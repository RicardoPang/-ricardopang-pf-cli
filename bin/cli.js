#!/usr/bin/env node
// Shebang 行，指定使用 node 执行

// 加载环境变量
require('dotenv').config();

// 导入核心 CLI 框架
const { program } = require('commander'); // CLI 参数解析和命令管理
const path = require('path'); // 跨平台路径处理
const fs = require('fs'); // 文件系统操作

// ASCII 艺术字生成
const figlet = require('figlet');
const versionStr = figlet.textSync('PF-CLI');

// 彩色输出
const Printer = require('@darkobits/lolcatjs');
const version = require('../package.json').version;

// 品牌展示（在交互模式中使用）
const transformed = Printer.fromString(
  ` \n   ✨ PF项目脚手架 ${version} ✨ \n ${versionStr}`
);

// 导入其他依赖
const ora = require('ora'); // 加载动画 spinner
const inquirer = require('inquirer'); // 交互式问答
const chalk = require('chalk'); // 文本颜色
const shell = require('shelljs'); // 跨平台 shell 命令
const {
  quicktype, // 核心类型生成函数
  InputData, // 输入数据容器
  jsonInputForTargetLanguage, // JSON 输入配置
} = require('quicktype-core');

// 默认保存路径配置
const desktopPath = path.join(require('os').homedir(), 'Desktop');
const currentPath = process.cwd();

// 检查 VSCode 是否可用
const hasVSCode = shell.which('code');

// 生成类型定义的核心函数
async function generateTypes(url, typeName) {
  const spinner = ora('🚀 正在获取API数据...').start();

  try {
    // 获取API数据
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.statusText}`);
    }

    // 解析JSON数据
    const jsonData = await response.json();
    spinner.text = '🔄 正在解析数据结构...';

    // 处理数据：如果是数组，取第一个元素作为类型推断样式
    const sampleData = Array.isArray(jsonData) ? jsonData[0] : jsonData;

    spinner.text = '📝 正在生成类型定义...';

    // 配置quicktype的typescript输入
    const jsonInput = jsonInputForTargetLanguage('typescript');
    await jsonInput.addSource({
      name: typeName, // 类型名称
      samples: [JSON.stringify(sampleData)], // JSON数据
    });

    // 创建输入数据容器
    const inputData = new InputData();
    inputData.addInput(jsonInput);

    spinner.text = '🎨 正在优化类型结构...';

    // 调用quicktype生成类型定义
    const result = await quicktype({
      lang: 'typescript',
      inputData,
      alphabetizeProperties: true, // 属性按字母排序 可读性
      rendererOptions: {},
    });

    const lines = result.lines;


    // 验证生成结果
    if (!lines || lines.length === 0) {
      spinner.fail('❌ 生成的类型为空，请检查API返回数据');
      throw new Error('⚠️ 生成的类型为空，请检查API返回数据');
    }

    spinner.succeed(chalk.green('✨ 太棒了！类型定义生成成功！'));

    return { lines };
  } catch (error) {
    spinner.fail('❌ 处理失败');
    throw error;
  }
}

// 交互式用户输入函数
async function promptUser() {
  console.log(transformed);
  console.log(chalk.cyan('\n👋 欢迎使用类型生成工具！让我们开始吧~\n'));

  // 定义问题配置数据
  const questions = [
    {
      type: 'input',
      name: 'url',
      message: '🌐 请输入API URL地址:',
      validate: (input) => {
        try {
          new URL(input);
          return true;
        } catch {
          return '❌ URL格式不正确，请输入有效的URL';
        }
      },
    },
    {
      type: 'input',
      name: 'name',
      message: '📝 请输入类型名称:',
      default: 'ApiTypes', // 默认值减少用户输入负担
      validate: (input) => {
        // 验证类型名称符合 TypeScript 命名规范
        if (/^[A-Za-z][A-Za-z0-9]*$/.test(input)) {
          return true;
        }
        return '❌ 类型名称必须以字母开头，且只能包含字母和数字';
      },
    },
    {
      type: 'list',
      name: 'path',
      message: '📂 请选择保存位置:',
      choices: [
        { name: '💻 桌面', value: desktopPath },
        { name: '📁 当前目录', value: currentPath },
        { name: '🔍 自定义路径', value: 'custom' }, // 触发未输入
      ],
    },
  ];

  // 执行问答流程
  const answers = await inquirer.prompt(questions);

  // 处理自定义路径的额外输入
  if (answers.path === 'custom') {
    const { customPath } = await inquirer.prompt({
      type: 'input',
      name: 'customPath',
      message: '📁 请输入保存路径:',
      default: currentPath,
      validate: (input) => {
        // 使用shelljs检查路径是否存在
        if (shell.test('-d', input)) {
          return true; // 路径存在
        }
        return '❌ 路径不存在，请输入有效的路径';
      },
    });
    answers.path = customPath; // 替换为用户输入的自定义路径
  }

  return answers;
}

// Git工作流完整函数
async function generateCommitMessage() {
  console.log(chalk.cyan('🤖 AI Git 完整工作流助手\n'));

  // 检查是否在git仓库中
  if (!shell.which('git')) {
    console.error(chalk.red('❌ Git未安装或不在PATH中'));
    process.exit(1);
  }

  // 检查是否在git仓库中
  const isGitRepo =
    shell.exec('git rev-parse --is-inside-work-tree', { silent: true }).code ===
    0;
  if (!isGitRepo) {
    console.error(chalk.red('❌ 当前目录不是Git仓库'));
    process.exit(1);
  }

  try {
    // 步骤1: Git Add
    await handleGitAdd();
    
    // 步骤2: 生成并执行Commit
    const commitMessage = await generateAndCommit();
    if (!commitMessage) {
      console.log(chalk.yellow('🚫 用户取消了提交操作'));
      process.exit(0);
    }

    // 步骤3: Git Pull
    await handleGitPull();

    // 步骤4: Git Push  
    await handleGitPush();

    console.log(chalk.green('\n🎉 Git工作流执行完成！'));
    console.log(chalk.gray(`📋 最终提交: ${commitMessage}`));

  } catch (error) {
    console.error(chalk.red('\n❌ Git工作流执行失败:'), error.message);
    console.log(chalk.yellow('💡 请手动处理后重试'));
    process.exit(1);
  }
}

// Git Add 处理函数
async function handleGitAdd() {
  const spinner = ora('📋 正在检查文件状态...').start();
  
  const gitStatus = shell.exec('git status --porcelain', { silent: true });
  
  if (gitStatus.stdout.trim() === '') {
    spinner.fail(chalk.yellow('⚠️  没有检测到任何变更'));
    console.log(chalk.gray('💡 当前工作区没有待提交的文件'));
    process.exit(0);
  }

  spinner.succeed(chalk.green('✅ 检测到文件变更'));

  // 显示文件状态
  console.log(chalk.cyan('\n📁 检测到以下文件变更:'));
  const statusLines = gitStatus.stdout.trim().split('\n');
  statusLines.forEach(line => {
    const status = line.substring(0, 2);
    const file = line.substring(3);
    let statusIcon = '📄';
    let statusText = '';
    
    if (status.includes('M')) {
      statusIcon = '📝';
      statusText = chalk.yellow('Modified');
    } else if (status.includes('A')) {
      statusIcon = '➕';
      statusText = chalk.green('Added');
    } else if (status.includes('D')) {
      statusIcon = '🗑️';
      statusText = chalk.red('Deleted');
    } else if (status.includes('??')) {
      statusIcon = '❓';
      statusText = chalk.blue('Untracked');
    }
    
    console.log(`  ${statusIcon} ${statusText} ${file}`);
  });

  // 询问用户如何添加文件
  const { addChoice } = await inquirer.prompt({
    type: 'list',
    name: 'addChoice',
    message: '\n📦 请选择要添加的文件:',
    choices: [
      { name: '🌍 添加所有文件 (git add .)', value: 'all' },
      { name: '📝 只添加已跟踪的修改文件 (git add -u)', value: 'updated' },
      { name: '🎯 手动选择文件', value: 'selective' },
      { name: '🚫 取消操作', value: 'cancel' }
    ]
  });

  if (addChoice === 'cancel') {
    console.log(chalk.yellow('🚫 操作已取消'));
    process.exit(0);
  }

  const addSpinner = ora('📦 正在添加文件...').start();

  let addResult;
  if (addChoice === 'all') {
    addResult = shell.exec('git add .', { silent: true });
  } else if (addChoice === 'updated') {
    addResult = shell.exec('git add -u', { silent: true });
  } else if (addChoice === 'selective') {
    addSpinner.stop();
    
    // 解析文件列表用于选择
    const fileChoices = statusLines.map(line => {
      const file = line.substring(3);
      const status = line.substring(0, 2);
      let statusIcon = '📄';
      
      if (status.includes('M')) statusIcon = '📝';
      else if (status.includes('A')) statusIcon = '➕';
      else if (status.includes('D')) statusIcon = '🗑️';
      else if (status.includes('??')) statusIcon = '❓';
      
      return { name: `${statusIcon} ${file}`, value: file };
    });

    const { selectedFiles } = await inquirer.prompt({
      type: 'checkbox',
      name: 'selectedFiles',
      message: '请选择要添加的文件:',
      choices: fileChoices,
      validate: (input) => input.length > 0 || '❌ 至少选择一个文件'
    });

    addSpinner.start('📦 正在添加选中的文件...');
    const filePaths = selectedFiles.map(f => `"${f}"`).join(' ');
    addResult = shell.exec(`git add ${filePaths}`, { silent: true });
  }

  if (addResult.code !== 0) {
    addSpinner.fail(chalk.red('❌ 文件添加失败'));
    throw new Error(`Git add 失败: ${addResult.stderr}`);
  }

  addSpinner.succeed(chalk.green('✅ 文件添加成功'));
}

// 生成并执行Commit
async function generateAndCommit() {
  const spinner = ora('🧠 AI正在分析代码变更...').start();

  try {
    // 获取staged变更
    const gitDiff = shell.exec('git diff --cached', { silent: true });
    const gitStatus = shell.exec('git status --porcelain', { silent: true });

    if (gitDiff.stdout.trim() === '') {
      spinner.fail(chalk.yellow('⚠️  没有暂存的文件可以提交'));
      throw new Error('没有暂存的文件');
    }

    // 检查API密钥
    const apiKey = process.env.OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY;
    if (
      !apiKey ||
      apiKey === 'your-openai-api-key-here' ||
      !apiKey.startsWith('sk-')
    ) {
      spinner.fail(chalk.red('❌ OpenAI API密钥未配置或无效'));
      console.error(chalk.red('🔑 请设置环境变量 OPENAI_API_KEY'));
      console.error(
        chalk.gray('💡 提示: export OPENAI_API_KEY="sk-your-real-key"')
      );
      
      // 回退到手动输入
      return await handleManualCommit();
    }

    // 调用OpenAI API
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `你是一个专业且幽默的Git commit信息生成助手。请根据提供的git diff内容，生成一个简洁、准确、略带幽默的commit信息。

要求：
1. 使用中文
2. 长度控制在50字以内
3. 准确描述变更内容
4. 可以适当幽默，但要专业
5. 使用合适的emoji
6. 格式：<emoji> <动作>: <具体内容>

示例：
- 🐛 修复: 用户登录时的空指针异常
- ✨ 新增: OpenAI智能commit信息生成功能
- 🎨 优化: 重构用户服务的代码结构
- 📝 更新: 完善README文档说明
- 🔧 配置: 添加ESLint规则配置`,
        },
        {
          role: 'user',
          content: `请为以下Git变更生成commit信息：

Git Status:
${gitStatus.stdout}

Git Diff:
${gitDiff.stdout.slice(0, 3000)}`,
        },
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    const commitMessage = response.choices[0].message.content.trim();
    spinner.succeed(chalk.green('🎉 AI commit信息生成完成！'));

    console.log(chalk.cyan('\n🤖 AI建议的commit信息:'));
    console.log(chalk.yellow(`📝 ${commitMessage}\n`));

    const { useAICommit } = await inquirer.prompt({
      type: 'confirm',
      name: 'useAICommit',
      message: '是否使用这个commit信息进行提交？',
      default: true,
    });

    let finalMessage;
    if (useAICommit) {
      finalMessage = commitMessage;
    } else {
      const { customMessage } = await inquirer.prompt({
        type: 'input',
        name: 'customMessage',
        message: '请输入自定义commit信息:',
        default: commitMessage,
        validate: (input) => input.trim() !== '' || '❌ Commit信息不能为空',
      });
      finalMessage = customMessage;
    }

    // 执行commit
    const commitSpinner = ora('💾 正在提交更改...').start();
    const commitResult = shell.exec(`git commit -m "${finalMessage}"`, {
      silent: true,
    });

    if (commitResult.code !== 0) {
      commitSpinner.fail(chalk.red('❌ 提交失败'));
      throw new Error(`Git commit 失败: ${commitResult.stderr}`);
    }

    commitSpinner.succeed(chalk.green('✅ 提交成功！'));
    console.log(chalk.gray(`📋 Commit: ${finalMessage}`));
    
    return finalMessage;

  } catch (error) {
    spinner.fail(chalk.red('❌ 生成commit信息失败'));
    
    if (error.code === 'insufficient_quota') {
      console.error(chalk.red('💳 OpenAI API配额不足，请检查账户余额'));
    } else if (error.code === 'invalid_api_key') {
      console.error(
        chalk.red('🔑 OpenAI API密钥无效，请检查环境变量OPENAI_API_KEY')
      );
    } else {
      console.error(chalk.red('🤖 AI服务暂时不可用:'), error.message);
    }

    return await handleManualCommit();
  }
}

// 手动Commit处理
async function handleManualCommit() {
  console.log(chalk.cyan('\n📝 回退到手动输入模式:'));
  const { manualMessage } = await inquirer.prompt({
    type: 'input',
    name: 'manualMessage',
    message: '请输入commit信息:',
    validate: (input) => input.trim() !== '' || '❌ Commit信息不能为空',
  });

  const commitSpinner = ora('💾 正在提交更改...').start();
  const commitResult = shell.exec(`git commit -m "${manualMessage}"`, {
    silent: true,
  });

  if (commitResult.code !== 0) {
    commitSpinner.fail(chalk.red('❌ 提交失败'));
    throw new Error(`Git commit 失败: ${commitResult.stderr}`);
  }

  commitSpinner.succeed(chalk.green('✅ 提交成功！'));
  console.log(chalk.gray(`📋 Commit: ${manualMessage}`));
  
  return manualMessage;
}

// Git Pull 处理函数
async function handleGitPull() {
  const spinner = ora('📥 正在拉取远程更新...').start();

  // 检查是否有远程仓库
  const remoteResult = shell.exec('git remote', { silent: true });
  if (remoteResult.stdout.trim() === '') {
    spinner.info(chalk.yellow('📡 没有配置远程仓库，跳过pull操作'));
    return;
  }

  // 获取当前分支
  const branchResult = shell.exec('git branch --show-current', { silent: true });
  const currentBranch = branchResult.stdout.trim();

  if (!currentBranch) {
    spinner.info(chalk.yellow('📡 未检测到当前分支，跳过pull操作'));
    return;
  }

  // 检查远程分支是否存在
  const remoteBranchResult = shell.exec(
    `git ls-remote --heads origin ${currentBranch}`, 
    { silent: true }
  );
  
  if (remoteBranchResult.stdout.trim() === '') {
    spinner.info(chalk.yellow(`📡 远程分支 ${currentBranch} 不存在，跳过pull操作`));
    return;
  }

  // 执行pull
  const pullResult = shell.exec('git pull origin ' + currentBranch, { silent: true });

  if (pullResult.code !== 0) {
    spinner.fail(chalk.red('❌ Pull失败'));
    
    // 检查是否是合并冲突
    if (pullResult.stderr.includes('CONFLICT') || pullResult.stderr.includes('conflict')) {
      console.error(chalk.red('💥 检测到合并冲突！'));
      console.log(chalk.yellow('📝 请手动解决冲突后重试'));
      console.log(chalk.gray('💡 提示: 解决冲突后运行 git add . && git commit'));
      throw new Error('存在合并冲突，需要手动解决');
    }
    
    throw new Error(`Git pull 失败: ${pullResult.stderr}`);
  }

  if (pullResult.stdout.includes('Already up to date')) {
    spinner.succeed(chalk.green('✅ 代码已是最新版本'));
  } else {
    spinner.succeed(chalk.green('✅ 远程更新拉取成功'));
    console.log(chalk.gray('📋 Pull结果:'), pullResult.stdout.trim());
  }
}

// Git Push 处理函数  
async function handleGitPush() {
  const spinner = ora('📤 正在推送到远程仓库...').start();

  // 获取当前分支
  const branchResult = shell.exec('git branch --show-current', { silent: true });
  const currentBranch = branchResult.stdout.trim();

  if (!currentBranch) {
    spinner.fail(chalk.red('❌ 未检测到当前分支'));
    throw new Error('无法获取当前分支信息');
  }

  // 执行push
  const pushResult = shell.exec(`git push origin ${currentBranch}`, { silent: true });

  if (pushResult.code !== 0) {
    spinner.fail(chalk.red('❌ Push失败'));
    
    // 检查是否需要设置上游分支
    if (pushResult.stderr.includes('no upstream branch')) {
      console.log(chalk.yellow('📡 正在设置上游分支...'));
      const upstreamResult = shell.exec(`git push -u origin ${currentBranch}`, { silent: true });
      
      if (upstreamResult.code !== 0) {
        throw new Error(`设置上游分支失败: ${upstreamResult.stderr}`);
      }
      
      spinner.succeed(chalk.green('✅ 推送成功并设置上游分支'));
      return;
    }
    
    throw new Error(`Git push 失败: ${pushResult.stderr}`);
  }

  spinner.succeed(chalk.green('✅ 推送到远程仓库成功'));
  console.log(chalk.gray(`📋 推送分支: ${currentBranch}`));
}

// CLI命令配置
program
  .version(version) // 显示版本信息
  .description('🚀 PF-CLI - 从API生成TypeScript类型 + AI Git助手');

// 添加git commit子命令
program
  .command('commit')
  .alias('c')
  .description('🤖 使用AI生成Git commit信息并执行完整工作流')
  .action(generateCommitMessage);

// 原有的主命令
program
  .option('-u, --url <url>', 'API URL地址')
  .option('-n, --name <name>', '生成的类型名称')
  .option('-p, --path <path>', '保存路径')
  .action(async (options) => {
    try {
      // 决定配置来源（命令行参数 vs 交互式输入）
      const config = options.url ? {
        url: options.url,
        name: options.name || 'ApiTypes',
        path: options.path || currentPath
      } : await promptUser();
      // 执行类型生成
      const { lines } = await generateTypes(config.url, config.name);
      // 文件保存流程
      const spinner = ora('💾 正在保存文件...').start();
      // 确保目标目录存在（跨平台兼容）
      if (!shell.test('d', config.path)) {
        shell.mkdir('-p', config.path); // 递归创建目录
      }
      // 构建完整文件路径
      const fullPath = path.join(config.path, `${config.name}.ts`);
      // 使用shelljs写入文件（跨平台兼容）
      shell.ShellString(lines.join('\n')).to(fullPath);
      spinner.succeed(chalk.green('🎉 文件保存成功！'));
      // 结果展示
      console.log(chalk.cyan('\n📍 文件保存在:'), fullPath);
      console.log(chalk.yellow('\n👀 类型定义预览:\n'));
      console.log(chalk.gray('✨ ----------------------------------------'));
      console.log(lines.join('\n'));
      console.log(chalk.gray('✨ ----------------------------------------\n'));
      // VSCode集成功能
      if (hasVSCode) {
        const { openFile } = await inquirer.prompt({
          type: 'confirm',
          name: 'openFile',
          message: '🔍 是否要在VSCode中打开生成的文件？',
          default: false,
        });

        if (openFile) {
          // 使用shelljs执行VSCode命令
          const result = shell.exec(`code "${fullPath}"`, { silent: true });
          if (result.code === 0) {
            console.log(chalk.green('\n📝 已在VSCode中打开文件'));
          } else {
            console.log(chalk.yellow('\n⚠️  无法自动打开文件，请手动打开查看'));
          }
        }

        console.log(chalk.green('\n👋 感谢使用，祝您开发愉快！\n'));
      }
    } catch (error) {
      // 统一错误处理
      console.error(chalk.red('\n❌ 错误:'), error.message);
      process.exit(1); // 非零退出码表示错误
    }
  });

// 解析命令行参数
program.parse(process.argv);

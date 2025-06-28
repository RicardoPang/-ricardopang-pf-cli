#!/usr/bin/env node
// Shebang 行，指定使用 node 执行

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

// CLI命令配置
program
  .version(version) // 显示版本信息
  .description('🚀 从API URL生成TypeScript类型定义')
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

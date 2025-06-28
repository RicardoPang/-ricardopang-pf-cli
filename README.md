# 🚀 PF-CLI - 让类型定义不再是噩梦！

<div align="center">

```
   ____  _____      ____ _     ___ 
 |  _ \|  ___|    / ___| |   |_ _|
 | |_) | |_ _____| |   | |    | | 
 |  __/|  _|_____| |___| |___ | | 
 |_|   |_|        \____|_____|___|
```

[![npm version](https://img.shields.io/npm/v/@ricardopang/pf-cli.svg)](https://www.npmjs.com/package/@ricardopang/pf-cli)
[![License](https://img.shields.io/npm/l/@ricardopang/pf-cli.svg)](https://github.com/RicardoPang/pf-cli/blob/main/LICENSE)
[![Downloads](https://img.shields.io/npm/dm/@ricardopang/pf-cli.svg)](https://www.npmjs.com/package/@ricardopang/pf-cli)

*一个让你告别手写TypeScript类型定义的神奇工具* ✨

</div>

## 🎯 这是什么？

还在为API返回的复杂JSON数据手写TypeScript类型定义而秃头吗？😱  
还在为嵌套对象的类型推导而加班到深夜吗？🌙  
还在为团队成员写出的`any`类型而抓狂吗？😤  

**PF-CLI** 来拯救你了！🦸‍♂️

只需要一个API URL，我们就能帮你生成完美的TypeScript类型定义。就像变魔术一样，但是更实用！🎩✨

## 🎪 核心功能

- 🌐 **API转类型**: 从任何REST API自动生成TypeScript接口
- 🎨 **美观输出**: 生成的代码整洁、可读性强
- 📁 **灵活保存**: 支持桌面、当前目录或自定义路径
- 💻 **VSCode集成**: 一键在VSCode中打开生成的文件
- 🚀 **快如闪电**: 几秒钟搞定复杂的嵌套类型
- 🛡️ **类型安全**: 包含运行时类型验证函数

## 📦 安装

```bash
# 全局安装，走遍天下都不怕
npm install -g @ricardopang/pf-cli

# 或者用你最爱的包管理器
pnpm add -g @ricardopang/pf-cli
yarn global add @ricardopang/pf-cli
```

## 🎮 使用方法

### 🎪 交互式模式（推荐新手）

```bash
pf-gen
```

然后跟着彩色提示走就行了！就像玩游戏一样简单：

1. 🌐 输入API URL
2. 📝 起个好听的类型名字
3. 📂 选择保存位置
4. ☕ 喝口茶，等待奇迹发生

### ⚡ 命令行模式（极客专用）

```bash
# 基础用法
pf-gen -u https://api.example.com/user -n User

# 完整参数
pf-gen -u https://api.example.com/posts -n BlogPost -p ./types

# 查看版本（炫耀必备）
pf-gen --version

# 查看帮助（迷路时用）
pf-gen --help
```

## 🎯 实战演示

### 🌟 示例1: 用户数据类型

```bash
pf-gen -u https://jsonplaceholder.typicode.com/users/1 -n UserProfile
```

**生成结果**：
```typescript
export interface UserProfile {
    address:  Address;
    company:  Company;
    email:    string;
    id:       number;
    name:     string;
    phone:    string;
    username: string;
    website:  string;
}

export interface Address {
    city:    string;
    geo:     Geo;
    street:  string;
    suite:   string;
    zipcode: string;
}

export interface Geo {
    lat: string;
    lng: string;
}

export interface Company {
    bs:          string;
    catchPhrase: string;
    name:        string;
}
```

### 🌟 示例2: 博客文章类型

```bash
pf-gen -u https://jsonplaceholder.typicode.com/posts/1 -n BlogPost
```

**瞬间获得**：
```typescript
export interface BlogPost {
    body:   string;
    id:     number;
    title:  string;
    userId: number;
}
```

## 🎛️ 参数详解

| 参数 | 简写 | 描述 | 示例 |
|------|------|------|------|
| `--url` | `-u` | 🌐 API接口地址 | `-u https://api.example.com/data` |
| `--name` | `-n` | 📝 生成的类型名称 | `-n UserData` |
| `--path` | `-p` | 📁 文件保存路径 | `-p ./src/types` |
| `--version` | `-V` | 📊 显示版本信息 | |
| `--help` | `-h` | 🆘 显示帮助信息 | |

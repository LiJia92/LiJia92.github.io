---
title: 国内网络环境下 Claude Code 配置 DeepSeek 模型完全指南
date: 2026-05-13 12:00:00
tags:
 - AI
---

## 背景

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) 是 Anthropic 官方推出的命令行 AI 编程助手，支持在终端中直接进行代码生成、重构、调试等操作。但 Anthropic 官方 API 在国内无法直接访问，需要借助第三方兼容端点。

[DeepSeek](https://platform.deepseek.com/) 提供了兼容 Anthropic Messages API 格式的端点，国内可直接访问，使得我们可以在无需代理的环境下使用 Claude Code。

<!-- more -->

> **重要提示：** 此配置方式属于非官方、未文档化的用法，Anthropic 官方不提供技术支持。部分高级功能（扩展思考、Prompt Caching、视觉识别等）可能不可用。

## 前置条件

**安装 Node.js**

Claude Code 基于 Node.js 运行，需要 Node.js 18 及以上版本。

```bash
# 检查是否已安装
node --version

# 如未安装，前往 https://nodejs.org 下载 LTS 版本
```

**配置 npm 国内镜像（可选）**

```bash
npm config set registry https://registry.npmmirror.com
```

**获取 DeepSeek API Key**

1. 访问 [platform.deepseek.com](https://platform.deepseek.com)
2. 注册或登录账号
3. 在「API Keys」页面创建新的 API Key
4. 复制保存（格式为 `sk-xxxxxxxx`）

## 安装 Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

安装完成后验证：

```bash
claude --version
```

## 配置 DeepSeek 端点

Claude Code 通过 `settings.json` 管理配置，支持全局和项目级两种方式。

**配置文件位置**

配置文件按优先级从高到低排列：

|优先级|路径|说明|
|---|---|---|
|1|`~/.claude/settings.local.json`|全局本地配置，推荐存放密钥|
|2|`~/.claude/settings.json`|全局配置|
|3|`.claude/settings.local.json`|项目本地配置|
|4|`.claude/settings.json`|项目级配置|

> `settings.local.json` 文件会被自动 `.gitignore`，适合存放 API Key 等敏感信息。

**核心环境变量**

|变量名|作用|示例值|
|---|---|---|
|`ANTHROPIC_BASE_URL`|API 端点地址|`https://api.deepseek.com/anthropic`|
|`ANTHROPIC_AUTH_TOKEN`|API 认证密钥|`sk-xxxxxxxxxxxxxxxx`|
|`ANTHROPIC_MODEL`|使用的模型名称|`deepseek-chat`|
|`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`|禁用非必要网络请求|`1`|

**推荐配置方式**

编辑 `~/.claude/settings.local.json`，全局生效：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "sk-你的DeepSeek密钥",
    "ANTHROPIC_MODEL": "deepseek-chat",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  }
}
```

**按项目配置**

在项目根目录创建 `.claude/settings.local.json`：

```bash
mkdir -p .claude
```

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "sk-你的DeepSeek密钥",
    "ANTHROPIC_MODEL": "deepseek-chat",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  }
}
```

**可用模型**

DeepSeek 兼容端点支持以下模型：

|模型|特点|
|---|---|
|`deepseek-chat`|DeepSeek-V3，通用对话模型|
|`deepseek-reasoner`|DeepSeek-R1，推理增强模型|

修改 `ANTHROPIC_MODEL` 的值即可切换。

**`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` 的作用**

设置为 `"1"` 后会禁用以下非必要网络请求，避免访问不可达的 Anthropic 服务器：

- 遥测数据上报
- 使用统计上报
- 版本更新检查
- 其他非核心 API 调用

建议在国内网络环境下开启此选项。

## 使用 Claude Code

**基本命令**

```bash
# 启动交互式对话
claude

# 单次询问
claude -p "这段代码有什么问题？"

# 指定文件上下文提问
claude -p "解释 index.js 的主要逻辑"

# 使用管道输入
cat error.log | claude -p "分析这些错误日志"

# 继续上次对话
claude --continue
```

**交互模式常用操作**

进入 `claude` 交互模式后：

- 直接输入问题，按 `Enter` 发送
- `Shift + Enter` 换行
- 输入 `/help` 查看内置命令
- `/clear` 清空当前对话上下文
- `/compact` 压缩上下文，用于对话过长时
- `/memory` 查看或管理持久化记忆
- `Ctrl + C` 中断当前生成
- `Ctrl + D` 或输入 `exit` 退出

**日常使用场景**

```bash
# 代码审查
claude -p "review 这段代码，找出潜在问题" < src/utils.js

# 生成单元测试
claude -p "为以下函数生成 Jest 测试用例"

# 重构代码
claude -p "将这个函数从回调风格改为 async/await"

# 解释代码
claude -p "解释这个正则表达式的含义" -- -- "/\d{3}-\d{4}-\d{4}/"
```

**项目级配置进阶**

在项目的 `.claude/settings.json` 中可以添加权限配置：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "sk-你的DeepSeek密钥",
    "ANTHROPIC_MODEL": "deepseek-chat",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  },
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Bash(npm:*)",
      "Bash(node:*)"
    ]
  }
}
```

预先授权常用命令，可以减少交互中的权限确认提示。

## 功能限制说明

使用 DeepSeek 端点时，以下 Claude 原生功能不可用或受限：

|功能|状态|说明|
|---|---|---|
|基础对话/代码生成|可用|核心功能正常|
|Tool Use（工具调用）|取决于端点|DeepSeek 端点已支持|
|流式输出（SSE）|取决于端点|DeepSeek 端点已支持|
|扩展思考（Extended Thinking）|不可用|Anthropic 专有格式|
|Prompt Caching|不可用|依赖 Anthropic 专有 Header|
|图片/PDF 分析|不可用|Anthropic 专有格式|
|Computer Use|不可用|Anthropic 专有工具|
|联网搜索|不可用|Anthropic 专有工具|
|官方技术支持|无|非官方配置路径|

> 日常编程场景（代码生成、代码审查、重构、调试等）的核心功能基本不受影响。

## 常见问题

**提示 `401 Unauthorized`**

检查 DeepSeek API Key 是否正确，确认账户有余额。

**提示连接错误**

确认 `ANTHROPIC_BASE_URL` 设置为 `https://api.deepseek.com/anthropic`，注意路径中的 `/anthropic` 后缀。

**响应速度慢**

DeepSeek 低价接口在高峰期可能限速。建议在 DeepSeek 平台充值以获得更好的并发体验。

**工具调用（读写文件等）失败**

确认 DeepSeek 端点完整支持 Anthropic 的 `tool_use` / `tool_result` 消息格式。如不支持，工具类功能将无法使用。

**如何切换回官方 Anthropic API**

删除或注释 `settings.local.json` 中的 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_MODEL`，改为设置标准的 `ANTHROPIC_API_KEY`。

**如何升级 Claude Code**

```bash
npm update -g @anthropic-ai/claude-code
```

## 总结

通过将 Claude Code 的 API 端点指向 DeepSeek 的 Anthropic 兼容接口，国内开发者可以在无需代理的环境下使用 CLI AI 编程助手。虽然部分高级功能受限，但日常编码场景的核心体验基本完整。

**推荐配置清单：**

1. 安装 Node.js 18+
2. `npm install -g @anthropic-ai/claude-code`
3. 获取 DeepSeek API Key
4. 编辑 `~/.claude/settings.local.json` 填入上述 JSON 配置
5. 运行 `claude` 开始使用

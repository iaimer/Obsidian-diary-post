# ai-polish Specification

## Purpose
TBD - created by archiving change project-baseline. Update Purpose after archive.
## Requirements
### Requirement: 多 API 引擎支持

系统 SHALL 支持多种 AI API 进行内容润色，包括 Claude API、OpenAI API、DeepSeek、Moonshot 和本地 Ollama。

#### Scenario: 使用 Claude API 润色
- **WHEN** 用户配置的 baseUrl 包含 "anthropic"
- **THEN** 系统调用 Anthropic Messages API 格式发送润色请求

#### Scenario: 使用 OpenAI 兼容 API 润色
- **WHEN** 用户配置的 baseUrl 不包含 "anthropic"
- **THEN** 系统调用 OpenAI Chat Completions API 格式发送润色请求

### Requirement: AI 配置持久化

系统 SHALL 将 AI 引擎配置持久化存储到 localStorage。

#### Scenario: 保存 AI 配置
- **WHEN** 用户在设置页面填写 AI 配置并点击保存
- **THEN** 配置写入 localStorage 键 `diary-ai-config`，包含 enabled、name、baseUrl、apiKey、model 字段

#### Scenario: 检查 AI 是否已配置
- **WHEN** 任何组件调用 AI 润色前
- **THEN** 系统检查 localStorage 中是否有完整且 enabled 的 AI 配置

### Requirement: 五种预设模板

系统 SHALL 提供 5 种 API 预设模板供用户快速选择。

#### Scenario: 选择预设模板
- **WHEN** 用户选择 "DeepSeek" 预设
- **THEN** 系统自动填充 DeepSeek 的 baseUrl、模型名称等字段

### Requirement: 三层标签生成

系统 SHALL 要求 AI 润色后自动生成三层标签：领域（必选1个）、能力（必选1个）、方法（可选0~1个）。

#### Scenario: AI 润色返回结构化标签
- **WHEN** AI 润色完成
- **THEN** 返回内容中包含 "#领域/能力/方法" 格式的标签

#### Scenario: 解析 AI 返回的标签
- **WHEN** AI 返回内容包含 "#工作/项目管理/方法论" 标签
- **THEN** 系统解析出领域="工作"、能力="项目管理"、方法="方法论"

### Requirement: 自定义润色规则

系统 SHALL 允许用户自定义润色提示词规则，影响 AI 润色行为。

#### Scenario: 编辑润色规则
- **WHEN** 用户在设置页面修改润色规则 textarea 内容
- **THEN** 自定义规则保存到 localStorage，覆盖默认润色规则

#### Scenario: 重置为默认规则
- **WHEN** 用户点击"重置为默认"按钮
- **THEN** 润色规则恢复为系统预设的默认提示词

#### Scenario: 默认润色规则
- **WHEN** 未自定义润色规则
- **THEN** 系统使用尊重事实零增补、适度修辞、轻微扩写等默认规则

### Requirement: 三种润色类型

系统 SHALL 支持三种润色类型：随手记（quickNote）、觉察反思（reflection）、每日小确幸（happiness），每种可使用不同的润色提示词。

#### Scenario: 随手记润色
- **WHEN** 用户在随手记界面触发 AI 润色
- **THEN** 系统使用 quickNote 类型的提示词发送润色请求

#### Scenario: 觉察反思润色
- **WHEN** 用户在觉察弹窗触发 AI 润色
- **THEN** 系统使用 reflection 类型的提示词发送润色请求

### Requirement: AI 人生教练（荔枝喵说）

系统 SHALL 基于当天日记完整内容生成教练式反馈，支持自定义提示词。

#### Scenario: 生成教练反馈
- **WHEN** 用户在日记「🧠 人生教练」卡片点击「生成今日教练反馈」
- **THEN** 系统收集当天所有日记区块（随手记、小确幸、焦虑时刻、觉察等）作为上下文
- **AND** 调用 AI API 使用教练提示词生成 250-300 字反馈
- **AND** 输出包含 📌 模式识别 / ⚠️ 矛盾指出 / 🎯 行动建议 / 💬 暖心鼓励
- **AND** max_tokens 设为 800

#### Scenario: 重新生成教练反馈
- **WHEN** 人生教练已有内容且用户点击「🔄 重新生成」
- **THEN** 系统重新调用 AI 生成新内容并替换整个人生教练区块

#### Scenario: 行动建议分离
- **WHEN** AI 返回内容包含「🎯」
- **THEN** 系统提取 🎯 行及其后续内容，追加到日记的明日寄语（### 🌙 明日寄语）区块
- **AND** 人生教练区块只保留 📌 / ⚠️ / 💬 部分

#### Scenario: 教练提示词自定义
- **WHEN** 用户在设置页 AI 润色引擎内切换到「教练提示词」Tab
- **THEN** 系统显示教练提示词 textarea 供编辑
- **AND** 用户可点击「重置为默认」恢复系统预设教练提示词

#### Scenario: 区块标题兼容
- **WHEN** 读取旧日记文件时遇到 `### 🧠 荔枝喵说` 标题
- **THEN** 系统正确识别并解析内容
- **AND** 下次写入时自动迁移为 `### 🧠 人生教练` 新标题

#### Scenario: 无 AI 配置时
- **WHEN** 用户未配置 AI API 却点击生成
- **THEN** 系统提示"请先在设置页面配置AI API"


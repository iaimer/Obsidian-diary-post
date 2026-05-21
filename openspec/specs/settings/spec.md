# settings Specification

## Purpose
TBD - created by archiving change project-baseline. Update Purpose after archive.
## Requirements
### Requirement: 折叠分组

系统 SHALL 在设置页面使用可折叠分组组织配置项。

#### Scenario: 展开/折叠分组
- **WHEN** 用户点击分组标题栏
- **THEN** 分组内容区域展开或折叠，箭头图标旋转 90 度过渡

#### Scenario: 默认状态
- **WHEN** 用户首次打开设置页面
- **THEN** 远程 API 设置和 AI 润色引擎分组默认折叠，其他分组展开

### Requirement: AI 引擎配置

系统 SHALL 在设置页面提供 AI 引擎的完整配置界面。

#### Scenario: 配置 AI 引擎
- **WHEN** 用户选择预设模板并填写 API Key
- **THEN** 配置保存到 localStorage，润色功能可用

#### Scenario: 隐藏 API Key
- **WHEN** 用户在设置页面查看已填写的 API Key
- **THEN** API Key 字段以密码输入框样式展示，不可明文读取

#### Scenario: 切换提示词类型
- **WHEN** 用户点击「教练提示词」Tab
- **THEN** 系统切换显示教练提示词 textarea，隐藏润色规则 textarea
- **AND** 用户可编辑人生教练的 AI 生成提示词

#### Scenario: 旧版提示词迁移
- **WHEN** 读取到含"第一人称"关键词的旧版教练提示词
- **THEN** 系统自动替换为当前默认教练提示词

### Requirement: 图片压缩参数设置

系统 SHALL 在设置页面提供图片压缩参数的自定义配置。

#### Scenario: 设置压缩参数
- **WHEN** 用户修改最大长边、最大文件大小、JPEG 质量或文件名格式
- **THEN** 配置保存到 localStorage，即时生效

#### Scenario: 无效参数提示
- **WHEN** 用户输入无效的压缩参数（如负数质量）
- **THEN** 系统使用输入框的 min/max 属性限制输入范围

### Requirement: 远程模式配置

系统 SHALL 在设置页面提供远程模式的开关和连接配置。

#### Scenario: 启用远程模式
- **WHEN** 用户勾选"启用远程模式"并输入 API 地址和 Token
- **THEN** 系统切换到远程数据服务，通过 HTTP API 操作日记

#### Scenario: 测试远程连接
- **WHEN** 用户配置远程模式参数
- **THEN** 系统允许用户测试 API 连通性

### Requirement: 设置持久化

系统 SHALL 将所有设置项持久化到 localStorage 并通过 Zustand persist 中间件管理。

#### Scenario: 关闭应用后重新打开
- **WHEN** 用户关闭浏览器后重新打开应用
- **THEN** 之前的设置（AI 配置、压缩参数、远程模式）均保持不变

### Requirement: CollapsibleSection 可复用组件

系统 SHALL 提供通用的 CollapsibleSection 可折叠组件，支持自定义标题和默认展开状态。

#### Scenario: 在其他页面使用折叠组件
- **WHEN** 开发者使用 CollapsibleSection 组件并传入 title 和 children
- **THEN** 组件渲染折叠标题栏和子内容，支持展开/折叠交互


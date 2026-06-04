# 工作流指南

各场景应使用的 skill 速查表。

## 场景 → Skill 映射

| 场景 | Skill | 说明 |
|------|-------|------|
| 快速拷问/压力测试方案 | **`grill-with-docs`** | 一问一答拷问，交叉检查领域文档 |
| 修复 bug / 性能回归 | **`diagnose`** | 6 阶段闭环：复现→假设→检测→修复→回归→复盘 |
| TDD 开发新功能 | **`tdd`** | 红绿重构循环，先写测试再实现 |
| 从零搭前端 UI | **`impeccable`** | 全功能设计系统，支持批评/审计/润色/动画 |
| 润色/重构已有 UI | **`impeccable`** | critique / audit / polish 等子命令 |
| 多步骤复杂任务 | **`planning-with-files-zh`** | 创建 task_plan.md + findings.md + progress.md |
| 需要全局理解代码 | **`zoom-out`** | 获取模块和调用链的全景视角 |
| 重构/解耦代码架构 | **`improve-codebase-architecture`** | 找出紧耦合、低内聚模块，生成 HTML 报告 |
| 审查代码变更 | **`requesting-code-review`** | 派发代码审查子 agent |
| 推送前更新文档 | **`project-docs-workflow`** | 更新 package.json → AGENTS.md → SESSION_LOG.md → CHANGELOG.md → README.md |
| 记录新想法到 PLAN.md | **`project-docs-workflow`** | 说"我有一个新的idea"触发 |
| 创建会话接力文档 | **`handoff`** | 压缩当前会话为接续文档 |
| 创建新 skill | **`write-a-skill`** | 标准 skill 结构 + 渐进式展示 |
| 极简回复模式 | **`caveman`** | /caveman 触发，省 token 模式 |
| 拆解方案为 GitHub Issues | **`to-issues`** | 垂直切片发布到 GitHub Issues |
| 写 PRD 并发布 | **`to-prd`** | 从当前上下文生成 PRD |
| 管理 Issue 状态机 | **`triage`** | 按 needs-triage / ready-for-agent 等标签流转 |
| 初始化工程 skill 配置 | **`setup-matt-pocock-skills`** | 配置 issue tracker / triage labels / domain docs |

## 典型工作流

### 新功能开发
```
idea → grill-with-docs(拷问方案)
     → planning-with-files-zh(分解任务)
     → tdd(红绿重构) / 直接实现
     → requesting-code-review(审查)
     → project-docs-workflow(更新文档→推送)
```

### Bug 修复
```
bug report → diagnose(复现→假设→修复→回归)
           → requesting-code-review(审查)
           → project-docs-workflow(更新文档→推送)
```

### 前端 UI 迭代
```
需求 → impeccable(搭建/润色)
     → requesting-code-review(审查)
     → project-docs-workflow(更新文档→推送)
```

## 已归档的冗余 Skill

以下 skill 因功能重复已归档到 `.opencode/skills/archived/`（全局级在 `~/.config/opencode/skills/archived/`）：

| 归档 Skill | 被取代者 | 原因 |
|------------|----------|------|
| `frontend-design` | `impeccable` | impeccable 功能更全 |
| `design-taste-frontend` | `impeccable` | impeccable 功能更全 |
| `grill-me` | `grill-with-docs` | 被超集完全覆盖 |
| `openspec-explore` | `grill-with-docs` / `planning-with-files-zh` | 探索需求已被覆盖 |
| `openspec-propose` | `planning-with-files-zh` | 轻量方案替代 |
| `openspec-apply-change` | `planning-with-files-zh` | 轻量方案替代 |
| `openspec-archive-change` | `planning-with-files-zh` | 轻量方案替代 |

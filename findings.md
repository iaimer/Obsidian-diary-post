# 发现与决策

## 需求
- 设置页从折叠式重构为系统设置风格（概览→详情导航）
- 手机单栏 + 桌面双栏
- 保留全部现有功能，仅改交互和视觉

## 研究发现

### 现有代码结构
- `src/components/SettingsPage.tsx` — 794 行单体组件，14 个 useState + 15 个 store selector
- `src/components/CollapsibleSection.tsx` — 40 行折叠包装器，仅在 SettingsPage 中使用
- `src/App.tsx` — 362 行，无隐藏底部导航机制，需要新增

### 现有设置项
| 区块 | 保存方式 |
|------|---------|
| 🏃 习惯管理 | 开关/编辑立即生效 |
| 🌐 远程API | 输入直接写 Store |
| 🤖 AI润色引擎 | 独立 localStorage，手动保存 |
| 📷 图片压缩 | 草稿模式，手动保存 |
| 📋 关于 | 只读 |

### 导航机制
- App.tsx 用 `currentView` 控制顶层页面切换
- 底部导航无条件渲染
- 无子页面导航机制

## 技术决策
| 决策 | 理由 |
|------|------|
| SettingsPage 内部管理子导航状态 | 不污染 App.tsx |
| `hideBottomNav` 通过回调或 props 传递 | App.tsx 单一控制点 |
| 拆分为 SettingsOverview + SettingDetail 组件 | 保持组件职责单一 |
| 远程 API 改为草稿模式 | PRD 要求，且更符合用户预期 |
| 桌面双栏用 CSS media query (lg:) | 不引入路由库 |

## 资源
- 现有 Tailwind 配置色板：暖灰 `#FAF8F5~#141210`，陶土 `#885649`
- 图标系统：`src/components/Icons.tsx`，线性 SVG

---

*每执行2次查看/浏览器/搜索操作后更新此文件*
*防止视觉信息丢失*

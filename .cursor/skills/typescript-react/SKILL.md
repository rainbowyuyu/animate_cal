---
name: typescript-react
description: TypeScript and React best practices. Use when writing or refactoring .ts/.tsx files, React components, hooks, or type definitions.
metadata:
  tags: typescript, react, frontend, components, hooks
---

# TypeScript & React 技能

## 何时使用

- 编写或修改 `.ts` / `.tsx` 文件
- 实现或重构 React 组件、Hooks
- 定义或扩展类型、接口
- 配置 tsconfig、处理类型错误

## 约定

### TypeScript

- 优先使用 `interface` 描述对象形状；需要联合/交叉时用 `type`
- 导出类型用 `export type { X }` 或 `export interface X`
- 避免 `any`；必要时用 `unknown` 或泛型
- 启用 `strict: true` 时注意 `undefined` 与可选链 `?.`、空值合并 `??`

### React

- 函数组件 + 类型化 props：`const Comp: React.FC<{ id: string }> = ({ id }) => ...`
- Hooks 顺序固定，不在条件/循环中调用
- 列表项必须有稳定 `key`（不用 index 除非列表静态且无重排）
- 副作用放在 `useEffect`，依赖数组写全，避免闭包陈旧值

### 项目内

- 本仓库含 Remotion（React + 帧驱动），动画用 `useCurrentFrame()`、`interpolate`、`spring`，避免依赖真实时间
- 样式优先内联 `style` 或已有 theme/constants，保持与现有 intro-video、gemini-canvas 一致

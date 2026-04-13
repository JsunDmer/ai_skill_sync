---
title: feat: Skill 同步工具 - 独立 Web 服务
type: feat
status: completed
date: 2026-04-10
origin: docs/brainstorms/skill-sync-tool-requirements.md
---

# Skill 同步工具 - 独立 Web 服务

## Overview

创建一个技能同步工具的独立 Web 应用，实现技能的中央存储（Git 仓库）、全平台共享（OpenCode/Claude/Trace-CN/Cursor）和可视化前端管理。

## Problem Frame

用户需要在多个 AI Agent 平台间共享技能定义。当前各平台的技能是分散的，无法统一管理。本项目通过中央 Git 仓库存储 + Web 前端管理来解决这个问题。

## Requirements Trace

- R1. 查看技能列表：在前端展示所有已同步的技能 (P0)
- R2. 查看技能详情：点击查看技能的完整内容 (P0)
- R3. 添加技能：将技能添加到中央仓库 (P0)
- R4. 删除技能：从中央仓库删除指定技能 (P0)
- R5. Git 同步：链接仓库、pull、commit (P0)
- R6. 平台适配：OpenCode/Claude/Trace-CN/Cursor 四个适配器 (P0)
- R7. 前端页面：技能列表、详情、添加、设置 (P0)

## Scope Boundaries

- MVP 阶段不包含用户认证系统
- 冲突处理 (P1) 延后实现
- 实时双向同步 (P1) 延后实现

## Context & Research

### 技术栈选择

- **前端框架**: Next.js 14 (App Router) - 现代化全栈框架
- **UI 库**: Tailwind CSS + shadcn/ui - 快速构建美观的 UI
- **Git 操作**: isomorphic-git - 纯前端 Git 操作，无需后端
- **状态管理**: Zustand - 轻量级状态管理
- **部署**: Vercel / 自托管

### 假设 (基于待澄清问题)

1. **Git 认证**: 使用 HTTPS + Personal Access Token（简化认证流程）
2. **目录结构**: 技能存储在 Git 仓库的 `/skills/` 目录
3. **用户认证**: MVP 阶段不需要，后续可扩展

## Key Technical Decisions

- **纯前端 Git 操作**: 使用 isomorphic-git 在浏览器中直接操作 Git，无需后端服务
- **统一技能格式**: 定义标准 JSON 格式，各平台适配器负责转换
- **静态站点优先**: MVP 使用静态生成，减少复杂度

## Implementation Units

- [ ] **Unit 1: 项目初始化与基础架构**

**Goal:** 创建 Next.js 项目、配置 Tailwind + shadcn/ui、搭建项目结构

**Requirements:** N/A (基础架构)

**Dependencies:** None

**Files:**
- Create: `package.json`
- Create: `next.config.js`
- Create: `tailwind.config.js`
- Create: `tsconfig.json`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/components/ui/` (shadcn 组件)

**Approach:**
- 使用 create-next-app 初始化项目
- 安装并配置 shadcn/ui
- 创建基础布局和路由结构

**Patterns to follow:**
- Next.js 14 App Router 官方结构
- shadcn/ui 组件使用模式

**Test scenarios:**
- Test expectation: none -- 基础脚手架搭建

**Verification:**
- `npm run dev` 能正常启动
- 首页能正常访问

---

- [ ] **Unit 2: 技能数据模型与类型定义**

**Goal:** 定义技能的数据结构和 TypeScript 类型

**Requirements:** R1, R2 (技能展示需要数据结构)

**Dependencies:** Unit 1

**Files:**
- Create: `src/types/skill.ts`
- Create: `src/lib/skill-utils.ts`

**Approach:**
- 根据需求文档定义 Skill 接口
- 实现技能内容的序列化和反序列化工具函数

**Patterns to follow:**
- TypeScript 最佳实践
- 清晰的接口文档注释

**Test scenarios:**
- Test expectation: none -- 类型定义文件

**Verification:**
- TypeScript 编译无错误

---

- [ ] **Unit 3: Git 仓库服务层**

**Goal:** 实现 Git 仓库的连接、克隆、拉取、提交功能

**Requirements:** R5 (Git 同步)

**Dependencies:** Unit 2

**Files:**
- Create: `src/lib/git-service.ts`
- Create: `src/hooks/use-git.ts`

**Approach:**
- 使用 isomorphic-git 实现 Git 操作
- 支持 HTTPS + Token 认证
- 实现文件级别的操作（读取、写入、删除）
- 处理 Git 仓库的初始化和克隆

**Technical design:**
```typescript
// GitService 接口设计
interface GitService {
  clone(url: string, token: string): Promise<void>;
  pull(): Promise<void>;
  commit(message: string): Promise<void>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  listFiles(): Promise<string[]>;
}
```

**Patterns to follow:**
- isomorphic-git 官方文档模式
- 错误处理最佳实践

**Test scenarios:**
- Happy path: 正常的 clone/pull/commit 操作
- Edge case: 空仓库处理
- Error path: 认证失败、网络错误

**Verification:**
- 能克隆一个测试 Git 仓库
- 能读取和写入文件

---

- [ ] **Unit 4: 技能管理核心逻辑**

**Goal:** 实现技能的增删改查逻辑

**Requirements:** R1, R2, R3, R4

**Dependencies:** Unit 2, Unit 3

**Files:**
- Create: `src/lib/skill-manager.ts`
- Create: `src/hooks/use-skills.ts`
- Create: `src/stores/skill-store.ts`

**Approach:**
- 封装 Git 操作为技能管理的高级接口
- 实现技能的 CRUD 操作
- 使用 Zustand 管理前端状态

**Patterns to follow:**
- Repository 模式
- Zustand 状态管理模式

**Test scenarios:**
- Happy path: 添加、读取、更新、删除技能
- Edge case: 重复名称处理、空技能列表
- Error path: Git 操作失败

**Verification:**
- 能在前端完成完整的技能管理流程

---

- [ ] **Unit 5: 平台适配器架构**

**Goal:** 实现四个平台的适配器

**Requirements:** R6

**Dependencies:** Unit 2

**Files:**
- Create: `src/lib/adapters/index.ts`
- Create: `src/lib/adapters/base-adapter.ts`
- Create: `src/lib/adapters/opencode-adapter.ts`
- Create: `src/lib/adapters/claude-adapter.ts`
- Create: `src/lib/adapters/trace-cn-adapter.ts`
- Create: `src/lib/adapters/cursor-adapter.ts`

**Approach:**
- 定义适配器基类接口
- 每个平台实现自己的转换逻辑
- 适配器负责将统一格式转换为各平台可用格式

**Technical design:**
```typescript
// Adapter 接口设计
interface SkillAdapter {
  name: string;
  transform(skill: Skill): PlatformSkill;
  validate(content: string): boolean;
}
```

**Patterns to follow:**
- 适配器模式
- 开闭原则

**Test scenarios:**
- Happy path: 各平台适配器能正确转换
- Edge case: 不支持的平台字段

**Verification:**
- 各适配器输出格式符合平台要求

---

- [ ] **Unit 6: 前端页面 - 技能列表**

**Goal:** 实现技能列表页面

**Requirements:** R1

**Dependencies:** Unit 4

**Files:**
- Create: `src/app/skills/page.tsx`
- Create: `src/components/skill-card.tsx`
- Modify: `src/app/page.tsx` (重定向到技能列表)

**Approach:**
- 使用卡片布局展示技能
- 显示技能名称、描述、标签
- 支持点击查看详情

**Patterns to follow:**
- shadcn/ui 组件使用
- 响应式布局

**Test scenarios:**
- Happy path: 正常显示技能列表
- Edge case: 空列表显示提示
- Error path: 加载失败显示错误状态

**Verification:**
- 页面美观、响应式适配正常

---

- [ ] **Unit 7: 前端页面 - 技能详情**

**Goal:** 实现技能详情页面

**Requirements:** R2

**Dependencies:** Unit 5, Unit 6

**Files:**
- Create: `src/app/skills/[id]/page.tsx`
- Create: `src/components/skill-detail.tsx`
- Create: `src/components/platform-preview.tsx`

**Approach:**
- 展示技能的完整信息
- 显示各平台的预览格式
- 支持编辑和删除操作

**Patterns to follow:**
- shadcn/ui 组件使用
- 代码高亮显示

**Test scenarios:**
- Happy path: 正确显示技能详情和各平台预览
- Edge case: 不存在的技能 ID

**Verification:**
- 详情页完整展示所有信息

---

- [ ] **Unit 8: 前端页面 - 添加技能**

**Goal:** 实现添加技能表单页面

**Requirements:** R3

**Dependencies:** Unit 4

**Files:**
- Create: `src/app/skills/new/page.tsx`
- Create: `src/components/add-skill-form.tsx`

**Approach:**
- 表单收集技能信息（名称、描述、代码内容、标签）
- 支持上传技能文件
- 表单验证

**Patterns to follow:**
- React Hook Form + Zod 验证
- shadcn/ui 表单组件

**Test scenarios:**
- Happy path: 成功添加技能并跳转到列表
- Edge case: 表单验证失败
- Error path: Git 提交失败

**Verification:**
- 表单完整且验证有效

---

- [ ] **Unit 9: 前端页面 - 设置**

**Goal:** 实现设置页面

**Requirements:** R5 (Git 配置)

**Dependencies:** Unit 3

**Files:**
- Create: `src/app/settings/page.tsx`
- Create: `src/components/settings-form.tsx`

**Approach:**
- Git 仓库 URL 配置
- Personal Access Token 配置（本地存储）
- 平台选择配置

**Patterns to follow:**
- shadcn/ui 表单组件
- 本地存储或 localStorage

**Test scenarios:**
- Happy path: 能保存和加载配置
- Edge case: 无效配置处理

**Verification:**
- 配置能正确保存和读取

---

## System-Wide Impact

- **Interaction graph:** 前端组件 → Zustand Store → Git Service → 各平台适配器
- **Error propagation:** Git 操作失败 → 前端提示用户
- **State lifecycle risks:** 本地状态仅在内存中，刷新丢失（设计决策：MVP 阶段接受）

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| isomorphic-git 浏览器限制 | 详细测试各浏览器兼容性 |
| Git 认证安全 | Token 存储在 localStorage（需用户自担风险） |
| 平台适配复杂性 | MVP 先实现基础转换，详细适配后续迭代 |

## Documentation / Operational Notes

- 需要编写部署文档
- 需要编写各平台适配器的使用说明

## Sources & References

- **Origin document:** [docs/brainstorms/skill-sync-tool-requirements.md](docs/brainstorms/skill-sync-tool-requirements.md)
- Next.js 14 文档: https://nextjs.org/docs
- isomorphic-git 文档: https://isomorphic-git.org/docs/en/intro
- shadcn/ui: https://ui.shadcn.com/

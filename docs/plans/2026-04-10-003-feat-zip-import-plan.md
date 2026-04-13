---
title: feat: 添加 ZIP 导入功能支持多个技能包
type: feat
status: completed
date: 2026-04-10
origin: docs/brainstorms/skill-sync-tool-requirements.md
---

# 添加 ZIP 导入功能支持多个技能包

## Overview

扩展现有的导入功能，支持从 ZIP 文件批量导入多个技能包。ZIP 文件内可以包含多个技能 JSON 文件，每个文件对应一个技能。

## Problem Frame

用户需要能够批量导入多个技能，而不是一次导入一个。现有的导入功能仅支持单个 JSON 文件。需要扩展为支持 ZIP 文件格式，ZIP 内可以包含多个技能定义文件。

## Requirements Trace

- R1. 支持从 ZIP 文件导入 (上传 .zip 文件，解压后批量导入多个技能)
- R2. 支持通过粘贴 ZIP Base64 内容导入
- R3. 自动识别并解析 ZIP 内的所有 .json 文件
- R4. 跳过无效的 JSON 文件并给出提示

## Scope Boundaries

- 仅支持 .zip 格式的压缩包
- 不支持其他压缩格式 (rar, 7z, tar.gz)
- 不支持密码保护的 ZIP 文件

## Context & Research

### Technology Stack

- Next.js 14 (React 18)
- TypeScript
- JSZip (客户端 ZIP 处理)

### Relevant Code and Patterns

- `src/app/skills/new/page.tsx` - 现有的导入功能实现
- `src/types/skill.ts` - Skill 类型定义

### Institutional Learnings

- 现有的导入功能使用 Tabs 组件区分 Create 和 Import
- 使用 localStorage 持久化技能数据

## Key Technical Decisions

- 使用 JSZip 库在客户端处理 ZIP 文件解压
- 支持两种导入方式：文件选择器上传和粘贴 Base64 文本
- 遍历 ZIP 内所有 .json 文件并逐个解析
- 过滤掉无法解析的文件并在 UI 提示用户

## Open Questions

### Resolved During Planning

- 使用哪个库处理 ZIP？选择 JSZip，功能完善且支持浏览器端
- ZIP 内文件结构如何？任意层级，只要包含 .json 文件即可
- 如何处理解析失败的 JSON？跳过并记录，用户可查看导入结果

## Implementation Units

- [ ] **Unit 1: 添加 JSZip 依赖**

**Goal:** 安装 JSZip 库用于客户端 ZIP 处理

**Dependencies:** None

**Files:**
- Modify: `package.json`

**Approach:**
- 运行 npm install jszip 添加依赖
- 或直接添加依赖到 package.json

**Verification:**
- JSZip 可正常引入使用

---

- [ ] **Unit 2: 创建 ZIP 导入工具模块**

**Goal:** 实现 ZIP 文件解析和批量技能导入逻辑

**Dependencies:** Unit 1

**Files:**
- Create: `src/lib/zip-importer.ts`

**Approach:**
- 实现 parseZipFile() 函数：接收 File 或 Base64 字符串，返回 Skill[] 数组
- 实现 validateSkillJson() 函数：验证 JSON 是否为有效的 Skill 对象
- 处理解压、遍历 .json 文件、解析、验证的完整流程

**Test scenarios:**
- Happy path: 有效的 ZIP 文件包含多个有效 JSON
- Edge case: 空 ZIP、无 .json 文件的 ZIP、包含无效 JSON 的 ZIP
- Error path: 损坏的 ZIP 文件、密码保护的 ZIP

**Verification:**
- 能正确解析标准 ZIP 文件并返回技能数组

---

- [ ] **Unit 3: 修改导入页面支持 ZIP**

**Goal:** 在导入页面添加 ZIP 导入选项

**Dependencies:** Unit 2

**Files:**
- Modify: `src/app/skills/new/page.tsx`

**Approach:**
- 在 Import Tab 中添加 ZIP 上传选项
- 添加 Base64 粘贴输入框
- 调用 zip-importer 解析并批量导入
- 显示导入结果：成功数量、失败数量、失败原因

**Test scenarios:**
- Happy path: 上传包含 3 个有效技能的 ZIP，成功导入
- Edge case: 上传包含 5 个技能但 2 个无效，仅导入 3 个并提示
- Error path: 上传损坏的 ZIP 文件，提示错误信息

**Verification:**
- ZIP 文件可以正常导入并批量添加技能

---

## System-Wide Impact

- **Interaction graph:** 修改了技能创建流程，增加了批量导入路径
- **Error propagation:** 解析失败不影响已成功导入的技能
- **State lifecycle:** 批量导入会多次触发 addSkill，需要验证 store 是否支持批量操作

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 大型 ZIP 文件可能导致浏览器内存问题 | 限制单个文件大小或添加进度提示 |
| 无效 JSON 格式导致导入失败 | 跳过无效文件并提供详细错误信息 |

## Documentation / Operational Notes

- 需要更新 UI 提示用户 ZIP 文件结构要求
- 建议在导入结果显示中列出成功和失败的技能名称
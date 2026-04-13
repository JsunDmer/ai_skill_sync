---
title: feat: 添加导入功能和自定义标签分组
type: feat
status: active
date: 2026-04-10
origin: docs/brainstorms/skill-sync-tool-requirements.md
---

# 添加导入功能和自定义标签分组

## Overview

为现有的技能同步工具添加技能导入功能和自定义标签分组功能。

## Problem Frame

当前用户只能手动创建技能，需要支持从外部导入已有的技能文件。同时，技能列表缺乏组织能力，需要按标签分组来组织技能。

## Requirements Trace

- R1. 支持从文件导入技能 (导入 .json 技能文件)
- R2. 支持从剪贴板导入 (粘贴 JSON 内容)
- R2. 支持自定义标签分组 (创建/编辑/删除分组)
- R3. 按分组筛选技能

## Implementation Units

- [ ] **Unit 1: 导入功能**

**Goal:** 添加技能导入功能（文件上传 + 剪贴板）

**Requirements:** R1, R2

**Dependencies:** Unit 2 (现有的类型定义)

**Files:**
- Modify: `src/app/skills/new/page.tsx` (添加导入选项)
- Create: `src/components/import-skill-dialog.tsx`

**Approach:**
- 在添加技能页面添加"导入"选项卡
- 支持文件选择器上传 .json 文件
- 支持粘贴 JSON 内容到文本框
- 解析并验证技能格式

**Test scenarios:**
- Happy path: 上传有效的技能 JSON 文件
- Edge case: 文件格式错误、无效 JSON

**Verification:**
- 能成功导入有效的技能文件

---

- [ ] **Unit 2: 标签分组功能**

**Goal:** 添加自定义标签分组功能

**Requirements:** R2, R3

**Dependencies:** None

**Files:**
- Modify: `src/types/skill.ts` (添加 SkillGroup 类型)
- Create: `src/lib/group-manager.ts`
- Create: `src/components/group-sidebar.tsx`
- Modify: `src/app/skills/page.tsx` (添加分组显示)

**Approach:**
- 添加 SkillGroup 类型定义
- 实现分组管理 (创建、编辑、删除分组)
- 在技能列表页添加分组侧边栏
- 支持按分组筛选技能

**Test scenarios:**
- Happy path: 创建分组、编辑分组、删除分组
- Edge case: 空分组名称

**Verification:**
- 能创建和管理分组

## Open Questions

### Deferred to Implementation

- 是否需要持久化分组配置到 localStorage？
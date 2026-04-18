---
date: 2026-04-18
type: 技术设计
tags: [技能导入, 外部市场, SkillsMP]
status: 待用户审批
---

# 外部技能导入设计

**创建日期**: 2026-04-18
**版本**: 1.0
**状态**: 待用户审批

---

## 1. 需求概述

从外部技能市场（SkillsMP）搜索、预览并导入技能到本地仓库。

### 1.1 需求来源

- 目标平台：SkillsMP（425K+ 技能）
- 技能格式：SKILL.md（行业标准）

### 1.2 功能列表

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 技能搜索 | 从 SkillsMP 搜索技能 | P0 |
| 搜索结果展示 | 展示搜索结果列表 | P0 |
| 技能详情 | 查看技能完整内容 | P0 |
| 一键导入 | 导入技能到本地仓库 | P0 |
| AI 语义搜索 | 使用自然语言搜索 | P1 |

---

## 2. 技术方案

### 2.1 SkillsMP API

| 项目 | 值 |
|------|-----|
| Base URL | `https://skillsmp.com/api/v1` |
| 认证方式 | Bearer Token |
| 搜索端点 | `GET /skills/search` |
| AI 搜索端点 | `GET /skills/ai-search` |

### 2.2 API 认证

用户需要在设置页面配置 SkillsMP API Key：
- 匿名用户：50 requests/day（仅关键字搜索）
- 认证用户：500 requests/day（全部功能）

---

## 3. 数据结构

### 3.1 搜索结果

```typescript
interface SkillsMPSkill {
  id: string;
  name: string;
  author: string;
  repo: string;
  description: string;
  stars: number;
  recent: string;
  category?: string;
  occupation?: string;
}
```

### 3.2 本地存储格式

导入的技能保存为标准 SKILL.md：

```markdown
---
name: {skill-name}
description: {description}
license: MIT
compatibility: opencode,claude,cursor
source: skillsmp
repo: {owner}/{repo}
---

# 技能内容
...
```

### 3.3 目录结构

```
skills/
├── {skill-name}/
│   └── SKILL.md
```

---

## 4. 组件设计

### 4.1 技能搜索组件

```
┌─────────────────────────────────────────────────┐
│  🔍 搜索技能...                    [AI搜索] [搜索] │
├─────────────────────────────────────────────────┤
│  筛选: ▾ 全类别   ▾ 全职业   排序: ▾ 热门   ▾ 最新  │
└─────────────────────────────────────────────────┘
```

### 4.2 搜索结果卡片

```
┌─────────────────────────────────────────────────┐
│ 📁 react-patterns                      ⭐ 1.2k │
│ 作者: anthropics/claude-code                      │
│ React 开发最佳实践，包含 Hooks、状态管理、       │
│ 性能优化等模式                                   │
├─────────────────────────────────────────────────┤
│         [预览]              [导入到本地]          │
└─────────────────────────────────────────────────┘
```

### 4.3 技能详情弹窗

```
┌─────────────────────────────────────────────────┐
│  react-patterns                                      │
│  作者: anthropics                               ✕  │
├─────────────────────────────────────────────────┤
│  ⭐ 1.2k  |  📁 anthropics/claude-code       │
│  类别: Development  |  更新: 2026-04-10        │
├─────────────────────────────────────────────────┤
│  ## 简介                                          │
│  React 开发最佳实践...                              │
│                                                  │
│  ## 使用方式                                      │
│  ...                                             │
├─────────────────────────────────────────────────┤
│                   [导入到本地]                    │
└─────────────────────────────────────────────────┘
```

---

## 5. 页面设计

### 5.1 外部技能导入页

```
┌──────────────────────────────────────────────────────────┐
│  ← 外部技能导入                              ⚙️ API 设置   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 🔍 搜索技能...                          [AI搜索]   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  热门搜索: react, python, docker, testing, security     │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  推荐技能                                                │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐      │
│  │ react      │  │ python     │  │ testing    │      │
│  │ patterns   │  │ best      │  │ strategies │      │
│  │ ⭐ 1.2k    │  │ ⭐ 890     │  │ ⭐ 650     │      │
│  └────────────┘  └────────────┘  └────────────┘      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 6. API 客户端设计

### 6.1 核心接口

```typescript
// src/lib/skillsmp-client.ts

interface SkillsMPConfig {
  apiKey: string;
}

interface SearchParams {
  query: string;
  page?: number;
  limit?: number;
  sortBy?: 'stars' | 'recent';
  category?: string;
  occupation?: string;
}

interface SearchResult {
  skills: SkillsMPSkill[];
  total: number;
}

// 关键字搜索
async function searchSkills(params: SearchParams): Promise<SearchResult>

// AI 语义搜索
async function aiSearchSkills(query: string, limit?: number): Promise<SearchResult>

// 获取技能详情（从 GitHub repo 获取 SKILL.md）
async function getSkillContent(owner: string, repo: string): Promise<string>
```

### 6.2 错误处理

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| MISSING_API_KEY | 未配置 API Key | 引导用户去设置 |
| INVALID_API_KEY | API Key 无效 | 提示重新配置 |
| MISSING_QUERY | 未输入搜索词 | 提示输入 |
| DAILY_QUOTA_EXCEEDED | 配额用尽 | 提示次日再用 |

---

## 7. 实现计划

### Phase 1: API 客户端

- [ ] 创建 `skillsmp-client.ts`
- [ ] 实现关键字搜索
- [ ] 实现 AI 语义搜索
- [ ] 实现 GitHub 内容获取
- [ ] 错误处理

### Phase 2: UI 组件

- [ ] 搜索输入组件
- [ ] 技能卡片组件
- [ ] 搜索结果列表
- [ ] 技能详情弹窗
- [ ] 导入功能

### Phase 3: 页面集成

- [ ] 创建导入页
- [ ] 搜索功能集成
- [ ] 预览功能集成
- [ ] 导入功能集成
- [ ] API Key 配置

### Phase 4: 测试

- [ ] 单元测试
- [ ] E2E 测试
- [ ] 性能测试

---

## 8. 待用户审批

- [x] 方案选择：API 集成
- [x] 市场选择：SkillsMP
- [x] 功能范围：搜索+预览+导入+管理

---

等待用户审批后开始实现。
# 外部技能导入实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现从 SkillsMP 技能市场搜索、预览并导入技能到本地仓库的功能

**Architecture:** 通过 SkillsMP REST API 获取技能列表，用 GitHub API 获取技能内容，转换并保存为本地 SKILL.md 格式

**Tech Stack:** Next.js App Router, TypeScript, fetch API, localStorage

---

## Task 1: SkillsMP API 客户端

**Files:**
- Create: `src/lib/skillsmp-client.ts`

**Step 1: Write the failing test**

```typescript
// tests/skillsmp-client.test.ts
import { searchSkills, aiSearchSkills, getSkillContent } from '@/lib/skillsmp-client';

describe('SkillsMP Client', () => {
  it('should export searchSkills function', () => {
    expect(typeof searchSkills).toBe('function');
  });

  it('should export aiSearchSkills function', () => {
    expect(typeof aiSearchSkills).toBe('function');
  });

  it('should export getSkillContent function', () => {
    expect(typeof getSkillContent).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/skillsmp-client.test.ts`
Expected: FAIL with "Cannot find module '@/lib/skillsmp-client'"

**Step 3: Write minimal implementation**

```typescript
// src/lib/skillsmp-client.ts

export interface SkillsMPSkill {
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

export interface SearchParams {
  query: string;
  page?: number;
  limit?: number;
  sortBy?: 'stars' | 'recent';
  category?: string;
  occupation?: string;
}

export interface SearchResult {
  skills: SkillsMPSkill[];
  total: number;
}

export interface SkillsMPConfig {
  apiKey: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://skillsmp.com/api/v1';

export function getConfig(): SkillsMPConfig | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('skillsmp_config');
  return stored ? JSON.parse(stored) : null;
}

export function setConfig(config: SkillsMPConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('skillsmp_config', JSON.stringify(config));
  }
}

export async function searchSkills(params: SearchParams): Promise<SearchResult> {
  const config = getConfig();
  if (!config?.apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  const { query, page = 1, limit = 20, sortBy, category, occupation } = params;
  const searchParams = new URLSearchParams({
    q: query,
    page: page.toString(),
    limit: Math.min(limit, 100).toString(),
  });

  if (sortBy) searchParams.set('sortBy', sortBy);
  if (category) searchParams.set('category', category);
  if (occupation) searchParams.set('occupation', occupation);

  const response = await fetch(
    `${config.baseUrl || DEFAULT_BASE_URL}/skills/search?${searchParams}`,
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (error.error?.code === 'MISSING_API_KEY') {
      throw new Error('MISSING_API_KEY');
    }
    if (error.error?.code === 'INVALID_API_KEY') {
      throw new Error('INVALID_API_KEY');
    }
    if (error.error?.code === 'DAILY_QUOTA_EXCEEDED') {
      throw new Error('DAILY_QUOTA_EXCEEDED');
    }
    throw new Error(`API_ERROR: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    skills: data.data || [],
    total: data.total || 0,
  };
}

export async function aiSearchSkills(query: string, limit = 20): Promise<SearchResult> {
  const config = getConfig();
  if (!config?.apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  const searchParams = new URLSearchParams({
    q: query,
    limit: Math.min(limit, 100).toString(),
  });

  const response = await fetch(
    `${config.baseUrl || DEFAULT_BASE_URL}/skills/ai-search?${searchParams}`,
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (error.error?.code === 'MISSING_API_KEY') {
      throw new Error('MISSING_API_KEY');
    }
    if (error.error?.code === 'INVALID_API_KEY') {
      throw new Error('INVALID_API_KEY');
    }
    if (error.error?.code === 'DAILY_QUOTA_EXCEEDED') {
      throw new Error('DAILY_QUOTA_EXCEEDED');
    }
    throw new Error(`API_ERROR: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    skills: data.data || [],
    total: data.total || 0,
  };
}

export async function getSkillContent(owner: string, repo: string): Promise<string> {
  const response = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/main/SKILL.md`
  );

  if (!response.ok) {
    // Try master branch
    const masterResponse = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/master/SKILL.md`
    );
    if (!masterResponse.ok) {
      throw new Error('SKILL_NOT_FOUND');
    }
    return masterResponse.text();
  }

  return response.text();
}

export function extractRepoInfo(repoString: string): { owner: string; repo: string } {
  const parts = repoString.split('/');
  return {
    owner: parts[0],
    repo: parts[1],
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test tests/skillsmp-client.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/skillsmp-client.ts tests/skillsmp-client.test.ts
git commit -m "feat: add SkillsMP API client"
```

---

## Task 2: 技能格式转换器

**Files:**
- Create: `src/lib/skill-converter.ts`

**Step 1: Write the failing test**

```typescript
// tests/skill-converter.test.ts
import { convertSkillsMPSkillToSKILL } from '@/lib/skill-converter';

describe('Skill Converter', () => {
  it('should export convertSkillsMPSkillToSKILL function', () => {
    expect(typeof convertSkillsMPSkillToSKILL).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/skill-converter.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/lib/skill-converter.ts
import { SkillsMPSkill } from './skillsmp-client';

export interface SKILLMetadata {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  source?: string;
  repo?: string;
}

export function convertSkillsMPSkillToSKILL(
  skill: SkillsMPSkill,
  content: string
): string {
  const metadata: SKILLMetadata = {
    name: skill.name,
    description: skill.description,
    source: 'skillsmp',
    repo: skill.repo,
    compatibility: 'opencode,claude,cursor',
  };

  let frontmatter = '---\n';
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined) {
      frontmatter += `${key}: ${value}\n`;
    }
  }
  frontmatter += '---\n\n';

  return frontmatter + content;
}

export function parseSkillName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
```

**Step 4: Run test to verify it passes**

Run: `npm test tests/skill-converter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/skill-converter.ts tests/skill-converter.test.ts
git commit -m "feat: add skill format converter"
```

---

## Task 3: 搜索组件

**Files:**
- Create: `src/components/SkillSearch.tsx`

**Step 1: Write the component**

```typescript
// src/components/SkillSearch.tsx
'use client';

import { useState } from 'react';

interface SkillSearchProps {
  onSearch: (query: string, isAI: boolean) => void;
  isLoading?: boolean;
}

export function SkillSearch({ onSearch, isLoading }: SkillSearchProps) {
  const [query, setQuery] = useState('');
  const [isAI, setIsAI] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), isAI);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索技能..."
            className="w-full px-4 py-2 pl-10 border rounded-lg"
            disabled={isLoading}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsAI(!isAI)}
          className={`px-4 py-2 rounded-lg border ${
            isAI ? 'bg-purple-500 text-white' : 'bg-gray-100'
          }`}
          disabled={isLoading}
        >
          AI 搜索
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? '搜索中...' : '搜索'}
        </button>
      </div>
    </form>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/SkillSearch.tsx
git commit -m "feat: add SkillSearch component"
```

---

## Task 4: 技能卡片组件

**Files:**
- Create: `src/components/SkillCard.tsx`

**Step 1: Write the component**

```typescript
// src/components/SkillCard.tsx
'use client';

import { SkillsMPSkill } from '@/lib/skillsmp-client';

interface SkillCardProps {
  skill: SkillsMPSkill;
  onPreview: (skill: SkillsMPSkill) => void;
  onImport: (skill: SkillsMPSkill) => void;
}

export function SkillCard({ skill, onPreview, onImport }: SkillCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-lg">{skill.name}</h3>
          <p className="text-sm text-gray-600">{skill.repo}</p>
        </div>
        <div className="flex items-center gap-1">
          <span>⭐</span>
          <span>{formatStars(skill.stars)}</span>
        </div>
      </div>
      <p className="mt-2 text-gray-600 line-clamp-2">{skill.description}</p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onPreview(skill)}
          className="flex-1 px-3 py-1.5 border rounded hover:bg-gray-50"
        >
          预览
        </button>
        <button
          onClick={() => onImport(skill)}
          className="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          导入
        </button>
      </div>
    </div>
  );
}

function formatStars(stars: number): string {
  if (stars >= 1000) {
    return (stars / 1000).toFixed(1) + 'k';
  }
  return stars.toString();
}
```

**Step 2: Commit**

```bash
git add src/components/SkillCard.tsx
git commit -m "feat: add SkillCard component"
```

---

## Task 5: 技能详情弹窗

**Files:**
- Create: `src/components/SkillPreview.tsx`

**Step 1: Write the component**

```typescript
// src/components/SkillPreview.tsx
'use client';

import { SkillsMPSkill } from '@/lib/skillsmp-client';

interface SkillPreviewProps {
  skill: SkillsMPSkill | null;
  content: string;
  isLoading: boolean;
  onClose: () => void;
  onImport: (skill: SkillsMPSkill) => void;
}

export function SkillPreview({
  skill,
  content,
  isLoading,
  onClose,
  onImport,
}: SkillPreviewProps) {
  if (!skill) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-start justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-medium">{skill.name}</h2>
            <p className="text-sm text-gray-600">{skill.repo}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        <div className="p-4 border-b">
          <div className="flex gap-4 text-sm">
            <span>⭐ {skill.stars}</span>
            <span>📁 {skill.repo}</span>
            {skill.category && <span>类别: {skill.category}</span>}
          </div>
        </div>
        <div className="p-4 overflow-auto max-h-[50vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <span>加载中...</span>
            </div>
          ) : (
            <div className="prose">
              <pre className="whitespace-pre-wrap">{content}</pre>
            </div>
          )}
        </div>
        <div className="p-4 border-t">
          <button
            onClick={() => onImport(skill)}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            导入到本地
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/SkillPreview.tsx
git commit -m "feat: add SkillPreview modal"
```

---

## Task 6: 导入页面

**Files:**
- Create: `src/app/import/page.tsx`
- Modify: `src/app/page.tsx` (添加导航链接)

**Step 1: Write the page**

```typescript
// src/app/import/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { SkillSearch } from '@/components/SkillSearch';
import { SkillCard } from '@/components/SkillCard';
import { SkillPreview } from '@/components/SkillPreview';
import {
  searchSkills,
  aiSearchSkills,
  getSkillContent,
  extractRepoInfo,
  SkillsMPSkill,
  getConfig,
} from '@/lib/skillsmp-client';
import { convertSkillsMPSkillToSKILL } from '@/lib/skill-converter';

export default function ImportPage() {
  const [skills, setSkills] = useState<SkillsMPSkill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillsMPSkill | null>(null);
  const [previewContent, setPreviewContent] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    const config = getConfig();
    if (!config?.apiKey) {
      setError('请先设置 SkillsMP API Key');
    }
  }, []);

  const handleSearch = async (query: string, isAI: boolean) => {
    setIsLoading(true);
    setError(null);
    setSkills([]);

    try {
      let result;
      if (isAI) {
        result = await aiSearchSkills(query);
      } else {
        result = await searchSkills({ query, sortBy: 'stars' });
      }
      setSkills(result.skills);
    } catch (e) {
      setError(e instanceof Error ? e.message : '搜索失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async (skill: SkillsMPSkill) => {
    setSelectedSkill(skill);
    setIsPreviewLoading(true);
    setPreviewContent('');

    try {
      const { owner, repo } = extractRepoInfo(skill.repo);
      const content = await getSkillContent(owner, repo);
      setPreviewContent(content);
    } catch (e) {
      setPreviewContent('无法加载技能内容');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleImport = async (skill: SkillsMPSkill) => {
    try {
      const { owner, repo } = extractRepoInfo(skill.repo);
      const content = await getSkillContent(owner, repo);
      const skillContent = convertSkillsMPSkillToSKILL(skill, content);

      const response = await fetch('/api/skills/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: skill.name,
          content: skillContent,
        }),
      });

      if (!response.ok) {
        throw new Error('导入失败');
      }

      alert('导入成功！');
      setSelectedSkill(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : '导入失败');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">外部技能导入</h1>
        <button
          onClick={() => window.location.href = '/settings'}
          className="text-blue-500"
        >
          ⚙️ API 设置
        </button>
      </div>

      <SkillSearch onSearch={handleSearch} isLoading={isLoading} />

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      {skills.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onPreview={handlePreview}
              onImport={handleImport}
            />
          ))}
        </div>
      )}

      {!isLoading && skills.length === 0 && !error && (
        <div className="mt-8 text-center text-gray-500">
          <p>输入关键词搜索技能</p>
          <div className="mt-2 flex gap-2 justify-center">
            {['react', 'python', 'docker', 'testing', 'security'].map((tag) => (
              <button
                key={tag}
                onClick={() => handleSearch(tag, false)}
                className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <SkillPreview
        skill={selectedSkill}
        content={previewContent}
        isLoading={isPreviewLoading}
        onClose={() => setSelectedSkill(null)}
        onImport={handleImport}
      />
    </div>
  );
}
```

**Step 2: Create import API route**

```typescript
// src/app/api/skills/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const SKILLS_DIR = join(homedir(), '.skill-sync', 'skills');

export async function POST(request: NextRequest) {
  try {
    const { name, content } = await request.json();

    if (!name || !content) {
      return NextResponse.json(
        { error: 'Missing name or content' },
        { status: 400 }
      );
    }

    const skillDir = join(SKILLS_DIR, name);
    await fs.mkdir(skillDir, { recursive: true });

    const skillPath = join(skillDir, 'SKILL.md');
    await fs.writeFile(skillPath, content);

    return NextResponse.json({ success: true, path: skillPath });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add src/app/import/page.tsx src/app/api/skills/import/route.ts
git commit -m "feat: add import page"
```

---

## Task 7: API Key 设置页面

**Files:**
- Create: `src/app/settings/page.tsx`

**Step 1: Write the settings page**

```typescript
// src/app/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getConfig, setConfig, SkillsMPConfig } from '@/lib/skillsmp-client';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const config = getConfig();
    if (config?.apiKey) {
      setApiKey(config.apiKey);
    }
  }, []);

  const handleSave = () => {
    setConfig({ apiKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">设置</h1>

      <div className="max-w-md">
        <label className="block mb-2">SkillsMP API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk_live_xxx"
          className="w-full px-4 py-2 border rounded"
        />
        <p className="mt-2 text-sm text-gray-500">
          获取 API Key:{' '}
          <a
            href="https://skillsmp.com/settings/api"
            target="_blank"
            className="text-blue-500 underline"
          >
            SkillsMP Settings
          </a>
        </p>

        <button
          onClick={handleSave}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          {saved ? '已保存 ✓' : '保存'}
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat: add settings page for API key"
```

---

## Task 8: 导航链接

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add navigation links**

```typescript
// In the navigation/header section, add:
<Link href="/import" className="text-blue-500">
  导入外部技能
</Link>
<Link href="/settings" className="text-blue-500">
  设置
</Link>
```

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add navigation links"
```

---

## Plan complete and saved to `docs/plans/2026-04-18-external-skills-import-plan.md`.

Two execution options:

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
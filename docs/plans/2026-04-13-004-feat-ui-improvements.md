# UI Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 四项 UI 优化：批量同步支持选择 Agent、修复删除 bug、优化上传 UI（拖拽区域）、添加深色/亮色/系统主题切换。

**Architecture:** 全部改动在 Next.js 前端层，不涉及后端 API 结构变更（仅修复 deleteSkill 传参）。主题切换用轻量手动实现（localStorage + class 注入），避免引入 next-themes 依赖。

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS, Zustand, TypeScript

---

### Task 1: 修复删除技能的 filePath 传参 bug

**Files:**
- Modify: `src/app/skills/page.tsx:107`（SkillsPage 组件，`deleteSkill` 调用处）
- Modify: `src/stores/skill-store.ts:67-79`（deleteSkill 改为接收 folderName）

**背景：**
`skill.content.filePath` 存的是文件夹名（如 `"my-skill/"`），API DELETE 路由用 `name` 拼路径 `SKILLS_DIR/name`。但 `deleteSkill` 传的是 `skill.name`（frontmatter display name），两者不一致，导致 404。

**Step 1: 修改 SkillCard 的 onDelete 调用，传 folderName 而非 display name**

在 `src/app/skills/page.tsx` 的 `SkillCard` 组件接口中，`onDelete` 参数改为传 `skill.content.filePath`：

```tsx
// 修改前（约第 65 行）
if (confirm(`Delete "${skill.name}"?`)) {
  onDelete(skill.name);
}

// 修改后
if (confirm(`Delete "${skill.name}"?`)) {
  onDelete(skill.content.filePath.replace(/\/$/, ''));
}
```

**Step 2: 验证 API 侧的路径拼接逻辑正确**

检查 `src/app/api/skills/route.ts:219`：
```ts
const skillPath = join(SKILLS_DIR, name);
```
这里 `name` = 文件夹名，拼接后路径正确，无需修改。

**Step 3: 手动测试**
1. 启动 `npm run dev`
2. 导入一个 ZIP 技能
3. 在技能卡上点击删除按钮
4. 确认技能消失，刷新后仍不存在

**Step 4: Commit**
```bash
git add src/app/skills/page.tsx
git commit -m "fix: pass folder name to deleteSkill to match API path lookup"
```

---

### Task 2: 技能卡 Agent 图标改为纯状态指示器（不可点击）

**Files:**
- Modify: `src/components/agent-icons.tsx`
- Modify: `src/app/skills/page.tsx`（移除 onSync prop 传递）

**Step 1: 修改 AgentIcon，移除 onClick 支持，改为纯展示**

在 `src/components/agent-icons.tsx` 中，将 `AgentIcon` 的 `button` 改为 `div`，移除点击相关逻辑：

```tsx
// 修改 AgentIconProps（移除 onClick）
interface AgentIconProps {
  platform: Platform;
  isSynced: boolean;
  isLoading?: boolean;
  className?: string;
}

// 将 button 改为 div
export function AgentIcon({ platform, isSynced, isLoading, className }: AgentIconProps) {
  const config = PLATFORM_CONFIG[platform];

  return (
    <div
      className={cn(
        'flex items-center justify-center w-7 h-7 rounded-md',
        isSynced
          ? `${config.color} bg-current/10`
          : 'text-muted-foreground bg-muted',
        isLoading && 'opacity-50',
        className
      )}
      title={`${config.name}${isSynced ? ' (已同步)' : ' (未同步)'}`}
    >
      {isLoading ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        config.icon
      )}
    </div>
  );
}
```

**Step 2: 修改 AgentIconGroup，移除 onSync prop**

```tsx
interface AgentIconGroupProps {
  platforms: Platform[];
  syncedPlatforms: Platform[];
  loadingPlatforms?: Platform[];
  className?: string;
}

export function AgentIconGroup({
  platforms,
  syncedPlatforms,
  loadingPlatforms = [],
  className,
}: AgentIconGroupProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {platforms.map((platform) => (
        <AgentIcon
          key={platform}
          platform={platform}
          isSynced={syncedPlatforms.includes(platform)}
          isLoading={loadingPlatforms.includes(platform)}
        />
      ))}
    </div>
  );
}
```

**Step 3: 修改 SkillCard，移除 onSync prop 及相关状态**

在 `src/app/skills/page.tsx`：
- 从 `SkillCardProps` 中移除 `onSync`
- 从 `SkillCard` 函数签名中移除 `onSync`
- 从 `AgentIconGroup` 调用中移除 `onSync` prop
- 从 `SkillsPage` 中移除 `handleSingleSync` 函数、`loadingPlatforms` 状态
- 渲染 `SkillCard` 时移除 `onSync={handleSingleSync}` 和 `loadingPlatforms`

**Step 4: Commit**
```bash
git add src/components/agent-icons.tsx src/app/skills/page.tsx
git commit -m "refactor: make agent icons read-only status indicators, remove single-card sync"
```

---

### Task 3: 批量同步弹出 Agent 选择 Modal

**Files:**
- Modify: `src/app/skills/page.tsx`

**Step 1: 添加 Agent 选择 Modal 状态**

在 `SkillsPage` 的 state 区域添加：
```tsx
const [showSyncModal, setShowSyncModal] = useState(false);
const [selectedAgents, setSelectedAgents] = useState<Set<Platform>>(new Set(SUPPORTED_PLATFORMS));
```

**Step 2: 将 handleSync 拆成两步**

```tsx
// 打开 Modal
const openSyncModal = () => {
  if (selectedSkills.size === 0) return;
  setSelectedAgents(new Set(SUPPORTED_PLATFORMS)); // 每次打开默认全选
  setShowSyncModal(true);
};

// 确认同步
const handleSync = async () => {
  if (selectedSkills.size === 0 || selectedAgents.size === 0) return;
  setShowSyncModal(false);
  setIsSyncing(true);
  try {
    const selectedSkillsList = Array.from(selectedSkills);
    const agentsList = Array.from(selectedAgents);
    const result = await syncToPlatforms(selectedSkillsList, agentsList);

    const successCount = result.results.filter(r => r.status === 'success').length;
    alert(`Synced ${successCount} results to ${agentsList.join(', ')}`);

    for (const skillName of selectedSkillsList) {
      const skillResults = result.results.filter(r => r.skill === skillName);
      const newlySynced = skillResults
        .filter(r => r.status === 'success' || r.status === 'skipped')
        .map(r => r.platform as Platform);
      setSyncedPlatforms(prev => ({
        ...prev,
        [skillName]: [...new Set([...(prev[skillName] || []), ...newlySynced])],
      }));
    }
  } catch (e) {
    alert('Sync failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
  } finally {
    setIsSyncing(false);
    setSelectedSkills(new Set());
  }
};
```

**Step 3: 顶部按钮改为 openSyncModal**

```tsx
{selectedSkills.size > 0 && (
  <Button onClick={openSyncModal} disabled={isSyncing}>
    {isSyncing ? 'Syncing...' : `Sync ${selectedSkills.size} to Agents`}
  </Button>
)}
```

**Step 4: 在 return 末尾添加 Agent 选择 Modal**

```tsx
{showSyncModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-background p-6 rounded-lg w-[360px] space-y-4">
      <h2 className="text-xl font-bold">选择同步目标</h2>
      <p className="text-sm text-muted-foreground">
        将 {selectedSkills.size} 个技能同步到以下 Agent：
      </p>
      <div className="space-y-3">
        {SUPPORTED_PLATFORMS.map((platform) => {
          const labels: Record<Platform, string> = {
            opencode: 'OpenCode',
            claude: 'Claude Code',
            'trace-cn': 'Trace CN',
            cursor: 'Cursor',
          };
          return (
            <div key={platform} className="flex items-center gap-3">
              <Checkbox
                id={`agent-${platform}`}
                checked={selectedAgents.has(platform)}
                onCheckedChange={(checked) => {
                  setSelectedAgents(prev => {
                    const next = new Set(prev);
                    if (checked) next.add(platform);
                    else next.delete(platform);
                    return next;
                  });
                }}
              />
              <label htmlFor={`agent-${platform}`} className="text-sm font-medium cursor-pointer">
                {labels[platform]}
              </label>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={() => setShowSyncModal(false)}>
          取消
        </Button>
        <Button
          onClick={handleSync}
          disabled={selectedAgents.size === 0}
        >
          确认同步
        </Button>
      </div>
    </div>
  </div>
)}
```

**Step 5: Commit**
```bash
git add src/app/skills/page.tsx
git commit -m "feat: add agent selection modal for batch sync"
```

---

### Task 4: 优化上传 UI（拖拽区域）

**Files:**
- Modify: `src/app/skills/new/page.tsx`

**Step 1: 添加拖拽状态**

在 `ImportSkillPage` 顶部添加：
```tsx
const [isDragging, setIsDragging] = useState(false);
const [showAdvanced, setShowAdvanced] = useState(false);
```

**Step 2: 添加拖拽处理函数**

```tsx
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(true);
};

const handleDragLeave = () => {
  setIsDragging(false);
};

const handleDrop = async (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);
  const file = e.dataTransfer.files?.[0];
  if (!file) return;
  await processFile(file);
};
```

**Step 3: 提取文件处理逻辑为 processFile 函数**

将 `handleFileUpload` 内的核心逻辑提取：
```tsx
const processFile = async (file: File) => {
  setError('');
  setImportResult(null);

  if (!file.name.endsWith('.zip')) {
    setError('Unsupported file format. Please upload a ZIP file.');
    return;
  }

  setLoading(true);
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/skills', { method: 'POST', body: formData });
    const data = await response.json();
    if (data.error) {
      setError(data.error);
    } else {
      setImportResult({ success: data.success || [], failed: data.failed || [] });
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to read ZIP file');
  } finally {
    setLoading(false);
  }
};

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  await processFile(file);
};
```

**Step 4: 替换上传区 UI 为拖拽区域**

```tsx
{/* 拖拽区域 */}
<div
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  onClick={() => zipFileInputRef.current?.click()}
  className={cn(
    'flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
    isDragging
      ? 'border-primary bg-primary/5'
      : 'border-border hover:border-primary/50 hover:bg-accent/30'
  )}
>
  <input
    type="file"
    accept=".zip"
    ref={zipFileInputRef}
    onChange={handleFileUpload}
    className="hidden"
  />
  {isLoading ? (
    <svg className="w-8 h-8 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ) : (
    <svg className="w-8 h-8 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )}
  <div className="text-center">
    <p className="text-sm font-medium">
      {isLoading ? 'Importing...' : 'Drop ZIP file here or click to select'}
    </p>
    <p className="text-xs text-muted-foreground mt-1">Only .zip files are supported</p>
  </div>
</div>

{/* 高级选项：Base64 粘贴 */}
<div>
  <button
    type="button"
    onClick={() => setShowAdvanced(v => !v)}
    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
  >
    <svg className={cn('w-3 h-3 transition-transform', showAdvanced && 'rotate-90')} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
    Advanced: paste Base64
  </button>
  {showAdvanced && (
    <div className="mt-3 space-y-2">
      <Textarea
        id="importZipBase64"
        value={importZipBase64}
        onChange={e => setImportZipBase64(e.target.value)}
        placeholder="Paste ZIP file as Base64..."
        className="min-h-[100px] font-mono text-sm"
      />
      <Button onClick={handleZipBase64Import} disabled={isLoading} variant="outline" size="sm">
        {isLoading ? 'Importing...' : 'Import from Base64'}
      </Button>
    </div>
  )}
</div>
```

需要在文件顶部添加 `cn` import：
```tsx
import { cn } from '@/lib/utils';
```

**Step 5: Commit**
```bash
git add src/app/skills/new/page.tsx
git commit -m "feat: replace file input with drag-and-drop upload zone"
```

---

### Task 5: 添加主题切换（深色/亮色/系统）

**Files:**
- Create: `src/components/theme-provider.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/navigation.tsx`

**Step 1: 创建 ThemeProvider 组件**

创建 `src/components/theme-provider.tsx`：

```tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) setThemeState(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const applyDark = () => root.classList.add('dark');
    const applyLight = () => root.classList.remove('dark');

    if (theme === 'dark') {
      applyDark();
    } else if (theme === 'light') {
      applyLight();
    } else {
      // system
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.matches ? applyDark() : applyLight();
      const handler = (e: MediaQueryListEvent) => e.matches ? applyDark() : applyLight();
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('theme', t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

**Step 2: 在 layout.tsx 包裹 ThemeProvider**

修改 `src/app/layout.tsx`：
```tsx
import { ThemeProvider } from '@/components/theme-provider';

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, 'min-h-screen bg-background')}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

注意：`<html>` 加 `suppressHydrationWarning` 避免 SSR class 不匹配警告。

**Step 3: 在 Navigation 添加主题切换下拉菜单**

修改 `src/components/navigation.tsx`：

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';

type Theme = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(v => !v)}
        title="Toggle theme"
      >
        {/* Sun icon for light */}
        {theme === 'light' && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14A7 7 0 0012 5z" />
          </svg>
        )}
        {/* Moon icon for dark */}
        {theme === 'dark' && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
        {/* Monitor icon for system */}
        {theme === 'system' && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-md z-20 w-32 py-1">
            {THEME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setTheme(opt.value); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors ${theme === opt.value ? 'text-primary font-medium' : 'text-foreground'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Navigation() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/skills" className="text-xl font-bold">
          AI Skill Sync
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/skills">
            <Button variant="ghost">Skills</Button>
          </Link>
          <Link href="/skills/new">
            <Button variant="ghost">Import</Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost">Settings</Button>
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
```

**Step 4: Commit**
```bash
git add src/components/theme-provider.tsx src/app/layout.tsx src/components/navigation.tsx
git commit -m "feat: add light/dark/system theme toggle with localStorage persistence"
```

---

### Task 6: 验证所有功能正常

**Step 1: 启动开发服务器**
```bash
npm run dev
```

**Step 2: 验证清单**
- [ ] 技能卡上的 Agent 图标不可点击，仅显示同步状态
- [ ] 勾选技能后点"Sync N to Agents"弹出 Agent 选择弹窗
- [ ] 弹窗默认全选 4 个 Agent，可取消勾选，点"确认同步"执行
- [ ] 删除按钮正常工作，删除后技能消失
- [ ] 上传页面显示拖拽区域，可拖拽 ZIP 文件上传
- [ ] 点击拖拽区域也可以选择文件
- [ ] Base64 输入折叠在"Advanced"中
- [ ] Navigation 右侧有主题切换按钮
- [ ] Light / Dark / System 三种模式切换生效
- [ ] 刷新页面后主题偏好保持

**Step 3: 构建验证**
```bash
npm run build
```
Expected: 无 TypeScript 错误，构建成功。

**Step 4: 最终 Commit**
```bash
git add -A
git commit -m "chore: final verification build passes"
```

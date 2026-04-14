# Agent Unsync Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add ability to unsync (remove) skills from Agent platforms via single-icon clicks and batch operations.

**Architecture:** Extend existing sync API with `action: 'unsync'` that deletes symlinks/directories. Restore AgentIcon clickability with toggle behavior (gray→sync, colored→unsync). Add batch unsync button with agent selection modal.

**Tech Stack:** Next.js 14 App Router, TypeScript, Zustand, Node.js fs/exec

---

## Task 1: Backend - Add Unsync Action to API

**Files:**
- Modify: `src/app/api/sync/route.ts:29-180`

**Step 1: Add unsync action handler after sync action**

After line 180 (end of sync action), add:

```typescript
    if (action === 'unsync') {
      if (!skills || !platforms || platforms.length === 0) {
        return NextResponse.json({ error: 'Missing skills or platforms' }, { status: 400 });
      }
      
      const results: { skill: string; platform: string; status: string; error?: string }[] = [];
      
      for (const skillName of skills) {
        for (const platform of platforms as Platform[]) {
          const targetBase = PLATFORM_PATHS[platform];
          if (!targetBase) continue;
          
          const targetPath = join(homedir(), targetBase, skillName);
          
          try {
            const stats = await fs.lstat(targetPath).catch(() => null);
            
            if (!stats) {
              results.push({ skill: skillName, platform, status: 'skipped', error: 'Not synced' });
              continue;
            }
            
            if (stats.isSymbolicLink()) {
              await fs.unlink(targetPath);
              results.push({ skill: skillName, platform, status: 'success' });
            } else if (stats.isDirectory()) {
              await fs.rm(targetPath, { recursive: true, force: true });
              results.push({ skill: skillName, platform, status: 'success' });
            } else {
              results.push({ skill: skillName, platform, status: 'error', error: 'Unknown file type' });
            }
          } catch (error) {
            results.push({ 
              skill: skillName, 
              platform, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Failed to unsync' 
            });
          }
        }
      }
      
      return NextResponse.json({ results });
    }
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -v "sync/route.ts"`
Expected: No new errors

**Step 3: Commit backend changes**

```bash
git add src/app/api/sync/route.ts
git commit -m "feat(api): add unsync action to remove skills from agent platforms"
```

---

## Task 2: Store - Add unsyncFromPlatforms Method

**Files:**
- Modify: `src/stores/skill-store.ts:40-60`

**Step 1: Add unsyncFromPlatforms method after syncToPlatforms**

After the `syncToPlatforms` method (around line 50), add:

```typescript
  unsyncFromPlatforms: async (skillNames: string[], platforms: Platform[]) => {
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsync',
          skills: skillNames,
          platforms,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unsync skills');
      }

      return await response.json();
    } catch (error) {
      console.error('Unsync error:', error);
      throw error;
    }
  },
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -v "sync/route.ts"`
Expected: No new errors

**Step 3: Commit store changes**

```bash
git add src/stores/skill-store.ts
git commit -m "feat(store): add unsyncFromPlatforms method"
```

---

## Task 3: AgentIcon - Restore Clickability with Toggle Behavior

**Files:**
- Modify: `src/components/agent-icon.tsx:1-30`

**Step 1: Change AgentIcon from div to button, add click handler**

Replace the entire component with:

```typescript
'use client';

import { Platform } from '@/types/skill';

interface AgentIconProps {
  platform: Platform;
  isSynced: boolean;
  isLoading?: boolean;
  onClick?: () => void;
}

const PLATFORM_ICONS: Record<Platform, string> = {
  opencode: '🔧',
  claude: '🤖',
  'trace-cn': '🔍',
  cursor: '⚡',
};

export function AgentIcon({ platform, isSynced, isLoading, onClick }: AgentIconProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`w-6 h-6 flex items-center justify-center text-sm transition-all ${
        isLoading
          ? 'opacity-50 cursor-wait'
          : isSynced
          ? 'opacity-100 cursor-pointer hover:scale-110'
          : 'opacity-30 cursor-pointer hover:opacity-50'
      }`}
      title={`${isSynced ? 'Unsync from' : 'Sync to'} ${platform}`}
    >
      {isLoading ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        PLATFORM_ICONS[platform]
      )}
    </button>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -v "sync/route.ts"`
Expected: No new errors

**Step 3: Commit AgentIcon changes**

```bash
git add src/components/agent-icon.tsx
git commit -m "feat(ui): restore AgentIcon clickability with sync/unsync toggle"
```

---

## Task 4: Skills Page - Add Single Icon Click Handlers

**Files:**
- Modify: `src/app/skills/page.tsx:103-220`

**Step 1: Add loading state for individual icons**

After line 115 (`const [selectedAgents, setSelectedAgents] = ...`), add:

```typescript
  const [loadingIcons, setLoadingIcons] = useState<Record<string, Set<Platform>>>({});
```

**Step 2: Add handleIconClick function before openSyncModal**

Before the `openSyncModal` function (around line 186), add:

```typescript
  const handleIconClick = async (skillName: string, platform: Platform, isSynced: boolean) => {
    if (isSyncing) return;

    if (isSynced) {
      const confirmed = confirm(`Remove sync with ${platform}?`);
      if (!confirmed) return;

      setLoadingIcons(prev => ({
        ...prev,
        [skillName]: new Set([...(prev[skillName] || []), platform]),
      }));

      try {
        const result = await unsyncFromPlatforms([skillName], [platform]);
        const platformResults = result.results.filter((r: any) => r.platform !== 'local');
        const successCount = platformResults.filter((r: any) => r.status === 'success').length;
        const failedResults = platformResults.filter((r: any) => r.status === 'error');

        if (failedResults.length > 0) {
          alert(`Failed to unsync: ${failedResults[0].error || 'Unknown error'}`);
        } else if (successCount > 0) {
          setSyncedPlatforms(prev => ({
            ...prev,
            [skillName]: (prev[skillName] || []).filter(p => p !== platform),
          }));
        }
      } catch (e) {
        alert('Unsync failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
      } finally {
        setLoadingIcons(prev => {
          const next = { ...prev };
          next[skillName]?.delete(platform);
          if (next[skillName]?.size === 0) delete next[skillName];
          return next;
        });
      }
    } else {
      setLoadingIcons(prev => ({
        ...prev,
        [skillName]: new Set([...(prev[skillName] || []), platform]),
      }));

      try {
        const result = await syncToPlatforms([skillName], [platform]);
        const platformResults = result.results.filter((r: any) => r.platform !== 'local');
        const successCount = platformResults.filter((r: any) => r.status === 'success').length;

        if (successCount > 0) {
          setSyncedPlatforms(prev => ({
            ...prev,
            [skillName]: [...new Set([...(prev[skillName] || []), platform])],
          }));
        }
      } catch (e) {
        alert('Sync failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
      } finally {
        setLoadingIcons(prev => {
          const next = { ...prev };
          next[skillName]?.delete(platform);
          if (next[skillName]?.size === 0) delete next[skillName];
          return next;
        });
      }
    }
  };
```

**Step 3: Update AgentIcon usage in skill card**

Find the AgentIcon rendering (around line 350), replace with:

```typescript
                    <AgentIcon
                      key={platform}
                      platform={platform}
                      isSynced={syncedPlatforms[skill.name]?.includes(platform) || false}
                      isLoading={loadingIcons[skill.name]?.has(platform) || false}
                      onClick={() => handleIconClick(skill.name, platform, syncedPlatforms[skill.name]?.includes(platform) || false)}
                    />
```

**Step 4: Add unsyncFromPlatforms to store destructuring**

Update line 104 to include `unsyncFromPlatforms`:

```typescript
  const { skills, isLoading, error, fetchSkills, deleteSkill, syncToPlatforms, unsyncFromPlatforms, pushToGithub } = useSkillStore();
```

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -v "sync/route.ts"`
Expected: No new errors

**Step 6: Commit single icon click handlers**

```bash
git add src/app/skills/page.tsx
git commit -m "feat(ui): add single icon click to sync/unsync individual agents"
```

---

## Task 5: Skills Page - Add Batch Unsync Button and Modal

**Files:**
- Modify: `src/app/skills/page.tsx:115-220`

**Step 1: Add showUnsyncModal state**

After line 114 (`const [showSyncModal, setShowSyncModal] = ...`), add:

```typescript
  const [showUnsyncModal, setShowUnsyncModal] = useState(false);
```

**Step 2: Add openUnsyncModal function**

After the `openSyncModal` function (around line 190), add:

```typescript
  const openUnsyncModal = () => {
    if (selectedSkills.size === 0) return;
    
    // Only show agents that are synced for at least one selected skill
    const syncedAgents = new Set<Platform>();
    for (const skillName of Array.from(selectedSkills)) {
      const platforms = syncedPlatforms[skillName] || [];
      platforms.forEach(p => syncedAgents.add(p));
    }
    
    setSelectedAgents(syncedAgents);
    setShowUnsyncModal(true);
  };
```

**Step 3: Add handleUnsync function**

After the `handleSync` function (around line 220), add:

```typescript
  const handleUnsync = async () => {
    if (selectedSkills.size === 0 || selectedAgents.size === 0) return;
    setShowUnsyncModal(false);
    setIsSyncing(true);
    try {
      const selectedSkillsList = Array.from(selectedSkills);
      const agentsList = Array.from(selectedAgents);
      const result = await unsyncFromPlatforms(selectedSkillsList, agentsList);

      const platformResults = result.results.filter((r: any) => r.platform !== 'local');
      const successCount = platformResults.filter((r: any) => r.status === 'success').length;
      const failedResults = platformResults.filter((r: any) => r.status === 'error');

      if (failedResults.length > 0) {
        const failedMsg = failedResults
          .map((r: any) => `• ${r.skill} → ${r.platform}: ${r.error || 'Unknown error'}`)
          .join('\n');
        alert(`Unsynced ${successCount} skill(s) successfully.\n\nFailed (${failedResults.length}):\n${failedMsg}`);
      } else {
        alert(`Unsynced ${successCount} skill(s) from ${agentsList.join(', ')}`);
      }

      for (const skillName of selectedSkillsList) {
        const skillResults = result.results.filter((r: any) => r.skill === skillName);
        const removedPlatforms = skillResults
          .filter((r: any) => r.status === 'success')
          .map((r: any) => r.platform as Platform);
        setSyncedPlatforms(prev => ({
          ...prev,
          [skillName]: (prev[skillName] || []).filter(p => !removedPlatforms.includes(p)),
        }));
      }
    } catch (e) {
      alert('Unsync failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setIsSyncing(false);
      setSelectedSkills(new Set());
    }
  };
```

**Step 4: Add Unsync button in batch actions bar**

Find the batch actions section (around line 280), add button after "Sync to Agents":

```typescript
              <Button
                onClick={openUnsyncModal}
                disabled={isSyncing}
                variant="outline"
              >
                Unsync {selectedSkills.size} from Agents
              </Button>
```

**Step 5: Add Unsync modal after Sync modal**

After the Sync modal closing tag (around line 330), add:

```typescript
        {/* Unsync Modal */}
        {showUnsyncModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Select Agents to Unsync From</h3>
              <div className="space-y-3 mb-6">
                {SUPPORTED_PLATFORMS.map((platform) => (
                  <div key={platform} className="flex items-center gap-3">
                    <Checkbox
                      id={`unsync-agent-${platform}`}
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
                    <label htmlFor={`unsync-agent-${platform}`} className="text-sm font-medium cursor-pointer">
                      {PLATFORM_LABELS[platform]}
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowUnsyncModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUnsync} disabled={selectedAgents.size === 0}>
                  Unsync
                </Button>
              </div>
            </div>
          </div>
        )}
```

**Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -v "sync/route.ts"`
Expected: No new errors

**Step 7: Commit batch unsync feature**

```bash
git add src/app/skills/page.tsx
git commit -m "feat(ui): add batch unsync button and agent selection modal"
```

---

## Task 6: Manual Testing

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test single icon sync**

1. Navigate to http://localhost:3000/skills
2. Find a skill with gray agent icons
3. Click a gray icon → should show spinner → turn colored
4. Verify symlink created: `ls -la ~/.claude/skills/` (or other agent path)

**Step 3: Test single icon unsync**

1. Click the colored icon from step 2
2. Confirm the browser dialog
3. Icon should show spinner → turn gray
4. Verify symlink removed: `ls -la ~/.claude/skills/`

**Step 4: Test batch sync**

1. Select 2-3 skills with checkboxes
2. Click "Sync N to Agents"
3. Select 2 agents in modal
4. Click Sync
5. Verify alert shows correct count
6. Verify icons turn colored

**Step 5: Test batch unsync**

1. Keep skills selected from step 4
2. Click "Unsync N from Agents"
3. Modal should only show the 2 agents you synced to
4. Select them and click Unsync
5. Verify alert shows correct count
6. Verify icons turn gray

**Step 6: Test error handling**

1. Manually delete a symlink: `rm ~/.claude/skills/some-skill`
2. Try to unsync that skill via icon click
3. Should show "Not synced" (skipped, not error)

**Step 7: Stop dev server**

Press Ctrl+C

---

## Task 7: Build Verification

**Step 1: Run production build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds, no new errors in our modified files

**Step 2: Commit if any fixes needed**

If build revealed issues:
```bash
git add .
git commit -m "fix: resolve build errors in unsync feature"
```

---

## Completion Checklist

- [ ] Backend unsync action handles symlinks and directories
- [ ] Store has unsyncFromPlatforms method
- [ ] AgentIcon is clickable button with toggle behavior
- [ ] Single icon click syncs/unsyncs correctly
- [ ] Batch unsync button appears when skills selected
- [ ] Batch unsync modal filters to synced agents only
- [ ] State updates correctly after unsync operations
- [ ] Error messages display for failed operations
- [ ] Build passes without new errors

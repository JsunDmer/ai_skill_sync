# Agent Unsync Feature Design

**Date:** 2026-04-14  
**Status:** Approved

## Overview

Add the ability to unsync (remove) skills from Agent platforms. Currently users can only sync skills to agents but cannot remove them. This design adds both single-skill and batch unsync operations.

## User Requirements

- Agent icons on skill cards should be clickable: gray (not synced) → click to sync, colored (synced) → click to unsync
- Top batch operations should support both "Sync to Agents" and "Unsync from Agents"
- Unsync should remove symlinks or copied directories from agent skill folders

## Architecture

### 1. Skill Card Agent Icons

**Current State:** Icons are read-only `<div>` elements showing sync status (gray/colored).

**New Behavior:**

| State | Visual | Click Action |
|-------|--------|--------------|
| Not synced | Gray, `cursor-pointer` | Immediately sync to that agent, show spinner → turn colored |
| Synced | Colored, `cursor-pointer` | Show browser `confirm()` → delete symlink/folder → turn gray |
| Loading | Spinner | Disabled |

**Implementation:**
- Restore `AgentIcon` to `<button>` (reverts Task 2 changes)
- Add `onClick` handler that checks current sync state
- If not synced: call `syncToPlatforms([skillName], [platform])`
- If synced: show `confirm("Remove sync with {platform}?")` → call `unsyncFromPlatforms([skillName], [platform])`
- Add per-icon loading state to prevent double-clicks

### 2. Batch Operations

**Current State:** Top bar shows "Sync N to Agents" button when skills are selected.

**New UI:**

```
[Sync N to Agents]  [Unsync N from Agents]
```

Both buttons:
- Only appear when `selectedSkills.size > 0`
- Open modal to select target agents
- "Unsync" modal only shows agents that are synced for at least one selected skill

**Implementation:**
- Add `handleUnsyncModal()` function (mirrors `openSyncModal`)
- Add `showUnsyncModal` state
- Reuse agent selection modal pattern with different title/action
- Filter available agents: only show platforms where `syncedPlatforms[skill]` includes that platform for any selected skill

### 3. Backend API

**Endpoint:** `POST /api/sync`

**New Action:** `action: 'unsync'`

**Request:**
```json
{
  "action": "unsync",
  "skills": ["skill-name"],
  "platforms": ["claude", "cursor"]
}
```

**Logic:**
```ts
for each skill × platform:
  targetPath = ~/.{platform}/skills/{skillName}
  
  if not exists:
    results.push({ status: 'skipped', error: 'Not synced' })
  else if isSymlink(targetPath):
    fs.unlink(targetPath)
    results.push({ status: 'success' })
  else if isDirectory(targetPath):
    fs.rm(targetPath, { recursive: true })
    results.push({ status: 'success' })
```

**Response:** Same structure as sync action:
```json
{
  "results": [
    { "skill": "...", "platform": "...", "status": "success|error|skipped", "error": "..." }
  ]
}
```

### 4. Store Method

**New Method:** `unsyncFromPlatforms(skillNames: string[], platforms: Platform[])`

```ts
unsyncFromPlatforms: async (skillNames, platforms) => {
  const response = await fetch('/api/sync', {
    method: 'POST',
    body: JSON.stringify({ action: 'unsync', skills: skillNames, platforms })
  });
  return response.json();
}
```

Mirrors `syncToPlatforms` structure.

### 5. State Updates

After successful unsync:
- Update `syncedPlatforms` state: remove platform from `syncedPlatforms[skillName]` array
- Skill card icons automatically reflect new state (gray)
- Show alert with success/failure counts (reuse sync alert pattern)

## Error Handling

- If symlink/directory doesn't exist: return `status: 'skipped'` (not an error)
- If deletion fails (permissions): return `status: 'error'` with error message
- Frontend shows failed unsync operations in alert (same pattern as sync failures)

## Testing Considerations

- Test unsync of symlinked skills
- Test unsync of copied skills (fallback from failed symlink)
- Test unsync of non-existent skills (should skip gracefully)
- Test batch unsync with mixed sync states
- Test single-icon click unsync
- Test permission errors

## Implementation Order

1. Backend: Add `action: 'unsync'` handler to `/api/sync` route
2. Store: Add `unsyncFromPlatforms` method
3. Frontend: Restore `AgentIcon` clickability with sync/unsync toggle
4. Frontend: Add "Unsync from Agents" batch button and modal
5. Frontend: Update state management after unsync operations
6. Testing: Verify all unsync paths work correctly

## Non-Goals

- No undo/restore functionality (user can re-sync if needed)
- No confirmation for batch unsync (modal selection is the confirmation)
- No partial unsync UI (all-or-nothing per operation)

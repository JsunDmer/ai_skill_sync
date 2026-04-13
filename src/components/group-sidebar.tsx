'use client';

import { useState } from 'react';
import { useSkillStore } from '@/stores/skill-store';
import { SkillGroup } from '@/types/skill';
import { createGroup, addGroup, deleteGroup } from '@/lib/group-manager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Folder } from 'lucide-react';

interface GroupSidebarProps {
  selectedGroupId: string | null;
  onSelectGroup: (id: string | null) => void;
}

export function GroupSidebar({ selectedGroupId, onSelectGroup }: GroupSidebarProps) {
  const { skills } = useSkillStore();
  const [groups, setGroups] = useState<SkillGroup[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupTags, setNewGroupTags] = useState('');

  const allTags = Array.from(new Set(skills.flatMap(s => s.tags)));

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const tags = newGroupTags.split(',').map(t => t.trim()).filter(Boolean);
    const group = createGroup(newGroupName, tags);
    addGroup(group);
    setGroups([...groups, group]);
    setNewGroupName('');
    setNewGroupTags('');
    setIsCreating(false);
  };

  const handleDeleteGroup = (id: string) => {
    deleteGroup(id);
    setGroups(groups.filter(g => g.id !== id));
    if (selectedGroupId === id) {
      onSelectGroup(null);
    }
  };

  return (
    <div className="w-64 border-r bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Groups</h2>
        <Button variant="ghost" size="sm" onClick={() => setIsCreating(!isCreating)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {isCreating && (
        <div className="mb-4 p-3 bg-muted rounded-md space-y-2">
          <Label htmlFor="groupName">Group Name</Label>
          <Input
            id="groupName"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder="My Group"
          />
          <Label htmlFor="groupTags">Tags (comma separated)</Label>
          <Input
            id="groupTags"
            value={newGroupTags}
            onChange={e => setNewGroupTags(e.target.value)}
            placeholder="javascript, api"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreateGroup}>Create</Button>
            <Button size="sm" variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <button
          onClick={() => onSelectGroup(null)}
          className={`w-full text-left px-3 py-2 rounded-md text-sm ${
            selectedGroupId === null ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          }`}
        >
          All Skills
        </button>

        {groups.map(group => (
          <div key={group.id} className="flex items-center justify-between group">
            <button
              onClick={() => onSelectGroup(group.id)}
              className={`flex-1 text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 ${
                selectedGroupId === group.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <Folder className="h-4 w-4" />
              <span className="truncate">{group.name}</span>
              <span className="text-xs opacity-70">({group.tags.length})</span>
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100"
              onClick={() => handleDeleteGroup(group.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {allTags.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Tags</h3>
          <div className="flex flex-wrap gap-1">
            {allTags.map(tag => (
              <span key={tag} className="text-xs px-2 py-1 bg-secondary rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
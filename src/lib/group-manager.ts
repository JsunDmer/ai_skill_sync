import { SkillGroup } from '@/types/skill';

const STORAGE_KEY = 'ai-skill-groups';

export function getGroups(): SkillGroup[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveGroups(groups: SkillGroup[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

export function createGroup(name: string, tags: string[]): SkillGroup {
  return {
    id: `group-${Date.now()}`,
    name,
    tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function addGroup(group: SkillGroup): void {
  const groups = getGroups();
  groups.push(group);
  saveGroups(groups);
}

export function updateGroup(id: string, updates: Partial<Pick<SkillGroup, 'name' | 'tags'>>): void {
  const groups = getGroups();
  const index = groups.findIndex(g => g.id === id);
  if (index !== -1) {
    groups[index] = {
      ...groups[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveGroups(groups);
  }
}

export function deleteGroup(id: string): void {
  const groups = getGroups();
  const filtered = groups.filter(g => g.id !== id);
  saveGroups(filtered);
}

export function getGroupById(id: string): SkillGroup | undefined {
  const groups = getGroups();
  return groups.find(g => g.id === id);
}

export function getGroupsByTags(tags: string[]): SkillGroup[] {
  const groups = getGroups();
  return groups.filter(g => tags.some(tag => g.tags.includes(tag)));
}
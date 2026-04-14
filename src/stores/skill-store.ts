import { create } from 'zustand';
import { Skill, Platform, AppConfig, GitConfig } from '@/types/skill';

interface SkillStore {
  skills: Skill[];
  config: AppConfig;
  isLoading: boolean;
  error: string | null;
  
  fetchSkills: () => Promise<void>;
  addSkill: (skill: Skill) => Promise<void>;
  updateSkill: (name: string, skill: Partial<Skill>) => Promise<void>;
  deleteSkill: (name: string) => Promise<void>;
  getSkill: (name: string) => Skill | undefined;
  
  setConfig: (config: Partial<AppConfig>) => void;
  setGitConfig: (git: Partial<GitConfig>) => void;
  setSelectedPlatforms: (platforms: Platform[]) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  syncToPlatforms: (skillNames: string[], platforms: Platform[]) => Promise<{ results: { skill: string; platform: string; status: 'success' | 'error' | 'skipped'; error?: string }[] }>;
  unsyncFromPlatforms: (skillNames: string[], platforms: Platform[]) => Promise<{ results: { skill: string; platform: string; status: 'success' | 'error' | 'skipped'; error?: string }[] }>;
  pushToGithub: (githubConfig: { repoUrl: string; token: string; branch?: string }) => Promise<{ success: boolean; message?: string; error?: string }>;
}

const defaultConfig: AppConfig = {
  git: {
    repoUrl: '',
    token: '',
    branch: 'main',
  },
  selectedPlatforms: ['opencode', 'claude', 'trace-cn', 'cursor'],
};

export const useSkillStore = create<SkillStore>((set, get) => ({
  skills: [],
  config: defaultConfig,
  isLoading: false,
  error: null,

  fetchSkills: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/skills');
      const data = await res.json();
      if (data.error) {
        set({ error: data.error });
      } else {
        set({ skills: data.skills || [] });
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to fetch skills' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  addSkill: async (skill) => {
    // Import is handled by the page directly via API
  },
  
  updateSkill: async (name, updates) => {
    // Not needed for file-based storage
  },
  
  deleteSkill: async (name) => {
    try {
      const res = await fetch('/api/skills', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        await get().fetchSkills();
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to delete skill' });
    }
  },
  
  getSkill: (name) => get().skills.find((s) => s.name === name),
  
  setConfig: (config) => set((state) => ({
    config: { ...state.config, ...config },
  })),
  
  setGitConfig: (git) => set((state) => ({
    config: {
      ...state.config,
      git: { ...state.config.git, ...git },
    },
  })),
  
  setSelectedPlatforms: (platforms) => set((state) => ({
    config: { ...state.config, selectedPlatforms: platforms },
  })),
  
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  syncToPlatforms: async (skillNames, platforms) => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', skills: skillNames, platforms }),
      });
      const data = await res.json();
      set({ isLoading: false });
      return data;
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : 'Sync failed' });
      throw e;
    }
  },

  unsyncFromPlatforms: async (skillNames, platforms) => {
    set({ isLoading: true });
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
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Unsync failed' });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  pushToGithub: async (githubConfig) => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'github-push', githubConfig }),
      });
      const data = await res.json();
      set({ isLoading: false });
      return data;
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : 'GitHub push failed' });
      throw e;
    }
  },
}));
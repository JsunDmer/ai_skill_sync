export type Platform = 'opencode' | 'claude' | 'trace-cn' | 'cursor';

export interface SkillContent {
  filePath: string;
  content: string;
}

export interface Skill {
  name: string;
  description: string;
  platforms: Platform[];
  content: SkillContent;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SkillGroup {
  id: string;
  name: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SkillMetadata {
  name: string;
  description: string;
  tags: string[];
  platforms: Platform[];
  createdAt: string;
  updatedAt: string;
}

export interface PlatformSkill {
  platform: Platform;
  content: string;
  filePath: string;
  compatible: boolean;
}

export interface GitConfig {
  repoUrl: string;
  token: string;
  branch: string;
}

export interface AppConfig {
  git: GitConfig;
  selectedPlatforms: Platform[];
}

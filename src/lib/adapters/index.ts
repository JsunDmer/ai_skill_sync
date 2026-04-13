import { Skill, Platform, PlatformSkill } from '@/types/skill';
import { BaseAdapter } from './base-adapter';
import { OpenCodeAdapter } from './opencode-adapter';
import { ClaudeAdapter } from './claude-adapter';
import { TraceCNAdapter } from './trace-cn-adapter';
import { CursorAdapter } from './cursor-adapter';

const adapters: Record<Platform, BaseAdapter> = {
  opencode: new OpenCodeAdapter(),
  claude: new ClaudeAdapter(),
  'trace-cn': new TraceCNAdapter(),
  cursor: new CursorAdapter(),
};

export function transformSkill(skill: Skill, platform: Platform): PlatformSkill {
  const adapter = adapters[platform];
  return adapter.transform(skill);
}

export function validateForPlatform(content: string, platform: Platform): boolean {
  const adapter = adapters[platform];
  return adapter.validate(content);
}

export function getAllAdapters(): BaseAdapter[] {
  return Object.values(adapters);
}

export function getAdapter(platform: Platform): BaseAdapter {
  return adapters[platform];
}

export { BaseAdapter };
export { OpenCodeAdapter };
export { ClaudeAdapter };
export { TraceCNAdapter };
export { CursorAdapter };
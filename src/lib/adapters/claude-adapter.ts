import { Skill, Platform, PlatformSkill } from '@/types/skill';
import { BaseAdapter } from './base-adapter';

export class ClaudeAdapter extends BaseAdapter {
  platform: Platform = 'claude';
  name = 'Claude Code';

  transform(skill: Skill): PlatformSkill {
    const content = skill.content;
    const formattedContent = `// Skill: ${skill.name}\n// Platform: Claude Code\n\n${content.content}`;
    
    return {
      platform: this.platform,
      content: formattedContent,
      filePath: content.filePath,
      compatible: this.validate(formattedContent),
    };
  }

  validate(content: string): boolean {
    return content.length > 0;
  }
}
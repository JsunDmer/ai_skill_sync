import { Skill, Platform, PlatformSkill } from '@/types/skill';
import { BaseAdapter } from './base-adapter';

export class CursorAdapter extends BaseAdapter {
  platform: Platform = 'cursor';
  name = 'Cursor';

  transform(skill: Skill): PlatformSkill {
    const content = skill.content;
    const formattedContent = `/** ${skill.name} *\n * ${skill.description}\n */\n\n${content.content}`;
    
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
import { Skill, Platform, PlatformSkill } from '@/types/skill';
import { BaseAdapter } from './base-adapter';

export class TraceCNAdapter extends BaseAdapter {
  platform: Platform = 'trace-cn';
  name = 'Trace-CN';

  transform(skill: Skill): PlatformSkill {
    const content = skill.content;
    const formattedContent = content.content;
    
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
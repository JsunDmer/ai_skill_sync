import { Skill, Platform, PlatformSkill } from '@/types/skill';

export abstract class BaseAdapter {
  abstract platform: Platform;
  abstract name: string;

  abstract transform(skill: Skill): PlatformSkill;
  abstract validate(content: string): boolean;

  protected formatContent(content: { filePath: string; content: string }): PlatformSkill {
    const transformed = this.transformSkillContent(content);
    return {
      platform: this.platform,
      content: transformed,
      filePath: content.filePath,
      compatible: this.validate(transformed),
    };
  }

  protected transformSkillContent(content: { filePath: string; content: string }): string {
    return content.content;
  }
}
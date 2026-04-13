import { Skill, SkillMetadata } from '@/types/skill';

export function serializeSkill(skill: Skill): string {
  return JSON.stringify(skill, null, 2);
}

export function deserializeSkill(json: string): Skill {
  return JSON.parse(json) as Skill;
}

export function createSkillMetadata(skill: Skill): SkillMetadata {
  return {
    name: skill.name,
    description: skill.description,
    tags: skill.tags,
    platforms: skill.platforms,
    createdAt: skill.createdAt,
    updatedAt: skill.updatedAt,
  };
}

export function getSkillFileName(name: string): string {
  return `${name}.json`;
}

export function getSkillId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

export function generateTimestamp(): string {
  return new Date().toISOString();
}

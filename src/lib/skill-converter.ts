import { SkillsMPSkill } from './skillsmp-client';

export interface SKILLMetadata {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  source?: string;
  repo?: string;
}

export function convertSkillsMPSkillToSKILL(
  skill: SkillsMPSkill,
  content: string
): string {
  const metadata: SKILLMetadata = {
    name: skill.name,
    description: skill.description,
    source: 'skillsmp',
    repo: skill.repo,
    compatibility: 'opencode,claude,cursor',
  };

  let frontmatter = '---\n';
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined) {
      frontmatter += `${key}: ${value}\n`;
    }
  }
  frontmatter += '---\n\n';

  return frontmatter + content;
}

export function parseSkillName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
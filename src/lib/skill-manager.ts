import { Skill, Platform } from '@/types/skill';
import { generateTimestamp } from '@/lib/skill-utils';
import { getGitService } from './git-service';

export async function loadSkills(): Promise<Skill[]> {
  const git = getGitService();
  const files = await git.listFiles('skills');
  
  const skills: Skill[] = [];
  
  for (const file of files) {
    try {
      const content = await git.readFile(file);
      const skill = JSON.parse(content) as Skill;
      skills.push(skill);
    } catch (error) {
      console.error(`Failed to load skill from ${file}:`, error);
    }
  }
  
  return skills;
}

export async function addSkill(skillData: Omit<Skill, 'createdAt' | 'updatedAt'>): Promise<Skill> {
  const git = getGitService();
  const now = generateTimestamp();
  
  const skill: Skill = {
    ...skillData,
    createdAt: now,
    updatedAt: now,
  };
  
  const filePath = `skills/${skill.name}.json`;
  await git.writeFile(filePath, JSON.stringify(skill, null, 2));
  await git.commit(`Add skill: ${skill.name}`);
  
  return skill;
}

export async function updateSkill(name: string, updates: Partial<Skill>): Promise<Skill | null> {
  const git = getGitService();
  
  try {
    const filePath = `skills/${name}.json`;
    const content = await git.readFile(filePath);
    const skill = JSON.parse(content) as Skill;
    
    const updated: Skill = {
      ...skill,
      ...updates,
      updatedAt: generateTimestamp(),
    };
    
    await git.writeFile(filePath, JSON.stringify(updated, null, 2));
    await git.commit(`Update skill: ${name}`);
    
    return updated;
  } catch (error) {
    console.error(`Failed to update skill ${name}:`, error);
    return null;
  }
}

export async function deleteSkill(name: string): Promise<boolean> {
  const git = getGitService();
  
  try {
    const filePath = `skills/${name}.json`;
    await git.deleteFile(filePath);
    await git.commit(`Delete skill: ${name}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete skill ${name}:`, error);
    return false;
  }
}

export function getSkillByPlatform(skill: Skill, platform: Platform): string {
  const content = skill.content;
  
  switch (platform) {
    case 'opencode':
      return formatOpenCode(content);
    case 'claude':
      return formatClaude(content);
    case 'trace-cn':
      return formatTraceCN(content);
    case 'cursor':
      return formatCursor(content);
    default:
      return content.content;
  }
}

function formatOpenCode(content: { filePath: string; content: string }): string {
  return `# ${content.filePath}\n${content.content}`;
}

function formatClaude(content: { filePath: string; content: string }): string {
  return `// ${content.filePath}\n${content.content}`;
}

function formatTraceCN(content: { filePath: string; content: string }): string {
  return content.content;
}

function formatCursor(content: { filePath: string; content: string }): string {
  return content.content;
}
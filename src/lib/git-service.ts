import git from 'isomorphic-git';
import { GitConfig } from '@/types/skill';

export class GitService {
  private dir: string;
  private config: GitConfig | null = null;

  constructor(dir: string) {
    this.dir = dir;
  }

  async configure(config: GitConfig): Promise<void> {
    this.config = config;
  }

  async clone(url: string, token: string): Promise<void> {
    if (!this.config) {
      throw new Error('Git not configured');
    }
    console.log('Clone not implemented without fs/http clients');
  }

  async pull(): Promise<void> {
    if (!this.config) {
      throw new Error('Git not configured');
    }
    console.log('Pull not implemented');
  }

  async commit(message: string): Promise<void> {
    if (!this.config) {
      throw new Error('Git not configured');
    }
    console.log('Commit not implemented');
  }

  async readFile(path: string): Promise<string> {
    const fs = await import('fs/promises');
    return fs.readFile(`${this.dir}/${path}`, 'utf-8');
  }

  async writeFile(path: string, content: string): Promise<void> {
    const fs = await import('fs/promises');
    const filePath = `${this.dir}/${path}`;
    const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
    
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async deleteFile(path: string): Promise<void> {
    const fs = await import('fs/promises');
    const filePath = `${this.dir}/${path}`;
    await fs.unlink(filePath);
  }

  async listFiles(dir: string = ''): Promise<string[]> {
    const fs = await import('fs/promises');
    const targetDir = `${this.dir}/${dir}`.replace(/\/$/, '');
    
    try {
      const entries = await fs.readdir(targetDir, { withFileTypes: true });
      const files: string[] = [];
      
      for (const entry of entries) {
        const fullPath = dir ? `${dir}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          const subFiles = await this.listFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.name.endsWith('.json')) {
          files.push(fullPath);
        }
      }
      
      return files;
    } catch {
      return [];
    }
  }

  async push(): Promise<void> {
    if (!this.config) {
      throw new Error('Git not configured');
    }
    console.log('Push not implemented');
  }
}

let gitServiceInstance: GitService | null = null;

export function getGitService(): GitService {
  if (!gitServiceInstance) {
    gitServiceInstance = new GitService('/tmp/ai-skill-sync');
  }
  return gitServiceInstance;
}
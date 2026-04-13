import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import JSZip from 'jszip';
import { Skill, Platform } from '@/types/skill';

const SKILLS_DIR = (() => {
  const home = homedir();
  return join(home, '.skill-sync', 'skills');
})();

const PLATFORM_PATHS: Record<Platform, string> = {
  'opencode': '.config/opencode/skills',
  'claude': '.claude/skills',
  'trace-cn': '.trae-cn/skills',
  'cursor': '.cursor/skills',
};

function parseFrontmatter(content: string): { name?: string; description?: string; content: string; metadata?: Record<string, unknown> } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  
  const frontmatter = match[1];
  const body = content.slice(match[0].length).trim();
  
  const result: { name?: string; description?: string; content: string; metadata: Record<string, unknown> } = {
    content: body,
    metadata: {},
  };
  
  frontmatter.split('\n').forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) return;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    
    if (key === 'name') result.name = value;
    else if (key === 'description') result.description = value;
    else result.metadata[key] = value;
  });
  
  return result.name ? result : null;
}

function findSkillFolders(zip: JSZip): { folders: Map<string, JSZip.JSZipObject[]>, typeMap: Map<string, string> } {
  const folders = new Map<string, JSZip.JSZipObject[]>();
  const typeMap = new Map<string, string>();
  
  Object.entries(zip.files).forEach(([filename, data]) => {
    if (filename.includes('__MACOSX') || filename.includes('.DS_Store')) return;
    if (data.dir) return;
    
    const parts = filename.split('/').filter(Boolean);
    if (parts.length < 4) return;
    
    const typeFolder = parts[1];
    const skillFolder = parts[2];
    
    if (!folders.has(skillFolder)) {
      folders.set(skillFolder, []);
      typeMap.set(skillFolder, typeFolder);
    }
    folders.get(skillFolder)!.push(data);
  });
  
  return { folders, typeMap };
}

interface SkillMetadata {
  name: string;
  tag: string;
  createdAt: string;
}

export async function GET() {
  try {
    await fs.mkdir(SKILLS_DIR, { recursive: true });
    
    const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
    const skills: Skill[] = [];
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const skillPath = join(SKILLS_DIR, entry.name);
      const skillMdPath = join(skillPath, 'SKILL.md');
      const metadataPath = join(skillPath, 'metadata.json');
      
      let tag = entry.name;
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata: SkillMetadata = JSON.parse(metadataContent);
        tag = metadata.tag || entry.name;
      } catch (e) {
        // metadata.json doesn't exist, use folder name as tag
      }
      
      try {
        const content = await fs.readFile(skillMdPath, 'utf-8');
        const parsed = parseFrontmatter(content);
        
        if (!parsed || !parsed.name) continue;
        
        const stat = await fs.stat(skillPath);
        
        skills.push({
          name: parsed.name,
          description: parsed.description || '',
          platforms: [],
          content: {
            filePath: entry.name + '/',
            content: content,
          },
          tags: [tag],
          createdAt: stat.birthtime.toISOString(),
          updatedAt: stat.mtime.toISOString(),
        });
      } catch (e) {
        console.error(`Failed to read skill ${entry.name}:`, e);
      }
    }
    
    return NextResponse.json({ skills });
  } catch (error) {
    console.error('Failed to list skills:', error);
    return NextResponse.json({ error: 'Failed to list skills' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const zipFile = formData.get('file') as File | null;
    
    if (!zipFile) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    if (!zipFile.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'Only ZIP files supported' }, { status: 400 });
    }
    
    const arrayBuffer = await zipFile.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const { folders, typeMap } = findSkillFolders(zip);
    
    if (folders.size === 0) {
      return NextResponse.json({ error: 'No skill folders found in ZIP' }, { status: 400 });
    }
    
    const success: string[] = [];
    const failed: { filename: string; error: string }[] = [];
    
    for (const [folderName, files] of folders) {
      const skillMdFile = files.find(f => 
        f.name.endsWith('/SKILL.md') || 
        f.name.endsWith('/SKILL.MD') ||
        f.name.endsWith('/skill.md')
      );
      
      if (!skillMdFile) {
        failed.push({ filename: folderName, error: 'Missing SKILL.md file' });
        continue;
      }
      
      try {
        const content = await skillMdFile.async('string');
        const parsed = parseFrontmatter(content);
        
        if (!parsed || !parsed.name) {
          failed.push({ filename: `${folderName}/SKILL.md`, error: 'Invalid SKILL.md format' });
          continue;
        }
        
        const typeFolder = typeMap.get(folderName) || '';
        const skillDir = join(SKILLS_DIR, folderName);
        await fs.mkdir(skillDir, { recursive: true });
        
        const allFiles: string[] = [];
        for (const f of files) {
          if (f.name.includes('__MACOSX') || f.name.includes('.DS_Store')) continue;
          const fileContent = await f.async('string');
          const relativePath = f.name.split('/').slice(3).join('/');
          const targetPath = join(skillDir, relativePath);
          await fs.mkdir(join(targetPath, '..'), { recursive: true });
          await fs.writeFile(targetPath, fileContent);
          allFiles.push(relativePath);
        }
        
        const metadata: SkillMetadata = {
          name: parsed.name,
          tag: typeFolder,
          createdAt: new Date().toISOString(),
        };
        await fs.writeFile(join(skillDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
        
        success.push(folderName);
      } catch (e) {
        failed.push({ filename: folderName, error: e instanceof Error ? e.message : 'Unknown error' });
      }
    }
    
    return NextResponse.json({ success, failed });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed to import skills' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { name } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Missing skill name' }, { status: 400 });
    }
    
    const skillPath = join(SKILLS_DIR, name);
    const exists = await fs.access(skillPath).then(() => true).catch(() => false);
    
    if (!exists) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }
    
    await fs.rm(skillPath, { recursive: true, force: true });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete skill' }, { status: 500 });
  }
}
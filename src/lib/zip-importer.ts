import JSZip from 'jszip';
import { Skill } from '@/types/skill';

export interface ImportResult {
  success: Skill[];
  failed: { filename: string; error: string }[];
}

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

export async function parseZipFromFile(file: File): Promise<ImportResult> {
  const result: ImportResult = { success: [], failed: [] };
  
  try {
    const zip = await JSZip.loadAsync(file);
    const { folders, typeMap } = findSkillFolders(zip);
    
    if (folders.size === 0) {
      result.failed.push({ filename: '', error: 'No skill folders found in ZIP' });
      return result;
    }
    
    for (const [folderName, files] of folders) {
      const skillMdFile = files.find(f => 
        f.name.endsWith('/SKILL.md') || 
        f.name.endsWith('/SKILL.MD') ||
        f.name.endsWith('/skill.md')
      );
      
      if (!skillMdFile) {
        result.failed.push({ filename: folderName, error: `Folder "${folderName}" missing SKILL.md file` });
        continue;
      }
      
      try {
        const content = await skillMdFile.async('string');
        const parsed = parseFrontmatter(content);
        
        if (!parsed || !parsed.name) {
          result.failed.push({ filename: `${folderName}/SKILL.md`, error: 'Invalid SKILL.md format: no valid frontmatter with name' });
          continue;
        }
        
        const allContent: string[] = [];
        const typeFolder = typeMap.get(folderName) || '';
        for (const f of files) {
          if (f.name.includes('__MACOSX') || f.name.includes('.DS_Store')) continue;
          const fileContent = await f.async('string');
          allContent.push(`## ${f.name}\n\n${fileContent}\n`);
        }
        
        const skill: Skill = {
          name: parsed.name,
          description: parsed.description || '',
          content: {
            filePath: `${folderName}/`,
            content: allContent.join('\n\n'),
          },
          platforms: ['opencode'],
          tags: typeFolder ? [typeFolder] : (parsed.metadata ? Object.keys(parsed.metadata as object).map(k => `${k}:${(parsed.metadata as Record<string, unknown>)[k]}`) : []),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        result.success.push(skill);
      } catch (e) {
        result.failed.push({ filename: folderName, error: `Failed to parse: ${e instanceof Error ? e.message : 'Unknown error'}` });
      }
    }
  } catch (e) {
    result.failed.push({ filename: '', error: `Failed to read ZIP file: ${e instanceof Error ? e.message : 'Unknown error'}` });
  }
  
  return result;
}

export async function parseZipFromBase64(base64: string): Promise<ImportResult> {
  const result: ImportResult = { success: [], failed: [] };
  
  try {
    const binaryString = atob(base64.replace(/\s/g, ''));
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const zip = await JSZip.loadAsync(bytes);
    const { folders, typeMap } = findSkillFolders(zip);
    
    if (folders.size === 0) {
      result.failed.push({ filename: '', error: 'No skill folders found in ZIP' });
      return result;
    }
    
    for (const [folderName, files] of folders) {
      const skillMdFile = files.find(f => 
        f.name.endsWith('/SKILL.md') || 
        f.name.endsWith('/SKILL.MD') ||
        f.name.endsWith('/skill.md')
      );
      
      if (!skillMdFile) {
        result.failed.push({ filename: folderName, error: `Folder "${folderName}" missing SKILL.md file` });
        continue;
      }
      
        try {
        const content = await skillMdFile.async('string');
        const parsed = parseFrontmatter(content);
        
        if (!parsed || !parsed.name) {
          result.failed.push({ filename: `${folderName}/SKILL.md`, error: 'Invalid SKILL.md format' });
          continue;
        }
        
        const allContent: string[] = [];
        const typeFolder = typeMap.get(folderName) || '';
        for (const f of files) {
          if (f.name.includes('__MACOSX') || f.name.includes('.DS_Store')) continue;
          const fileContent = await f.async('string');
          allContent.push(`## ${f.name}\n\n${fileContent}\n`);
        }
        
        const skill: Skill = {
          name: parsed.name,
          description: parsed.description || '',
          content: {
            filePath: `${folderName}/`,
            content: allContent.join('\n\n'),
          },
          platforms: ['opencode'],
          tags: typeFolder ? [typeFolder] : (parsed.metadata ? Object.keys(parsed.metadata as object).map(k => `${k}:${(parsed.metadata as Record<string, unknown>)[k]}`) : []),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        result.success.push(skill);
      } catch (e) {
        result.failed.push({ filename: folderName, error: `Failed to parse: ${e instanceof Error ? e.message : 'Unknown error'}` });
      }
    }
  } catch (e) {
    result.failed.push({ filename: '', error: `Failed to parse Base64 ZIP data: ${e instanceof Error ? e.message : 'Unknown error'}` });
  }
  
  return result;
}
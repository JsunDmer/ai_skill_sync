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

  const lines = frontmatter.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) { i++; continue; }

    const key = line.slice(0, colonIdx).trim();
    const rawValue = line.slice(colonIdx + 1).trim();

    // 处理 YAML 块标量: description: | 或 description: |-
    if (rawValue === '|' || rawValue === '|-') {
      i++;
      const blockLines: string[] = [];
      // 收集后续缩进行
      while (i < lines.length && (lines[i].startsWith(' ') || lines[i].startsWith('\t'))) {
        blockLines.push(lines[i].trim());
        i++;
      }
      const blockValue = blockLines.join(' ').trim();
      if (key === 'name') result.name = blockValue;
      else if (key === 'description') result.description = blockValue;
      else result.metadata[key] = blockValue;
      continue;
    }

    if (key === 'name') result.name = rawValue;
    else if (key === 'description') result.description = rawValue;
    else result.metadata[key] = rawValue;
    i++;
  }

  return result.name ? result : null;
}

/**
 * 兼容两种 ZIP 结构：
 *   多技能包: root/type/skill/SKILL.md  (parts.length >= 4)
 *   单技能包: skill/SKILL.md 或 SKILL.md (parts.length 1-3)
 * 返回统一的 { folders, typeMap, sliceDepth }
 * sliceDepth 用于确定 relativePath 的起始层级
 */
function findSkillFolders(zip: JSZip, overrideTag?: string): {
  folders: Map<string, JSZip.JSZipObject[]>;
  typeMap: Map<string, string>;
  sliceDepthMap: Map<string, number>;
} {
  const folders = new Map<string, JSZip.JSZipObject[]>();
  const typeMap = new Map<string, string>();
  const sliceDepthMap = new Map<string, number>();

  const allFiles = Object.entries(zip.files).filter(([filename, data]) => {
    if (filename.includes('__MACOSX') || filename.includes('.DS_Store')) return false;
    if (data.dir) return false;
    return true;
  });

  // 检测是否有 SKILL.md（不区分大小写）
  const hasSkillMd = allFiles.some(([filename]) =>
    filename.split('/').pop()?.toLowerCase() === 'skill.md'
  );

  if (!hasSkillMd) return { folders, typeMap, sliceDepthMap };

  // 找到所有 SKILL.md 文件，从路径推断结构
  for (const [filename, data] of allFiles) {
    const parts = filename.split('/').filter(Boolean);
    const isSkillMd = parts[parts.length - 1]?.toLowerCase() === 'skill.md';
    if (!isSkillMd) continue;

    let skillFolder: string;
    let typeFolder: string;
    let sliceDepth: number;

    if (parts.length === 1) {
      // 结构: SKILL.md（根目录直接放）→ 用 ZIP 文件名作为文件夹名
      skillFolder = '__root__';
      typeFolder = overrideTag || '';
      sliceDepth = 0;
    } else if (parts.length === 2) {
      // 结构: skill-folder/SKILL.md（单技能 ZIP 主流格式）
      skillFolder = parts[0];
      typeFolder = overrideTag || '';
      sliceDepth = 1;
    } else if (parts.length === 3) {
      // 结构: type/skill/SKILL.md
      skillFolder = parts[1];
      typeFolder = overrideTag || parts[0];
      sliceDepth = 2;
    } else {
      // 结构: root/type/skill/SKILL.md（多技能包原有格式）
      skillFolder = parts[2];
      typeFolder = overrideTag || parts[1];
      sliceDepth = 3;
    }

    if (!folders.has(skillFolder)) {
      folders.set(skillFolder, []);
      typeMap.set(skillFolder, typeFolder);
      sliceDepthMap.set(skillFolder, sliceDepth);
    }
  }

  // 将所有文件分配到对应的技能文件夹
  for (const [, data] of allFiles) {
    const parts = data.name.split('/').filter(Boolean);

    for (const [skillFolder, , ] of [...folders.entries()]) {
      const sliceDepth = sliceDepthMap.get(skillFolder)!;
      const skillPartIndex = sliceDepth - 1;

      if (skillFolder === '__root__') {
        folders.get(skillFolder)!.push(data);
        break;
      }

      if (skillPartIndex >= 0 && parts[skillPartIndex] === skillFolder) {
        folders.get(skillFolder)!.push(data);
        break;
      }
    }
  }

  return { folders, typeMap, sliceDepthMap };
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
            filePath: entry.name,
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
    // 前端可传 tag 覆盖 ZIP 推断的类型
    const overrideTag = (formData.get('tag') as string | null) || undefined;

    if (!zipFile) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!zipFile.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'Only ZIP files supported' }, { status: 400 });
    }

    const arrayBuffer = await zipFile.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const { folders, typeMap, sliceDepthMap } = findSkillFolders(zip, overrideTag);

    if (folders.size === 0) {
      return NextResponse.json({ error: 'No skill folders found in ZIP. Make sure the ZIP contains a SKILL.md file.' }, { status: 400 });
    }

    const success: string[] = [];
    const failed: { filename: string; error: string }[] = [];

    for (const [folderName, files] of folders) {
      const sliceDepth = sliceDepthMap.get(folderName) ?? 3;

      const skillMdFile = files.find(f =>
        f.name.split('/').pop()?.toLowerCase() === 'skill.md'
      );

      if (!skillMdFile) {
        failed.push({ filename: folderName, error: 'Missing SKILL.md file' });
        continue;
      }

      try {
        const content = await skillMdFile.async('string');
        const parsed = parseFrontmatter(content);

        if (!parsed || !parsed.name) {
          failed.push({ filename: `${folderName}/SKILL.md`, error: 'Invalid SKILL.md format (missing name in frontmatter)' });
          continue;
        }

        const typeFolder = typeMap.get(folderName) || '';
        // 使用 folderName 作为目录名（__root__ 时用 ZIP 文件名去掉 .zip）
        const dirName = folderName === '__root__'
          ? zipFile.name.replace(/\.zip$/i, '')
          : folderName;
        const skillDir = join(SKILLS_DIR, dirName);

        // 同名替换：先删除旧目录，再重建
        const exists = await fs.access(skillDir).then(() => true).catch(() => false);
        if (exists) {
          await fs.rm(skillDir, { recursive: true, force: true });
        }
        await fs.mkdir(skillDir, { recursive: true });

        // 写入所有文件，relativePath 从 sliceDepth 层开始
        for (const f of files) {
          if (f.name.includes('__MACOSX') || f.name.includes('.DS_Store')) continue;
          const fileParts = f.name.split('/').filter(Boolean);
          const relativePath = fileParts.slice(sliceDepth).join('/');
          if (!relativePath) continue; // 跳过空路径（目录条目）
          const targetPath = join(skillDir, relativePath);
          await fs.mkdir(join(targetPath, '..'), { recursive: true });
          const fileContent = await f.async('nodebuffer');
          await fs.writeFile(targetPath, fileContent);
        }

        const metadata: SkillMetadata = {
          name: parsed.name,
          tag: typeFolder,
          createdAt: new Date().toISOString(),
        };
        await fs.writeFile(join(skillDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

        success.push(dirName);
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
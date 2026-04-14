import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { exec } from 'child_process';
import { Platform } from '@/types/skill';

const SKILLS_DIR = join(homedir(), '.skill-sync', 'skills');

const PLATFORM_PATHS: Record<Platform, string> = {
  'opencode': '.config/opencode/skills',
  'claude': '.claude/skills',
  'trace-cn': '.trae-cn/skills',
  'cursor': '.cursor/skills',
};

function execPromise(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { encoding: 'utf-8' }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    const { action, skills, platforms, githubConfig } = await request.json();
    
    if (action === 'sync') {
      if (!skills || !platforms || platforms.length === 0) {
        return NextResponse.json({ error: 'Missing skills or platforms' }, { status: 400 });
      }
      
      const results: { skill: string; platform: string; status: string; error?: string; method?: string }[] = [];
      
      for (const skillName of skills) {
        const sourcePath = join(SKILLS_DIR, skillName);
        
        const sourceExists = await fs.access(sourcePath).then(() => true).catch(() => false);
        if (!sourceExists) {
          results.push({ skill: skillName, platform: 'local', status: 'error', error: 'Skill not found in ~/.skill-sync/skills' });
          continue;
        }
        
        results.push({ skill: skillName, platform: 'local', status: 'success' });
        
        for (const platform of platforms as Platform[]) {
          const targetBase = PLATFORM_PATHS[platform];
          if (!targetBase) continue;
          
          const targetDir = join(homedir(), targetBase, skillName);
          const targetExists = await fs.access(targetDir).then(() => true).catch(() => false);
          
          if (targetExists) {
            results.push({ skill: skillName, platform, status: 'skipped', error: 'Already exists' });
            continue;
          }
          
          try {
            const parentDir = join(targetDir, '..');
            await fs.mkdir(parentDir, { recursive: true });
            
            // 首先尝试创建符号链接
            try {
              await execPromise(`ln -s "${sourcePath}" "${targetDir}"`);
              results.push({ skill: skillName, platform, status: 'success', method: 'symlink' });
            } catch (symlinkError) {
              // 符号链接失败，尝试复制文件
              const errorMsg = symlinkError instanceof Error ? symlinkError.message : '';
              
              // 如果是因为已存在，跳过
              if (errorMsg.includes('EEXIST') || errorMsg.includes('File exists')) {
                results.push({ skill: skillName, platform, status: 'skipped', error: 'Already exists' });
                continue;
              }
              
              // 尝试复制文件作为备选方案
              try {
                await fs.cp(sourcePath, targetDir, { recursive: true });
                results.push({ skill: skillName, platform, status: 'success', method: 'copy' });
              } catch (copyError) {
                const copyErrorMsg = copyError instanceof Error ? copyError.message : 'Unknown error';
                if (copyErrorMsg.includes('Permission denied') || copyErrorMsg.includes('EACCES')) {
                  results.push({ 
                    skill: skillName, 
                    platform, 
                    status: 'error', 
                    error: `权限不足: 无法同步到 ${targetDir}。请确保有权限访问该目录，或尝试手动复制技能文件夹。` 
                  });
                } else {
                  results.push({ 
                    skill: skillName, 
                    platform, 
                    status: 'error', 
                    error: `同步失败: ${copyErrorMsg}` 
                  });
                }
              }
            }
          } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error';
            results.push({ skill: skillName, platform, status: 'error', error: errorMsg });
          }
        }
      }
      
      return NextResponse.json({ results });
    }

    if (action === 'unsync') {
      if (!skills || !platforms || platforms.length === 0) {
        return NextResponse.json({ error: 'Missing skills or platforms' }, { status: 400 });
      }

      const results: { skill: string; platform: string; status: string; error?: string; method?: string }[] = [];

      for (const skillName of skills) {
        for (const platform of platforms as Platform[]) {
          const targetBase = PLATFORM_PATHS[platform];
          if (!targetBase) continue;

          const targetPath = join(homedir(), targetBase, skillName);

          try {
            const stats = await fs.lstat(targetPath).catch(() => null);

            if (!stats) {
              results.push({ skill: skillName, platform, status: 'skipped', error: 'Not synced' });
              continue;
            }

            if (stats.isSymbolicLink()) {
              await fs.unlink(targetPath);
              results.push({ skill: skillName, platform, status: 'success' });
            } else if (stats.isDirectory()) {
              await fs.rm(targetPath, { recursive: true, force: true });
              results.push({ skill: skillName, platform, status: 'success' });
            } else {
              results.push({ skill: skillName, platform, status: 'error', error: 'Unknown file type' });
            }
          } catch (error) {
            results.push({
              skill: skillName,
              platform,
              status: 'error',
              error: error instanceof Error ? error.message : 'Failed to unsync'
            });
          }
        }
      }

      return NextResponse.json({ results });
    }

    if (action === 'github-push') {
      if (!githubConfig?.repoUrl || !githubConfig?.token) {
        return NextResponse.json({ error: 'Missing GitHub config' }, { status: 400 });
      }
      
      const skillsPath = join(homedir(), '.skill-sync');
      const gitDir = join(skillsPath, '.git');
      const gitExists = await fs.access(gitDir).then(() => true).catch(() => false);
      
      let gitRepoDir = skillsPath;
      
      if (!gitExists) {
        const repoName = githubConfig.repoUrl.split('/').pop()?.replace('.git', '') || 'skills';
        const tempDir = join(homedir(), '.skill-sync', 'github-sync-temp');
        await fs.mkdir(tempDir, { recursive: true });
        
        await execPromise(`cd "${tempDir}" && git init`);
        await execPromise(`cd "${tempDir}" && git config user.email "ai-skill-sync@local"`);
        await execPromise(`cd "${tempDir}" && git config user.name "AI Skill Sync"`);
        
        const remoteUrl = githubConfig.repoUrl.replace('https://', `https://${githubConfig.token}@`);
        await execPromise(`cd "${tempDir}" && git remote add origin "${remoteUrl}"`);
        
        gitRepoDir = tempDir;
      }
      
      try {
        await fs.cp(SKILLS_DIR, join(gitRepoDir, 'skills'), { recursive: true });
      } catch (e) {
        if (!githubConfig.repoUrl) {
          const srcDir = join(SKILLS_DIR);
          const files = await fs.readdir(srcDir);
          for (const file of files) {
            const src = join(srcDir, file);
            const dest = join(gitRepoDir, 'skills', file);
            await fs.cp(src, dest, { recursive: true });
          }
        }
      }
      
      await execPromise(`cd "${gitRepoDir}" && git add .`);
      
      try {
        await execPromise(`cd "${gitRepoDir}" && git commit -m "Update skills from AI Skill Sync"`);
      } catch (e) {
        const output = e instanceof Error ? e.message : '';
        if (!output.includes('nothing to commit')) {
          throw e;
        }
      }
      
      try {
        await execPromise(`cd "${gitRepoDir}" && git push -u origin ${githubConfig.branch || 'main'} --force`);
      } catch (e) {
        return NextResponse.json({ error: 'Failed to push to GitHub: ' + (e instanceof Error ? e.message : 'Unknown error') }, { status: 500 });
      }
      
      return NextResponse.json({ success: true, message: 'Successfully pushed to GitHub' });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const skillName = url.searchParams.get('name');
    
    if (!skillName) {
      return NextResponse.json({ error: 'Missing skill name' }, { status: 400 });
    }
    
    const skillDir = join(SKILLS_DIR, skillName);
    const exists = await fs.access(skillDir).then(() => true).catch(() => false);
    
    if (!exists) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }
    
    const entries = await fs.readdir(skillDir, { withFileTypes: true });
    const files: { name: string; isDirectory: boolean }[] = [];
    
    for (const entry of entries) {
      if (entry.name === '.git') continue;
      files.push({ name: entry.name, isDirectory: entry.isDirectory() });
    }
    
    const links: { platform: string; path: string; linked: boolean }[] = [];
    
    for (const [platform, relativePath] of Object.entries(PLATFORM_PATHS)) {
      const targetPath = join(homedir(), relativePath, skillName);
      const isLinked = await fs.lstat(targetPath).then(stat => stat.isSymbolicLink()).catch(() => false);
      links.push({ platform, path: targetPath, linked: isLinked });
    }
    
    return NextResponse.json({ name: skillName, files, links });
  } catch (error) {
    console.error('Get skill error:', error);
    return NextResponse.json({ error: 'Failed to get skill info' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const SKILLS_DIR = join(homedir(), '.skill-sync', 'skills');

export async function POST(request: NextRequest) {
  try {
    const { name, content } = await request.json();

    if (!name || !content) {
      return NextResponse.json(
        { error: 'Missing name or content' },
        { status: 400 }
      );
    }

    const skillDir = join(SKILLS_DIR, name);
    await fs.mkdir(skillDir, { recursive: true });

    const skillPath = join(skillDir, 'SKILL.md');
    await fs.writeFile(skillPath, content);

    return NextResponse.json({ success: true, path: skillPath });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
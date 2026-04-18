export interface SkillsMPSkill {
  id: string;
  name: string;
  author: string;
  repo: string;
  description: string;
  stars: number;
  updatedAt: string;
  githubUrl?: string;
  category?: string;
  occupation?: string;
}

export interface SearchParams {
  query: string;
  page?: number;
  limit?: number;
  sortBy?: 'stars' | 'recent';
  category?: string;
  occupation?: string;
}

export interface SearchResult {
  skills: SkillsMPSkill[];
  total: number;
}

export interface SkillsMPConfig {
  apiKey: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://skillsmp.com/api/v1';

export function getConfig(): SkillsMPConfig | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('skillsmp_config');
  return stored ? JSON.parse(stored) : null;
}

export function setConfig(config: SkillsMPConfig): void {
  if (typeof window !== 'undefined') {
    console.log('Saving config:', config);
    localStorage.setItem('skillsmp_config', JSON.stringify(config));
  }
}

export async function searchSkills(params: SearchParams): Promise<SearchResult> {
  const config = getConfig();
  if (!config?.apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  const { query, page = 1, limit = 20, sortBy, category, occupation } = params;
  const searchParams = new URLSearchParams({
    q: query,
    page: page.toString(),
    limit: Math.min(limit, 100).toString(),
    apiKey: config.apiKey,
  });

  if (sortBy) searchParams.set('sortBy', sortBy);
  if (category) searchParams.set('category', category);
  if (occupation) searchParams.set('occupation', occupation);

  const proxyUrl = `/api/skillsmp?${searchParams}`;
  const response = await fetch(proxyUrl);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (error.error?.code === 'MISSING_API_KEY') {
      throw new Error('MISSING_API_KEY');
    }
    if (error.error?.code === 'INVALID_API_KEY') {
      throw new Error('INVALID_API_KEY');
    }
    if (error.error?.code === 'DAILY_QUOTA_EXCEEDED') {
      throw new Error('DAILY_QUOTA_EXCEEDED');
    }
    throw new Error(`API_ERROR: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    skills: data.data || [],
    total: data.total || 0,
  };
}

export async function aiSearchSkills(query: string, limit = 20): Promise<SearchResult> {
  const config = getConfig();
  if (!config?.apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  const searchParams = new URLSearchParams({
    q: query,
    limit: Math.min(limit, 100).toString(),
  });

  const response = await fetch(
    `${config.baseUrl || DEFAULT_BASE_URL}/skills/ai-search?${searchParams}`,
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (error.error?.code === 'MISSING_API_KEY') {
      throw new Error('MISSING_API_KEY');
    }
    if (error.error?.code === 'INVALID_API_KEY') {
      throw new Error('INVALID_API_KEY');
    }
    if (error.error?.code === 'DAILY_QUOTA_EXCEEDED') {
      throw new Error('DAILY_QUOTA_EXCEEDED');
    }
    throw new Error(`API_ERROR: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    skills: data.data || [],
    total: data.total || 0,
  };
}

export async function getSkillContent(owner: string, repo: string): Promise<string> {
  const cleanOwner = owner.replace(/\.git$/, '');
  const cleanRepo = repo.replace(/\.git$/, '').replace(/^tree\/[^/]+\//, '');
  
  if (!cleanOwner || !cleanRepo) {
    throw new Error('SKILL_NOT_FOUND');
  }
  
  const response = await fetch(
    `https://raw.githubusercontent.com/${cleanOwner}/${cleanRepo}/main/SKILL.md`
  );

  if (!response.ok) {
    const masterResponse = await fetch(
      `https://raw.githubusercontent.com/${cleanOwner}/${cleanRepo}/master/SKILL.md`
    );
    if (!masterResponse.ok) {
      throw new Error('SKILL_NOT_FOUND');
    }
    return masterResponse.text();
  }

  return response.text();
}

export function extractRepoInfo(repoString: string): { owner: string; repo: string } {
  if (!repoString) {
    return { owner: '', repo: '' };
  }
  
  const match = repoString.match(/github\.com[/:]([^/]+)[/]([^/]+)/);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  
  const parts = repoString.split('/');
  return {
    owner: parts[0] || '',
    repo: parts[1] || '',
  };
}
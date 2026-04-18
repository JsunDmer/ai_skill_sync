'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { SkillSearch } from '@/components/SkillSearch';
import { SkillCard } from '@/components/SkillCard';
import { SkillPreview } from '@/components/SkillPreview';
import {
  searchSkills,
  aiSearchSkills,
  getSkillContent,
  extractRepoInfo,
  SkillsMPSkill,
  getConfig,
} from '@/lib/skillsmp-client';
import { convertSkillsMPSkillToSKILL } from '@/lib/skill-converter';

export default function ImportPage() {
  const [skills, setSkills] = useState<SkillsMPSkill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillsMPSkill | null>(null);
  const [previewContent, setPreviewContent] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);

  useEffect(() => {
    const config = getConfig();
    if (!config?.apiKey) {
      setHasApiKey(false);
      setError('请先设置 SkillsMP API Key');
    }
  }, []);

  const handleSearch = async (query: string, isAI: boolean) => {
    if (!hasApiKey) {
      setError('请先设置 SkillsMP API Key');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSkills([]);

    try {
      let result;
      if (isAI) {
        result = await aiSearchSkills(query);
      } else {
        result = await searchSkills({ query, sortBy: 'stars' });
      }
      setSkills(result.skills);
    } catch (e) {
      setError(e instanceof Error ? e.message : '搜索失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async (skill: SkillsMPSkill) => {
    setSelectedSkill(skill);
    setIsPreviewLoading(true);
    setPreviewContent('');

    try {
      const { owner, repo } = extractRepoInfo(skill.repo);
      const content = await getSkillContent(owner, repo);
      setPreviewContent(content);
    } catch {
      setPreviewContent('无法加载技能内容');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleImport = async (skill: SkillsMPSkill) => {
    try {
      const { owner, repo } = extractRepoInfo(skill.repo);
      const content = await getSkillContent(owner, repo);
      const skillContent = convertSkillsMPSkillToSKILL(skill, content);

      const response = await fetch('/api/skills/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: skill.name,
          content: skillContent,
        }),
      });

      if (!response.ok) {
        throw new Error('导入失败');
      }

      alert('导入成功！');
      setSelectedSkill(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : '导入失败');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">外部技能导入</h1>
        <Link
          href="/settings"
          className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
        >
          <Settings className="w-4 h-4" />
          API 设置
        </Link>
      </div>

      <SkillSearch onSearch={handleSearch} isLoading={isLoading} />

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      {skills.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onPreview={handlePreview}
              onImport={handleImport}
            />
          ))}
        </div>
      )}

      {!isLoading && skills.length === 0 && !error && (
        <div className="mt-8 text-center text-gray-500">
          <p>输入关键词搜索技能</p>
          <div className="mt-2 flex gap-2 justify-center">
            {['react', 'python', 'docker', 'testing', 'security'].map((tag) => (
              <button
                key={tag}
                onClick={() => handleSearch(tag, false)}
                className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <SkillPreview
        skill={selectedSkill}
        content={previewContent}
        isLoading={isPreviewLoading}
        onClose={() => setSelectedSkill(null)}
        onImport={handleImport}
      />
    </div>
  );
}
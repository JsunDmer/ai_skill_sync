'use client';

import { SkillsMPSkill } from '@/lib/skillsmp-client';
import { Star, FolderOpen } from 'lucide-react';

interface SkillCardProps {
  skill: SkillsMPSkill;
  onPreview: (skill: SkillsMPSkill) => void;
  onImport: (skill: SkillsMPSkill) => void;
}

export function SkillCard({ skill, onPreview, onImport }: SkillCardProps) {
  const repoDisplay = skill.repo 
    ? skill.repo.replace(/^https:\/\/github\.com\//, '').replace(/\/tree\/[^/]+/, '')
    : skill.author + '/' + skill.name;
  
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-lg truncate">{skill.name}</h3>
          <p className="text-sm text-gray-500 truncate" title={skill.repo}>
            <FolderOpen className="w-3 h-3 inline" />
            {repoDisplay}
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm whitespace-nowrap ml-2">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span>{formatStars(skill.stars)}</span>
        </div>
      </div>
      <p className="mt-2 text-gray-600 line-clamp-2">{skill.description}</p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onPreview(skill)}
          className="flex-1 px-3 py-1.5 border rounded hover:bg-gray-200"
        >
          预览
        </button>
        <button
          onClick={() => onImport(skill)}
          className="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          导入
        </button>
      </div>
    </div>
  );
}

function formatStars(stars: number): string {
  if (stars >= 1000) {
    return (stars / 1000).toFixed(1) + 'k';
  }
  return stars.toString();
}
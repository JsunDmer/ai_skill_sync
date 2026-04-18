'use client';

import { SkillsMPSkill } from '@/lib/skillsmp-client';
import { Star, FolderOpen, X } from 'lucide-react';

interface SkillPreviewProps {
  skill: SkillsMPSkill | null;
  content: string;
  isLoading: boolean;
  onClose: () => void;
  onImport: (skill: SkillsMPSkill) => void;
}

export function SkillPreview({
  skill,
  content,
  isLoading,
  onClose,
  onImport,
}: SkillPreviewProps) {
  if (!skill) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-start justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-medium">{skill.name}</h2>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <FolderOpen className="w-3 h-3" />
              {skill.repo}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 border-b">
          <div className="flex gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              {skill.stars}
            </span>
            <span className="flex items-center gap-1">
              <FolderOpen className="w-4 h-4" />
              {skill.repo}
            </span>
            {skill.category && (
              <span className="px-2 py-0.5 bg-gray-100 rounded">类别: {skill.category}</span>
            )}
          </div>
        </div>
        <div className="p-4 overflow-auto max-h-[50vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-gray-500">加载中...</span>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded overflow-x-auto">
              {content}
            </pre>
          )}
        </div>
        <div className="p-4 border-t">
          <button
            onClick={() => onImport(skill)}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            导入到本地
          </button>
        </div>
      </div>
    </div>
  );
}
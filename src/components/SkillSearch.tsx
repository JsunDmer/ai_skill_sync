'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

interface SkillSearchProps {
  onSearch: (query: string, isAI: boolean) => void;
  isLoading?: boolean;
}

export function SkillSearch({ onSearch, isLoading }: SkillSearchProps) {
  const [query, setQuery] = useState('');
  const [isAI, setIsAI] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), isAI);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索技能..."
            className="w-full px-4 py-2 pl-10 border rounded-lg"
            disabled={isLoading}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <button
          type="button"
          onClick={() => setIsAI(!isAI)}
          className={`px-4 py-2 rounded-lg border ${
            isAI ? 'bg-purple-500 text-white' : 'bg-gray-100'
          }`}
          disabled={isLoading}
        >
          AI 搜索
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? '搜索中...' : '搜索'}
        </button>
      </div>
    </form>
  );
}
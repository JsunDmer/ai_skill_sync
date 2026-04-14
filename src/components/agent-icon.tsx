'use client';

import { Platform } from '@/types/skill';

interface AgentIconProps {
  platform: Platform;
  isSynced: boolean;
  isLoading?: boolean;
  onClick?: () => void;
}

const PLATFORM_ICONS: Record<Platform, string> = {
  opencode: '🔧',
  claude: '🤖',
  'trace-cn': '🔍',
  cursor: '⚡',
};

export function AgentIcon({ platform, isSynced, isLoading, onClick }: AgentIconProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`w-6 h-6 flex items-center justify-center text-sm transition-all ${
        isLoading
          ? 'opacity-50 cursor-wait'
          : isSynced
          ? 'opacity-100 cursor-pointer hover:scale-110'
          : 'opacity-30 cursor-pointer hover:opacity-50'
      }`}
      title={`${isSynced ? 'Unsync from' : 'Sync to'} ${platform}`}
    >
      {isLoading ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        PLATFORM_ICONS[platform]
      )}
    </button>
  );
}

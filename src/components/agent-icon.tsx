'use client';

import { Platform } from '@/types/skill';

interface AgentIconProps {
  platform: Platform;
  isSynced: boolean;
  isLoading?: boolean;
  onClick?: () => void;
}

const PLATFORM_ICONS: Record<Platform, { src: string; color: string }> = {
  opencode: {
    src: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/opencode.svg',
    color: '#1a1a2e',
  },
  claude: {
    src: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/claude.svg',
    color: '#D97757',
  },
  'trace-cn': {
    src: '',
    color: '#10B981',
  },
  cursor: {
    src: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/cursor.svg',
    color: '#10B981',
  },
};

export function AgentIcon({ platform, isSynced, isLoading, onClick }: AgentIconProps) {
  const icon = PLATFORM_ICONS[platform];

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`w-6 h-6 flex items-center justify-center transition-all ${
        isLoading
          ? 'opacity-50 cursor-wait'
          : isSynced
          ? 'opacity-100 cursor-pointer hover:scale-110'
          : 'opacity-40 cursor-pointer hover:opacity-60'
      }`}
      title={`${isSynced ? 'Unsync from' : 'Sync to'} ${platform}`}
      style={{ color: isSynced ? icon.color : undefined }}
    >
      {isLoading ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : platform === 'trace-cn' ? (
        <svg width="16" height="16" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" fill="#10B981"/>
          <path d="M12 7v5l3 2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <img src={icon.src} alt={platform} width={16} height={16} />
      )}
    </button>
  );
}

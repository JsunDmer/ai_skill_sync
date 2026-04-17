'use client';

import { Platform } from '@/types/skill';
import { OpenCode, Claude, Cursor } from '@lobehub/icons';

interface AgentIconProps {
  platform: Platform;
  isSynced: boolean;
  isLoading?: boolean;
  onClick?: () => void;
}

const PLATFORM_CONFIG: Record<Platform, { icon: React.ReactNode; color: string }> = {
  opencode: {
    icon: <OpenCode size={16} />,
    color: '#1a1a2e',
  },
  claude: {
    icon: <Claude.Color size={16} />,
    color: '#D97757',
  },
  'trace-cn': {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="#6366F1"/>
        <path d="M12 7v5l3 2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#6366F1',
  },
  cursor: {
    icon: <Cursor.Color size={16} />,
    color: '#10B981',
  },
};

export function AgentIcon({ platform, isSynced, isLoading, onClick }: AgentIconProps) {
  const config = PLATFORM_CONFIG[platform];

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
      style={{ color: isSynced ? config.color : undefined }}
    >
      {isLoading ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        config.icon
      )}
    </button>
  );
}

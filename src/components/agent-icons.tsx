'use client';

import { Platform } from '@/types/skill';
import { cn } from '@/lib/utils';
import { OpenCode, Claude, Cursor } from '@lobehub/icons';

interface AgentIconProps {
  platform: Platform;
  isSynced: boolean;
  className?: string;
}

const PLATFORM_CONFIG: Record<Platform, { name: string; icon: React.ReactNode; color: string }> = {
  opencode: {
    name: 'OpenCode',
    icon: <OpenCode size={16} />,
    color: '#1a1a2e',
  },
  claude: {
    name: 'Claude Code',
    icon: <Claude.Color size={16} />,
    color: '#D97757',
  },
  'trace-cn': {
    name: 'Trace CN',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="#6366F1"/>
        <path d="M12 7v5l3 2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#6366F1',
  },
  cursor: {
    name: 'Cursor',
    icon: <Cursor size={16} />,
    color: '#10B981',
  },
};

export function AgentIcon({ platform, isSynced, className }: AgentIconProps) {
  const config = PLATFORM_CONFIG[platform];

  return (
    <div
      className={cn(
        'flex items-center justify-center w-7 h-7 rounded-md',
        isSynced
          ? `${config.color} bg-current/10`
          : 'text-muted-foreground bg-muted',
        className
      )}
      title={`${config.name}${isSynced ? ' (已同步)' : ' (未同步)'}`}
    >
      {config.icon}
    </div>
  );
}

interface AgentIconGroupProps {
  platforms: Platform[];
  syncedPlatforms: Platform[];
  className?: string;
}

export function AgentIconGroup({
  platforms,
  syncedPlatforms,
  className,
}: AgentIconGroupProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {platforms.map((platform) => (
        <AgentIcon
          key={platform}
          platform={platform}
          isSynced={syncedPlatforms.includes(platform)}
        />
      ))}
    </div>
  );
}

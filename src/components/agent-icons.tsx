'use client';

import { Platform } from '@/types/skill';
import { cn } from '@/lib/utils';

interface AgentIconProps {
  platform: Platform;
  isSynced: boolean;
  className?: string;
}

const PLATFORM_CONFIG: Record<Platform, { name: string; src: string; color: string }> = {
  opencode: {
    name: 'OpenCode',
    src: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/opencode.svg',
    color: '#1a1a2e',
  },
  claude: {
    name: 'Claude Code',
    src: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/claude.svg',
    color: '#D97757',
  },
  'trace-cn': {
    name: 'Trace CN',
    src: '',
    color: '#10B981',
  },
  cursor: {
    name: 'Cursor',
    src: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/cursor.svg',
    color: '#10B981',
  },
};

export function AgentIconBadge({ platform, isSynced, className }: AgentIconProps) {
  const config = PLATFORM_CONFIG[platform];

  return (
    <div
      className={cn(
        'flex items-center justify-center w-7 h-7 rounded-md',
        isSynced
          ? 'bg-[color-mix(in_srgb,_var(--icon-color)_12%,_transparent)]'
          : 'text-muted-foreground bg-muted',
        className
      )}
      style={{ '--icon-color': config.color } as React.CSSProperties}
      title={`${config.name}${isSynced ? ' (已同步)' : ' (未同步)'}`}
    >
      {platform === 'trace-cn' ? (
        <svg width="16" height="16" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" fill="#10B981"/>
          <path d="M12 7v5l3 2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <img src={config.src} alt={config.name} width={16} height={16} />
      )}
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
        <AgentIconBadge
          key={platform}
          platform={platform}
          isSynced={syncedPlatforms.includes(platform)}
        />
      ))}
    </div>
  );
}

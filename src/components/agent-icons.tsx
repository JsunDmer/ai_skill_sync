'use client';

import { Platform } from '@/types/skill';
import { cn } from '@/lib/utils';

interface AgentIconProps {
  platform: Platform;
  isSynced: boolean;
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
}

const PLATFORM_CONFIG: Record<Platform, { name: string; icon: React.ReactNode; color: string }> = {
  opencode: {
    name: 'OpenCode',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4">
        <rect x="2" y="2" width="20" height="20" rx="4" fill="#1a1a1a"/>
        <rect x="6" y="6" width="12" height="12" rx="1" fill="none" stroke="white" strokeWidth="1.5"/>
        <rect x="9" y="9" width="6" height="6" rx="0.5" fill="white" opacity="0.3"/>
      </svg>
    ),
    color: 'text-[#1a1a1a]',
  },
  claude: {
    name: 'Claude Code',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4">
        <path fill="#C15F3C" d="M12 1.5C12.4 1.5 12.8 1.8 12.9 2.2L14.2 7.3L18.5 5.2C18.9 5 19.3 5.1 19.6 5.4C19.9 5.7 20 6.1 19.8 6.5L17.7 10.8L22.8 12.1C23.2 12.2 23.5 12.6 23.5 13C23.5 13.4 23.2 13.8 22.8 13.9L17.7 15.2L19.8 19.5C20 19.9 19.9 20.3 19.6 20.6C19.3 20.9 18.9 21 18.5 20.8L14.2 18.7L12.9 23.8C12.8 24.2 12.4 24.5 12 24.5C11.6 24.5 11.2 24.2 11.1 23.8L9.8 18.7L5.5 20.8C5.1 21 4.7 20.9 4.4 20.6C4.1 20.3 4 19.9 4.2 19.5L6.3 15.2L1.2 13.9C0.8 13.8 0.5 13.4 0.5 13C0.5 12.6 0.8 12.2 1.2 12.1L6.3 10.8L4.2 6.5C4 6.1 4.1 5.7 4.4 5.4C4.7 5.1 5.1 5 5.5 5.2L9.8 7.3L11.1 2.2C11.2 1.8 11.6 1.5 12 1.5Z"/>
      </svg>
    ),
    color: 'text-[#C15F3C]',
  },
  'trace-cn': {
    name: 'Trace CN',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4">
        <circle cx="12" cy="12" r="10" fill="none" stroke="#8B5CF6" strokeWidth="1.5"/>
        <path d="M12 6v6l4 2" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: 'text-[#8B5CF6]',
  },
  cursor: {
    name: 'Cursor',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4">
        <path fill="#10B981" d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"/>
      </svg>
    ),
    color: 'text-[#10B981]',
  },
};

export function AgentIcon({ platform, isSynced, isLoading, onClick, className }: AgentIconProps) {
  const config = PLATFORM_CONFIG[platform];

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        'flex items-center justify-center w-7 h-7 rounded-md transition-all duration-200',
        'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1',
        isSynced
          ? `${config.color} bg-current/10 hover:bg-current/20 focus:ring-current`
          : 'text-muted-foreground bg-muted hover:bg-muted/80 hover:text-foreground focus:ring-ring',
        isLoading && 'opacity-50 cursor-not-allowed',
        className
      )}
      title={`${config.name}${isSynced ? ' (已同步)' : ' (点击同步)'}`}
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

interface AgentIconGroupProps {
  platforms: Platform[];
  syncedPlatforms: Platform[];
  loadingPlatforms?: Platform[];
  onSync?: (platform: Platform) => void;
  className?: string;
}

export function AgentIconGroup({
  platforms,
  syncedPlatforms,
  loadingPlatforms = [],
  onSync,
  className,
}: AgentIconGroupProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {platforms.map((platform) => (
        <AgentIcon
          key={platform}
          platform={platform}
          isSynced={syncedPlatforms.includes(platform)}
          isLoading={loadingPlatforms.includes(platform)}
          onClick={() => onSync?.(platform)}
        />
      ))}
    </div>
  );
}

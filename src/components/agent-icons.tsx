'use client';

import { Platform } from '@/types/skill';
import { cn } from '@/lib/utils';

interface AgentIconProps {
  platform: Platform;
  isSynced: boolean;
  className?: string;
}

const PLATFORM_CONFIG: Record<Platform, { name: string; icon: React.ReactNode; color: string }> = {
  opencode: {
    name: 'OpenCode',
    icon: (
      <svg viewBox="0 0 28 28" className="w-4 h-4">
        <rect x="2" y="2" width="24" height="24" rx="5" fill="#1a1a2e"/>
        <path d="M7 18 L14 8 L21 18" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10 13 L14 18 L18 13" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      </svg>
    ),
    color: 'text-[#1a1a2e]',
  },
  claude: {
    name: 'Claude Code',
    icon: (
      <svg viewBox="0 0 32 32" className="w-4 h-4">
        <path fill="#D97706" d="M16 2C16.5 2 16.9 2.3 17 2.8L18.5 9.5L23.8 6.8C24.3 6.5 24.8 6.7 25.2 7.1C25.6 7.5 25.7 8 25.4 8.5L22.8 14L27.5 16C28 16.2 28.4 16.7 28.4 17.2C28.4 17.7 28 18.2 27.5 18.4L22.8 20.5L25.4 26C25.7 26.5 25.6 27 25.2 27.4C24.8 27.8 24.3 28 23.8 27.7L18.5 25L17 31.2C16.9 31.7 16.5 32 16 32C15.5 32 15.1 31.7 15 31.2L13.5 25L8.2 27.7C7.7 28 7.2 27.8 6.8 27.4C6.4 27 6.3 26.5 6.6 26L9.2 20.5L4.5 18.4C4 18.2 3.6 17.7 3.6 17.2C3.6 16.7 4 16.2 4.5 16L9.2 14L6.6 8.5C6.3 8 6.4 7.5 6.8 7.1C7.2 6.7 7.7 6.5 8.2 6.8L13.5 9.5L15 2.8C15.1 2.3 15.5 2 16 2Z" transform="scale(0.9) translate(1.6, 1.6)"/>
      </svg>
    ),
    color: 'text-[#D97706]',
  },
  'trace-cn': {
    name: 'Trace CN',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4">
        <defs>
          <linearGradient id="traceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#6366F1"/>
            <stop offset="100%" style="stop-color:#8B5CF6"/>
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="9" fill="url(#traceGrad)"/>
        <path d="M12 7v5l3 2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: 'text-[#6366F1]',
  },
  cursor: {
    name: 'Cursor',
    icon: (
      <svg viewBox="0 0 28 28" className="w-4 h-4">
        <defs>
          <linearGradient id="cursorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#10B981"/>
            <stop offset="100%" style="stop-color:#059669"/>
          </linearGradient>
        </defs>
        <path fill="url(#cursorGrad)" d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"/>
      </svg>
    ),
    color: 'text-[#10B981]',
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

import { Id } from '../../../convex/_generated/dataModel';
import {
  ChatCircle,
  Lightning,
  Gear,
  Warning,
  Robot,
} from '@phosphor-icons/react';

/**
 * AgentFeedItem
 *
 * Single activity entry in the agent feed.
 * Shows agent badge, action icon, summary, and timestamp.
 */

interface AgentFeedItemProps {
  entry: {
    _id: Id<'activityLog'>;
    actionType: string;
    summary: string;
    agentId?: Id<'agents'>;
    timestamp: number;
  };
  agentName?: string;
  agentAvatar?: string;
}

const ACTION_ICONS: Record<string, typeof ChatCircle> = {
  chat_message: ChatCircle,
  api_chat: Lightning,
  setup_complete: Gear,
  error: Warning,
};

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function AgentFeedItem({ entry, agentName, agentAvatar }: AgentFeedItemProps) {
  const Icon = ACTION_ICONS[entry.actionType] || Lightning;

  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) 0',
        borderBottom: '1px solid var(--border)',
        alignItems: 'flex-start',
      }}
    >
      {/* Agent badge */}
      {entry.agentId && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-sm)',
            background: agentAvatar || 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--bg-primary)',
            flexShrink: 0,
          }}
        >
          <Robot size={14} weight="fill" />
        </div>
      )}

      {/* Action icon */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          flexShrink: 0,
        }}
      >
        <Icon size={14} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {agentName && (
          <span
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginRight: 'var(--space-2)',
            }}
          >
            {agentName}
          </span>
        )}
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-secondary)',
            lineHeight: 'var(--leading-normal)',
          }}
        >
          {entry.summary}
        </span>
      </div>

      {/* Timestamp */}
      <span
        style={{
          fontSize: '10px',
          color: 'var(--text-secondary)',
          flexShrink: 0,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {formatTime(entry.timestamp)}
      </span>
    </div>
  );
}

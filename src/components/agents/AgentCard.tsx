import { Id } from '../../../convex/_generated/dataModel';
import { AgentControls } from './AgentControls';
import { useNavigate } from 'react-router-dom';
import { Robot } from '@phosphor-icons/react';

/**
 * AgentCard
 *
 * Status card for a single agent. Shows name, model, status,
 * inline controls, and links to detail page.
 */

interface AgentCardProps {
  agent: {
    _id: Id<'agents'>;
    name: string;
    description?: string;
    model: string;
    modelProvider: string;
    status: string;
    mode: string;
    avatar?: string;
    isDefault: boolean;
  };
}

const STATUS_COLORS: Record<string, string> = {
  running: 'var(--success)',
  paused: 'var(--warning)',
  idle: 'var(--accent)',
  error: 'var(--error)',
};

export function AgentCard({ agent }: AgentCardProps) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        transition: 'var(--transition-fast)',
        cursor: 'pointer',
      }}
      onClick={() => navigate(`/syncboard/agents/${agent._id}`)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {/* Header row: avatar + name + status dot */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            background: agent.avatar || 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--bg-primary)',
            flexShrink: 0,
          }}
        >
          <Robot size={18} weight="fill" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {agent.name}
            </span>
            {agent.isDefault && (
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--text-primary)',
                  color: 'var(--bg-primary)',
                  fontWeight: 500,
                }}
              >
                default
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {agent.modelProvider}/{agent.model}
          </div>
        </div>

        {/* Status dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 'var(--radius-full)',
            background: STATUS_COLORS[agent.status] || 'var(--accent)',
            flexShrink: 0,
          }}
          title={agent.status}
        />
      </div>

      {/* Description */}
      {agent.description && (
        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-secondary)',
            margin: 0,
            lineHeight: 'var(--leading-normal)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {agent.description}
        </p>
      )}

      {/* Status + mode badges */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          {agent.status}
        </span>
        <span
          style={{
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          {agent.mode.replace('_', ' ')}
        </span>
      </div>

      {/* Controls */}
      <div onClick={(e) => e.stopPropagation()}>
        <AgentControls
          agentId={agent._id}
          status={agent.status}
          mode={agent.mode}
          compact
        />
      </div>
    </div>
  );
}

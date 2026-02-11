import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import {
  Play,
  Pause,
  ArrowClockwise,
  Crosshair,
  Brain,
} from '@phosphor-icons/react';
import { useState } from 'react';

/**
 * AgentControls
 *
 * Inline control buttons for agent mode/status:
 * - Run (auto), Pause, Restart, Single Task, Think to Continue
 */

interface AgentControlsProps {
  agentId: Id<'agents'>;
  status: string;
  mode: string;
  compact?: boolean;
}

export function AgentControls({
  agentId,
  status,
  mode,
  compact = false,
}: AgentControlsProps) {
  const updateMode = useMutation(api.agents.updateMode);
  const updateStatus = useMutation(api.agents.updateStatus);
  const [isPending, setIsPending] = useState(false);

  const handleAction = async (
    action: 'auto' | 'paused' | 'single_task' | 'think_to_continue' | 'restart'
  ) => {
    if (isPending) return;
    setIsPending(true);
    try {
      if (action === 'restart') {
        await updateStatus({ agentId, status: 'idle' });
        await updateMode({ agentId, mode: 'auto' });
      } else {
        await updateMode({ agentId, mode: action });
        if (action === 'auto') {
          await updateStatus({ agentId, status: 'running' });
        }
      }
    } finally {
      setIsPending(false);
    }
  };

  const iconSize = compact ? 14 : 16;
  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: compact ? '2px' : '4px',
    padding: compact ? '4px 6px' : '6px 10px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-primary)',
    color: 'var(--text-secondary)',
    fontSize: compact ? 'var(--text-xs)' : 'var(--text-sm)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    opacity: isPending ? 0.5 : 1,
  };

  const activeStyle = (isActive: boolean): React.CSSProperties => ({
    ...btnBase,
    ...(isActive && {
      background: 'var(--text-primary)',
      color: 'var(--bg-primary)',
      borderColor: 'var(--text-primary)',
    }),
  });

  return (
    <div
      style={{
        display: 'flex',
        gap: compact ? '4px' : '6px',
        flexWrap: 'wrap',
      }}
    >
      <button
        style={activeStyle(mode === 'auto')}
        onClick={() => handleAction('auto')}
        title="Run automatically"
        disabled={isPending}
      >
        <Play size={iconSize} weight="fill" />
        {!compact && 'Run'}
      </button>
      <button
        style={activeStyle(mode === 'paused' || status === 'paused')}
        onClick={() => handleAction('paused')}
        title="Pause agent"
        disabled={isPending}
      >
        <Pause size={iconSize} weight="fill" />
        {!compact && 'Pause'}
      </button>
      <button
        style={btnBase}
        onClick={() => handleAction('restart')}
        title="Restart agent"
        disabled={isPending}
      >
        <ArrowClockwise size={iconSize} />
        {!compact && 'Restart'}
      </button>
      <button
        style={activeStyle(mode === 'single_task')}
        onClick={() => handleAction('single_task')}
        title="Do one task then pause"
        disabled={isPending}
      >
        <Crosshair size={iconSize} />
        {!compact && 'One Task'}
      </button>
      <button
        style={activeStyle(mode === 'think_to_continue')}
        onClick={() => handleAction('think_to_continue')}
        title="Think, then wait for approval"
        disabled={isPending}
      >
        <Brain size={iconSize} />
        {!compact && 'Think'}
      </button>
    </div>
  );
}

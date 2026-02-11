import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { CaretDown, Robot } from '@phosphor-icons/react';
import { useState, useRef, useEffect } from 'react';

/**
 * AgentSelector
 *
 * Dropdown to choose which agent to chat with.
 * Shows status dot next to each agent name.
 * Defaults to the default agent if no selection.
 */

interface AgentSelectorProps {
  selectedAgentId: Id<'agents'> | null;
  onSelect: (agentId: Id<'agents'>) => void;
}

const STATUS_COLORS: Record<string, string> = {
  running: 'var(--success)',
  paused: 'var(--warning)',
  idle: 'var(--accent)',
  error: 'var(--error)',
};

export function AgentSelector({ selectedAgentId, onSelect }: AgentSelectorProps) {
  const agents = useQuery(api.agents.list);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!agents || agents.length <= 1) return null;

  const selected = agents.find((a: any) => a._id === selectedAgentId) || agents.find((a: any) => a.isDefault) || agents[0];

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: '6px 10px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontSize: 'var(--text-sm)',
          cursor: 'pointer',
          transition: 'var(--transition-fast)',
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: 'var(--radius-full)',
            background: STATUS_COLORS[selected?.status || 'idle'] || 'var(--accent)',
          }}
        />
        <Robot size={14} />
        <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.name || 'Select Agent'}
        </span>
        <CaretDown size={12} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            minWidth: 200,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 'var(--z-dropdown)' as any,
            overflow: 'hidden',
          }}
        >
          {agents.map((agent: any) => (
            <button
              key={agent._id}
              onClick={() => {
                onSelect(agent._id);
                setIsOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background:
                  agent._id === selected?._id
                    ? 'var(--bg-hover)'
                    : 'transparent',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  agent._id === selected?._id ? 'var(--bg-hover)' : 'transparent';
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 'var(--radius-full)',
                  background: STATUS_COLORS[agent.status] || 'var(--accent)',
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {agent.name}
              </span>
              {agent.isDefault && (
                <span
                  style={{
                    fontSize: '9px',
                    padding: '1px 4px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--text-primary)',
                    color: 'var(--bg-primary)',
                  }}
                >
                  default
                </span>
              )}
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {agent.modelProvider}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
// Multi-agent feed page
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';
import { AgentFeedItem } from '../components/agents/AgentFeedItem';

/**
 * SyncBoardAgentFeed
 *
 * Combined activity feed from all agents with agent filter.
 * Real-time updates via Convex subscriptions.
 */

export function SyncBoardAgentFeed() {
  const agents = useQuery(api.agents.list);
  const allActivity = useQuery(api.activityLog.list, { limit: 200 });
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());

  // Build agent name lookup
  const agentMap = new Map<string, { name: string; avatar?: string }>();
  agents?.forEach((a: any) => agentMap.set(a._id, { name: a.name, avatar: a.avatar }));

  // Filter activity by selected agents
  const filteredActivity = allActivity?.filter((entry: any) => {
    if (selectedAgentIds.size === 0) return true; // Show all when no filter
    return entry.agentId && selectedAgentIds.has(entry.agentId);
  });

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  };

  return (
    <SyncBoardLayout>
      <div style={{ padding: 'var(--space-4)' }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h1
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Agent Feed
          </h1>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              margin: 0,
              marginTop: 'var(--space-1)',
            }}
          >
            Combined activity from all agents
          </p>
        </div>

        {/* Agent filter chips */}
        {agents && agents.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              flexWrap: 'wrap',
              marginBottom: 'var(--space-4)',
            }}
          >
            <button
              onClick={() => setSelectedAgentIds(new Set())}
              style={{
                padding: '4px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-full)',
                background: selectedAgentIds.size === 0 ? 'var(--text-primary)' : 'transparent',
                color: selectedAgentIds.size === 0 ? 'var(--bg-primary)' : 'var(--text-secondary)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
              }}
            >
              All
            </button>
            {agents.map((agent: any) => (
              <button
                key={agent._id}
                onClick={() => toggleAgent(agent._id)}
                style={{
                  padding: '4px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-full)',
                  background: selectedAgentIds.has(agent._id)
                    ? 'var(--text-primary)'
                    : 'transparent',
                  color: selectedAgentIds.has(agent._id)
                    ? 'var(--bg-primary)'
                    : 'var(--text-secondary)',
                  fontSize: 'var(--text-xs)',
                  cursor: 'pointer',
                }}
              >
                {agent.name}
              </button>
            ))}
          </div>
        )}

        {/* Activity list */}
        <div>
          {!filteredActivity ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
              Loading activity...
            </div>
          ) : filteredActivity.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-8)',
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-sm)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              No activity recorded yet.
            </div>
          ) : (
            filteredActivity.map((entry: any) => {
              const agentInfo = entry.agentId
                ? agentMap.get(entry.agentId)
                : undefined;
              return (
                <AgentFeedItem
                  key={entry._id}
                  entry={entry}
                  agentName={agentInfo?.name}
                  agentAvatar={agentInfo?.avatar}
                />
              );
            })
          )}
        </div>
      </div>
    </SyncBoardLayout>
  );
}

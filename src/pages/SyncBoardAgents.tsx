import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';
import { AgentCard } from '../components/agents/AgentCard';
import { Plus } from '@phosphor-icons/react';

/**
 * SyncBoardAgents
 *
 * Grid view of all agents with create button.
 * Each card shows status, model, controls.
 */

export function SyncBoardAgents() {
  const agents = useQuery(api.agents.list);
  const souls = useQuery(api.souls.list);
  const createAgent = useMutation(api.agents.create);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState('claude-sonnet-4-20250514');
  const [modelProvider, setModelProvider] = useState('anthropic');
  const [soulId, setSoulId] = useState<string>('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createAgent({
      name: name.trim(),
      description: description.trim() || undefined,
      model,
      modelProvider,
      soulId: soulId ? (soulId as any) : undefined,
    });
    setName('');
    setDescription('');
    setShowCreate(false);
  };

  return (
    <SyncBoardLayout>
      <div style={{ padding: 'var(--space-4)' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-4)',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Agents
            </h1>
            <p
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-secondary)',
                margin: 0,
                marginTop: 'var(--space-1)',
              }}
            >
              {agents?.length ?? 0} agent{agents?.length !== 1 ? 's' : ''} configured
            </p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: '8px 16px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: 'var(--text-primary)',
              color: 'var(--bg-primary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Plus size={16} weight="bold" />
            New Agent
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              Create New Agent
            </div>
            <input
              type="text"
              placeholder="Agent name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <select
                value={modelProvider}
                onChange={(e) => setModelProvider(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 120,
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
                <option value="xai">xAI</option>
                <option value="opencode-zen">OpenCode Zen</option>
              </select>
              <input
                type="text"
                placeholder="Model ID"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{
                  flex: 2,
                  minWidth: 180,
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                  outline: 'none',
                }}
              />
            </div>
            {/* Soul selection */}
            {souls && souls.length > 0 && (
              <select
                value={soulId}
                onChange={(e) => setSoulId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <option value="">No shared soul</option>
                {souls.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  background: !name.trim() ? 'var(--accent)' : 'var(--text-primary)',
                  color: 'var(--bg-primary)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  cursor: !name.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                Create Agent
              </button>
            </div>
          </div>
        )}

        {/* Agent grid */}
        {!agents ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-8)',
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-sm)',
            }}
          >
            Loading agents...
          </div>
        ) : agents.length === 0 ? (
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
            No agents configured yet. Create your first agent to get started.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 'var(--space-3)',
            }}
          >
            {agents.map((agent: any) => (
              <AgentCard key={agent._id} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </SyncBoardLayout>
  );
}

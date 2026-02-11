import { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';

/**
 * SyncBoard Memory Page (Supermemory)
 *
 * Configure and manage persistent agent memory via Supermemory.
 * Requires SUPERMEMORY_API_KEY environment variable.
 */
export function SyncBoardMemory() {
  const config = useQuery(api.supermemory.getConfig);
  const updateConfig = useMutation(api.supermemory.updateConfig);
  const addMemory = useAction(api.supermemoryActions.addMemory);
  const searchMemories = useAction(api.supermemoryActions.searchMemories);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ content: string; score?: number }>>([]);
  const [newMemory, setNewMemory] = useState('');
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery) return;
    setSearching(true);
    try {
      const result = await searchMemories({ query: searchQuery, limit: 10 });
      const results = (result.results ?? []).map((r: any) => ({
        content: r.content ?? '',
        score: r.score,
      }));
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMemory = async () => {
    if (!newMemory) return;
    setAdding(true);
    try {
      await addMemory({ content: newMemory });
      setNewMemory('');
    } catch (err) {
      console.error('Failed to add memory:', err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <SyncBoardLayout title="Memory">
      <div style={{ maxWidth: 900 }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
          Persistent agent memory powered by Supermemory. The agent remembers context across
          conversations for more personalized responses.
        </p>

        {/* Configuration */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Configuration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config?.enabled ?? false}
                onChange={(e) => updateConfig({ enabled: e.target.checked })}
              />
              <span>Enable Supermemory</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config?.autoStoreConversations ?? true}
                onChange={(e) => updateConfig({ autoStoreConversations: e.target.checked })}
              />
              <span>Auto-store conversations</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config?.autoInjectContext ?? true}
                onChange={(e) => updateConfig({ autoInjectContext: e.target.checked })}
              />
              <span>Auto-inject context into agent</span>
            </label>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>Max memories per query</label>
              <input
                type="number"
                className="input"
                value={config?.maxMemoriesPerQuery ?? 5}
                onChange={(e) => updateConfig({ maxMemoriesPerQuery: parseInt(e.target.value) || 5 })}
                min={1}
                max={20}
                style={{ width: 80 }}
              />
            </div>
          </div>
        </div>

        {/* Add Memory */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Add Memory</h3>
          <textarea
            className="input"
            value={newMemory}
            onChange={(e) => setNewMemory(e.target.value)}
            placeholder="Enter information for the agent to remember..."
            rows={3}
            style={{ width: '100%', resize: 'vertical', marginBottom: 'var(--space-3)' }}
          />
          <button className="btn btn-primary" onClick={handleAddMemory} disabled={adding || !newMemory}>
            {adding ? 'Adding...' : 'Add Memory'}
          </button>
        </div>

        {/* Search Memories */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Search Memories</h3>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <input
              className="input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agent memories..."
              style={{ flex: 1 }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="btn btn-secondary" onClick={handleSearch} disabled={searching || !searchQuery}>
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {searchResults.map((result, i) => (
                <div key={i} style={{ padding: 'var(--space-3)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)' }}>
                  <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>{result.content}</p>
                  {result.score !== undefined && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)', display: 'block' }}>
                      Relevance: {(result.score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SyncBoardLayout>
  );
}

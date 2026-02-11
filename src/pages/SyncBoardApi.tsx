import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';
import { Id } from '../../convex/_generated/dataModel';

export function SyncBoardApi() {
  const apiKeys = useQuery(api.apiKeys.list);
  const createKey = useMutation(api.apiKeys.create);
  const revokeKey = useMutation(api.apiKeys.revoke);
  const deleteKey = useMutation(api.apiKeys.remove);

  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState<'agent' | 'data' | 'admin'>('agent');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<Id<'apiKeys'> | null>(null);

  const usageSummary = useQuery(
    api.apiUsage.getSummary,
    selectedKeyId ? { apiKeyId: selectedKeyId } : { days: 7 }
  );

  const handleCreateKey = async () => {
    if (!newKeyName) return;

    try {
      const result = await createKey({
        name: newKeyName,
        description: newKeyDescription || undefined,
        keyType: newKeyType,
      });

      setGeneratedKey(result.key);
      setNewKeyName('');
      setNewKeyDescription('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'admin':
        return <span className="badge badge-warning">Admin</span>;
      case 'agent':
        return <span className="badge badge-success">Agent</span>;
      case 'data':
        return <span className="badge">Data</span>;
      default:
        return null;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <SyncBoardLayout title="API Keys">
      <div className="api-page">
        <div className="page-header">
          <div>
            <p className="description">
              Manage API keys for external access to your agent. Keys are hashed
              before storage - you will only see the full key once.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
            + Create API Key
          </button>
        </div>

        {/* Generated Key Modal */}
        {generatedKey && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>API Key Created</h3>
              <p className="warning">
                Copy this key now. You won't be able to see it again!
              </p>
              <div className="key-display">
                <code>{generatedKey}</code>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedKey);
                  }}
                >
                  Copy
                </button>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setGeneratedKey(null)}
              >
                I've copied the key
              </button>
            </div>
          </div>
        )}

        {/* Create Key Form */}
        {isCreating && (
          <div className="create-form">
            <h3>Create New API Key</h3>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="My API Key"
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                value={newKeyType}
                onChange={(e) => setNewKeyType(e.target.value as 'agent' | 'data' | 'admin')}
              >
                <option value="agent">Agent - Chat and thread access</option>
                <option value="data">Data - Read skills and activity</option>
                <option value="admin">Admin - Full access</option>
              </select>
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <textarea
                value={newKeyDescription}
                onChange={(e) => setNewKeyDescription(e.target.value)}
                placeholder="What is this key used for?"
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setIsCreating(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateKey}>
                Create Key
              </button>
            </div>
          </div>
        )}

        {/* API Keys List */}
        {apiKeys && apiKeys.length > 0 ? (
          <div className="keys-list">
            {apiKeys.map((key) => (
              <div
                key={key._id}
                className={`key-card ${key._id === selectedKeyId ? 'selected' : ''} ${!key.isActive ? 'revoked' : ''}`}
                onClick={() => setSelectedKeyId(key._id)}
              >
                <div className="key-header">
                  <div className="key-info">
                    <h3 className="key-name">{key.name}</h3>
                    <code className="key-prefix">{key.keyPrefix}...</code>
                  </div>
                  <div className="key-badges">
                    {getTypeBadge(key.keyType)}
                    {!key.isActive && <span className="badge badge-error">Revoked</span>}
                  </div>
                </div>

                {key.description && (
                  <p className="key-description">{key.description}</p>
                )}

                <div className="key-meta">
                  <span>Created: {formatDate(key.createdAt)}</span>
                  <span>Used: {key.usageCount} times</span>
                  {key.lastUsedAt && <span>Last: {formatDate(key.lastUsedAt)}</span>}
                  <span>Limit: {key.rateLimitPerMinute}/min</span>
                </div>

                <div className="key-scopes">
                  {key.scopes.slice(0, 4).map((scope: string, i: number) => (
                    <span key={i} className="scope-tag">{scope}</span>
                  ))}
                  {key.scopes.length > 4 && (
                    <span className="scope-tag">+{key.scopes.length - 4} more</span>
                  )}
                </div>

                <div className="key-actions" onClick={(e) => e.stopPropagation()}>
                  {key.isActive ? (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => revokeKey({ id: key._id })}
                    >
                      Revoke
                    </button>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => deleteKey({ id: key._id })}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No API keys created yet.</p>
            <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
              Create your first API key
            </button>
          </div>
        )}

        {/* Usage Summary */}
        {usageSummary && (
          <div className="usage-section">
            <h3>Usage Summary (Last 7 Days)</h3>
            <div className="usage-grid">
              <div className="usage-card">
                <span className="usage-value">{usageSummary.totalRequests}</span>
                <span className="usage-label">Total Requests</span>
              </div>
              <div className="usage-card">
                <span className="usage-value">{usageSummary.successfulRequests}</span>
                <span className="usage-label">Successful</span>
              </div>
              <div className="usage-card">
                <span className="usage-value">{usageSummary.failedRequests}</span>
                <span className="usage-label">Failed</span>
              </div>
              <div className="usage-card">
                <span className="usage-value">{usageSummary.totalTokens.toLocaleString()}</span>
                <span className="usage-label">Tokens Used</span>
              </div>
              <div className="usage-card">
                <span className="usage-value">{usageSummary.avgDurationMs}ms</span>
                <span className="usage-label">Avg Duration</span>
              </div>
            </div>

            {Object.keys(usageSummary.byEndpoint).length > 0 && (
              <div className="endpoint-breakdown">
                <h4>By Endpoint</h4>
                <div className="endpoint-list">
                  {Object.entries(usageSummary.byEndpoint).map(([endpoint, count]) => (
                    <div key={endpoint} className="endpoint-row">
                      <code>{endpoint}</code>
                      <span>{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .api-page {
          max-width: 900px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-6);
        }

        .description {
          color: var(--text-secondary);
          max-width: 500px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }

        .modal {
          background: var(--bg-primary);
          padding: var(--space-6);
          border-radius: var(--radius-xl);
          max-width: 500px;
          width: 90%;
        }

        .modal h3 {
          margin-bottom: var(--space-4);
        }

        .warning {
          color: var(--warning);
          margin-bottom: var(--space-4);
        }

        .key-display {
          background: var(--bg-secondary);
          padding: var(--space-3);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: var(--space-4);
          overflow-x: auto;
        }

        .key-display code {
          font-size: var(--text-sm);
          flex: 1;
          word-break: break-all;
        }

        .create-form {
          background: var(--bg-secondary);
          padding: var(--space-6);
          border-radius: var(--radius-xl);
          margin-bottom: var(--space-6);
        }

        .create-form h3 {
          margin-bottom: var(--space-4);
        }

        .form-group {
          margin-bottom: var(--space-4);
        }

        .form-group label {
          display: block;
          font-size: var(--text-sm);
          font-weight: 500;
          margin-bottom: var(--space-2);
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: var(--space-2) var(--space-3);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          background: var(--bg-primary);
        }

        .form-group textarea {
          min-height: 80px;
          resize: vertical;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-3);
        }

        .keys-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .key-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: var(--space-4);
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .key-card:hover {
          border-color: var(--interactive);
        }

        .key-card.selected {
          border-color: var(--interactive);
          box-shadow: 0 0 0 1px var(--interactive);
        }

        .key-card.revoked {
          opacity: 0.6;
        }

        .key-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-2);
        }

        .key-name {
          font-size: var(--text-lg);
          font-weight: 600;
        }

        .key-prefix {
          font-size: var(--text-xs);
          color: var(--text-secondary);
        }

        .key-badges {
          display: flex;
          gap: var(--space-2);
        }

        .key-description {
          color: var(--text-secondary);
          font-size: var(--text-sm);
          margin-bottom: var(--space-3);
        }

        .key-meta {
          display: flex;
          gap: var(--space-4);
          font-size: var(--text-xs);
          color: var(--text-secondary);
          margin-bottom: var(--space-3);
        }

        .key-scopes {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
          margin-bottom: var(--space-4);
        }

        .scope-tag {
          background: var(--bg-primary);
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          color: var(--text-secondary);
        }

        .key-actions {
          display: flex;
          gap: var(--space-2);
        }

        .btn-sm {
          padding: var(--space-1) var(--space-3);
          font-size: var(--text-xs);
        }

        .empty-state {
          text-align: center;
          padding: var(--space-12);
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
        }

        .empty-state p {
          color: var(--text-secondary);
          margin-bottom: var(--space-4);
        }

        .usage-section {
          margin-top: var(--space-8);
          background: var(--bg-secondary);
          padding: var(--space-6);
          border-radius: var(--radius-xl);
        }

        .usage-section h3 {
          margin-bottom: var(--space-4);
        }

        .usage-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }

        .usage-card {
          background: var(--bg-primary);
          padding: var(--space-4);
          border-radius: var(--radius-lg);
          text-align: center;
        }

        .usage-value {
          display: block;
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--interactive);
        }

        .usage-label {
          font-size: var(--text-xs);
          color: var(--text-secondary);
        }

        .endpoint-breakdown h4 {
          font-size: var(--text-sm);
          margin-bottom: var(--space-3);
        }

        .endpoint-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .endpoint-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-2);
          background: var(--bg-primary);
          border-radius: var(--radius-md);
        }

        .endpoint-row code {
          font-size: var(--text-xs);
          color: var(--text-secondary);
        }

        .endpoint-row span {
          font-weight: 600;
        }
      `}</style>
    </SyncBoardLayout>
  );
}

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';

export function SyncBoardConfig() {
  const config = useQuery(api.agentConfig.get);
  const updateConfig = useMutation(api.agentConfig.update);
  const rateLimits = useQuery(api.rateLimits.list);

  const [agentName, setAgentName] = useState('');
  const [uiConfig, setUiConfig] = useState({
    showActivityFeed: true,
    showVoiceToggle: false,
    showModelBadge: true,
    showSkillIndicators: true,
    showTypingIndicator: true,
    chatPlaceholder: 'Ask me anything...',
    maxMessageLength: 4000,
  });
  const [domainAllowlist, setDomainAllowlist] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setAgentName(config.name || '');
      setDomainAllowlist(config.domainAllowlist || []);
      if (config.uiConfig) {
        try {
          setUiConfig(JSON.parse(config.uiConfig));
        } catch {
          // Use default
        }
      }
    }
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateConfig({
        name: agentName,
        uiConfig: JSON.stringify(uiConfig),
        domainAllowlist,
      });
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddDomain = () => {
    if (newDomain && !domainAllowlist.includes(newDomain)) {
      setDomainAllowlist([...domainAllowlist, newDomain]);
      setNewDomain('');
    }
  };

  const handleRemoveDomain = (domain: string) => {
    setDomainAllowlist(domainAllowlist.filter((d) => d !== domain));
  };

  return (
    <SyncBoardLayout title="Configuration">
      <div className="config-page">
        <section className="config-section">
          <h3>Agent Settings</h3>
          <div className="form-group">
            <label>Agent Name</label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="input"
            />
          </div>
        </section>

        <section className="config-section">
          <h3>UI Configuration</h3>
          <div className="toggle-group">
            <label className="toggle">
              <input
                type="checkbox"
                checked={uiConfig.showActivityFeed}
                onChange={(e) => setUiConfig({ ...uiConfig, showActivityFeed: e.target.checked })}
              />
              <span>Show Activity Feed</span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={uiConfig.showModelBadge}
                onChange={(e) => setUiConfig({ ...uiConfig, showModelBadge: e.target.checked })}
              />
              <span>Show Model Badge</span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={uiConfig.showTypingIndicator}
                onChange={(e) => setUiConfig({ ...uiConfig, showTypingIndicator: e.target.checked })}
              />
              <span>Show Typing Indicator</span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={uiConfig.showVoiceToggle}
                onChange={(e) => setUiConfig({ ...uiConfig, showVoiceToggle: e.target.checked })}
              />
              <span>Show Voice Toggle (Phase 5)</span>
            </label>
          </div>

          <div className="form-group">
            <label>Chat Placeholder Text</label>
            <input
              type="text"
              value={uiConfig.chatPlaceholder}
              onChange={(e) => setUiConfig({ ...uiConfig, chatPlaceholder: e.target.value })}
              className="input"
            />
          </div>

          <div className="form-group">
            <label>Max Message Length</label>
            <input
              type="number"
              value={uiConfig.maxMessageLength}
              onChange={(e) => setUiConfig({ ...uiConfig, maxMessageLength: parseInt(e.target.value) })}
              className="input"
              min={100}
              max={10000}
            />
          </div>
        </section>

        <section className="config-section">
          <h3>Domain Allowlist</h3>
          <p className="section-desc">
            Domains that webhook skills are allowed to call. Leave empty to allow all domains.
          </p>

          <div className="domain-list">
            {domainAllowlist.map((domain) => (
              <div key={domain} className="domain-item">
                <span>{domain}</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleRemoveDomain(domain)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="add-domain">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="input"
              placeholder="api.example.com"
            />
            <button className="btn btn-secondary" onClick={handleAddDomain}>
              Add
            </button>
          </div>
        </section>

        <section className="config-section">
          <h3>Rate Limits</h3>
          <div className="rate-limits-list">
            {rateLimits?.map((limit: { _id: string; scope: string; maxRequests: number; windowMs: number }) => (
              <div key={limit._id} className="rate-limit-item">
                <span className="limit-scope">{limit.scope}</span>
                <span className="limit-value">
                  {limit.maxRequests} / {Math.round(limit.windowMs / 1000)}s
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      <style>{`
        .config-page {
          max-width: 700px;
        }

        .config-section {
          margin-bottom: var(--space-8);
          padding: var(--space-4);
          background-color: var(--bg-secondary);
          border-radius: var(--radius-xl);
        }

        .config-section h3 {
          margin-bottom: var(--space-4);
        }

        .section-desc {
          color: var(--text-secondary);
          font-size: var(--text-sm);
          margin-bottom: var(--space-4);
        }

        .form-group {
          margin-bottom: var(--space-4);
        }

        .form-group label {
          display: block;
          font-weight: 500;
          margin-bottom: var(--space-2);
        }

        .toggle-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          margin-bottom: var(--space-4);
        }

        .toggle {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          cursor: pointer;
        }

        .toggle input {
          width: 18px;
          height: 18px;
          accent-color: var(--interactive);
        }

        .domain-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          margin-bottom: var(--space-4);
        }

        .domain-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-2) var(--space-3);
          background-color: var(--bg-primary);
          border-radius: var(--radius-lg);
        }

        .add-domain {
          display: flex;
          gap: var(--space-2);
        }

        .add-domain .input {
          flex: 1;
        }

        .rate-limits-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .rate-limit-item {
          display: flex;
          justify-content: space-between;
          padding: var(--space-2);
          background-color: var(--bg-primary);
          border-radius: var(--radius-lg);
        }

        .limit-scope {
          font-weight: 500;
        }

        .limit-value {
          color: var(--text-secondary);
          font-family: var(--font-mono);
        }

        .btn-sm {
          padding: var(--space-1) var(--space-2);
          font-size: var(--text-xs);
        }

        .form-actions {
          margin-top: var(--space-4);
        }
      `}</style>
    </SyncBoardLayout>
  );
}

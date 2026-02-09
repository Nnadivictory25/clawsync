import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';
import { MagnifyingGlass, Building, Robot, CheckCircle, X } from '@phosphor-icons/react';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  company: string;
  description?: string;
}

const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic', models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-sonnet-20241022'] },
  { id: 'openai', name: 'OpenAI', models: [
    'gpt-5',
    'gpt-5-pro',
    'gpt-5.2',
    'gpt-5.3-codex',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4o',
    'gpt-4o-mini', 
    'o3',
    'o3-pro',
    'o4-mini',
    'o4-mini-high',
  ]},
  { id: 'google', name: 'Google', models: [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-pro',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ]},
  { id: 'openrouter', name: 'OpenRouter', models: [] as string[] },
  { id: 'opencode-zen', name: 'OpenCode Zen', models: ['claude-sonnet', 'gpt-4o'] },
];

const COMPANY_NAME_MAP: Record<string, string> = {
  'openai': 'OpenAI',
  'anthropic': 'Anthropic',
  'google': 'Google',
  'meta-llama': 'Meta',
  'mistralai': 'Mistral',
  'microsoft': 'Microsoft',
  'cohere': 'Cohere',
  'ai21': 'AI21',
  'perplexity': 'Perplexity',
  'x-ai': 'xAI',
  'deepseek': 'DeepSeek',
  'qwen': 'Qwen',
  'nvidia': 'NVIDIA',
  '01-ai': '01.AI',
  'amazon': 'Amazon',
  'snowflake': 'Snowflake',
  'databricks': 'Databricks',
  'fireworks': 'Fireworks',
  'together': 'Together',
  'octoai': 'OctoAI',
  'replicate': 'Replicate',
  'anyscale': 'Anyscale',
  'moonshotai': 'Kimi',
};

const formatCompanyName = (companyId: string): string => {
  return COMPANY_NAME_MAP[companyId.toLowerCase()] || companyId.charAt(0).toUpperCase() + companyId.slice(1);
};

export function SyncBoardModels() {
  const config = useQuery(api.agentConfig.get);
  const updateConfig = useMutation(api.agentConfig.update);
  const listModels = useAction(api.agent.modelSwitching.listAvailableModels);

  const [provider, setProvider] = useState('anthropic');
  const [model, setModel] = useState('claude-sonnet-4-20250514');
  const [fallbackProvider, setFallbackProvider] = useState('');
  const [fallbackModel, setFallbackModel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [allModels, setAllModels] = useState<ModelInfo[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const loadModels = async () => {
    setIsLoadingModels(true);
    try {
      const result = await listModels({ limit: 300 });
      setAllModels(result.models);
    } catch (error) {
      console.error('Failed to load models:', error);
      setAllModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await updateConfig({
        modelProvider: provider,
        model,
        fallbackProvider: fallbackProvider || undefined,
        fallbackModel: fallbackModel || undefined,
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, [listModels]);

  useEffect(() => {
    if (config) {
      setProvider(config.modelProvider || 'anthropic');
      setModel(config.model || 'claude-sonnet-4-20250514');
      setFallbackProvider(config.fallbackProvider || '');
      setFallbackModel(config.fallbackModel || '');
    }
  }, [config]);

  // OpenRouter models only
  const openRouterModels = useMemo(() => {
    return allModels.filter(m => m.provider === 'openrouter');
  }, [allModels]);

  // Calculate company counts from OpenRouter models
  const companyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    openRouterModels.forEach(m => {
      counts.set(m.company, (counts.get(m.company) || 0) + 1);
    });
    return counts;
  }, [openRouterModels]);

  // Available companies with counts
  const availableCompanies = useMemo(() => {
    return Array.from(companyCounts.entries())
      .map(([id, count]) => ({ id, name: formatCompanyName(id), count }))
      .sort((a, b) => b.count - a.count);
  }, [companyCounts]);

  // Filtered models based on search and company
  const filteredModels = useMemo(() => {
    let filtered = openRouterModels;
    
    if (selectedCompany) {
      filtered = filtered.filter(m => m.company === selectedCompany);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query) ||
        m.company.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [openRouterModels, selectedCompany, searchQuery]);

  const getModelDisplayName = (modelId: string) => {
    const m = allModels.find(m => m.id === modelId);
    return m?.name || modelId;
  };

  const handleProviderChange = (newProviderId: string) => {
    setProvider(newProviderId);
    setSelectedCompany('');
    setSearchQuery('');
    
    if (newProviderId === 'openrouter' && openRouterModels.length > 0) {
      setModel(openRouterModels[0].id);
    } else {
      const p = PROVIDERS.find(p => p.id === newProviderId);
      if (p && p.models.length > 0) {
        setModel(p.models[0]);
      }
    }
  };

  const handleFallbackProviderChange = (newProviderId: string) => {
    setFallbackProvider(newProviderId);
    
    if (newProviderId === 'openrouter') {
      if (openRouterModels.length > 0) {
        setFallbackModel(openRouterModels[0].id);
      }
    } else {
      setFallbackModel('');
    }
  };

  return (
    <SyncBoardLayout title="Model Configuration">
      <div className="models-config">
        <p className="description">
          Configure which AI model powers your agent. Model changes take effect on the next message.
        </p>

        <section className="config-section">
          <h3>Primary Model</h3>
          <p className="hint">
            <Robot size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Currently selected: <strong>{getModelDisplayName(model)}</strong>
          </p>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="provider">Provider</label>
              <select
                id="provider"
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="input"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="model">Model</label>
              {provider === 'openrouter' ? (
                <div className="model-display">
                  <span className="model-name">{getModelDisplayName(model)}</span>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowModelSelector(true)}
                    disabled={isLoadingModels}
                  >
                    Browse Models
                  </button>
                </div>
              ) : (
                <select
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="input"
                >
                  {PROVIDERS.find(p => p.id === provider)?.models.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {provider === 'openrouter' && showModelSelector && (
            <div className="model-selector-overlay" onClick={() => setShowModelSelector(false)}>
              <div className="model-selector" onClick={(e) => e.stopPropagation()}>
                <div className="model-selector-header">
                  <h4>Select Model ({openRouterModels.length} total)</h4>
                  <button className="btn btn-ghost" onClick={() => setShowModelSelector(false)}>
                    <X size={20} />
                  </button>
                </div>

                <div className="search-box">
                  <MagnifyingGlass size={18} />
                  <input
                    type="text"
                    placeholder="Search models (e.g., kimi, gpt, claude)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="company-filters">
                  <button
                    className={`company-btn ${selectedCompany === '' ? 'active' : ''}`}
                    onClick={() => setSelectedCompany('')}
                  >
                    <Building size={14} />
                    All ({filteredModels.length})
                  </button>
                  {availableCompanies.slice(0, 12).map((company) => (
                    <button
                      key={company.id}
                      className={`company-btn ${selectedCompany === company.id ? 'active' : ''}`}
                      onClick={() => setSelectedCompany(company.id)}
                    >
                      {company.name}
                      <span className="count">{company.count}</span>
                    </button>
                  ))}
                </div>

                <div className="model-list">
                  {isLoadingModels ? (
                    <div className="loading">Loading models...</div>
                  ) : filteredModels.length === 0 ? (
                    <div className="no-results">No models found matching your search.</div>
                  ) : (
                    filteredModels.map((m) => (
                      <div
                        key={m.id}
                        className={`model-item ${model === m.id ? 'selected' : ''}`}
                        onClick={() => {
                          setModel(m.id);
                          setShowModelSelector(false);
                        }}
                      >
                        <div className="model-info">
                          <div className="model-title">
                            {model === m.id && <CheckCircle size={16} className="check-icon" />}
                            {m.name}
                          </div>
                          <div className="model-meta">
                            <span className="company-badge">{m.company}</span>
                            <span className="model-id">{m.id}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="config-section">
          <h3>Fallback Model (Optional)</h3>
          <p className="hint">Used when the primary model fails or is unavailable.</p>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fallback-provider">Provider</label>
              <select
                id="fallback-provider"
                value={fallbackProvider}
                onChange={(e) => handleFallbackProviderChange(e.target.value)}
                className="input"
              >
                <option value="">None</option>
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="fallback-model">Model</label>
              <select
                id="fallback-model"
                value={fallbackModel}
                onChange={(e) => setFallbackModel(e.target.value)}
                className="input"
                disabled={!fallbackProvider}
              >
                <option value="">None</option>
                {fallbackProvider === 'openrouter' && openRouterModels.slice(0, 100).map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div className="form-actions">
          <button
            className={`btn ${saveStatus === 'success' ? 'btn-success' : saveStatus === 'error' ? 'btn-error' : 'btn-primary'}`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : saveStatus === 'error' ? 'Error!' : 'Save Configuration'}
          </button>
        </div>
      </div>

      <style>{`
        .models-config {
          max-width: 600px;
        }

        .description {
          color: var(--text-secondary);
          margin-bottom: var(--space-6);
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

        .hint {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin-bottom: var(--space-4);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .form-group label {
          font-weight: 500;
          font-size: var(--text-sm);
        }

        .form-actions {
          margin-top: var(--space-4);
        }

        .model-display {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          background: var(--bg-primary);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
        }

        .model-name {
          flex: 1;
          font-weight: 500;
        }

        .model-selector-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: var(--space-4);
        }

        .model-selector {
          background: var(--bg-primary);
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 700px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .model-selector-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-4) var(--space-6);
          border-bottom: 1px solid var(--border);
        }

        .model-selector-header h4 {
          margin: 0;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-6);
          border-bottom: 1px solid var(--border);
          background: var(--bg-secondary);
        }

        .search-box input {
          flex: 1;
          padding: var(--space-2);
          border: none;
          background: transparent;
          font-size: var(--text-base);
          outline: none;
        }

        .company-filters {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-6);
          border-bottom: 1px solid var(--border);
          background: var(--bg-secondary);
        }

        .company-btn {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          padding: var(--space-1) var(--space-3);
          border: 1px solid var(--border);
          border-radius: var(--radius-full);
          background: var(--bg-primary);
          cursor: pointer;
          font-size: var(--text-sm);
          transition: all 0.2s;
        }

        .company-btn:hover {
          background: var(--bg-secondary);
        }

        .company-btn.active {
          background: var(--interactive);
          color: white;
          border-color: var(--interactive);
        }

        .company-btn .count {
          font-size: var(--text-xs);
          opacity: 0.7;
        }

        .model-list {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-2);
        }

        .model-item {
          display: flex;
          align-items: center;
          padding: var(--space-3);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: background 0.2s;
        }

        .model-item:hover {
          background: var(--bg-secondary);
        }

        .model-item.selected {
          background: rgba(234, 91, 38, 0.1);
        }

        .model-info {
          flex: 1;
        }

        .model-title {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: 500;
          margin-bottom: var(--space-1);
        }

        .check-icon {
          color: var(--interactive);
        }

        .model-meta {
          display: flex;
          gap: var(--space-2);
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }

        .company-badge {
          background: var(--bg-secondary);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: var(--text-xs);
        }

        .model-id {
          font-family: monospace;
          opacity: 0.7;
        }

        .loading, .no-results {
          padding: var(--space-8);
          text-align: center;
          color: var(--text-secondary);
        }

        .btn-success {
          background: #22c55e !important;
          color: white !important;
        }

        .btn-error {
          background: #ef4444 !important;
          color: white !important;
        }
      `}</style>
    </SyncBoardLayout>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { Link } from 'react-router-dom';
import { api } from '../../convex/_generated/api';
import { AgentChat } from '../components/chat/AgentChat';
import { ActivityFeed } from '../components/chat/ActivityFeed';
import { MagnifyingGlass, Building, CheckCircle, CaretDown } from '@phosphor-icons/react';
import './ChatPage.css';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  company: string;
  description?: string;
}

const PROVIDERS = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-sonnet-20241022'],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
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
    ],
  },
  {
    id: 'google',
    name: 'Google',
    models: [
      'gemini-3-flash-preview',
      'gemini-3-pro-preview',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-pro',
    ],
  },
  { id: 'openrouter', name: 'OpenRouter', models: [] as string[] },
];

const COMPANY_NAME_MAP: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  'meta-llama': 'Meta',
  mistralai: 'Mistral',
  microsoft: 'Microsoft',
  cohere: 'Cohere',
  ai21: 'AI21',
  perplexity: 'Perplexity',
  'x-ai': 'xAI',
  deepseek: 'DeepSeek',
  qwen: 'Qwen',
  nvidia: 'NVIDIA',
  '01-ai': '01.AI',
  amazon: 'Amazon',
  snowflake: 'Snowflake',
  databricks: 'Databricks',
  fireworks: 'Fireworks',
  together: 'Together',
  octoai: 'OctoAI',
  replicate: 'Replicate',
  anyscale: 'Anyscale',
  moonshotai: 'Kimi',
};

const formatCompanyName = (companyId: string): string => {
  return COMPANY_NAME_MAP[companyId.toLowerCase()] || companyId.charAt(0).toUpperCase() + companyId.slice(1);
};

export function ChatPage() {
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem('clawsync_session_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('clawsync_session_id', newId);
    return newId;
  });

  const [threadId, setThreadId] = useState<string | null>(() => {
    return localStorage.getItem('clawsync_thread_id');
  });

  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [activeProvider, setActiveProvider] = useState('openrouter');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [openRouterModels, setOpenRouterModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const apiAny = api as any;
  const useQueryAny = useQuery as any;
  const useMutationAny = useMutation as any;
  const useActionAny = useAction as any;
  const agentConfig = useQueryAny(apiAny.agentConfig.get);
  const updateConfig = useMutationAny(apiAny.agentConfig.update);
  const listModels = useActionAny(apiAny.agent.modelSwitching.listAvailableModels);
  const uiConfig = agentConfig?.uiConfig ? JSON.parse(agentConfig.uiConfig) : null;

  useEffect(() => {
    if (threadId) {
      localStorage.setItem('clawsync_thread_id', threadId);
    }
  }, [threadId]);

  useEffect(() => {
    if (agentConfig?.modelProvider) {
      setActiveProvider(agentConfig.modelProvider);
    }
  }, [agentConfig?.modelProvider]);

  useEffect(() => {
    if (!showModelDropdown) return;
    if (activeProvider !== 'openrouter') return;
    if (openRouterModels.length > 0) return;

    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        const result = await listModels({ limit: 300 });
        setOpenRouterModels(result.models);
      } catch (error) {
        console.error('Failed to load OpenRouter models:', error);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadModels();
  }, [showModelDropdown, activeProvider, openRouterModels.length, listModels]);

  const openRouterCompanies = useMemo(() => {
    const counts = new Map<string, number>();
    openRouterModels.forEach((m) => {
      counts.set(m.company, (counts.get(m.company) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([id, count]) => ({ id, name: formatCompanyName(id), count }))
      .sort((a, b) => b.count - a.count);
  }, [openRouterModels]);

  const filteredOpenRouterModels = useMemo(() => {
    let filtered = openRouterModels;
    if (selectedCompany) {
      filtered = filtered.filter((m) => m.company === selectedCompany);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query) ||
          m.company.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [openRouterModels, selectedCompany, searchQuery]);

  const getProviderName = (providerId?: string) => {
    const p = PROVIDERS.find((prov) => prov.id === providerId);
    return p?.name || providerId || 'Model';
  };

  const handleSelectModel = (providerId: string, modelId: string) => {
    updateConfig({
      modelProvider: providerId,
      model: modelId,
    });
    setShowModelDropdown(false);
  };

  const currentProviderName = getProviderName(agentConfig?.modelProvider);
  const currentModelName = agentConfig?.model || 'Select model';

  return (
    <div className="chat-page">
      <header className="chat-header">
        <nav className="chat-nav">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/syncboard" className="nav-link">SyncBoard</Link>
          <Link to="/syncboard/models" className="nav-link">Models</Link>
        </nav>

        <div className="chat-center">
          <h1 className="chat-title">{agentConfig?.name || 'ClawSync Agent'}</h1>
          {uiConfig?.showModelBadge && (
            <div className="model-dropdown">
              <button
                className="badge model-badge"
                onClick={() => setShowModelDropdown((prev) => !prev)}
              >
                {currentProviderName} • {currentModelName}
                <CaretDown size={12} />
              </button>

              {showModelDropdown && (
                <div className="dropdown-panel">
                    <div className="dropdown-header">
                      <div className="dropdown-title">Switch Model</div>
                      <button className="dropdown-close" onClick={() => setShowModelDropdown(false)}>✕</button>
                    </div>

                    <div className="provider-tabs">
                      {PROVIDERS.map((provider) => (
                        <button
                          key={provider.id}
                          className={`provider-tab ${activeProvider === provider.id ? 'active' : ''}`}
                          onClick={() => {
                            setActiveProvider(provider.id);
                            setSearchQuery('');
                            setSelectedCompany('');
                          }}
                        >
                          {provider.name}
                        </button>
                      ))}
                    </div>

                    {activeProvider === 'openrouter' ? (
                      <div className="model-browser">
                        <div className="search-box">
                          <MagnifyingGlass size={16} />
                          <input
                            type="text"
                            placeholder="Search models (e.g., kimi, gpt, grok)..."
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
                            All ({filteredOpenRouterModels.length})
                          </button>
                          {openRouterCompanies.slice(0, 10).map((company) => (
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
                          ) : filteredOpenRouterModels.length === 0 ? (
                            <div className="no-results">No models match your search.</div>
                          ) : (
                            filteredOpenRouterModels.map((m) => (
                              <button
                                key={m.id}
                                className={`model-item ${agentConfig?.model === m.id ? 'selected' : ''}`}
                                onClick={() => handleSelectModel('openrouter', m.id)}
                              >
                                <div className="model-title">
                                  {agentConfig?.model === m.id && <CheckCircle size={16} className="check-icon" />}
                                  {m.name}
                                </div>
                                <div className="model-meta">
                                  <span className="company-badge">{formatCompanyName(m.company)}</span>
                                  <span className="model-id">{m.id}</span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="model-list">
                        {PROVIDERS.find((p) => p.id === activeProvider)?.models.map((m) => (
                          <button
                            key={m}
                            className={`model-item ${agentConfig?.model === m ? 'selected' : ''}`}
                            onClick={() => handleSelectModel(activeProvider, m)}
                          >
                            <div className="model-title">
                              {agentConfig?.model === m && <CheckCircle size={16} className="check-icon" />}
                              {m}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="chat-header-spacer" />
      </header>

      <main className="chat-main">
        <div className="chat-container">
          <AgentChat
            sessionId={sessionId}
            threadId={threadId}
            onThreadChange={setThreadId}
            placeholder={uiConfig?.chatPlaceholder || 'Ask me anything...'}
            maxLength={uiConfig?.maxMessageLength || 4000}
          />
        </div>

        {uiConfig?.showActivityFeed !== false && (
          <aside className="activity-sidebar">
            <ActivityFeed />
          </aside>
        )}
      </main>

      <style>{`
        .chat-header {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: var(--space-4) var(--space-6);
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          gap: var(--space-4);
        }

        .chat-center {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          justify-content: center;
          flex-wrap: wrap;
        }

        .chat-title {
          margin: 0;
        }

        .chat-header-spacer {
          justify-self: end;
        }

        .chat-nav {
          display: flex;
          gap: var(--space-4);
        }

        .nav-link {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: var(--text-sm);
          transition: color 0.2s;
        }

        .nav-link:hover {
          color: var(--interactive);
        }

        .model-dropdown {
          position: relative;
        }

        .model-badge {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-1) var(--space-3);
          background: var(--interactive);
          color: white;
          border: none;
          border-radius: var(--radius-full);
          cursor: pointer;
          font-size: var(--text-sm);
          font-weight: 500;
        }

        .model-badge:hover {
          background: var(--interactive-hover);
          color: white;
        }

        .dropdown-panel {
          position: absolute;
          left: 50%;
          top: calc(100% + 10px);
          transform: translateX(-50%);
          width: 520px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          z-index: 100;
          overflow: hidden;
        }

        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-3) var(--space-4);
          border-bottom: 1px solid var(--border);
        }

        .dropdown-title {
          font-weight: 600;
        }

        .dropdown-close {
          background: none;
          border: none;
          cursor: pointer;
          font-size: var(--text-lg);
          color: var(--text-secondary);
        }

        .provider-tabs {
          display: flex;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          border-bottom: 1px solid var(--border);
          background: var(--bg-secondary);
        }

        .provider-tab {
          padding: var(--space-2) var(--space-3);
          border: 1px solid var(--border);
          border-radius: var(--radius-full);
          background: var(--bg-primary);
          cursor: pointer;
          font-size: var(--text-sm);
        }

        .provider-tab.active {
          background: var(--interactive);
          color: white;
          border-color: var(--interactive);
        }

        .model-browser {
          padding: var(--space-3) var(--space-4);
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-3);
          background: var(--bg-secondary);
        }

        .search-box input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
        }

        .company-filters {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
          margin-bottom: var(--space-3);
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
          font-size: var(--text-xs);
          color: var(--text-primary);
        }

        .company-btn:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .company-btn.active {
          background: var(--interactive);
          color: white;
          border-color: var(--interactive);
        }

        .company-btn .count {
          font-size: 10px;
          opacity: 0.7;
        }

        .model-list {
          max-height: 320px;
          overflow-y: auto;
          padding: var(--space-2) var(--space-4) var(--space-4);
        }

        .model-item {
          width: 100%;
          text-align: left;
          border: 1px solid var(--border);
          background: var(--bg-primary);
          border-radius: var(--radius-lg);
          padding: var(--space-2) var(--space-3);
          margin-bottom: var(--space-2);
          cursor: pointer;
          color: var(--text-primary);
        }

        .model-item:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .model-item.selected {
          border-color: var(--interactive);
          background: rgba(234, 91, 38, 0.08);
        }

        .model-title {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: 500;
        }

        .check-icon {
          color: var(--interactive);
        }

        .model-meta {
          display: flex;
          gap: var(--space-2);
          font-size: var(--text-xs);
          color: var(--text-secondary);
          margin-top: var(--space-1);
        }

        .company-badge {
          background: var(--bg-secondary);
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }

        .model-id {
          font-family: monospace;
          opacity: 0.7;
        }

        .loading,
        .no-results {
          padding: var(--space-4);
          text-align: center;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}

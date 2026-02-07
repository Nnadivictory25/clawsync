import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { AgentChat } from '../components/chat/AgentChat';
import { ActivityFeed } from '../components/chat/ActivityFeed';
import './ChatPage.css';

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

  const agentConfig = useQuery(api.agentConfig.get);
  const uiConfig = agentConfig?.uiConfig ? JSON.parse(agentConfig.uiConfig) : null;

  useEffect(() => {
    if (threadId) {
      localStorage.setItem('clawsync_thread_id', threadId);
    }
  }, [threadId]);

  return (
    <div className="chat-page">
      <header className="chat-header">
        <div className="chat-header-content">
          <h1 className="chat-title">{agentConfig?.name || 'ClawSync Agent'}</h1>
          {uiConfig?.showModelBadge && agentConfig?.model && (
            <span className="badge">{agentConfig.model}</span>
          )}
        </div>
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
    </div>
  );
}

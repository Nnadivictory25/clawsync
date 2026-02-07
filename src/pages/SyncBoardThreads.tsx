import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';

export function SyncBoardThreads() {
  return (
    <SyncBoardLayout title="Threads">
      <div className="threads-page">
        <div className="page-description">
          <p>
            View and manage conversation threads from all channels.
            Threads are created automatically when users start chatting.
          </p>
        </div>

        <div className="threads-placeholder">
          <p>Thread management coming in Phase 2.</p>
          <p className="hint">
            Threads are managed by the @convex-dev/agent component.
            This view will show thread history, messages, and analytics.
          </p>
        </div>

        <div className="features-preview">
          <h3>Planned Features</h3>
          <ul>
            <li>View all conversation threads</li>
            <li>Filter by channel (web, Telegram, Slack, etc.)</li>
            <li>Search message content</li>
            <li>View thread analytics</li>
            <li>Export conversation history</li>
          </ul>
        </div>
      </div>

      <style>{`
        .threads-page {
          max-width: 800px;
        }

        .page-description {
          margin-bottom: var(--space-6);
        }

        .page-description p {
          color: var(--text-secondary);
        }

        .threads-placeholder {
          text-align: center;
          padding: var(--space-8);
          background-color: var(--bg-secondary);
          border-radius: var(--radius-xl);
          margin-bottom: var(--space-6);
        }

        .threads-placeholder p {
          color: var(--text-secondary);
        }

        .hint {
          font-size: var(--text-sm);
          margin-top: var(--space-2);
        }

        .features-preview {
          padding: var(--space-4);
          background-color: var(--bg-secondary);
          border-radius: var(--radius-xl);
        }

        .features-preview h3 {
          margin-bottom: var(--space-4);
        }

        .features-preview ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .features-preview li {
          padding-left: var(--space-4);
          position: relative;
          color: var(--text-secondary);
        }

        .features-preview li::before {
          content: '•';
          position: absolute;
          left: 0;
          color: var(--interactive);
        }
      `}</style>
    </SyncBoardLayout>
  );
}

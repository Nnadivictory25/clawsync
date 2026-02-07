import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';

export function SyncBoardX() {
  const config = useQuery(api.xTwitter.getConfig);
  const tweets = useQuery(api.xTwitter.listTweets, { limit: 20 });
  const updateConfig = useMutation(api.xTwitter.updateConfig);
  const toggleVisibility = useMutation(api.xTwitter.toggleTweetLandingVisibility);

  const [formState, setFormState] = useState({
    enabled: false,
    username: '',
    showOnLanding: false,
    autoReply: false,
    postFromAgent: false,
    rateLimitPerHour: 10,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Populate form with existing config
  useEffect(() => {
    if (config) {
      setFormState({
        enabled: config.enabled,
        username: config.username || '',
        showOnLanding: config.showOnLanding,
        autoReply: config.autoReply,
        postFromAgent: config.postFromAgent,
        rateLimitPerHour: config.rateLimitPerHour,
      });
    }
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await updateConfig({
        enabled: formState.enabled,
        username: formState.username || undefined,
        showOnLanding: formState.showOnLanding,
        autoReply: formState.autoReply,
        postFromAgent: formState.postFromAgent,
        rateLimitPerHour: formState.rateLimitPerHour,
      });
      setSaveMessage('Configuration saved!');
    } catch (error) {
      setSaveMessage(`Error: ${error instanceof Error ? error.message : 'Failed to save'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTweetVisibility = async (tweetId: string, currentVisibility: boolean) => {
    await toggleVisibility({
      tweetId,
      showOnLanding: !currentVisibility,
    });
  };

  return (
    <SyncBoardLayout title="X (Twitter)">
      <div className="x-page">
        <div className="page-description">
          <p>
            Connect your agent to X (Twitter) to read tweets, reply to mentions, and post updates.
            Agent tweets can optionally be displayed on your landing page.
          </p>
        </div>

        {/* Configuration Section */}
        <div className="config-section card">
          <h3>Configuration</h3>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formState.enabled}
                onChange={(e) => setFormState({ ...formState, enabled: e.target.checked })}
              />
              <span>Enable X Integration</span>
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="username">X Username (without @)</label>
            <input
              id="username"
              type="text"
              className="input"
              value={formState.username}
              onChange={(e) => setFormState({ ...formState, username: e.target.value })}
              placeholder="yourusername"
            />
          </div>

          <div className="form-group">
            <label htmlFor="rateLimit">Rate Limit (posts per hour)</label>
            <input
              id="rateLimit"
              type="number"
              className="input"
              value={formState.rateLimitPerHour}
              onChange={(e) => setFormState({ ...formState, rateLimitPerHour: parseInt(e.target.value) || 10 })}
              min={1}
              max={100}
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formState.showOnLanding}
                onChange={(e) => setFormState({ ...formState, showOnLanding: e.target.checked })}
              />
              <span>Show tweets on landing page</span>
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formState.autoReply}
                onChange={(e) => setFormState({ ...formState, autoReply: e.target.checked })}
              />
              <span>Auto-reply to mentions</span>
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formState.postFromAgent}
                onChange={(e) => setFormState({ ...formState, postFromAgent: e.target.checked })}
              />
              <span>Allow agent to post tweets</span>
            </label>
          </div>

          {saveMessage && (
            <div className={`save-message ${saveMessage.startsWith('Error') ? 'error' : 'success'}`}>
              {saveMessage}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        {/* API Keys Section */}
        <div className="api-section card">
          <h3>API Credentials</h3>
          <p className="section-description">
            Set these environment variables in your Convex Dashboard to enable X API access.
          </p>

          <div className="env-vars">
            <div className="env-var">
              <code>X_BEARER_TOKEN</code>
              <span>For reading tweets (OAuth 2.0 App-Only)</span>
            </div>
            <div className="env-var">
              <code>X_API_KEY</code>
              <span>OAuth 1.0a Consumer Key</span>
            </div>
            <div className="env-var">
              <code>X_API_SECRET</code>
              <span>OAuth 1.0a Consumer Secret</span>
            </div>
            <div className="env-var">
              <code>X_ACCESS_TOKEN</code>
              <span>OAuth 1.0a Access Token</span>
            </div>
            <div className="env-var">
              <code>X_ACCESS_TOKEN_SECRET</code>
              <span>OAuth 1.0a Access Token Secret</span>
            </div>
          </div>

          <a
            href="https://developer.x.com/en/portal/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Open X Developer Portal
          </a>
        </div>

        {/* Tweets Section */}
        <div className="tweets-section card">
          <h3>Cached Tweets</h3>
          <p className="section-description">
            Manage which tweets appear on your landing page.
          </p>

          {!tweets || tweets.length === 0 ? (
            <div className="empty-tweets">
              <p>No tweets cached yet. Tweets will appear here after the agent posts or reads them.</p>
            </div>
          ) : (
            <div className="tweets-list">
              {tweets.map((tweet: { _id: string; tweetId: string; text: string; authorUsername: string; postedAt: number; isAgentTweet: boolean; isReply: boolean; showOnLanding: boolean; likeCount?: number; retweetCount?: number; replyCount?: number }) => (
                <div key={tweet._id} className="tweet-item">
                  <div className="tweet-content">
                    <div className="tweet-meta">
                      <span className="tweet-author">@{tweet.authorUsername}</span>
                      <span className="tweet-time">{formatTimeAgo(tweet.postedAt)}</span>
                      {tweet.isAgentTweet && <span className="badge badge-success">Agent</span>}
                      {tweet.isReply && <span className="badge">Reply</span>}
                    </div>
                    <p className="tweet-text">{tweet.text}</p>
                    {tweet.likeCount !== undefined && (
                      <div className="tweet-stats">
                        <span>{tweet.likeCount} likes</span>
                        <span>{tweet.retweetCount || 0} retweets</span>
                        <span>{tweet.replyCount || 0} replies</span>
                      </div>
                    )}
                  </div>
                  <div className="tweet-actions">
                    <button
                      className={`btn ${tweet.showOnLanding ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleToggleTweetVisibility(tweet.tweetId, tweet.showOnLanding)}
                    >
                      {tweet.showOnLanding ? 'Showing on Landing' : 'Show on Landing'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .x-page {
          max-width: 800px;
        }

        .page-description {
          margin-bottom: var(--space-6);
        }

        .page-description p {
          color: var(--text-secondary);
        }

        .config-section,
        .api-section,
        .tweets-section {
          margin-bottom: var(--space-6);
        }

        .config-section h3,
        .api-section h3,
        .tweets-section h3 {
          margin-bottom: var(--space-4);
        }

        .section-description {
          color: var(--text-secondary);
          font-size: var(--text-sm);
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

        .checkbox-label {
          display: flex !important;
          align-items: center;
          gap: var(--space-2);
          cursor: pointer;
        }

        .checkbox-label input {
          width: 18px;
          height: 18px;
          accent-color: var(--interactive);
        }

        .save-message {
          padding: var(--space-3);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-4);
          font-size: var(--text-sm);
        }

        .save-message.success {
          background: var(--success-bg);
          color: var(--success);
        }

        .save-message.error {
          background: var(--error-bg);
          color: var(--error);
        }

        .env-vars {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          margin-bottom: var(--space-4);
        }

        .env-var {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          padding: var(--space-3);
          background: var(--bg-primary);
          border-radius: var(--radius-md);
        }

        .env-var code {
          font-family: var(--font-mono);
          font-size: var(--text-sm);
          color: var(--interactive);
        }

        .env-var span {
          font-size: var(--text-xs);
          color: var(--text-secondary);
        }

        .empty-tweets {
          text-align: center;
          padding: var(--space-6);
          color: var(--text-secondary);
        }

        .tweets-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .tweet-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-4);
          padding: var(--space-4);
          background: var(--bg-primary);
          border-radius: var(--radius-lg);
        }

        .tweet-content {
          flex: 1;
        }

        .tweet-meta {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-bottom: var(--space-2);
        }

        .tweet-author {
          font-weight: 600;
        }

        .tweet-time {
          font-size: var(--text-xs);
          color: var(--text-secondary);
        }

        .tweet-text {
          margin: 0;
          font-size: var(--text-sm);
          line-height: 1.5;
        }

        .tweet-stats {
          display: flex;
          gap: var(--space-4);
          margin-top: var(--space-2);
          font-size: var(--text-xs);
          color: var(--text-secondary);
        }

        .tweet-actions {
          flex-shrink: 0;
        }
      `}</style>
    </SyncBoardLayout>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

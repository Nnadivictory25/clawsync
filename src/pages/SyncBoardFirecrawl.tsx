import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';

/**
 * SyncBoard Firecrawl Page
 *
 * Web scraping with durable caching via Firecrawl.
 * Requires FIRECRAWL_API_KEY environment variable.
 */
export function SyncBoardFirecrawl() {
  const [url, setUrl] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrape = useMutation(api.firecrawl.scrape);
  const invalidate = useMutation(api.firecrawl.invalidate);

  // Reactively get content when jobId is set
  const content = useQuery(
    api.firecrawl.getContent,
    jobId ? { id: jobId } : 'skip'
  );

  const handleScrape = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    setJobId(null);

    try {
      const result = await scrape({ url, options: { formats: ['markdown'] } });
      setJobId(result.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scrape failed');
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidate = async () => {
    if (!url) return;
    try {
      await invalidate({ url });
      setJobId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalidation failed');
    }
  };

  return (
    <SyncBoardLayout title="Firecrawl">
      <div style={{ maxWidth: 900 }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
          Scrape web pages and convert them to clean markdown with durable caching.
          Results are cached for 30 days by default.
        </p>

        {/* Scrape form */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="input"
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={handleScrape}
              disabled={loading || !url}
            >
              {loading ? 'Scraping...' : 'Scrape'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleInvalidate}
              disabled={!url}
            >
              Clear Cache
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid #ef4444', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* Status and content */}
        {content && (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>
                {content.metadata?.title ?? content.url}
              </h3>
              <span className="badge">{content.status}</span>
            </div>

            {content.status === 'completed' && content.markdown && (
              <pre style={{ fontSize: 'var(--text-sm)', overflow: 'auto', maxHeight: 500, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'var(--bg-primary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
                {content.markdown}
              </pre>
            )}

            {content.status === 'scraping' && (
              <p style={{ color: 'var(--text-secondary)' }}>Scraping in progress...</p>
            )}

            {content.status === 'failed' && (
              <p style={{ color: '#ef4444' }}>{content.error ?? 'Scrape failed'}</p>
            )}
          </div>
        )}
      </div>
    </SyncBoardLayout>
  );
}

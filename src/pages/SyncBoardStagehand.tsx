import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';

/**
 * SyncBoard Stagehand Page
 *
 * AI-powered browser automation. Requires BROWSERBASE_API_KEY,
 * BROWSERBASE_PROJECT_ID, and MODEL_API_KEY environment variables.
 */
export function SyncBoardStagehand() {
  const [url, setUrl] = useState('');
  const [instruction, setInstruction] = useState('');
  const [jobType, setJobType] = useState<'extract' | 'act' | 'observe' | 'agent'>('extract');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const extractAction = useAction(api.stagehandActions.extract);
  const actAction = useAction(api.stagehandActions.act);
  const observeAction = useAction(api.stagehandActions.observe);
  const agentAction = useAction(api.stagehandActions.runAgent);

  const handleRun = async () => {
    if (!url || !instruction) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      let response: { result?: string; error?: string };
      switch (jobType) {
        case 'extract':
          response = await extractAction({ url, instruction });
          break;
        case 'act':
          response = await actAction({ url, instruction });
          break;
        case 'observe':
          response = await observeAction({ url, instruction });
          break;
        case 'agent':
          response = await agentAction({ url, instruction, maxSteps: 10 });
          break;
      }

      if (response.error) {
        setError(response.error);
      } else if (response.result) {
        try {
          const parsed = JSON.parse(response.result);
          setResult(JSON.stringify(parsed, null, 2));
        } catch {
          setResult(response.result);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SyncBoardLayout title="Stagehand">
      <div style={{ maxWidth: 900 }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
          AI-powered browser automation via Browserbase. Extract data, perform actions,
          observe elements, or run autonomous agents on any web page.
        </p>

        {/* Job form */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)' }}>Job Type</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value as typeof jobType)}
                className="input"
                style={{ width: '100%' }}
              >
                <option value="extract">Extract Data</option>
                <option value="act">Perform Action</option>
                <option value="observe">Observe Page</option>
                <option value="agent">Autonomous Agent</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)' }}>URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)' }}>Instruction</label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Extract all product names and prices"
              className="input"
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleRun}
            disabled={loading || !url || !instruction}
          >
            {loading ? 'Running...' : 'Run'}
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid #ef4444', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* Result display */}
        {result && (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Result</h3>
            <pre style={{ fontSize: 'var(--text-sm)', overflow: 'auto', maxHeight: 400, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {result}
            </pre>
          </div>
        )}
      </div>
    </SyncBoardLayout>
  );
}

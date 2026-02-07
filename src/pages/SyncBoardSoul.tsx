import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';

export function SyncBoardSoul() {
  const config = useQuery(api.agentConfig.get);
  const updateConfig = useMutation(api.agentConfig.update);

  const [soulDocument, setSoulDocument] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (config) {
      setSoulDocument(config.soulDocument || '');
      setSystemPrompt(config.systemPrompt || '');
    }
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await updateConfig({
        soulDocument,
        systemPrompt,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SyncBoardLayout title="Soul Document">
      <div className="soul-editor">
        <p className="description">
          The soul document defines your agent's identity, knowledge, communication style,
          and boundaries. This content is loaded into the agent's system prompt at runtime.
        </p>

        <div className="form-group">
          <label htmlFor="soul-document">Soul Document (Markdown)</label>
          <textarea
            id="soul-document"
            value={soulDocument}
            onChange={(e) => setSoulDocument(e.target.value)}
            className="textarea-large"
            placeholder="# Soul Document

## Identity
I am...

## Knowledge
I know about...

## Communication style
I communicate by...

## Boundaries
I will not..."
            rows={20}
          />
        </div>

        <div className="form-group">
          <label htmlFor="system-prompt">Additional System Prompt (Optional)</label>
          <textarea
            id="system-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="textarea-medium"
            placeholder="Additional instructions that get appended after the soul document..."
            rows={5}
          />
        </div>

        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          {saveStatus === 'saved' && (
            <span className="save-status success">Changes saved!</span>
          )}
          {saveStatus === 'error' && (
            <span className="save-status error">Failed to save. Please try again.</span>
          )}
        </div>
      </div>

      <style>{`
        .soul-editor {
          max-width: 800px;
        }

        .description {
          color: var(--text-secondary);
          margin-bottom: var(--space-6);
        }

        .form-group {
          margin-bottom: var(--space-6);
        }

        .form-group label {
          display: block;
          font-weight: 500;
          margin-bottom: var(--space-2);
        }

        .textarea-large,
        .textarea-medium {
          width: 100%;
          padding: var(--space-3);
          font-family: var(--font-mono);
          font-size: var(--text-sm);
          background-color: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          resize: vertical;
        }

        .textarea-large:focus,
        .textarea-medium:focus {
          outline: none;
          border-color: var(--interactive);
        }

        .form-actions {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }

        .save-status {
          font-size: var(--text-sm);
        }

        .save-status.success {
          color: var(--success);
        }

        .save-status.error {
          color: var(--error);
        }
      `}</style>
    </SyncBoardLayout>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';
import { ClipboardText, Link as LinkIcon } from '@phosphor-icons/react';

export function SyncBoardSkillNew() {
  const navigate = useNavigate();
  const templates = useQuery(api.skillTemplates.list);
  const createSkill = useMutation(api.skillRegistry.create);

  const [skillType, setSkillType] = useState<'template' | 'webhook'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Template data lookup for potential future use
  void templates?.find((t: { templateId: string }) => t.templateId === selectedTemplate);

  const handleCreate = async () => {
    if (!name || !description) {
      setError('Name and description are required');
      return;
    }

    if (skillType === 'template' && !selectedTemplate) {
      setError('Please select a template');
      return;
    }

    if (skillType === 'webhook' && !webhookUrl) {
      setError('Webhook URL is required');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const config = skillType === 'webhook'
        ? JSON.stringify({ url: webhookUrl, method: 'POST' })
        : undefined;

      await createSkill({
        name,
        description,
        skillType,
        templateId: skillType === 'template' ? selectedTemplate : undefined,
        config,
      });

      navigate('/syncboard/skills');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create skill');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SyncBoardLayout title="Add New Skill">
      <div className="skill-new-page">
        <div className="skill-type-selector">
          <button
            className={`type-btn ${skillType === 'template' ? 'active' : ''}`}
            onClick={() => setSkillType('template')}
          >
            <span className="type-icon"><ClipboardText size={32} weight="regular" /></span>
            <span className="type-label">Template Skill</span>
            <span className="type-desc">Use a pre-built template</span>
          </button>
          <button
            className={`type-btn ${skillType === 'webhook' ? 'active' : ''}`}
            onClick={() => setSkillType('webhook')}
          >
            <span className="type-icon"><LinkIcon size={32} weight="regular" /></span>
            <span className="type-label">Webhook Skill</span>
            <span className="type-desc">Call an external API</span>
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-section">
          <div className="form-group">
            <label htmlFor="name">Skill Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g., Weather Lookup"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              rows={3}
              placeholder="What does this skill do?"
            />
          </div>

          {skillType === 'template' && (
            <div className="form-group">
              <label>Select Template</label>
              <div className="template-grid">
                {templates?.map((template: { templateId: string; name: string; description: string; category: string }) => (
                  <button
                    key={template.templateId}
                    className={`template-card ${selectedTemplate === template.templateId ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedTemplate(template.templateId);
                      if (!name) setName(template.name);
                      if (!description) setDescription(template.description);
                    }}
                  >
                    <span className="template-name">{template.name}</span>
                    <span className="template-desc">{template.description}</span>
                    <span className="template-category">{template.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {skillType === 'webhook' && (
            <div className="form-group">
              <label htmlFor="webhook-url">Webhook URL</label>
              <input
                id="webhook-url"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="input"
                placeholder="https://api.example.com/webhook"
              />
              <p className="hint">
                The agent will POST to this URL with the skill input.
              </p>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/syncboard/skills')}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Skill'}
          </button>
        </div>
      </div>

      <style>{`
        .skill-new-page {
          max-width: 700px;
        }

        .skill-type-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }

        .type-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-4);
          background-color: var(--bg-secondary);
          border: 2px solid var(--border);
          border-radius: var(--radius-xl);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .type-btn:hover {
          border-color: var(--accent);
        }

        .type-btn.active {
          border-color: var(--interactive);
          background-color: var(--surface);
        }

        .type-icon {
          color: var(--interactive);
        }

        .type-label {
          font-weight: 600;
        }

        .type-desc {
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }

        .error-message {
          padding: var(--space-3);
          background-color: var(--error-bg);
          color: var(--error);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-4);
        }

        .form-section {
          background-color: var(--bg-secondary);
          border-radius: var(--radius-xl);
          padding: var(--space-4);
          margin-bottom: var(--space-4);
        }

        .form-group {
          margin-bottom: var(--space-4);
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-group label {
          display: block;
          font-weight: 500;
          margin-bottom: var(--space-2);
        }

        .hint {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin-top: var(--space-1);
        }

        .template-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: var(--space-3);
        }

        .template-card {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          padding: var(--space-3);
          background-color: var(--bg-primary);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          text-align: left;
          transition: all var(--transition-fast);
        }

        .template-card:hover {
          border-color: var(--accent);
        }

        .template-card.selected {
          border-color: var(--interactive);
        }

        .template-name {
          font-weight: 500;
        }

        .template-desc {
          font-size: var(--text-xs);
          color: var(--text-secondary);
        }

        .template-category {
          font-size: var(--text-xs);
          color: var(--interactive);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-3);
        }
      `}</style>
    </SyncBoardLayout>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';
import { UploadSimple } from '@phosphor-icons/react';
import { api } from '../../convex/_generated/api';

export function SyncBoardSkillNew() {
  const navigate = useNavigate();
  const createSkill = useMutation((api as any).skillRegistry.create);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [skillFileName, setSkillFileName] = useState('');
  const [skillDoc, setSkillDoc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const parseSkillMarkdown = (text: string) => {
    let frontmatter: Record<string, string> = {};
    let body = text;

    if (text.startsWith('---')) {
      const endIndex = text.indexOf('\n---', 3);
      if (endIndex !== -1) {
        const fmBlock = text.slice(3, endIndex).trim();
        body = text.slice(endIndex + 4).trim();
        const lines = fmBlock.split('\n');
        for (const line of lines) {
          const colonIndex = line.indexOf(':');
          if (colonIndex === -1) continue;
          const key = line.slice(0, colonIndex).trim();
          const value = line.slice(colonIndex + 1).trim();
          if (key) frontmatter[key] = value;
        }
      }
    }

    return {
      name: frontmatter.name || '',
      description: frontmatter.description || '',
      body,
    };
  };

  const handleSkillFile = async (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.md')) {
      setError('Please upload a .md skill file');
      return;
    }

    const text = await file.text();
    const parsed = parseSkillMarkdown(text);
    if (!parsed.name || !parsed.description) {
      setError('SKILL.md must include name and description in frontmatter');
      return;
    }

    setName(parsed.name);
    setDescription(parsed.description);
    setSkillDoc(text.trim());
    setSkillFileName(file.name);
    setError('');
  };

  const handleCreate = async () => {
    if (!skillDoc) {
      setError('Please upload a SKILL.md file');
      return;
    }

    if (!name || !description) {
      setError('Name and description are required');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      await createSkill({
        name,
        description,
        skillType: 'code',
        uiMeta: JSON.stringify({
          source: 'skill_md',
          filename: skillFileName || 'SKILL.md',
          markdown: skillDoc,
        }),
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
        <div className="skill-type-banner">
          <span className="type-icon"><UploadSimple size={24} weight="regular" /></span>
          <div>
            <div className="type-label">Import Skill</div>
            <div className="type-desc">Upload a SKILL.md file to define the skill.</div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-section">
          <div className="form-group">
            <label htmlFor="skill-file">Upload SKILL.md</label>
            <input
              id="skill-file"
              type="file"
              accept=".md"
              className="input"
              onChange={(e) => handleSkillFile(e.target.files?.[0] ?? null)}
            />
            <p className="hint">
              Must include frontmatter with <code>name</code> and <code>description</code>.
            </p>
            {skillFileName && (
              <p className="hint">Selected: <code>{skillFileName}</code></p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="name">Skill Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Skill name"
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

          {skillDoc && (
            <div className="form-group">
              <label htmlFor="skill-doc">Skill Document</label>
              <textarea
                id="skill-doc"
                className="input"
                rows={8}
                value={skillDoc}
                onChange={(e) => setSkillDoc(e.target.value)}
              />
              <p className="hint">Stored with the skill for reference.</p>
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

        .skill-type-banner {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4);
          margin-bottom: var(--space-6);
          border-radius: var(--radius-xl);
          background-color: var(--bg-secondary);
          border: 1px solid var(--border);
        }

        .type-icon {
          color: var(--interactive);
          display: inline-flex;
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

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-3);
        }
      `}</style>
    </SyncBoardLayout>
  );
}

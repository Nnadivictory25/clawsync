import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';
import type { Id } from '../../convex/_generated/dataModel';

export function SyncBoardSkills() {
  const [activeTab, setActiveTab] = useState<'installed' | 'browse' | 'sources'>('installed');
  const skills = useQuery(api.skillRegistry.list);
  const approveSkill = useMutation(api.skillRegistry.approve);
  const rejectSkill = useMutation(api.skillRegistry.reject);

  // Marketplace state
  const availableSkills = useQuery(api.skillsMarketplace.listAvailable, {});
  const sources = useQuery(api.skillsMarketplace.listSources);
  const activateSkill = useMutation(api.skillsMarketplace.activateSkill);
  const deactivateSkill = useMutation(api.skillsMarketplace.deactivateSkill);
  const addSource = useMutation(api.skillsMarketplace.addSource);
  const removeSource = useMutation(api.skillsMarketplace.removeSource);
  const syncSource = useAction(api.skillsMarketplaceActions.syncSource);

  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceType, setNewSourceType] = useState<'skills_directory' | 'github_repo' | 'custom_registry'>('github_repo');
  const [syncing, setSyncing] = useState<string | null>(null);

  const getStatusBadge = (skill: { status: string; approved: boolean }) => {
    if (!skill.approved) {
      return <span className="badge badge-warning">Pending Approval</span>;
    }
    if (skill.status === 'active') {
      return <span className="badge badge-success">Active</span>;
    }
    return <span className="badge">Inactive</span>;
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'template':
        return <span className="badge">Template</span>;
      case 'webhook':
        return <span className="badge">Webhook</span>;
      case 'code':
        return <span className="badge">Code</span>;
      default:
        return null;
    }
  };

  const handleAddSource = async () => {
    if (!newSourceName || !newSourceUrl) return;
    await addSource({ name: newSourceName, sourceType: newSourceType, url: newSourceUrl });
    setNewSourceName('');
    setNewSourceUrl('');
  };

  const handleSync = async (sourceId: Id<'externalSkillSources'>) => {
    setSyncing(sourceId);
    try {
      await syncSource({ sourceId });
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(null);
    }
  };

  return (
    <SyncBoardLayout title="Skills">
      <div className="skills-page">
        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: 'var(--space-1)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border)' }}>
          {(['installed', 'browse', 'sources'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                fontSize: 'var(--text-sm)',
                fontWeight: activeTab === tab ? 600 : 400,
                borderBottom: activeTab === tab ? '2px solid var(--text-primary)' : '2px solid transparent',
                background: 'none',
                border: 'none',
                borderBottomStyle: 'solid',
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab ? 'var(--text-primary)' : 'transparent',
                cursor: 'pointer',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {tab === 'installed' ? 'Installed' : tab === 'browse' ? 'Browse' : 'Sources'}
            </button>
          ))}
        </div>

        {/* Installed tab */}
        {activeTab === 'installed' && (
          <>
            <div className="page-header">
              <p className="description">
                Manage skills that your agent can use. Skills must be approved before activation.
              </p>
              <Link to="/syncboard/skills/new" className="btn btn-primary">
                + Add Skill
              </Link>
            </div>

            {skills && skills.length > 0 ? (
              <div className="skills-list">
                {skills.map((skill) => (
                  <div key={skill._id} className="skill-card">
                    <div className="skill-header">
                      <h3 className="skill-name">{skill.name}</h3>
                      <div className="skill-badges">
                        {getTypeBadge(skill.skillType)}
                        {getStatusBadge(skill)}
                      </div>
                    </div>

                    <p className="skill-description">{skill.description}</p>

                    <div className="skill-meta">
                      <span>Rate limit: {skill.rateLimitPerMinute}/min</span>
                      {skill.timeoutMs && <span>Timeout: {skill.timeoutMs / 1000}s</span>}
                    </div>

                    <div className="skill-actions">
                      <Link to={`/syncboard/skills/${skill._id}`} className="btn btn-secondary btn-sm">
                        View Details
                      </Link>
                      {!skill.approved && (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => approveSkill({ id: skill._id })}>Approve</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => rejectSkill({ id: skill._id })}>Reject</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No skills configured yet.</p>
                <Link to="/syncboard/skills/new" className="btn btn-primary">Add your first skill</Link>
              </div>
            )}
          </>
        )}

        {/* Browse tab */}
        {activeTab === 'browse' && (
          <>
            <p className="description" style={{ marginBottom: 'var(--space-4)' }}>
              Skills imported from external registries. Activate to add them to your agent.
            </p>
            {availableSkills && availableSkills.length > 0 ? (
              <div className="skills-list">
                {availableSkills.map((skill: { _id: Id<'importedSkills'>; name: string; description: string; category?: string; author?: string; status: string; sourceUrl?: string }) => (
                  <div key={skill._id} className="skill-card">
                    <div className="skill-header">
                      <h3 className="skill-name">{skill.name}</h3>
                      <div className="skill-badges">
                        {skill.category && <span className="badge">{skill.category}</span>}
                        <span className={`badge ${skill.status === 'active' ? 'badge-success' : ''}`}>{skill.status}</span>
                      </div>
                    </div>
                    <p className="skill-description">{skill.description}</p>
                    {skill.author && <div className="skill-meta"><span>By: {skill.author}</span></div>}
                    <div className="skill-actions">
                      {skill.status === 'available' && (
                        <button className="btn btn-primary btn-sm" onClick={() => activateSkill({ importedSkillId: skill._id })}>Activate</button>
                      )}
                      {skill.status === 'active' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => deactivateSkill({ importedSkillId: skill._id })}>Deactivate</button>
                      )}
                      {skill.sourceUrl && (
                        <a href={skill.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Source</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No skills available yet. Add a source in the Sources tab and sync it.</p>
              </div>
            )}
          </>
        )}

        {/* Sources tab */}
        {activeTab === 'sources' && (
          <>
            <p className="description" style={{ marginBottom: 'var(--space-4)' }}>
              External skill registries. Add GitHub repos, Skills Directory, or custom registries.
            </p>

            {/* Add source form */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <input className="input" value={newSourceName} onChange={(e) => setNewSourceName(e.target.value)} placeholder="Source name" />
                <select className="input" value={newSourceType} onChange={(e) => setNewSourceType(e.target.value as typeof newSourceType)}>
                  <option value="github_repo">GitHub Repo</option>
                  <option value="skills_directory">Skills Directory</option>
                  <option value="custom_registry">Custom Registry</option>
                </select>
                <input className="input" value={newSourceUrl} onChange={(e) => setNewSourceUrl(e.target.value)} placeholder={newSourceType === 'github_repo' ? 'owner/repo' : 'https://api.example.com/skills'} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleAddSource} disabled={!newSourceName || !newSourceUrl}>Add Source</button>
            </div>

            {/* Sources list */}
            {sources && sources.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {sources.map((source: { _id: Id<'externalSkillSources'>; name: string; sourceType: string; url: string; skillCount?: number; lastSyncedAt?: number }) => (
                  <div key={source._id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{source.name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-1)' }}>
                        <span className="badge">{source.sourceType}</span>
                        <span>{source.url}</span>
                        {source.skillCount !== undefined && <span>{source.skillCount} skills</span>}
                        {source.lastSyncedAt && <span>Synced: {new Date(source.lastSyncedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button className="btn btn-secondary btn-sm" style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-xs)' }} onClick={() => handleSync(source._id)} disabled={syncing === source._id}>
                        {syncing === source._id ? 'Syncing...' : 'Sync'}
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-xs)' }} onClick={() => removeSource({ id: source._id })}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No sources configured. Add one above to start browsing external skills.</p>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .skills-page {
          max-width: 900px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-6);
        }

        .description {
          color: var(--text-secondary);
          max-width: 500px;
        }

        .skills-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .skill-card {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: var(--space-4);
        }

        .skill-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-2);
        }

        .skill-name {
          font-size: var(--text-lg);
          font-weight: 600;
        }

        .skill-badges {
          display: flex;
          gap: var(--space-2);
        }

        .skill-description {
          color: var(--text-secondary);
          font-size: var(--text-sm);
          margin-bottom: var(--space-3);
        }

        .skill-meta {
          display: flex;
          gap: var(--space-4);
          font-size: var(--text-xs);
          color: var(--text-secondary);
          margin-bottom: var(--space-4);
        }

        .skill-actions {
          display: flex;
          gap: var(--space-2);
        }

        .btn-sm {
          padding: var(--space-1) var(--space-3);
          font-size: var(--text-xs);
        }

        .empty-state {
          text-align: center;
          padding: var(--space-12);
          background-color: var(--bg-secondary);
          border-radius: var(--radius-xl);
        }

        .empty-state p {
          color: var(--text-secondary);
          margin-bottom: var(--space-4);
        }
      `}</style>
    </SyncBoardLayout>
  );
}

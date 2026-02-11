import { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';
import type { Id } from '../../convex/_generated/dataModel';

/**
 * SyncBoard Research Page
 *
 * Create and manage research projects: competitive, topic, real-time (X), or API.
 */
export function SyncBoardResearch() {
  const projects = useQuery(api.research.listProjects, {});
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [researchType, setResearchType] = useState<'competitive' | 'topic' | 'realtime' | 'api'>('competitive');
  const [configInput, setConfigInput] = useState('');
  const [selectedProject, setSelectedProject] = useState<Id<'researchProjects'> | null>(null);

  const createProject = useMutation(api.research.createProject);
  const deleteProject = useMutation(api.research.deleteProject);
  const runCompetitive = useAction(api.researchActions.runCompetitiveResearch);
  const runRealtime = useAction(api.researchActions.runRealtimeResearch);

  const findings = useQuery(
    api.research.listFindings,
    selectedProject ? { projectId: selectedProject } : 'skip'
  );

  const handleCreate = async () => {
    if (!title) return;
    const id = await createProject({
      title,
      description: description || undefined,
      researchType,
      config: configInput || undefined,
    });
    setShowNew(false);
    setTitle('');
    setDescription('');
    setConfigInput('');
    setSelectedProject(id);
  };

  const handleRun = async (projectId: Id<'researchProjects'>, type: string) => {
    const project = projects?.find((p: { _id: Id<'researchProjects'> }) => p._id === projectId);
    if (!project) return;

    const config = project.config ? JSON.parse(project.config) : {};

    if (type === 'competitive') {
      await runCompetitive({
        projectId,
        targets: config.targets ?? configInput.split('\n').filter(Boolean),
      });
    } else if (type === 'realtime') {
      await runRealtime({
        projectId,
        query: config.query ?? title,
        maxResults: 20,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'running': return 'badge-warning';
      case 'failed': return '';
      default: return '';
    }
  };

  return (
    <SyncBoardLayout title="Research">
      <div style={{ maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 500 }}>
            Research projects for competitive analysis, topic research, real-time X/Twitter
            monitoring, and external API data gathering.
          </p>
          <button className="btn btn-primary" onClick={() => setShowNew(!showNew)}>
            + New Research
          </button>
        </div>

        {/* New project form */}
        {showNew && (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>New Research Project</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)' }}>Title</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)' }}>Type</label>
                <select className="input" value={researchType} onChange={(e) => setResearchType(e.target.value as typeof researchType)} style={{ width: '100%' }}>
                  <option value="competitive">Competitive</option>
                  <option value="topic">Topic</option>
                  <option value="realtime">Real-time (X/Twitter)</option>
                  <option value="api">API Sources</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)' }}>Description</label>
              <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ width: '100%', resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)' }}>
                {researchType === 'competitive' ? 'Target URLs (one per line)' : researchType === 'realtime' ? 'Search Query' : 'Config (JSON)'}
              </label>
              <textarea className="input" value={configInput} onChange={(e) => setConfigInput(e.target.value)} rows={3} style={{ width: '100%', resize: 'vertical' }} placeholder={researchType === 'competitive' ? 'https://competitor1.com\nhttps://competitor2.com' : researchType === 'realtime' ? 'AI agents' : '{"key": "value"}'} />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-primary" onClick={handleCreate}>Create</button>
              <button className="btn btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Projects list */}
        {projects && projects.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {projects.map((project: { _id: Id<'researchProjects'>; title: string; description?: string; researchType: string; status: string; createdAt: number }) => (
              <div key={project._id} style={{ background: 'var(--bg-secondary)', border: `1px solid ${selectedProject === project._id ? 'var(--text-primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', cursor: 'pointer' }} onClick={() => setSelectedProject(selectedProject === project._id ? null : project._id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <h4 style={{ fontWeight: 600 }}>{project.title}</h4>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <span className="badge">{project.researchType}</span>
                    <span className={`badge ${getStatusColor(project.status)}`}>{project.status}</span>
                  </div>
                </div>
                {project.description && (
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>{project.description}</p>
                )}
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                  {project.status === 'draft' && (
                    <button className="btn btn-primary btn-sm" style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-xs)' }} onClick={(e) => { e.stopPropagation(); handleRun(project._id, project.researchType); }}>
                      Run
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-xs)' }} onClick={(e) => { e.stopPropagation(); deleteProject({ id: project._id }); }}>
                    Delete
                  </button>
                </div>

                {/* Findings */}
                {selectedProject === project._id && findings && findings.length > 0 && (
                  <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
                    <h5 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Findings ({findings.length})</h5>
                    {findings.map((finding: { _id: string; title?: string; source: string; sourceType: string; content: string }) => (
                      <div key={finding._id} style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-2)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                          <span className="badge">{finding.sourceType}</span>
                          <strong style={{ fontSize: 'var(--text-sm)' }}>{finding.title ?? finding.source}</strong>
                        </div>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{finding.content.slice(0, 200)}...</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No research projects yet.</p>
          </div>
        )}
      </div>
    </SyncBoardLayout>
  );
}

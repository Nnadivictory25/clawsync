import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';
import { Id } from '../../convex/_generated/dataModel';

export function SyncBoardSkillDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const skill = useQuery(api.skillRegistry.get, { id: id as Id<'skillRegistry'> });
  const invocations = useQuery(api.skillInvocations.listBySkill, {
    skillName: skill?.name ?? '',
    limit: 20,
  });
  const summary = useQuery(api.skillSummary.getBySkill, {
    skillName: skill?.name ?? '',
  });

  const approveSkill = useMutation(api.skillRegistry.approve);
  const updateSkill = useMutation(api.skillRegistry.update);
  const deleteSkill = useMutation(api.skillRegistry.remove);

  if (!skill) {
    return (
      <SyncBoardLayout title="Skill Details">
        <p>Loading...</p>
      </SyncBoardLayout>
    );
  }

  const handleToggleStatus = async () => {
    await updateSkill({
      id: skill._id,
      status: skill.status === 'active' ? 'inactive' : 'active',
    });
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this skill?')) {
      await deleteSkill({ id: skill._id });
      navigate('/syncboard/skills');
    }
  };

  return (
    <SyncBoardLayout title={skill.name}>
      <div className="skill-detail">
        <div className="skill-header-section">
          <div className="skill-info">
            <span className={`badge ${skill.approved ? 'badge-success' : 'badge-warning'}`}>
              {skill.approved ? 'Approved' : 'Pending Approval'}
            </span>
            <span className={`badge ${skill.status === 'active' ? 'badge-success' : ''}`}>
              {skill.status}
            </span>
            <span className="badge">{skill.skillType}</span>
          </div>

          <div className="skill-actions">
            {!skill.approved && (
              <button
                className="btn btn-primary"
                onClick={() => approveSkill({ id: skill._id })}
              >
                Approve
              </button>
            )}
            <button className="btn btn-secondary" onClick={handleToggleStatus}>
              {skill.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
            <button className="btn btn-ghost" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>

        <p className="skill-description">{skill.description}</p>

        {summary && (
          <div className="stats-section">
            <h3>Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{summary.totalInvocations}</span>
                <span className="stat-label">Total Invocations</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{summary.successCount}</span>
                <span className="stat-label">Successful</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{summary.failureCount}</span>
                <span className="stat-label">Failed</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{Math.round(summary.avgDurationMs)}ms</span>
                <span className="stat-label">Avg Duration</span>
              </div>
            </div>
          </div>
        )}

        <div className="config-section">
          <h3>Configuration</h3>
          <pre className="config-display">
            {skill.config ? JSON.stringify(JSON.parse(skill.config), null, 2) : 'No configuration'}
          </pre>
        </div>

        <div className="invocations-section">
          <h3>Recent Invocations</h3>
          {invocations && invocations.length > 0 ? (
            <table className="invocations-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Security</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {invocations.map((inv: { _id: string; timestamp: number; success: boolean; securityCheckResult: string; durationMs: number }) => (
                  <tr key={inv._id}>
                    <td>{new Date(inv.timestamp).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${inv.success ? 'badge-success' : 'badge-error'}`}>
                        {inv.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${inv.securityCheckResult === 'passed' ? 'badge-success' : 'badge-warning'}`}>
                        {inv.securityCheckResult}
                      </span>
                    </td>
                    <td>{inv.durationMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-secondary">No invocations yet</p>
          )}
        </div>
      </div>

      <style>{`
        .skill-detail {
          max-width: 900px;
        }

        .skill-header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-4);
        }

        .skill-info {
          display: flex;
          gap: var(--space-2);
        }

        .skill-actions {
          display: flex;
          gap: var(--space-2);
        }

        .skill-description {
          color: var(--text-secondary);
          margin-bottom: var(--space-6);
        }

        .stats-section,
        .config-section,
        .invocations-section {
          margin-bottom: var(--space-6);
        }

        .stats-section h3,
        .config-section h3,
        .invocations-section h3 {
          margin-bottom: var(--space-4);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-4);
        }

        .stat-card {
          background-color: var(--bg-secondary);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: var(--text-2xl);
          font-weight: 600;
        }

        .stat-label {
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }

        .config-display {
          background-color: var(--bg-secondary);
          padding: var(--space-4);
          border-radius: var(--radius-lg);
          font-size: var(--text-sm);
          overflow-x: auto;
        }

        .invocations-table {
          width: 100%;
          border-collapse: collapse;
        }

        .invocations-table th,
        .invocations-table td {
          padding: var(--space-3);
          text-align: left;
          border-bottom: 1px solid var(--border);
        }

        .invocations-table th {
          font-weight: 500;
          color: var(--text-secondary);
          font-size: var(--text-sm);
        }
      `}</style>
    </SyncBoardLayout>
  );
}

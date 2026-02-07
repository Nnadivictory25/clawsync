import { Link } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';

export function SyncBoardSkills() {
  const skills = useQuery(api.skillRegistry.list);
  const approveSkill = useMutation(api.skillRegistry.approve);
  const rejectSkill = useMutation(api.skillRegistry.reject);

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

  return (
    <SyncBoardLayout title="Skills">
      <div className="skills-page">
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
            {skills.map((skill: { _id: string; name: string; description: string; skillType: string; status: string; approved: boolean; rateLimitPerMinute: number; timeoutMs?: number }) => (
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
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => approveSkill({ id: skill._id })}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => rejectSkill({ id: skill._id })}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No skills configured yet.</p>
            <Link to="/syncboard/skills/new" className="btn btn-primary">
              Add your first skill
            </Link>
          </div>
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

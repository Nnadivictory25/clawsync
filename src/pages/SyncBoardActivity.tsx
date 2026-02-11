import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';
import {
  ChatCircle,
  Lightning,
  DeviceMobile,
  Lock,
  PushPin,
} from '@phosphor-icons/react';

export function SyncBoardActivity() {
  const activities = useQuery(api.activityLog.list, { limit: 100 });
  const securityFailures = useQuery(api.skillInvocations.listSecurityFailures, { limit: 20 });
  const updateVisibility = useMutation(api.activityLog.updateVisibility);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionIcon = (actionType: string): React.ReactNode => {
    const iconProps = { size: 16, weight: 'regular' as const };
    switch (actionType) {
      case 'chat_message':
        return <ChatCircle {...iconProps} />;
      case 'skill_invocation':
        return <Lightning {...iconProps} />;
      case 'channel_message':
        return <DeviceMobile {...iconProps} />;
      case 'security_event':
        return <Lock {...iconProps} />;
      default:
        return <PushPin {...iconProps} />;
    }
  };

  return (
    <SyncBoardLayout title="Activity Log">
      <div className="activity-page">
        <div className="activity-sections">
          <section className="activity-section">
            <h3>All Activity</h3>
            {activities && activities.length > 0 ? (
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Summary</th>
                    <th>Visibility</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity) => (
                    <tr key={activity._id}>
                      <td className="time-cell">{formatTime(activity.timestamp)}</td>
                      <td>
                        <span className="action-type">
                          {getActionIcon(activity.actionType)} {activity.actionType}
                        </span>
                      </td>
                      <td className="summary-cell">{activity.summary}</td>
                      <td>
                        <span className={`badge ${activity.visibility === 'public' ? 'badge-success' : ''}`}>
                          {activity.visibility}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => updateVisibility({
                            id: activity._id,
                            visibility: activity.visibility === 'public' ? 'private' : 'public',
                          })}
                        >
                          Toggle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-text">No activity recorded yet.</p>
            )}
          </section>

          <section className="activity-section">
            <h3>Security Events</h3>
            {securityFailures && securityFailures.length > 0 ? (
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Skill</th>
                    <th>Result</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {securityFailures.map((failure: { _id: string; timestamp: number; skillName: string; securityCheckResult: string; errorMessage?: string }) => (
                    <tr key={failure._id}>
                      <td className="time-cell">{formatTime(failure.timestamp)}</td>
                      <td>{failure.skillName}</td>
                      <td>
                        <span className="badge badge-error">
                          {failure.securityCheckResult}
                        </span>
                      </td>
                      <td className="error-cell">{failure.errorMessage || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-text success">No security failures. All checks passing.</p>
            )}
          </section>
        </div>
      </div>

      <style>{`
        .activity-page {
          max-width: 1000px;
        }

        .activity-sections {
          display: flex;
          flex-direction: column;
          gap: var(--space-8);
        }

        .activity-section h3 {
          margin-bottom: var(--space-4);
        }

        .activity-table {
          width: 100%;
          border-collapse: collapse;
          background-color: var(--bg-secondary);
          border-radius: var(--radius-xl);
          overflow: hidden;
        }

        .activity-table th,
        .activity-table td {
          padding: var(--space-3);
          text-align: left;
          border-bottom: 1px solid var(--border);
        }

        .activity-table th {
          font-weight: 500;
          color: var(--text-secondary);
          font-size: var(--text-sm);
          background-color: var(--bg-hover);
        }

        .time-cell {
          font-size: var(--text-xs);
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .action-type {
          font-size: var(--text-sm);
        }

        .summary-cell {
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .error-cell {
          font-size: var(--text-xs);
          color: var(--error);
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .btn-sm {
          padding: var(--space-1) var(--space-2);
          font-size: var(--text-xs);
        }

        .empty-text {
          color: var(--text-secondary);
          padding: var(--space-4);
          background-color: var(--bg-secondary);
          border-radius: var(--radius-lg);
        }

        .empty-text.success {
          color: var(--success);
          background-color: var(--success-bg);
        }
      `}</style>
    </SyncBoardLayout>
  );
}

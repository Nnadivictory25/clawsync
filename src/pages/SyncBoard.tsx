import { Link, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import './SyncBoard.css';

const navItems = [
  { path: '/syncboard', label: 'Overview', icon: '📊' },
  { path: '/syncboard/soul', label: 'Soul Document', icon: '🧠' },
  { path: '/syncboard/models', label: 'Models', icon: '🤖' },
  { path: '/syncboard/skills', label: 'Skills', icon: '⚡' },
  { path: '/syncboard/mcp', label: 'MCP Servers', icon: '🔌' },
  { path: '/syncboard/channels', label: 'Channels', icon: '📱' },
  { path: '/syncboard/threads', label: 'Threads', icon: '💬' },
  { path: '/syncboard/activity', label: 'Activity Log', icon: '📋' },
  { path: '/syncboard/config', label: 'Configuration', icon: '⚙️' },
];

export function SyncBoard() {
  const location = useLocation();
  const agentConfig = useQuery(api.agentConfig.get);
  const skills = useQuery(api.skillRegistry.list);
  const activities = useQuery(api.activityLog.list, { limit: 10 });

  const activeSkills = skills?.filter((s: { status: string; approved: boolean }) => s.status === 'active' && s.approved).length ?? 0;
  const pendingSkills = skills?.filter((s: { status: string; approved: boolean }) => s.status === 'pending' || !s.approved).length ?? 0;

  return (
    <div className="syncboard">
      <aside className="syncboard-sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">SyncBoard</h1>
          <Link to="/chat" className="btn btn-ghost text-sm">
            ← Back to Chat
          </Link>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="syncboard-main">
        {location.pathname === '/syncboard' ? (
          <div className="dashboard">
            <h2>Dashboard Overview</h2>

            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{agentConfig?.name || 'Not configured'}</span>
                <span className="stat-label">Agent Name</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{agentConfig?.model || 'Not set'}</span>
                <span className="stat-label">Model</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{activeSkills}</span>
                <span className="stat-label">Active Skills</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{pendingSkills}</span>
                <span className="stat-label">Pending Approval</span>
              </div>
            </div>

            <section className="dashboard-section">
              <h3>Recent Activity</h3>
              {activities && activities.length > 0 ? (
                <ul className="activity-list-compact">
                  {activities.map((activity: { _id: string; actionType: string; summary: string; timestamp: number }) => (
                    <li key={activity._id}>
                      <span className="activity-type">{activity.actionType}</span>
                      <span className="activity-summary">{activity.summary}</span>
                      <span className="activity-time">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-secondary">No recent activity</p>
              )}
            </section>

            <section className="dashboard-section">
              <h3>Quick Actions</h3>
              <div className="quick-actions">
                <Link to="/syncboard/skills/new" className="btn btn-primary">
                  Add Skill
                </Link>
                <Link to="/syncboard/soul" className="btn btn-secondary">
                  Edit Soul
                </Link>
                <Link to="/syncboard/models" className="btn btn-secondary">
                  Configure Model
                </Link>
              </div>
            </section>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}

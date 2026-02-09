import { Link, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  ChartBar,
  Brain,
  Robot,
  Lightning,
  Plug,
  DeviceMobile,
  XLogo,
  EnvelopeSimple,
  Key,
  ChatCircle,
  ClipboardText,
  Gear,
  Toolbox,
} from '@phosphor-icons/react';
import './SyncBoard.css';

const navItems = [
  { path: '/syncboard', label: 'Overview', Icon: ChartBar },
  { path: '/syncboard/soul', label: 'Soul Document', Icon: Brain },
  { path: '/syncboard/models', label: 'Models', Icon: Robot },
  { path: '/syncboard/skills', label: 'Skills', Icon: Lightning },
  { path: '/syncboard/tools', label: 'Tools', Icon: Toolbox },
  { path: '/syncboard/mcp', label: 'MCP Servers', Icon: Plug },
  { path: '/syncboard/channels', label: 'Channels', Icon: DeviceMobile },
  { path: '/syncboard/x', label: 'X (Twitter)', Icon: XLogo },
  { path: '/syncboard/agentmail', label: 'AgentMail', Icon: EnvelopeSimple },
  { path: '/syncboard/api', label: 'API Keys', Icon: Key },
  { path: '/syncboard/threads', label: 'Threads', Icon: ChatCircle },
  { path: '/syncboard/activity', label: 'Activity Log', Icon: ClipboardText },
  { path: '/syncboard/config', label: 'Configuration', Icon: Gear },
];

export function SyncBoard() {
  const location = useLocation();
  const agentConfig = useQuery(api.agentConfig.get);
  const skills = useQuery(api.skillRegistry.list);
  const activities = useQuery(api.activityLog.list, { limit: 10 });

  const activeSkills = skills?.filter((s: { status: string; approved: boolean }) => s.status === 'active' && s.approved).length ?? 0;

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
              <span className="nav-icon"><item.Icon size={18} weight="regular" /></span>
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
                <span className="stat-value">15</span>
                <span className="stat-label">Tools</span>
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

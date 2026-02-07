import { Link, useLocation } from 'react-router-dom';
import { ReactNode, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import './SyncBoardLayout.css';

const navItems = [
  { path: '/syncboard', label: 'Overview', icon: '📊' },
  { path: '/syncboard/soul', label: 'Soul Document', icon: '🧠' },
  { path: '/syncboard/models', label: 'Models', icon: '🤖' },
  { path: '/syncboard/skills', label: 'Skills', icon: '⚡' },
  { path: '/syncboard/mcp', label: 'MCP Servers', icon: '🔌' },
  { path: '/syncboard/channels', label: 'Channels', icon: '📱' },
  { path: '/syncboard/x', label: 'X (Twitter)', icon: '𝕏' },
  { path: '/syncboard/api', label: 'API Keys', icon: '🔑' },
  { path: '/syncboard/threads', label: 'Threads', icon: '💬' },
  { path: '/syncboard/activity', label: 'Activity Log', icon: '📋' },
  { path: '/syncboard/config', label: 'Configuration', icon: '⚙️' },
];

interface SyncBoardLayoutProps {
  title: string;
  children: ReactNode;
}

export function SyncBoardLayout({ title, children }: SyncBoardLayoutProps) {
  const location = useLocation();
  const authEnabled = useQuery(api.syncboardAuth.isEnabled);
  const logout = useMutation(api.syncboardAuth.logout);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const token = localStorage.getItem('syncboard_token');
    if (token) {
      await logout({ token });
      localStorage.removeItem('syncboard_token');
      localStorage.removeItem('syncboard_token_expires');
    }
    // Force reload to trigger auth check
    window.location.href = '/syncboard';
  };

  return (
    <div className="syncboard">
      <aside className="syncboard-sidebar">
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo-link">
            <img src="/clawsync-logo.svg" alt="ClawSync" className="sidebar-logo" onError={(e) => { e.currentTarget.src = '/clawsync-logo.png'; }} />
          </Link>
          <h1 className="sidebar-title">SyncBoard</h1>
          <div className="sidebar-header-actions">
            <Link to="/chat" className="btn btn-ghost text-sm">
              ← Back to Chat
            </Link>
            {authEnabled && (
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="btn btn-ghost text-sm logout-btn"
              >
                {isLoggingOut ? 'Signing out...' : 'Sign Out'}
              </button>
            )}
          </div>
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
        <header className="page-header">
          <h2>{title}</h2>
        </header>
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}

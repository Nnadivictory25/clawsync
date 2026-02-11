import { Link, useLocation } from 'react-router-dom';
import { ReactNode, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
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
  Image,
  Browser,
  Globe,
  MagnifyingGlass,
  ChartLine,
  CloudArrowUp,
  UsersThree,
  BookOpen,
  ListBullets,
} from '@phosphor-icons/react';
import './SyncBoardLayout.css';

const navItems = [
  { path: '/syncboard', label: 'Overview', Icon: ChartBar },
  { path: '/syncboard/agents', label: 'Agents', Icon: UsersThree },
  { path: '/syncboard/souls', label: 'Souls', Icon: BookOpen },
  { path: '/syncboard/agent-feed', label: 'Agent Feed', Icon: ListBullets },
  { path: '/syncboard/soul', label: 'Soul Document', Icon: Brain },
  { path: '/syncboard/models', label: 'Models', Icon: Robot },
  { path: '/syncboard/skills', label: 'Skills', Icon: Lightning },
  { path: '/syncboard/tools', label: 'Tools', Icon: Toolbox },
  { path: '/syncboard/mcp', label: 'MCP Servers', Icon: Plug },
  { path: '/syncboard/channels', label: 'Channels', Icon: DeviceMobile },
  { path: '/syncboard/x', label: 'X (Twitter)', Icon: XLogo },
  { path: '/syncboard/agentmail', label: 'AgentMail', Icon: EnvelopeSimple },
  { path: '/syncboard/media', label: 'Media', Icon: Image },
  { path: '/syncboard/stagehand', label: 'Stagehand', Icon: Browser },
  { path: '/syncboard/firecrawl', label: 'Firecrawl', Icon: Globe },
  { path: '/syncboard/research', label: 'Research', Icon: MagnifyingGlass },
  { path: '/syncboard/analytics', label: 'Analytics', Icon: ChartLine },
  { path: '/syncboard/memory', label: 'Memory', Icon: CloudArrowUp },
  { path: '/syncboard/api', label: 'API Keys', Icon: Key },
  { path: '/syncboard/threads', label: 'Threads', Icon: ChatCircle },
  { path: '/syncboard/activity', label: 'Activity Log', Icon: ClipboardText },
  { path: '/syncboard/config', label: 'Configuration', Icon: Gear },
];

interface SyncBoardLayoutProps {
  title?: string;
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
              <span className="nav-icon"><item.Icon size={18} weight="regular" /></span>
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

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  ChatCircle,
  Lightning,
  DeviceMobile,
  PushPin,
} from '@phosphor-icons/react';
import './ActivityFeed.css';

export function ActivityFeed() {
  const activities = useQuery(api.activityLog.listPublic, { limit: 20 });

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60_000) return 'Just now';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
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
      default:
        return <PushPin {...iconProps} />;
    }
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="activity-feed">
        <h3 className="activity-title">Activity</h3>
        <p className="activity-empty">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      <h3 className="activity-title">Activity</h3>
      <ul className="activity-list">
        {activities.map((activity: { _id: string; actionType: string; summary: string; timestamp: number }) => (
          <li key={activity._id} className="activity-item">
            <span className="activity-icon">{getActionIcon(activity.actionType)}</span>
            <div className="activity-content">
              <p className="activity-summary">{activity.summary}</p>
              <span className="activity-time">{formatTime(activity.timestamp)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

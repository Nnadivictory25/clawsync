import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';

/**
 * SyncBoard Analytics Page
 *
 * AI-powered weekly analytics with anomaly detection, trends, and recommendations.
 */
export function SyncBoardAnalytics() {
  const latest = useQuery(api.analyticsReport.getLatest);
  const reports = useQuery(api.analyticsReport.list, { limit: 10 });
  const triggerManual = useMutation(api.analyticsReport.triggerManual);

  const parseJson = (json: string) => {
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  };

  return (
    <SyncBoardLayout title="AI Analytics">
      <div style={{ maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 500 }}>
            AI-powered analysis of your metrics. Reports run automatically every Monday
            or can be triggered manually. Includes anomaly detection, trend analysis,
            and actionable recommendations.
          </p>
          <button className="btn btn-primary" onClick={() => triggerManual()}>
            Generate Report Now
          </button>
        </div>

        {/* Latest report */}
        {latest ? (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>{latest.title}</h3>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <span className="badge">{latest.reportType}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  {new Date(latest.generatedAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Summary */}
            <p style={{ marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>{latest.summary}</p>

            {/* Sections */}
            {parseJson(latest.sections).map((section: { heading: string; content: string }, i: number) => (
              <div key={i} style={{ marginBottom: 'var(--space-4)' }}>
                <h4 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>{section.heading}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>{section.content}</p>
              </div>
            ))}

            {/* Anomalies */}
            {parseJson(latest.anomalies).length > 0 && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <h4 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Anomalies</h4>
                {parseJson(latest.anomalies).map((a: { metric: string; description: string; severity: string }, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', marginBottom: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)' }}>
                    <span className="badge" style={{ flexShrink: 0 }}>{a.severity}</span>
                    <div>
                      <strong>{a.metric}</strong>: {a.description}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {parseJson(latest.recommendations).length > 0 && (
              <div>
                <h4 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Recommendations</h4>
                {parseJson(latest.recommendations).map((r: { action: string; priority: string; reasoning: string }, i: number) => (
                  <div key={i} style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                      <span className="badge">{r.priority}</span>
                      <strong>{r.action}</strong>
                    </div>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{r.reasoning}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-6)' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              No analytics reports generated yet. Click the button above to generate your first report.
            </p>
          </div>
        )}

        {/* Report history */}
        {reports && reports.length > 1 && (
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Report History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {reports.slice(1).map((report: { _id: string; title: string; reportType: string; generatedAt: number; summary: string }) => (
                <div key={report._id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{report.title}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                      {report.summary.slice(0, 100)}...
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexShrink: 0 }}>
                    <span className="badge">{report.reportType}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      {new Date(report.generatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SyncBoardLayout>
  );
}

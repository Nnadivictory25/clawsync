import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';

/**
 * SyncBoard Media Page
 *
 * Upload and manage files via Convex native storage (default) or R2 (optional).
 */
export function SyncBoardMedia() {
  const files = useQuery(api.media.list, {});
  const stats = useQuery(api.media.getStats);
  const generateUploadUrl = useMutation(api.media.generateUploadUrl);
  const saveFile = useMutation(api.media.saveFile);
  const deleteFile = useMutation(api.media.deleteFile);

  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Convex native upload
      const url = await generateUploadUrl();
      const result = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      const { storageId } = await result.json();

      await saveFile({
        storageId,
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <SyncBoardLayout title="Media">
      <div style={{ maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 500 }}>
            Upload and manage files. Convex native storage is the default.
            R2 can be enabled by configuring environment variables.
          </p>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            {uploading ? 'Uploading...' : '+ Upload File'}
            <input
              type="file"
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            {[
              { label: 'Total Files', value: stats.totalFiles },
              { label: 'Convex Files', value: stats.convexFiles },
              { label: 'R2 Files', value: stats.r2Files },
              { label: 'Total Size', value: formatSize(stats.totalSize) },
            ].map((stat) => (
              <div key={stat.label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{stat.label}</div>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 600, marginTop: 'var(--space-1)' }}>{stat.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* File list */}
        {files && files.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {files.map((file) => (
              <div key={file._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-3) var(--space-4)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{file.filename}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-1)' }}>
                    <span>{file.contentType}</span>
                    <span>{formatSize(file.size)}</span>
                    <span className="badge">{file.storageBackend}</span>
                    <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {file.url && (
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-xs)' }}>
                      View
                    </a>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-xs)' }}
                    onClick={() => deleteFile({ id: file._id })}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>No files uploaded yet.</p>
          </div>
        )}
      </div>
    </SyncBoardLayout>
  );
}

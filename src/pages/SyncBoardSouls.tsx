import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';
import {
  Plus,
  FloppyDisk,
  Trash,
  PencilSimple,
  X,
  Robot,
} from '@phosphor-icons/react';

/**
 * SyncBoardSouls
 *
 * Soul document library. Create, edit, delete souls.
 * Shows which agents use each soul.
 */

export function SyncBoardSouls() {
  const souls = useQuery(api.souls.list);
  const createSoul = useMutation(api.souls.create);
  const updateSoul = useMutation(api.souls.update);
  const removeSoul = useMutation(api.souls.remove);

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<Id<'souls'> | null>(null);
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');

  const handleCreate = async () => {
    if (!name.trim() || !document.trim()) return;
    await createSoul({
      name: name.trim(),
      document: document.trim(),
      systemPrompt: systemPrompt.trim() || undefined,
    });
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingId || !name.trim()) return;
    await updateSoul({
      soulId: editingId,
      name: name.trim(),
      document: document.trim(),
      systemPrompt: systemPrompt.trim() || undefined,
    });
    resetForm();
  };

  const handleDelete = async (soulId: Id<'souls'>) => {
    try {
      await removeSoul({ soulId });
    } catch (error) {
      // Soul is still referenced by agents
      alert(error instanceof Error ? error.message : 'Cannot delete soul');
    }
  };

  const startEdit = (soul: { _id: Id<'souls'>; name: string; document: string; systemPrompt?: string }) => {
    setEditingId(soul._id);
    setName(soul.name);
    setDocument(soul.document);
    setSystemPrompt(soul.systemPrompt || '');
    setShowCreate(false);
  };

  const resetForm = () => {
    setShowCreate(false);
    setEditingId(null);
    setName('');
    setDocument('');
    setSystemPrompt('');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: 'var(--text-sm)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <SyncBoardLayout>
      <div style={{ padding: 'var(--space-4)' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-4)',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Souls
            </h1>
            <p
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-secondary)',
                margin: 0,
                marginTop: 'var(--space-1)',
              }}
            >
              Shared soul documents for your agents
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: '8px 16px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: 'var(--text-primary)',
              color: 'var(--bg-primary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Plus size={16} weight="bold" />
            New Soul
          </button>
        </div>

        {/* Create/edit form */}
        {(showCreate || editingId) && (
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                {editingId ? 'Edit Soul' : 'Create New Soul'}
              </span>
              <button
                onClick={resetForm}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                <X size={16} />
              </button>
            </div>
            <input
              style={inputStyle}
              placeholder="Soul name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <textarea
              style={{ ...inputStyle, minHeight: 200, fontFamily: 'var(--font-mono)', resize: 'vertical' }}
              placeholder="Soul document (Markdown)"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
            />
            <textarea
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
              placeholder="System prompt (optional)"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
              <button
                onClick={resetForm}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={!name.trim() || (!editingId && !document.trim())}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--text-primary)',
                  color: 'var(--bg-primary)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <FloppyDisk size={14} />
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {/* Souls list */}
        {!souls ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            Loading souls...
          </div>
        ) : souls.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-8)',
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-sm)',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            No soul documents yet. Create your first soul to share across agents.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {souls.map((soul) => (
              <SoulItem
                key={soul._id}
                soul={soul}
                onEdit={() => startEdit(soul)}
                onDelete={() => handleDelete(soul._id)}
              />
            ))}
          </div>
        )}
      </div>
    </SyncBoardLayout>
  );
}

/**
 * Individual soul list item with agent usage count
 */
function SoulItem({
  soul,
  onEdit,
  onDelete,
}: {
  soul: { _id: Id<'souls'>; name: string; document: string; updatedAt: number };
  onEdit: () => void;
  onDelete: () => void;
}) {
  const agents = useQuery(api.souls.getAgents, { soulId: soul._id });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-primary)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
          {soul.name}
        </div>
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 300,
          }}
        >
          {soul.document.slice(0, 100)}...
        </div>
        {agents && agents.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              marginTop: 'var(--space-1)',
            }}
          >
            <Robot size={12} />
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Used by {agents.map((a) => a.name).join(', ')}
            </span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
        <button
          onClick={onEdit}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <PencilSimple size={14} />
        </button>
        <button
          onClick={onDelete}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px',
            border: '1px solid var(--error)',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: 'var(--error)',
            cursor: 'pointer',
          }}
        >
          <Trash size={14} />
        </button>
      </div>
    </div>
  );
}

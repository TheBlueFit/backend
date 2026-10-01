"use client";
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, GripVertical, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { dashboardAPI } from '@/services/api';

type Exercise = { id: string; name: string; sets: string; reps: string; rpe: string };

const fieldStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '8px',
  color: '#fff',
  padding: '8px 10px',
  fontSize: '13px',
  outline: 'none',
  minWidth: 0,
};

export default function TemplateClient() {
  // Works for both /coach/templates/edit?id=... (works in the static app) and the older /coach/templates/[id]
  const params = useParams<{ id?: string }>();
  const search = useSearchParams();
  const templateId = search.get('id') || params?.id || '';

  const [title, setTitle] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!templateId) {
      setMessage({ type: 'error', text: 'No template selected.' });
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const t = await dashboardAPI.getTemplate(templateId);
        if (cancelled) return;
        setTitle(t.title || '');
        setExercises(
          (t.exercises || []).map((e: any, i: number) => ({
            id: String(e.id || i + 1),
            name: e.name || '',
            sets: String(e.sets ?? ''),
            reps: String(e.reps ?? ''),
            rpe: String(e.rpe ?? ''),
          }))
        );
      } catch (err: any) {
        if (!cancelled) setMessage({ type: 'error', text: err.message || 'Could not load this template.' });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [templateId]);

  const updateExercise = (id: string, patch: Partial<Exercise>) =>
    setExercises((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const addExercise = () =>
    setExercises((list) => [...list, { id: String(Date.now()), name: '', sets: '3', reps: '8-10', rpe: '7' }]);

  const removeExercise = (id: string) => setExercises((list) => list.filter((e) => e.id !== id));

  const save = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await dashboardAPI.updateTemplate(templateId, {
        title,
        exercises: exercises.filter((e) => e.name.trim()),
      });
      setMessage({ type: 'ok', text: 'Template saved.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Could not save this template.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px', paddingBottom: '80px' }}>

      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <Link href="/coach/templates" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
          <ArrowLeft size={20} /> Back to Templates
        </Link>
        <button
          onClick={save}
          disabled={isSaving || isLoading || !templateId}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px', background: 'rgba(0, 226, 123, 0.15)', color: '#00E27B', border: '1px solid rgba(0, 226, 123, 0.4)' }}
        >
          <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="app-card fade-in">
        <h1 className="animated-gradient-text" style={{ fontSize: '24px', margin: '0 0 8px 0' }}>Template Configuration</h1>

        {message && (
          <div
            className={message.type === 'error' ? 'error-banner' : undefined}
            style={message.type === 'ok' ? { color: '#00E27B', marginBottom: '16px', fontSize: '14px' } : undefined}
          >
            {message.text}
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading Configuration...</div>
        ) : !templateId || (message?.type === 'error' && exercises.length === 0 && !title) ? null : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Template name"
              aria-label="Template name"
              style={{ ...fieldStyle, fontSize: '16px', padding: '12px 14px' }}
            />

            {exercises.map((ex, index) => (
              <div key={ex.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '16px',
                borderRadius: '12px'
              }}>
                <GripVertical size={20} color="var(--text-secondary)" style={{ cursor: 'grab' }} />
                <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                  <input
                    value={ex.name}
                    onChange={(e) => updateExercise(ex.id, { name: e.target.value })}
                    maxLength={100}
                    placeholder={`${index + 1}. Exercise name`}
                    aria-label={`Exercise ${index + 1} name`}
                    style={fieldStyle}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input value={ex.sets} onChange={(e) => updateExercise(ex.id, { sets: e.target.value })} maxLength={10} placeholder="Sets" aria-label="Sets" style={{ ...fieldStyle, width: '33%' }} />
                    <input value={ex.reps} onChange={(e) => updateExercise(ex.id, { reps: e.target.value })} maxLength={10} placeholder="Reps" aria-label="Reps" style={{ ...fieldStyle, width: '33%' }} />
                    <input value={ex.rpe} onChange={(e) => updateExercise(ex.id, { rpe: e.target.value })} maxLength={10} placeholder="RPE" aria-label="RPE" style={{ ...fieldStyle, width: '33%' }} />
                  </div>
                </div>
                <button
                  onClick={() => removeExercise(ex.id)}
                  aria-label={`Remove exercise ${index + 1}`}
                  style={{ background: 'transparent', border: 'none', color: '#FF453A', cursor: 'pointer', padding: '8px' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}

            <button
              onClick={addExercise}
              style={{
                width: '100%',
                padding: '16px',
                background: 'transparent',
                border: '1px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                marginTop: '8px'
              }}
            >
              <Plus size={18} /> Add Exercise
            </button>

          </div>
        )}
      </div>
    </div>
  );
}

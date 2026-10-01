"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Scale, TrendingUp, CheckCircle2, Upload } from 'lucide-react';
import { dashboardAPI } from '@/services/api';

export default function WeeklyCheckIn() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const form = new FormData(e.currentTarget);
    const waist = String(form.get('waist') || '').trim();
    const notes = String(form.get('notes') || '').trim();
    try {
      await dashboardAPI.saveCheckin({
        weight: Number(form.get('weight')),
        adherence: String(form.get('adherence')),
        workoutQuality: String(form.get('workoutQuality')),
        ...(waist ? { waist: Number(waist) } : {}),
        ...(notes ? { notes } : {}),
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Could not save your check-in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Shared dark-mode input styling
  const inputStyle = {
    width: '100%',
    padding: '14px',
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
    fontSize: '15px',
    marginTop: '8px',
    transition: 'border-color 0.2s ease'
  };

  if (submitted) {
    return (
      <div className="container" style={{ maxWidth: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="app-card fade-in" style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(0, 226, 123, 0.1)', border: '1px solid var(--accent-green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', boxShadow: '0 0 15px rgba(0, 226, 123, 0.2)' }}>
            <CheckCircle2 className="neon-green" size={40} color="#00E27B" />
          </div>
          <h2 className="animated-gradient-text" style={{ fontSize: '28px', marginBottom: '12px', textTransform: 'none' }}>Check-In Complete</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '15px' }}>Your coach has been notified and will review your progress shortly.</p>
          <button onClick={() => router.push('/client')} className="btn-primary full-width">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div className="app-card fade-in">
        
        <div className="section-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', marginBottom: '32px' }}>
          <h1 className="animated-gradient-text" style={{ fontSize: '32px', textTransform: 'none' }}>Weekly Review</h1>
          <p className="label-text" style={{ textTransform: 'none', color: 'var(--text-secondary)', letterSpacing: '0', fontSize: '14px' }}>Log your physical metrics and how you felt this week.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Quantitative Metrics */}
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
              <Scale size={18} color="var(--accent-gold)" /> Body Metrics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              <div>
                <label className="label-text">Current Weight (kg)</label>
                <input name="weight" type="number" step="0.1" required style={inputStyle} placeholder="e.g. 67.5" />
              </div>
              <div>
                <label className="label-text">Waist (cm)</label>
                <input name="waist" type="number" step="0.5" style={inputStyle} placeholder="e.g. 82.0" />
              </div>
            </div>
          </div>

          {/* Qualitative Feedback */}
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
              <TrendingUp size={18} color="var(--accent-green)" /> Performance & Recovery
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label className="label-text">Diet Adherence</label>
                <select name="adherence" style={{...inputStyle, WebkitAppearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23888888%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px top 50%', backgroundSize: '10px auto'}}>
                  <option value="strict" style={{ background: '#111' }}>Strictly followed the plan</option>
                  <option value="mostly" style={{ background: '#111' }}>Mostly followed, minor slips</option>
                  <option value="struggled" style={{ background: '#111' }}>Struggled this week</option>
                </select>
              </div>
              <div>
                <label className="label-text">Workout Quality (e.g. Core bracing, machine presses)</label>
                <select name="workoutQuality" style={{...inputStyle, WebkitAppearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23888888%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px top 50%', backgroundSize: '10px auto'}}>
                  <option value="strong" style={{ background: '#111' }}>Strong, progressed on lifts</option>
                  <option value="maintained" style={{ background: '#111' }}>Maintained strength</option>
                  <option value="weak" style={{ background: '#111' }}>Felt fatigued/weak</option>
                </select>
              </div>
              <div>
                <label className="label-text">Challenges & Notes</label>
                <textarea name="notes" maxLength={2000} rows={3} style={{ ...inputStyle, resize: 'none' }} placeholder="How was your sleep, stress, or digestion?"></textarea>
              </div>
            </div>
          </div>

          {/* Progress Photos */}
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
              <Camera size={18} color="#60A5FA" /> Progress Photos
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '16px' }}>
              {['Front', 'Side', 'Back'].map((angle) => (
                <label 
                  key={angle} 
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '120px', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.2)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; e.currentTarget.style.background = 'rgba(229,184,105,0.05)'; }} 
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'rgba(0,0,0,0.2)'; }}
                >
                  <Upload size={24} color="var(--text-secondary)" style={{ marginBottom: '8px' }} />
                  <span className="label-text">{angle}</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} />
                </label>
              ))}
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}
          <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: '8px' }}>
            {isSubmitting ? 'Saving...' : 'Submit Check-In'}
          </button>
        </form>

      </div>
    </div>
  );
}
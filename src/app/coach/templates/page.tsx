"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Copy, Activity, Calendar, Utensils } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { dashboardAPI } from '@/services/api';

export default function PlanTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const created = await dashboardAPI.createTemplate({ title: 'New Template' });
      router.push(`/coach/templates/edit?id=${encodeURIComponent(created.id)}`);
    } catch (err: any) {
      setError(err.message || 'Could not create a template.');
      setIsCreating(false);
    }
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await dashboardAPI.getCoachTemplates();
        setTemplates(data.templates);
      } catch (error) {
        console.error("Failed to fetch templates:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  return (
    <>

      {/* Main Content */}
      <div className="container" style={{ maxWidth: '800px' }}>
        <div className="app-card fade-in">
          
          {/* Header Row */}
          <div className="section-header" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: 'bold', margin: '0 0 8px 0', lineHeight: '1.2' }}>
                <span style={{ color: '#E5B869' }}>Plan</span><br/>
                <span className="animated-gradient-text">Templates</span>
              </h1>
              <p className="label-text" style={{ textTransform: 'none', color: 'var(--text-secondary)', letterSpacing: '0', fontSize: '14px', margin: 0, maxWidth: '240px' }}>
                Build and manage reusable activity and workout frameworks.
              </p>
            </div>
            <button onClick={handleCreate} disabled={isCreating} 
              className="btn-primary" 
              style={{ padding: '10px 16px', flex: 'none', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 122, 255, 0.15)', color: '#60A5FA', border: '1px solid rgba(0, 122, 255, 0.4)', borderRadius: '8px', cursor: 'pointer' }}
            >
              <Plus size={16} /> {isCreating ? 'CREATING...' : 'NEW TEMPLATE'}
            </button>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {/* Template Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {isLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Templates...</div>
            ) : (
              templates.map((template) => (
                <div key={template.id} style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }}>
                  
                  {/* Title and Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: 0, maxWidth: '80%' }}>
                      {template.title}
                    </h3>
                    <div style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)' }}>
                      <Edit2 size={18} style={{ cursor: 'pointer' }} />
                      <Copy size={18} style={{ cursor: 'pointer' }} />
                    </div>
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                    {template.description}
                  </p>

                  {/* Attributes List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Activity size={16} color="#00E27B" />
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>{template.activities}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Calendar size={16} color="#60A5FA" />
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>{template.workoutDays}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Utensils size={16} color="#E5B869" />
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>Goal: {template.goal}</span>
                    </div>
                  </div>

                  {/* Action Button wired to the dynamic routing folder */}
                  <Link 
                    href={`/coach/templates/edit?id=${encodeURIComponent(template.id)}`}
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      textDecoration: 'none',
                      width: '100%',
                      padding: '14px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                      transition: 'background 0.2s'
                    }}
                  >
                    VIEW CONFIGURATION
                  </Link>

                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </>
  );
}
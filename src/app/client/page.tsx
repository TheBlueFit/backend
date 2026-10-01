// "use client";
// import React from 'react';
// import { Info, Check, Plus, Minus, Flame } from 'lucide-react';
// import Link from 'next/link';

// export default function ClientDashboard() {
//   const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
//   const adherenceScore = 65; 

//   const tasks = [
//     { id: 't1', title: 'Daily Water Intake', target: 3, unit: 'Liters', type: 'numeric', progress: 1.5 },
//     { id: 't2', title: 'Step Count', target: 10000, unit: 'Steps', type: 'numeric', progress: 6500 },
//     { id: 't3', title: 'Hit Protein Target', target: 140, unit: 'grams', type: 'boolean', progress: 0 },
//     { id: 't4', title: 'Core Stability & Press', target: 1, unit: 'Session', type: 'boolean', progress: 0 },
//   ];

//   return (
//     <div className="container">
//       <div className="app-card fade-in">
        
//         {/* Header */}
//         <div className="section-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', marginBottom: '32px' }}>
//           <span className="label-text" style={{ color: 'var(--accent-gold)' }}>{todayDate}</span>
//           <h2 className="animated-gradient-text" style={{ fontSize: '28px', textTransform: 'none' }}>Good Morning, Hemanth</h2>
//         </div>

//         {/* Adherence Summary */}
//         <div className="results-summary">
//           <div className="macro-row" style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
//             <div className="macro-pill" style={{ justifyContent: 'space-between', padding: '20px' }}>
//               <div>
//                 <div className="label-text">Daily Adherence</div>
//                 <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
//                   <strong className="pulse-text" style={{ fontSize: '32px', color: '#FFF' }}>{adherenceScore}%</strong>
//                   <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>on track</span>
//                 </div>
//               </div>
              
//               {/* SVG Adherence Ring with Lucide Flame */}
//               <div className="relative" style={{ width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//                 <svg className="absolute w-full h-full" style={{ transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
//                   <path stroke="var(--border-subtle)" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
//                   <path 
//                     stroke="var(--accent-green)" 
//                     strokeDasharray={`${adherenceScore}, 100`} 
//                     strokeWidth="3" 
//                     fill="none" 
//                     strokeLinecap="round" 
//                     d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
//                     style={{ filter: 'drop-shadow(0 0 4px rgba(0,226,123,0.5))', transition: 'stroke-dasharray 1s ease-out' }} 
//                   />
//                 </svg>
//                 <Flame className="neon-orange" size={24} />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Diet Plan Summary Callout */}
//         <div className="error-banner" style={{ background: 'rgba(0, 122, 255, 0.1)', borderColor: 'rgba(0, 122, 255, 0.3)', color: '#FFF', textAlign: 'left', marginBottom: '32px', display: 'flex', gap: '16px' }}>
//           <div style={{ background: 'rgba(0, 122, 255, 0.2)', color: '#60A5FA', padding: '8px', borderRadius: '12px', height: 'fit-content' }}>
//             <Info size={20} />
//           </div>
//           <div>
//             <strong style={{ display: 'block', marginBottom: '6px', color: '#60A5FA' }}>Your Macros are Updated</strong>
//             <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', display: 'block' }}>
//               Your coach updated your diet plan. Your new target is <strong style={{ color: '#FFF' }}>2151 kcal</strong> prioritizing Soya Chunks and Sesame Seeds for protein.
//             </span>
//             <Link href="/client/diet" style={{ display: 'inline-block', marginTop: '12px', fontSize: '13px', color: '#60A5FA', fontWeight: '600', textDecoration: 'none' }}>
//               View Diet Plan →
//             </Link>
//           </div>
//         </div>

//         {/* Action Checklist */}
//         <div className="section-header" style={{ marginBottom: '16px' }}>
//           <h2 style={{ fontSize: '15px' }}>Today's Tasks</h2>
//         </div>

//         <div className="plan-cards-container" style={{ paddingRight: '8px' }}>
//           {tasks.map((task) => {
//             const isComplete = task.progress >= task.target;
            
//             return (
//               <div 
//                 key={task.id} 
//                 className="plan-card" 
//                 style={{ 
//                   flexDirection: 'column', 
//                   alignItems: 'stretch', 
//                   gap: '14px', 
//                   borderColor: isComplete ? 'var(--accent-green)' : 'var(--border-subtle)' 
//                 }}
//               >
//                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                   <div className="plan-card-left">
//                     <span className="plan-item-name" style={{ color: isComplete ? 'var(--accent-green)' : 'var(--text-primary)' }}>
//                       {task.title}
//                     </span>
//                     <span className="plan-item-category">
//                       {task.type === 'numeric' ? `${task.progress} / ${task.target} ${task.unit}` : `${task.target} ${task.unit}`}
//                     </span>
//                   </div>

//                   <div className="plan-card-right" style={{ flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
//                     {task.type === 'boolean' ? (
//                       <button 
//                         style={{ 
//                           width: '32px', height: '32px', borderRadius: '50%', 
//                           background: isComplete ? 'rgba(0, 226, 123, 0.15)' : 'var(--bg-input)', 
//                           border: `1px solid ${isComplete ? 'var(--accent-green)' : 'var(--border-subtle)'}`, 
//                           display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
//                         }}
//                       >
//                         <Check className={isComplete ? 'neon-green' : ''} size={16} color={isComplete ? '#00E27B' : 'var(--text-secondary)'} />
//                       </button>
//                     ) : (
//                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
//                         <button style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
//                           <Minus size={14} />
//                         </button>
//                         <strong style={{ fontSize: '16px', color: 'var(--text-primary)', minWidth: '24px', textAlign: 'center' }}>
//                           {task.progress}
//                         </strong>
//                         <button style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0, 122, 255, 0.2)', border: '1px solid rgba(0, 122, 255, 0.5)', color: '#60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
//                           <Plus size={14} />
//                         </button>
//                       </div>
//                     )}
//                   </div>
//                 </div>

//                 {/* Internal Progress Bar for Numeric Tasks */}
//                 {task.type === 'numeric' && (
//                   <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', width: '100%' }}>
//                     <div 
//                       style={{ 
//                         height: '100%', 
//                         width: `${(task.progress / task.target) * 100}%`, 
//                         background: isComplete ? 'var(--accent-green)' : '#60A5FA', 
//                         transition: 'width 0.4s ease', 
//                         boxShadow: isComplete ? '0 0 8px rgba(0,226,123,0.5)' : '0 0 8px rgba(96,165,250,0.5)' 
//                       }} 
//                     />
//                   </div>
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// }

// "use client";
// import React, { useState } from 'react';
// import { Settings, X, LayoutDashboard, Activity, Camera, CalendarCheck, CheckCircle2 } from 'lucide-react';
// import Link from 'next/link';

// export default function ClientDashboard() {
//   const [isRightMenuOpen, setIsRightMenuOpen] = useState(false);

//   return (
//     <>
//       {/* MOBILE ONLY: Right-side trigger button */}
//       <div className="md:hidden"> 
//         <button 
//           onClick={() => setIsRightMenuOpen(true)}
//           className="mobile-header-right-btn"
//         >
//           <Settings size={26} color="#fff" />
//         </button>
//       </div>

//       {/* Glassmorphism Right Drawer for Athlete Tools */}
//       <aside className={`sub-sidebar ${isRightMenuOpen ? 'mobile-open' : ''}`}>
//         <div className="sidebar-header border-b border-white/10 pb-4">
//           <h2 className="premium-ambient-title" style={{ fontSize: '20px' }}>Client Tools</h2>
//           <button onClick={() => setIsRightMenuOpen(false)} className="icon-btn">
//             <X size={28} color="#fff" />
//           </button>
//         </div>
        
//         <nav className="flex flex-col gap-2 mt-4">
//           <Link href="/client" onClick={() => setIsRightMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 bg-white/10 border border-white/5 text-white rounded-xl shadow-lg">
//             <LayoutDashboard size={20} className="text-green-400" />
//             <span className="font-medium">Dashboard</span>
//           </Link>
//           <Link href="/client/plan" onClick={() => setIsRightMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-white/70 hover:text-white">
//             <Activity size={20} />
//             <span className="font-medium">My Plan</span>
//           </Link>
//           <Link href="/client/photos" onClick={() => setIsRightMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-white/70 hover:text-white">
//             <Camera size={20} />
//             <span className="font-medium">Progress Photos</span>
//           </Link>
//           <Link href="/client/checkin" onClick={() => setIsRightMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-white/70 hover:text-white">
//             <CalendarCheck size={20} />
//             <span className="font-medium">Check-In</span>
//           </Link>
//         </nav>
//       </aside>

//       {/* Invisible overlay to close right drawer */}
//       {isRightMenuOpen && (
//         <div className="mobile-overlay md:hidden" onClick={() => setIsRightMenuOpen(false)} />
//       )}

//       {/* Main Dashboard Content */}
//       <div className="container" style={{ maxWidth: '800px' }}>
//         <div className="app-card fade-in">
          
//           <div className="section-header" style={{ marginBottom: '32px' }}>
//             <div>
//               <h2 className="animated-gradient-text" style={{ fontSize: '28px', textTransform: 'none', marginBottom: '8px' }}>Athlete Portal</h2>
//               <span className="label-text" style={{ color: 'var(--text-secondary)', textTransform: 'none' }}>Your daily progress and active plans.</span>
//             </div>
//           </div>

//           {/* Example Athlete Dashboard UI */}
//           <div className="results-summary">
//             <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Today's Training</h3>
//             <div className="plan-cards-container">
              
//               <div className="plan-card">
//                 <div className="plan-card-left">
//                   <span className="plan-item-name">Dryland Core Conditioning</span>
//                   <span className="plan-item-category">McGill Big 3 & Supine Pelvic Tilts</span>
//                 </div>
//                 <div className="plan-card-right">
//                   <CheckCircle2 size={24} className="text-green-400" />
//                 </div>
//               </div>

//               <div className="plan-card">
//                 <div className="plan-card-left">
//                   <span className="plan-item-name">Push-Pull-Legs Routine</span>
//                   <span className="plan-item-category">Machine Presses & Dumbbell Movements</span>
//                 </div>
//                 <div className="plan-card-right">
//                   <span style={{ 
//                     fontSize: '10px', 
//                     fontWeight: '800', 
//                     color: '#E5B869', 
//                     background: 'rgba(229, 184, 105, 0.1)',
//                     padding: '4px 8px',
//                     borderRadius: '4px',
//                     border: '1px solid rgba(229, 184, 105, 0.3)'
//                   }}>
//                     PENDING
//                   </span>
//                 </div>
//               </div>

//             </div>
//           </div>

//         </div>
//       </div>
//     </>
//   );
// }


// ==================================
"use client";
import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { dashboardAPI } from '@/services/api';

export default function AthleteDashboard() {
  const [athleteData, setAthleteData] = useState<{ todayTraining: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Fetching via the centralized API service
        const data = await dashboardAPI.getAthleteData('athlete-123'); 
        setAthleteData(data);
      } catch (error) {
        console.error("Failed to fetch athlete data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  return (
    <>

      {/* Main Dashboard Content */}
      <div className="container" style={{ maxWidth: '800px' }}>
        <div className="app-card fade-in">
          
          <div className="section-header" style={{ marginBottom: '32px' }}>
            <div>
              <h2 className="animated-gradient-text" style={{ fontSize: '28px', textTransform: 'none', marginBottom: '8px' }}>Athlete Portal</h2>
              <span className="label-text" style={{ color: 'var(--text-secondary)', textTransform: 'none' }}>Your daily progress and active plans.</span>
            </div>
          </div>

          <div className="results-summary">
            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Today's Training</h3>
            
            {isLoading || !athleteData ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Training Plan...</div>
            ) : (
              <div className="plan-cards-container">
                {athleteData.todayTraining.length === 0 && (
                  <div style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>No training scheduled for today yet.</div>
                )}
                {athleteData.todayTraining.map((training: any) => (
                  <GlassCard 
                    key={training.id}
                    title={training.title}
                    subtitle={training.subtitle}
                    statusText={training.statusText}
                    statusColor={training.statusColor}
                    Icon={training.statusText === 'completed' ? CheckCircle2 : Clock}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
// "use client";
// import React, { useState, useEffect } from 'react';
// import { Users, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
// import Link from 'next/link';

// // Map string names from the database to actual React components
// const iconMap: Record<string, any> = {
//   Users,
//   TrendingUp,
//   CheckCircle2,
//   AlertCircle
// };

// export default function CoachDashboard() {
//   const [dashboardData, setDashboardData] = useState<{ stats: any[], recentActivity: any[] } | null>(null);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     const fetchDashboard = async () => {
//       try {
//         // Replace with your live API Gateway URL. 
//         // We are using a mock coachId "coach-123" for now.
//         const response = await fetch('<API_URL>/coach/coach-123/dashboard');
//         if (!response.ok) throw new Error('Failed to fetch coach dashboard');
        
//         const data = await response.json();
//         setDashboardData(data);
//       } catch (error) {
//         console.error(error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchDashboard();
//   }, []);

//   return (
//     <div className="container" style={{ maxWidth: '800px' }}>
//       <div className="app-card fade-in">
        
//         {/* Header */}
//         <div className="section-header" style={{ justifyContent: 'space-between', marginBottom: '32px' }}>
//           <div>
//             <h2 className="animated-gradient-text" style={{ fontSize: '28px', textTransform: 'none', marginBottom: '8px' }}>Overview</h2>
//             <span className="label-text" style={{ color: 'var(--text-secondary)', textTransform: 'none' }}>Here is what is happening with your clients today.</span>
//           </div>
//           <Link href="/admin/onboarding" className="btn-primary" style={{ padding: '10px 20px', flex: 'none', fontSize: '12px', background: 'rgba(0, 122, 255, 0.2)', color: '#60A5FA', border: '1px solid rgba(0, 122, 255, 0.5)', textDecoration: 'none' }}>
//             + Add Client
//           </Link>
//         </div>

//         {isLoading || !dashboardData ? (
//           <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Coach Metrics...</div>
//         ) : (
//           <>
//             {/* KPI Stats */}
//             <div className="results-summary">
//               <div className="macro-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
//                 {dashboardData.stats.map((stat, idx) => {
//                   const IconComponent = iconMap[stat.icon];
//                   return (
//                     <div key={idx} className="macro-pill" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '16px', gap: '12px' }}>
//                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
//                         {IconComponent && <IconComponent size={18} color={stat.glowColor} />}
//                         <span className="plan-item-category" style={{ margin: 0 }}>{stat.label}</span>
//                       </div>
//                       <strong className={stat.isPulse ? "pulse-text" : ""} style={{ fontSize: '24px', color: stat.glowColor }}>
//                         {stat.value}
//                       </strong>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>

//             {/* Activity Feed Header */}
//             <div className="section-header" style={{ marginBottom: '16px', marginTop: '32px' }}>
//               <h2 style={{ fontSize: '15px' }}>Recent Client Activity</h2>
//             </div>

//             {/* Activity Feed Container */}
//             <div className="plan-cards-container">
//               {dashboardData.recentActivity.map((activity) => (
//                 <div key={activity.id} className="plan-card">
//                   <div className="plan-card-left">
//                     <span className="plan-item-name">{activity.client}</span>
//                     <span className="plan-item-category">{activity.action}</span>
//                   </div>
//                   <div className="plan-card-right" style={{ alignItems: 'flex-end', gap: '6px' }}>
//                     <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{activity.time}</span>
//                     <span style={{ 
//                       fontSize: '10px', 
//                       fontWeight: '800', 
//                       color: activity.status === 'completed' ? 'var(--accent-green)' : '#FF453A', 
//                       letterSpacing: '1px',
//                       background: activity.status === 'completed' ? 'rgba(0, 226, 123, 0.1)' : 'rgba(255, 69, 58, 0.1)',
//                       padding: '4px 8px',
//                       borderRadius: '4px',
//                       border: `1px solid ${activity.status === 'completed' ? 'rgba(0, 226, 123, 0.3)' : 'rgba(255, 69, 58, 0.3)'}`
//                     }}>
//                       {activity.status.toUpperCase()}
//                     </span>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </>
//         )}

//       </div>
//     </div>
//   );
// }
// ================================================================================================
"use client";
import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Activity } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { dashboardAPI } from '@/services/api';


export default function CoachDashboard() {
  const [dashboardData, setDashboardData] = useState<{ stats: any[], recentActivity: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Fetching via the centralized API service
        const data = await dashboardAPI.getCoachData('coach-123'); 
        setDashboardData(data);
      } catch (error) {
        console.error("Failed to fetch coach data:", error);
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
          
          <div className="section-header" style={{ justifyContent: 'space-between', marginBottom: '32px' }}>
            <div>
              <h2 className="animated-gradient-text" style={{ fontSize: '28px', textTransform: 'none', marginBottom: '8px' }}>Overview</h2>
              <span className="label-text" style={{ color: 'var(--text-secondary)', textTransform: 'none' }}>Here is what is happening with your clients today.</span>
            </div>
          </div>

          {isLoading || !dashboardData ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Coach Metrics...</div>
          ) : (
            <>
              {/* Activity Feed Header */}
              <div className="section-header" style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '15px' }}>Recent Client Activity</h2>
              </div>

              {/* Activity Feed Container using Universal GlassCards */}
              <div className="plan-cards-container">
                {dashboardData.recentActivity.map((activity: any) => (
                  <GlassCard 
                    key={activity.id}
                    title={activity.client}
                    subtitle={activity.action}
                    statusText={activity.status}
                    statusColor={activity.status === 'completed' ? 'green' : 'red'}
                    Icon={activity.status === 'completed' ? CheckCircle2 : AlertCircle}
                  />
                ))}
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}

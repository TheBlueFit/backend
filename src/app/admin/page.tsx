// "use client";
// import React, { useState, useEffect } from 'react';
// import { Shield, Users, Activity, Database, Plus, Edit2, Trash2, Key, PieChart, Utensils, X, Save, RefreshCw } from 'lucide-react';
// import Link from 'next/link';

// export default function AdminDashboard() {
//   const [activeTab, setActiveTab] = useState<'users' | 'services' | 'analytics'>('users');
//   const [dbUsers, setDbUsers] = useState<any[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [fetchError, setFetchError] = useState<string | null>(null);

//   // Fetch live users from DynamoDB on mount
//   useEffect(() => {
//     const fetchUsers = async () => {
//       try {
//         setIsLoading(true);
//         setFetchError(null);
        
//         const apiUrl = process.env.NEXT_PUBLIC_API_URL;
//         if (!apiUrl) throw new Error("API URL is missing in environment variables.");

//         const response = await fetch(`${apiUrl}/admin/users`);
        
//         if (!response.ok) {
//           const errorPayload = await response.json().catch(() => ({}));
//           throw new Error(errorPayload.error || `AWS Backend Error: ${response.status}`);
//         }
        
//         const data = await response.json();
//         setDbUsers(data);
//       } catch (error: any) {
//         console.error("Fetch failed:", error);
//         setFetchError(error.message || "Failed to load users.");
//       } finally {
//         setIsLoading(false);
//       }
//     };
    
//     fetchUsers();
//   }, []);

//   // --- NEW: Delete User Logic ---
//   const handleDeleteUser = async (userId: string) => {
//     if (!confirm("Are you sure you want to delete this user?")) return;
    
//     try {
//       const apiUrl = process.env.NEXT_PUBLIC_API_URL;
//       const response = await fetch(`${apiUrl}/admin/users/${userId}`, {
//         method: 'DELETE',
//       });

//       if (!response.ok) throw new Error('Failed to delete user');

//       // Instantly remove the user from the UI
//       setDbUsers((prevUsers) => prevUsers.filter((user) => user.PK !== userId));
//     } catch (error) {
//       console.error("Error deleting user:", error);
//       alert("Failed to delete user. Please try again.");
//     }
//   };

//   // --- NEW: Assign Coach Logic ---
//   const handleAssignCoach = async (clientId: string, selectedCoachId: string) => {
//     if (!selectedCoachId) return;

//     try {
//       const apiUrl = process.env.NEXT_PUBLIC_API_URL;
//       const response = await fetch(`${apiUrl}/admin/users/${clientId}/assign`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ coachId: selectedCoachId }),
//       });

//       if (!response.ok) throw new Error('Failed to assign coach');

//       // Instantly update the UI to show the assigned coach
//       setDbUsers((prevUsers) => 
//         prevUsers.map((user) => 
//           user.PK === clientId ? { ...user, coachId: selectedCoachId } : user
//         )
//       );
//       alert("Coach assigned successfully!");
//     } catch (error) {
//       console.error("Error assigning coach:", error);
//       alert("Failed to assign coach.");
//     }
//   };

//   // Get only the coaches for the assignment dropdown
//   const coaches = dbUsers.filter(u => u.role === 'COACH');

//   // Mock Admin KPIs
//   const stats = [
//     { label: 'Total Users', value: dbUsers.length.toString(), icon: Users, glowColor: 'var(--text-primary)' },
//     { label: 'Active Coaches', value: coaches.length.toString(), icon: Shield, glowColor: 'var(--blue)' },
//     { label: 'Generated Diets', value: '840', icon: Utensils, glowColor: 'var(--accent-gold)' },
//     { label: 'System Health', value: '99.9%', icon: Activity, glowColor: 'var(--accent-green)', isPulse: true },
//   ];

//   return (
//     <div className="container" style={{ maxWidth: '1000px' }}>
//       <div className="app-card fade-in">
        
//         {/* Header */}
//         <div className="section-header" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
//           <div>
//             <h1 className="glazy-title" style={{ fontSize: '32px', textTransform: 'none', marginBottom: '8px', margin: 0 }}>{`Welcome, ${currentUserName}`}</h1>
//             <p className="label-text" style={{ textTransform: 'none', color: 'var(--text-secondary)', letterSpacing: '0', fontSize: '14px', margin: 0 }}>Global system oversight, user access management, and core services.</p>
//           </div>
//           <button 
//             onClick={fetchUsers} 
//             className="btn-primary" 
//             style={{ padding: '10px 20px', flex: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgb(var(--gold-rgb) / 0.15)', color: 'var(--accent-gold)', border: '1px solid rgb(var(--gold-rgb) / 0.4)', cursor: 'pointer' }}
//           >
//             <Database size={16} /> Sync Database
//           </button>
//         </div>

//         {/* Global KPIs */}
//         <div className="results-summary" style={{ marginBottom: '32px' }}>
//           <div className="macro-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
//             {stats.map((stat, idx) => (
//               <div key={idx} className="macro-pill" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '16px', gap: '12px' }}>
//                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
//                   <stat.icon size={18} color={stat.glowColor} />
//                   <span className="plan-item-category" style={{ margin: 0 }}>{stat.label}</span>
//                 </div>
//                 <strong className={stat.isPulse ? "pulse-text" : ""} style={{ fontSize: '24px', color: stat.glowColor }}>
//                   {stat.value}
//                 </strong>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Admin Navigation Tabs */}
//         <div className="button-row" style={{ marginBottom: '24px', flex: 'none', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
//           <button 
//             className={activeTab === 'users' ? 'btn-primary' : 'btn-secondary'} 
//             onClick={() => setActiveTab('users')}
//             style={{ padding: '12px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
//           >
//             <Users size={16} /> Directory (Access)
//           </button>
//           <button 
//             className={activeTab === 'services' ? 'btn-primary' : 'btn-secondary'} 
//             onClick={() => setActiveTab('services')}
//             style={{ padding: '12px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
//           >
//             <Utensils size={16} /> Core Services
//           </button>
//           <button 
//             className={activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'} 
//             onClick={() => setActiveTab('analytics')}
//             style={{ padding: '12px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
//           >
//             <PieChart size={16} /> Monthly Analysis
//           </button>
//         </div>

//         {/* TAB 1: User & Access Management */}
//         {activeTab === 'users' && (
//           <div className="fade-in">
//             <div className="section-header" style={{ justifyContent: 'space-between', marginBottom: '16px' }}>
//               <h2 style={{ fontSize: '16px' }}>User Directory</h2>
//               <Link href="/admin/onboarding" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
//                 <Plus size={14} /> Provision User
//               </Link>
//             </div>
            
//             <div className="plan-cards-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
//               {isLoading ? (
//                 <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Syncing Database...</div>
//               ) : fetchError ? (
//                 <div style={{ padding: '24px', textAlign: 'center', color: 'var(--danger)', background: 'rgb(var(--red-rgb) / 0.1)', borderRadius: '8px', border: '1px solid rgb(var(--red-rgb) / 0.3)' }}>
//                   Error: {fetchError}. Make sure your API is deployed and the URL in your .env file is correct.
//                 </div>
//               ) : dbUsers.length === 0 ? (
//                 <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No users found. Provision one to get started.</div>
//               ) : (
//                 dbUsers.map((user) => (
//                   <div key={user.PK} className="plan-card">
//                     <div className="plan-card-left">
//                       <span className="plan-item-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//                         {user.name || 'Unnamed User'}
//                         {user.role === 'COACH' && <Shield size={14} color="var(--blue)" />}
//                       </span>
//                       <span className="plan-item-category">
//                         {user.role || 'UNKNOWN'} • ID: <span style={{ color: 'var(--text-secondary)' }}>{user.PK ? user.PK.split('#')[1] : 'N/A'}</span>
//                       </span>
//                     </div>
                    
//                     <div className="plan-card-right" style={{ flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                      
//                       {/* NEW: Coach Assignment Dropdown for Clients */}
//                       {user.role === 'CLIENT' && (
//                         <select
//                           value={user.coachId || ""}
//                           onChange={(e) => handleAssignCoach(user.PK, e.target.value)}
//                           style={{
//                             background: 'var(--bg-input)',
//                             border: '1px solid var(--border-subtle)',
//                             color: 'var(--text-primary)',
//                             padding: '6px 10px',
//                             borderRadius: '8px',
//                             fontSize: '12px',
//                             cursor: 'pointer'
//                           }}
//                         >
//                           <option value="" disabled>Assign Coach...</option>
//                           {coaches.map(coach => (
//                             <option key={coach.PK} value={coach.PK}>{coach.name}</option>
//                           ))}
//                         </select>
//                       )}

//                       <button style={{ background: 'rgb(var(--blue-rgb) / 0.1)', border: '1px solid rgb(var(--blue-rgb) / 0.3)', color: 'var(--blue)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }} title="Manage Access Level">
//                         <Key size={14} />
//                       </button>
//                       <button style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }} title="Edit User">
//                         <Edit2 size={14} />
//                       </button>

//                       {/* NEW: Wired Delete Button */}
//                       <button 
//                         onClick={() => handleDeleteUser(user.PK)}
//                         style={{ background: 'rgb(var(--red-rgb) / 0.1)', border: '1px solid rgb(var(--red-rgb) / 0.3)', color: 'var(--danger)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }} 
//                         title="Delete/Suspend User"
//                       >
//                         <Trash2 size={14} />
//                       </button>

//                     </div>
//                   </div>
//                 ))
//               )}
//             </div>
//           </div>
//         )}

//         {/* TAB 2: Core Services */}
//         {activeTab === 'services' && (
//           <div className="fade-in">
//              <div className="section-header" style={{ marginBottom: '16px' }}>
//               <h2 style={{ fontSize: '16px' }}>Master Tools</h2>
//             </div>
//             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              
//               <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
//                 <div style={{ width: '48px', height: '48px', background: 'rgb(var(--gold-rgb) / 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgb(var(--gold-rgb) / 0.3)' }}>
//                   <Utensils className="neon-orange" size={24} />
//                 </div>
//                 <div>
//                   <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>Master Diet Orchestrator</h3>
//                   <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Access the core AWS generation engine to build and assign universal diet plans bypassing client restrictions.</p>
//                 </div>
//                 <Link href="/client/diet" className="btn-secondary" style={{ textAlign: 'center', textDecoration: 'none', marginTop: 'auto' }}>
//                   Launch Orchestrator
//                 </Link>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* TAB 3: Analytics */}
//         {activeTab === 'analytics' && (
//           <div className="fade-in">
//             <div className="section-header" style={{ marginBottom: '16px' }}>
//               <h2 style={{ fontSize: '16px' }}>Platform Analytics</h2>
//             </div>
//             <div className="error-banner" style={{ background: 'rgb(var(--green-rgb) / 0.1)', borderColor: 'rgb(var(--green-rgb) / 0.3)', color: 'var(--text-primary)', textAlign: 'left', marginBottom: '24px' }}>
//               <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--accent-green)' }}>Monthly Report Ready</strong>
//               <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
//                 System-wide analysis is complete. Client retention is up 12% and average adherence sits at 78%.
//               </span>
//             </div>
//           </div>
//         )}

//       </div>
//     </div>
//   );
// }

"use client";
import React, { useState, useEffect } from 'react';
import { Shield, Users, Activity, Database, Plus, Edit2, Trash2, Key, PieChart, Utensils, X, Save, RefreshCw, Monitor } from 'lucide-react';
import Link from 'next/link';
import { AdminMonitor, authSession, dashboardAPI } from '@/services/api';

export default function AdminDashboard() {
  const [currentUserName, setCurrentUserName] = useState("Administrator");
  const [activeTab, setActiveTab] = useState<'users' | 'services' | 'analytics'>('users');
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [resetResult, setResetResult] = useState<{ userCode: string; tempPassword: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [monitor, setMonitor] = useState<AdminMonitor | null>(null);

  useEffect(() => {
    const syncCurrentUser = () => {
      setCurrentUserName(authSession.get()?.name?.trim() || "Administrator");
    };

    syncCurrentUser();
    window.addEventListener("bluefit:auth-change", syncCurrentUser);
    return () => window.removeEventListener("bluefit:auth-change", syncCurrentUser);
  }, []);

  // Fetch live users from DynamoDB on mount
  // Fix 8: fetchUsers hoisted so Sync Database button can call it directly
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const data = await dashboardAPI.getAllUsers();
      setDbUsers(data);
    } catch (error: any) {
      console.error("Fetch failed:", error);
      setFetchError(error.message || "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Live platform numbers (who is online, inactive, unassigned…) from the same source as the Monitor page
  useEffect(() => {
    let alive = true;
    const load = () => dashboardAPI.getAdminMonitor().then((m) => alive && setMonitor(m)).catch(() => {});
    load();
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30_000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    
    try {
      await dashboardAPI.deleteUser(userId);

      setDbUsers((prevUsers) => prevUsers.filter((user) => user.PK !== userId));
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user. Please try again.");
    }
  };

  const handleAssignCoach = async (clientId: string, selectedCoachId: string) => {
    if (!selectedCoachId) return;

    try {
      await dashboardAPI.assignCoach(clientId, selectedCoachId);

      setDbUsers((prevUsers) => 
        prevUsers.map((user) => 
          user.PK === clientId ? { ...user, coachId: selectedCoachId } : user
        )
      );
      alert("Coach assigned successfully!");
    } catch (error) {
      console.error("Error assigning coach:", error);
      alert("Failed to assign coach.");
    }
  };

  const coaches = dbUsers.filter(u => u.role === 'COACH');

  const openEditUser = (user: any) => {
    setEditingUser(user);
    setResetResult(null);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      status: user.status || 'ACTIVE',
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      setIsSaving(true);
      const payload = {
        ...editForm,
        age: editForm.age === '' ? undefined : Number(editForm.age),
        height: editForm.height === '' ? undefined : Number(editForm.height),
        weight: editForm.weight === '' ? undefined : Number(editForm.weight),
      };
      const result = await dashboardAPI.updateUser(editingUser.PK, payload);
      setDbUsers(prev => prev.map(u => u.PK === editingUser.PK ? { ...u, ...result.user } : u));
      setEditingUser(null);
    } catch (error: any) {
      alert(error?.message || 'Failed to update user.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (user: any) => {
    if (!confirm(`Generate a new temporary password for ${user.name || user.PK}?`)) return;
    try {
      setIsResetting(true);
      setResetResult(null);
      const result = await dashboardAPI.resetUserPassword(user.PK);
      setResetResult({ userCode: result.userCode, tempPassword: result.tempPassword });
      setDbUsers(prev => prev.map(u => u.PK === user.PK ? { ...u, mustChangePassword: true, status: 'ACTIVE' } : u));
    } catch (error: any) {
      alert(error?.message || 'Failed to reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  const stats = [
    { label: 'Total Users', value: dbUsers.length.toString(), icon: Users, glowColor: 'var(--text-primary)' },
    { label: 'Active Coaches', value: coaches.length.toString(), icon: Shield, glowColor: 'var(--blue)' },
    { label: 'Clients', value: dbUsers.filter((u) => u.role === 'CLIENT').length.toString(), icon: Utensils, glowColor: 'var(--accent-gold)' },
    { label: 'Online Now', value: monitor ? String(monitor.summary.onlineNow) : '—', icon: Activity, glowColor: 'var(--accent-green)', isPulse: true },
  ];

  return (
    <>

      {/* Main Admin Dashboard Content */}
      <div className="container" style={{ maxWidth: '1000px' }}>
        <div className="app-card fade-in">
          
          <div className="section-header" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ minWidth: 0, flex: '1 1 260px' }}>
              <h1 className="glazy-title" style={{ fontSize: '32px', textTransform: 'none', marginBottom: '8px', margin: 0 }}>{`Welcome, ${currentUserName}`}</h1>
              <p className="label-text" style={{ textTransform: 'none', color: 'var(--text-secondary)', letterSpacing: '0', fontSize: '14px', margin: 0 }}>Global system oversight, user access management, and core services.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/admin/monitor" className="btn-secondary" style={{ padding: '10px 20px', flex: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <Monitor size={16} /> Monitor
            </Link>
            <button 
              onClick={fetchUsers} 
              className="btn-primary" 
              style={{ padding: '10px 20px', flex: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgb(var(--gold-rgb) / 0.15)', color: 'var(--accent-gold)', border: '1px solid rgb(var(--gold-rgb) / 0.4)', cursor: 'pointer' }}
            >
              <Database size={16} /> Sync Database
            </button>
            </div>
          </div>

          <div className="results-summary" style={{ marginBottom: '32px' }}>
            <div className="macro-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              {stats.map((stat, idx) => (
                <div key={idx} className="macro-pill" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '16px', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <stat.icon size={18} color={stat.glowColor} />
                    <span className="plan-item-category" style={{ margin: 0 }}>{stat.label}</span>
                  </div>
                  <strong className={stat.isPulse ? "pulse-text" : ""} style={{ fontSize: '24px', color: stat.glowColor }}>
                    {stat.value}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          <div className="button-row admin-tabs" style={{ marginBottom: '24px', flex: 'none', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
            <button 
              className={`${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'} admin-tab`} 
              onClick={() => setActiveTab('users')}
              style={{ padding: '12px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Users size={16} /> Directory (Access)
            </button>
            <button 
              className={`${activeTab === 'services' ? 'btn-primary' : 'btn-secondary'} admin-tab`} 
              onClick={() => setActiveTab('services')}
              style={{ padding: '12px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Utensils size={16} /> Core Services
            </button>
            <button 
              className={`${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'} admin-tab`} 
              onClick={() => setActiveTab('analytics')}
              style={{ padding: '12px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <PieChart size={16} /> Platform Analytics
            </button>
          </div>

          {activeTab === 'users' && (
            <div className="fade-in">
              <div className="section-header" style={{ justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px' }}>User Directory</h2>
                <Link href="/admin/onboarding" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                  <Plus size={14} /> Provision User
                </Link>
              </div>
              
              <div className="plan-cards-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {isLoading ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Syncing Database...</div>
                ) : fetchError ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--danger)', background: 'rgb(var(--red-rgb) / 0.1)', borderRadius: '8px', border: '1px solid rgb(var(--red-rgb) / 0.3)' }}>
                    Error: {fetchError}. Make sure your API is deployed and the URL in your .env file is correct.
                  </div>
                ) : dbUsers.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No users found. Provision one to get started.</div>
                ) : (
                  dbUsers.map((user) => (
                    <div key={user.PK} className="plan-card user-row">
                      <div className="plan-card-left">
                        <span className="plan-item-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {user.name || 'Unnamed User'}
                          {user.role === 'COACH' && <Shield size={14} color="var(--blue)" />}
                        </span>
                        <span className="plan-item-category">
                          {user.role || 'UNKNOWN'} • ID: <span style={{ color: 'var(--text-secondary)' }}>{user.PK ? user.PK.split('#')[1] : 'N/A'}</span>
                        </span>
                      </div>
                      
                      <div className="plan-card-right user-row-actions" style={{ flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                        {user.role === 'CLIENT' && (
                          <select
                            value={user.coachId || ""}
                            onChange={(e) => handleAssignCoach(user.PK, e.target.value)}
                            style={{
                              background: 'var(--bg-input)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-primary)',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="" disabled>Assign Coach...</option>
                            {coaches.map(coach => (
                              <option key={coach.PK} value={coach.PK}>{coach.name}</option>
                            ))}
                          </select>
                        )}

                        <button
                          onClick={() => handleResetPassword(user)}
                          disabled={isResetting || user.role === 'ADMIN'}
                          style={{ background: 'rgb(var(--blue-rgb) / 0.1)', border: '1px solid rgb(var(--blue-rgb) / 0.3)', color: 'var(--blue)', padding: '8px', borderRadius: '8px', cursor: user.role === 'ADMIN' ? 'not-allowed' : 'pointer', opacity: user.role === 'ADMIN' ? 0.45 : 1 }}
                          title="Generate temporary password"
                        >
                          {isResetting ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
                        </button>
                        <button
                          onClick={() => openEditUser(user)}
                          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                          title="Edit User"
                        >
                          <Edit2 size={14} />
                        </button>

                        <button 
                          onClick={() => handleDeleteUser(user.PK)}
                          style={{ background: 'rgb(var(--red-rgb) / 0.1)', border: '1px solid rgb(var(--red-rgb) / 0.3)', color: 'var(--danger)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }} 
                          title="Delete/Suspend User"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="fade-in">
               <div className="section-header" style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px' }}>Master Tools</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                
                <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', background: 'rgb(var(--gold-rgb) / 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgb(var(--gold-rgb) / 0.3)' }}>
                    <Utensils className="neon-orange" size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>Master Diet Orchestrator</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Access the core AWS generation engine to build and assign universal diet plans bypassing client restrictions.</p>
                  </div>
                  <Link href="/client/diet" className="btn-secondary" style={{ textAlign: 'center', textDecoration: 'none', marginTop: 'auto' }}>
                    Launch Orchestrator
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="fade-in">
              <div className="section-header" style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px' }}>Platform Analytics</h2>
              </div>
              {monitor ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  {[
                    { label: 'Active today', value: monitor.summary.activeToday, color: 'var(--blue)' },
                    { label: 'Online now', value: monitor.summary.onlineNow, color: 'var(--accent-green)' },
                    { label: 'Inactive 7d+', value: monitor.summary.inactive7d, color: 'var(--danger)' },
                    { label: 'Never signed in', value: monitor.summary.neverSignedIn, color: 'var(--text-secondary)' },
                    { label: 'Clients without a coach', value: monitor.summary.unassignedClients, color: 'var(--accent-gold)' },
                    { label: 'Locked / disabled', value: monitor.summary.lockedAccounts + monitor.summary.disabledAccounts, color: 'var(--danger)' },
                  ].map((m) => (
                    <div key={m.label} className="macro-pill" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '16px', gap: '10px' }}>
                      <span className="plan-item-category" style={{ margin: 0 }}>{m.label}</span>
                      <strong style={{ fontSize: '24px', color: m.color }}>{m.value}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading platform numbers…</div>
              )}
              <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Live figures, refreshed every 30 seconds. Open the <Link href="/admin/monitor" style={{ color: 'var(--accent-gold)' }}>Monitor</Link> for per-user detail.
              </p>
            </div>
          )}

        </div>
      </div>

      {resetResult && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgb(var(--well-rgb) / 0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="app-card" style={{ width: 'min(460px, 100%)', padding: '26px' }}>
            <div className="section-header" style={{ justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <div className="label-text" style={{ color: 'var(--accent-gold)' }}>PASSWORD RESET</div>
                <h3 style={{ marginTop: '6px' }}>Temporary password generated</h3>
              </div>
              <button onClick={() => setResetResult(null)} style={{ background: 'transparent', border: 0, color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>Give this password to the user securely. It will only be shown here now, and the user must replace it at their next sign-in.</p>
            <div style={{ marginTop: '18px', padding: '16px', borderRadius: '12px', background: 'rgb(var(--gold-rgb) / 0.08)', border: '1px solid rgb(var(--gold-rgb) / 0.25)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>USER</div>
              <strong>{resetResult.userCode}</strong>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '14px', marginBottom: '6px' }}>TEMPORARY PASSWORD</div>
              <code style={{ fontSize: '20px', letterSpacing: '0.08em', color: 'var(--accent-gold)' }}>{resetResult.tempPassword}</code>
            </div>
            <button className="btn-primary" onClick={() => setResetResult(null)} style={{ marginTop: '18px', width: '100%' }}>Done</button>
          </div>
        </div>
      )}

      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgb(var(--well-rgb) / 0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="app-card" style={{ width: 'min(620px, 100%)', maxHeight: '90vh', overflowY: 'auto', padding: '26px' }}>
            <div className="section-header" style={{ justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div className="label-text" style={{ color: 'var(--accent-gold)' }}>USER MANAGEMENT</div>
                <h3 style={{ marginTop: '6px' }}>Edit {editingUser.name || editingUser.userCode}</h3>
              </div>
              <button onClick={() => setEditingUser(null)} style={{ background: 'transparent', border: 0, color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {['name', 'email'].map(key => (
                <label key={key} style={{ display: 'grid', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{key}</span>
                  <input value={editForm[key] ?? ''} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '9px' }} />
                </label>
              ))}
              <label style={{ display: 'grid', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>STATUS</span>
                <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '9px' }}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
              <button className="btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveUser} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><Save size={15} /> {isSaving ? 'Saving...' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
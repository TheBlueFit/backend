// "use client";
// import React, { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { Dumbbell, Activity, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
// import { dashboardAPI, UserSession } from '@/services/api';

// export default function OpeningLoginPage() {
//   const router = useRouter();

//   // Opening screen only shows CLIENT and COACH options
//   const [selectedRole, setSelectedRole] = useState<'CLIENT' | 'COACH'>('CLIENT');
//   const [identifier, setIdentifier] = useState('');
//   const [password, setPassword] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // First-time user setup state (triggered when mustChangePassword is true)
//   const [pendingUser, setPendingUser] = useState<UserSession | null>(null);
//   const [setupStep, setSetupStep] = useState<1 | 2>(1);
//   const [newPassword, setNewPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');

//   // Client Initial Onboarding Fields
//   const [age, setAge] = useState('');
//   const [height, setHeight] = useState('');
//   const [weight, setWeight] = useState('');
//   const [primaryGoal, setPrimaryGoal] = useState('Muscle Building');
//   const [medicalNotes, setMedicalNotes] = useState('');

//   // Coach Initial Onboarding Fields
//   const [specialization, setSpecialization] = useState('Strength & Conditioning');
//   const [experienceYears, setExperienceYears] = useState('');
//   const [certifications, setCertifications] = useState('');

//   const routeByRole = (role: 'CLIENT' | 'COACH' | 'ADMIN') => {
//     if (role === 'CLIENT') router.push('/client');
//     else if (role === 'COACH') router.push('/coach');
//     else router.push('/admin');
//   };

//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError(null);
//     setLoading(true);
//     try {
//       const user = await dashboardAPI.login(selectedRole, identifier, password);
//       if (user.mustChangePassword || user.onboardingCompleted === false) {
//         setPendingUser(user);
//         setSetupStep(1);
//       } else {
//         routeByRole(user.role);
//       }
//     } catch (err: any) {
//       setError(err.message || 'Invalid ID or Password.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handlePasswordStepNext = (e: React.FormEvent) => {
//     e.preventDefault();
//     setError(null);
//     if (newPassword.length < 6) {
//       setError('New password must be at least 6 characters.');
//       return;
//     }
//     if (newPassword !== confirmPassword) {
//       setError('Passwords do not match.');
//       return;
//     }
//     if (newPassword === password) {
//       setError('Please choose a password different from your temporary password.');
//       return;
//     }
//     setSetupStep(2);
//   };

//   const handleCompleteOnboarding = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!pendingUser) return;
//     setError(null);
//     setLoading(true);
//     try {
//       const extraData =
//         pendingUser.role === 'CLIENT'
//           ? {
//               age: age ? Number(age) : undefined,
//               height: height ? Number(height) : undefined,
//               weight: weight ? Number(weight) : undefined,
//               primaryGoal,
//               medicalNotes,
//             }
//           : {
//               specialization,
//               experienceYears: experienceYears ? Number(experienceYears) : undefined,
//               certifications,
//             };

//       const updatedUser = await dashboardAPI.completeFirstTimeSetup({
//         userId: pendingUser.PK,
//         currentPassword: password,
//         newPassword,
//         ...extraData,
//       });

//       routeByRole(updatedUser.role);
//     } catch (err: any) {
//       setError(err.message || 'Failed to save onboarding details.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const inputStyle: React.CSSProperties = {
//     width: '100%',
//     padding: '14px 16px',
//     backgroundColor: 'var(--bg-input)',
//     border: '1px solid var(--border-subtle)',
//     borderRadius: 'var(--radius-md)',
//     color: 'var(--text-primary)',
//     fontSize: '14px',
//     outline: 'none',
//   };

//   return (
//     <div className="container" style={{ maxWidth: '500px', justifyContent: 'center' }}>
//       <div className="app-card fade-in" style={{ justifyContent: 'center' }}>
//         <div style={{ textAlign: 'center', marginBottom: '28px' }}>
//           <h1 className="glazy-title" style={{ fontSize: '36px', marginBottom: '8px' }}>
//             The Blue Fit
//           </h1>
//           <p className="label-text" style={{ textTransform: 'none', fontSize: '14px' }}>
//             {!pendingUser
//               ? 'Select your portal and sign in with your Admin-issued credentials.'
//               : `Welcome ${pendingUser.name} (${pendingUser.userCode}) — Complete your initial setup.`}
//           </p>
//         </div>

//         {/* ==================== OPENING LOGIN SCREEN ==================== */}
//         {!pendingUser && (
//           <form onSubmit={handleLogin} className="fade-in">
//             {/* Role Selector: ONLY Athlete & Coach shown */}
//             <div className="button-row" style={{ marginTop: 0, marginBottom: '24px' }}>
//               <button
//                 type="button"
//                 className={selectedRole === 'CLIENT' ? 'btn-primary' : 'btn-secondary'}
//                 onClick={() => {
//                   setSelectedRole('CLIENT');
//                   setError(null);
//                 }}
//                 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}
//               >
//                 <Activity size={16} /> Athlete (Client)
//               </button>
//               <button
//                 type="button"
//                 className={selectedRole === 'COACH' ? 'btn-primary' : 'btn-secondary'}
//                 onClick={() => {
//                   setSelectedRole('COACH');
//                   setError(null);
//                 }}
//                 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}
//               >
//                 <Dumbbell size={16} /> Coach Portal
//               </button>
//             </div>

//             <div className="form-grid">
//               <div className="input-group">
//                 <label className="label-text">
//                   {selectedRole === 'CLIENT' ? 'Athlete ID (e.g. CLS001)' : 'Coach ID (e.g. CHR001)'}
//                 </label>
//                 <input
//                   type="text"
//                   required
//                   placeholder={selectedRole === 'CLIENT' ? 'Enter CLS001 or Email' : 'Enter CHR001 or Email'}
//                   value={identifier}
//                   onChange={(e) => setIdentifier(e.target.value)}
//                   style={inputStyle}
//                 />
//               </div>

//               <div className="input-group">
//                 <label className="label-text">Password</label>
//                 <input
//                   type="password"
//                   required
//                   placeholder="Enter your password (or Admin temp password)"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   style={inputStyle}
//                 />
//               </div>
//             </div>

//             {error && <div className="error-banner">{error}</div>}

//             <div className="button-row mt-24">
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="btn-primary full-width"
//                 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
//               >
//                 {loading ? 'Signing In...' : `Sign In as ${selectedRole === 'CLIENT' ? 'Athlete' : 'Coach'}`}
//                 <ArrowRight size={16} />
//               </button>
//             </div>
//           </form>
//         )}

//         {/* ==================== FIRST-TIME SETUP: PASSWORD + ONBOARDING ==================== */}
//         {pendingUser && (
//           <div className="fade-in">
//             <div className="progress-container">
//               <div className="progress-line">
//                 <div className="progress-line-fill" style={{ width: setupStep === 1 ? '50%' : '100%' }} />
//               </div>
//               <div className="progress-step">
//                 <div className={`progress-dot ${setupStep >= 1 ? 'active' : ''}`} />
//                 <span className={`progress-label ${setupStep === 1 ? 'active-label' : ''}`}>1. Set Password</span>
//               </div>
//               <div className="progress-step">
//                 <div className={`progress-dot ${setupStep >= 2 ? 'active' : ''}`} />
//                 <span className={`progress-label ${setupStep === 2 ? 'active-label' : ''}`}>2. Initial Onboarding</span>
//               </div>
//             </div>

//             {setupStep === 1 && (
//               <form onSubmit={handlePasswordStepNext} className="fade-in">
//                 <div className="section-header">
//                   <div className="step-badge">1</div>
//                   <h2>Create Your Personal Password</h2>
//                 </div>

//                 <div className="form-grid">
//                   <div className="input-group">
//                     <label className="label-text">New Password</label>
//                     <input
//                       type="password"
//                       required
//                       placeholder="Minimum 6 characters"
//                       value={newPassword}
//                       onChange={(e) => setNewPassword(e.target.value)}
//                       style={inputStyle}
//                     />
//                   </div>
//                   <div className="input-group">
//                     <label className="label-text">Confirm New Password</label>
//                     <input
//                       type="password"
//                       required
//                       placeholder="Re-enter new password"
//                       value={confirmPassword}
//                       onChange={(e) => setConfirmPassword(e.target.value)}
//                       style={inputStyle}
//                     />
//                   </div>
//                 </div>

//                 {error && <div className="error-banner">{error}</div>}

//                 <div className="button-row mt-24">
//                   <button type="submit" className="btn-primary full-width">
//                     Next: Complete Initial Profile
//                   </button>
//                 </div>
//               </form>
//             )}

//             {setupStep === 2 && (
//               <form onSubmit={handleCompleteOnboarding} className="fade-in">
//                 <div className="section-header">
//                   <div className="step-badge">2</div>
//                   <h2>{pendingUser.role === 'CLIENT' ? 'Athlete Baseline Onboarding' : 'Coach Profile Onboarding'}</h2>
//                 </div>

//                 {pendingUser.role === 'CLIENT' ? (
//                   <div className="form-grid">
//                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
//                       <div className="input-group">
//                         <label className="label-text">Age</label>
//                         <input
//                           type="number"
//                           required
//                           placeholder="26"
//                           value={age}
//                           onChange={(e) => setAge(e.target.value)}
//                           style={inputStyle}
//                         />
//                       </div>
//                       <div className="input-group">
//                         <label className="label-text">Height (cm)</label>
//                         <input
//                           type="number"
//                           required
//                           placeholder="175"
//                           value={height}
//                           onChange={(e) => setHeight(e.target.value)}
//                           style={inputStyle}
//                         />
//                       </div>
//                       <div className="input-group">
//                         <label className="label-text">Weight (kg)</label>
//                         <input
//                           type="number"
//                           step="0.1"
//                           required
//                           placeholder="72.5"
//                           value={weight}
//                           onChange={(e) => setWeight(e.target.value)}
//                           style={inputStyle}
//                         />
//                       </div>
//                     </div>

//                     <div className="input-group">
//                       <label className="label-text">Primary Fitness Goal</label>
//                       <select value={primaryGoal} onChange={(e) => setPrimaryGoal(e.target.value)} style={inputStyle}>
//                         <option value="Muscle Building">Muscle Building & Hypertrophy</option>
//                         <option value="Fat Loss">Fat Loss & Conditioning</option>
//                         <option value="Core Stability">Core Stability & Injury Prevention</option>
//                         <option value="Maintenance">Strength & Maintenance</option>
//                       </select>
//                     </div>

//                     <div className="input-group">
//                       <label className="label-text">Medical / Injury Notes (Optional)</label>
//                       <input
//                         type="text"
//                         placeholder="e.g. Lower back care"
//                         value={medicalNotes}
//                         onChange={(e) => setMedicalNotes(e.target.value)}
//                         style={inputStyle}
//                       />
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="form-grid">
//                     <div className="input-group">
//                       <label className="label-text">Coaching Specialization</label>
//                       <select value={specialization} onChange={(e) => setSpecialization(e.target.value)} style={inputStyle}>
//                         <option value="Strength & Conditioning">Strength & Conditioning</option>
//                         <option value="Hypertrophy & Bodybuilding">Hypertrophy & Bodybuilding</option>
//                         <option value="Sports Nutrition & Macros">Sports Nutrition & Macros</option>
//                         <option value="Core Rehab & Mobility">Core Rehab & Mobility</option>
//                       </select>
//                     </div>

//                     <div className="input-group">
//                       <label className="label-text">Years of Experience</label>
//                       <input
//                         type="number"
//                         required
//                         placeholder="5"
//                         value={experienceYears}
//                         onChange={(e) => setExperienceYears(e.target.value)}
//                         style={inputStyle}
//                       />
//                     </div>

//                     <div className="input-group">
//                       <label className="label-text">Certifications</label>
//                       <input
//                         type="text"
//                         placeholder="e.g. CSCS, ISSA"
//                         value={certifications}
//                         onChange={(e) => setCertifications(e.target.value)}
//                         style={inputStyle}
//                       />
//                     </div>
//                   </div>
//                 )}

//                 {error && <div className="error-banner">{error}</div>}

//                 <div className="button-row mt-24">
//                   <button type="button" onClick={() => setSetupStep(1)} className="btn-secondary">
//                     Back
//                   </button>
//                   <button type="submit" disabled={loading} className="btn-primary">
//                     {loading ? 'Saving Profile...' : 'Finish & Enter Dashboard'}
//                   </button>
//                 </div>
//               </form>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


// ====================================================================

// "use client";
// import React, { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { Camera, Upload, Activity, Scale, Briefcase, Dumbbell, Lock, ArrowRight } from 'lucide-react';
// import { dashboardAPI, UserSession } from '@/services/api';

// export default function OpeningPortalPage() {
//   const router = useRouter();

//   // Opening screen role toggle (Only CLIENT and COACH shown)
//   const [selectedRole, setSelectedRole] = useState<'CLIENT' | 'COACH'>('CLIENT');
//   const [identifier, setIdentifier] = useState('');
//   const [password, setPassword] = useState('');
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // First-time login state (Step 1: Set New Password -> Step 2: Metrics -> Step 3: 3-Day Log)
//   const [pendingUser, setPendingUser] = useState<UserSession | null>(null);
//   const [currentStep, setCurrentStep] = useState(1);
//   const [activeDay, setActiveDay] = useState('Day 1');
//   const [newPassword, setNewPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');

//   // Coach Onboarding Fields
//   const [coachSpecialization, setCoachSpecialization] = useState('hypertrophy');

//   // Client Onboarding Fields (Matching your ProvisioningForm)
//   const [age, setAge] = useState('');
//   const [height, setHeight] = useState('');
//   const [weight, setWeight] = useState('');
//   const [activityLevel, setActivityLevel] = useState('sedentary');
//   const [primaryGoal, setPrimaryGoal] = useState('fat_loss');
//   const [medicalNotes, setMedicalNotes] = useState('');

//   const inputStyle = {
//     width: '100%',
//     padding: '14px',
//     background: 'rgba(0,0,0,0.4)',
//     border: '1px solid var(--border-subtle)',
//     borderRadius: 'var(--radius-sm)',
//     color: 'var(--text-primary)',
//     outline: 'none',
//     fontSize: '15px',
//     marginTop: '8px',
//     transition: 'border-color 0.2s ease'
//   };

//   const selectBg = 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23888888%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")';

//   const days = ['Day 1', 'Day 2', 'Day 3'];
//   const meals = ['Breakfast', 'Brunch', 'Lunch', 'Snacks', 'Dinner'];

//   const routeByRole = (role: 'CLIENT' | 'COACH' | 'ADMIN') => {
//     if (role === 'CLIENT') router.push('/client');
//     else if (role === 'COACH') router.push('/coach');
//     else router.push('/admin');
//   };

//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError(null);
//     setIsSubmitting(true);
//     try {
//       const user = await dashboardAPI.login(selectedRole, identifier, password);
//       if (user.mustChangePassword || user.onboardingCompleted === false) {
//         setPendingUser(user);
//         setCurrentStep(1);
//       } else {
//         routeByRole(user.role);
//       }
//     } catch (err: any) {
//       setError(err.message || 'Invalid ID or Password.');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handlePasswordStep = (e: React.FormEvent) => {
//     e.preventDefault();
//     setError(null);
//     if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
//       setError('Use at least 8 characters, with both letters and numbers.');
//       return;
//     }
//     if (newPassword !== confirmPassword) {
//       setError('Passwords do not match.');
//       return;
//     }
//     if (newPassword === password) {
//       setError('New password must be different from your temporary password.');
//       return;
//     }
//     setCurrentStep(2);
//   };

//   const handleFinalSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!pendingUser) return;
//     setError(null);
//     setIsSubmitting(true);

//     try {
//       const extraPayload = pendingUser.role === 'COACH'
//         ? { specialization: coachSpecialization }
//         : {
//             age: Number(age),
//             height: Number(height),
//             weight: Number(weight),
//             activityLevel,
//             primaryGoal,
//             medicalNotes,
//           };

//       const updated = await dashboardAPI.completeFirstTimeSetup({
//         userId: pendingUser.PK,
//         currentPassword: password,
//         newPassword,
//         ...extraPayload,
//       });

//       routeByRole(updated.role);
//     } catch (err: any) {
//       setError(err.message || 'Failed to complete onboarding.');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <div className="container" style={{ maxWidth: pendingUser ? '800px' : '500px', justifyContent: 'center' }}>
//       <div className="app-card fade-in">
//         {/* Header */}
//         <div className="section-header" style={{ flexDirection: 'column', alignItems: pendingUser ? 'flex-start' : 'center', gap: '4px', marginBottom: '32px', textAlign: pendingUser ? 'left' : 'center' }}>
//           <h1 className="animated-gradient-text" style={{ fontSize: '32px', textTransform: 'none' }}>
//             {pendingUser ? `Welcome, ${pendingUser.name} (${pendingUser.userCode})` : 'The Blue Fit'}
//           </h1>
//           <p className="label-text" style={{ textTransform: 'none', color: 'var(--text-secondary)', letterSpacing: '0', fontSize: '14px' }}>
//             {pendingUser
//               ? 'Set your personal password and complete your initial baseline profile.'
//               : 'Select your portal and sign in with your Admin-issued ID & password.'}
//           </p>
//         </div>

//         {/* ==================== OPENING LOGIN VIEW ==================== */}
//         {!pendingUser && (
//           <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
//             <div className="button-row" style={{ marginTop: 0 }}>
//               <button
//                 type="button"
//                 className={selectedRole === 'CLIENT' ? 'btn-primary' : 'btn-secondary'}
//                 onClick={() => { setSelectedRole('CLIENT'); setError(null); }}
//                 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}
//               >
//                 <Activity size={16} /> Athlete / Client
//               </button>
//               <button
//                 type="button"
//                 className={selectedRole === 'COACH' ? 'btn-primary' : 'btn-secondary'}
//                 onClick={() => { setSelectedRole('COACH'); setError(null); }}
//                 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}
//               >
//                 <Dumbbell size={16} /> Coach / Trainer
//               </button>
//             </div>

//             <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
//               <div>
//                 <label className="label-text">
//                   {selectedRole === 'CLIENT' ? 'Athlete User ID (e.g. CLS001)' : 'Coach User ID (e.g. CHR001)'}
//                 </label>
//                 <input
//                   type="text"
//                   required
//                   value={identifier}
//                   onChange={(e) => setIdentifier(e.target.value)}
//                   style={inputStyle}
//                   placeholder={selectedRole === 'CLIENT' ? 'CLS001' : 'CHR001'}
//                 />
//               </div>

//               <div>
//                 <label className="label-text">Password</label>
//                 <input
//                   type="password"
//                   required
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   style={inputStyle}
//                   placeholder="Enter password (or Admin temp password)"
//                 />
//               </div>
//             </div>

//             {error && <div className="error-banner">{error}</div>}

//             <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
//               {isSubmitting ? 'Verifying...' : `Enter ${selectedRole === 'CLIENT' ? 'Athlete' : 'Coach'} Portal`}
//               <ArrowRight size={16} />
//             </button>
//           </form>
//         )}

//         {/* ==================== FIRST-TIME SETUP & ONBOARDING ==================== */}
//         {pendingUser && (
//           <>
//             <div className="progress-container">
//               <div className="progress-line">
//                 <div
//                   className="progress-line-fill"
//                   style={{
//                     width: currentStep === 1 ? '33%' : currentStep === 2 ? '66%' : '100%'
//                   }}
//                 />
//               </div>
//               <div className="progress-step">
//                 <div className={`progress-dot ${currentStep >= 1 ? 'active' : ''}`} />
//                 <span className={`progress-label ${currentStep >= 1 ? 'active-label' : ''}`}>Password</span>
//               </div>
//               <div className="progress-step">
//                 <div className={`progress-dot ${currentStep >= 2 ? 'active' : ''}`} />
//                 <span className={`progress-label ${currentStep >= 2 ? 'active-label' : ''}`}>Metrics</span>
//               </div>
//               {pendingUser.role === 'CLIENT' && (
//                 <div className="progress-step">
//                   <div className={`progress-dot ${currentStep >= 3 ? 'active' : ''}`} />
//                   <span className={`progress-label ${currentStep >= 3 ? 'active-label' : ''}`}>3-Day Log</span>
//                 </div>
//               )}
//             </div>

//             {/* STEP 1: Change Temporary Password */}
//             {currentStep === 1 && (
//               <form onSubmit={handlePasswordStep} className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
//                 <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
//                   <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
//                     <Lock size={18} color="var(--accent-gold)" /> Set Your New Password
//                   </h3>
//                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
//                     <div>
//                       <label className="label-text">New Password</label>
//                       <input
//                         type="password"
//                         required
//                         value={newPassword}
//                         onChange={(e) => setNewPassword(e.target.value)}
//                         style={inputStyle}
//                         placeholder="Minimum 6 characters"
//                       />
//                     </div>
//                     <div>
//                       <label className="label-text">Confirm New Password</label>
//                       <input
//                         type="password"
//                         required
//                         value={confirmPassword}
//                         onChange={(e) => setConfirmPassword(e.target.value)}
//                         style={inputStyle}
//                         placeholder="Re-enter new password"
//                       />
//                     </div>
//                   </div>
//                 </div>

//                 {error && <div className="error-banner">{error}</div>}

//                 <button type="submit" className="btn-primary">
//                   Continue to Initial Onboarding
//                 </button>
//               </form>
//             )}

//             {/* STEP 2: Coach Profile OR Client Physical & Lifestyle Metrics */}
//             {currentStep === 2 && (
//               <form onSubmit={handleFinalSubmit} className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
//                 {pendingUser.role === 'COACH' ? (
//                   <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
//                     <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
//                       <Briefcase size={18} color="var(--accent-gold)" /> Coach Profile
//                     </h3>
//                     <div>
//                       <label className="label-text">Primary Specialization</label>
//                       <select
//                         value={coachSpecialization}
//                         onChange={(e) => setCoachSpecialization(e.target.value)}
//                         style={{...inputStyle, WebkitAppearance: 'none', backgroundImage: selectBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px top 50%', backgroundSize: '10px auto'}}
//                       >
//                         <option value="hypertrophy" style={{ background: '#111' }}>Muscle Hypertrophy & Bodybuilding</option>
//                         <option value="nutrition" style={{ background: '#111' }}>Clinical Nutrition & Fat Loss</option>
//                         <option value="mobility" style={{ background: '#111' }}>Mobility & Injury Rehab</option>
//                         <option value="powerlifting" style={{ background: '#111' }}>Strength & Powerlifting</option>
//                       </select>
//                     </div>
//                     <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: '24px', width: '100%' }}>
//                       {isSubmitting ? 'Saving...' : 'Complete Setup & Enter Coach Portal'}
//                     </button>
//                   </div>
//                 ) : (
//                   <>
//                     <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
//                       <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
//                         <Scale size={18} color="var(--accent-gold)" /> Physical Attributes
//                       </h3>
//                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
//                         <div>
//                           <label className="label-text">Age</label>
//                           <input type="number" required value={age} onChange={(e) => setAge(e.target.value)} style={inputStyle} placeholder="e.g. 28" />
//                         </div>
//                         <div>
//                           <label className="label-text">Height (cm)</label>
//                           <input type="number" step="0.1" required value={height} onChange={(e) => setHeight(e.target.value)} style={inputStyle} placeholder="e.g. 175" />
//                         </div>
//                         <div>
//                           <label className="label-text">Current Weight (kg)</label>
//                           <input type="number" step="0.1" required value={weight} onChange={(e) => setWeight(e.target.value)} style={inputStyle} placeholder="e.g. 82.5" />
//                         </div>
//                       </div>
//                     </div>

//                     <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
//                       <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
//                         <Activity size={18} color="#60A5FA" /> Lifestyle & Health
//                       </h3>
//                       <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
//                         <div>
//                           <label className="label-text">Daily Activity Level</label>
//                           <select
//                             value={activityLevel}
//                             onChange={(e) => setActivityLevel(e.target.value)}
//                             style={{...inputStyle, WebkitAppearance: 'none', backgroundImage: selectBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px top 50%', backgroundSize: '10px auto'}}
//                           >
//                             <option value="sedentary" style={{ background: '#111' }}>Sedentary (Desk job, minimal movement)</option>
//                             <option value="moderate" style={{ background: '#111' }}>Moderately Active (3-5 workouts/week)</option>
//                             <option value="high" style={{ background: '#111' }}>Very Active (Heavy training / active work)</option>
//                           </select>
//                         </div>
//                         <div>
//                           <label className="label-text">Primary Fitness Goal</label>
//                           <select
//                             value={primaryGoal}
//                             onChange={(e) => setPrimaryGoal(e.target.value)}
//                             style={{...inputStyle, WebkitAppearance: 'none', backgroundImage: selectBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px top 50%', backgroundSize: '10px auto'}}
//                           >
//                             <option value="fat_loss" style={{ background: '#111' }}>Fat Loss & Definition</option>
//                             <option value="hypertrophy" style={{ background: '#111' }}>Muscle Hypertrophy</option>
//                             <option value="recomp" style={{ background: '#111' }}>Body Recomposition</option>
//                           </select>
//                         </div>
//                         <div>
//                           <label className="label-text">Medical Notes / Limitations</label>
//                           <textarea
//                             rows={3}
//                             value={medicalNotes}
//                             onChange={(e) => setMedicalNotes(e.target.value)}
//                             style={{ ...inputStyle, resize: 'none' }}
//                             placeholder="List any past injuries or dietary restrictions..."
//                           />
//                         </div>
//                       </div>
//                     </div>

//                     <button
//                       type="button"
//                       disabled={!age || !height || !weight}
//                       onClick={() => setCurrentStep(3)}
//                       className="btn-primary"
//                     >
//                       Continue to 3-Day Food Log
//                     </button>
//                   </>
//                 )}
//               </form>
//             )}

//             {/* STEP 3: 3-Day Diet Recall (Clients Only) */}
//             {currentStep === 3 && pendingUser.role === 'CLIENT' && (
//               <form onSubmit={handleFinalSubmit} className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
//                 <div className="button-row" style={{ marginTop: 0 }}>
//                   {days.map((day) => (
//                     <button
//                       key={day}
//                       type="button"
//                       className={activeDay === day ? 'btn-primary' : 'btn-secondary'}
//                       onClick={() => setActiveDay(day)}
//                       style={{ padding: '12px', flex: 1 }}
//                     >
//                       {day}
//                     </button>
//                   ))}
//                 </div>

//                 <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
//                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
//                     <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', fontWeight: '600', margin: 0 }}>
//                       <Camera size={18} color="#60A5FA" /> {activeDay} Dietary Recall
//                     </h3>
//                   </div>
//                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
//                     {meals.map((meal) => (
//                       <label
//                         key={`${activeDay}-${meal}`}
//                         style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.2)', cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'center', padding: '12px' }}
//                       >
//                         <Upload size={24} color="var(--text-secondary)" style={{ marginBottom: '12px' }} />
//                         <span className="label-text" style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>{meal}</span>
//                         <input type="file" accept="image/*" style={{ display: 'none' }} />
//                       </label>
//                     ))}
//                   </div>
//                 </div>

//                 {error && <div className="error-banner">{error}</div>}

//                 <div className="button-row" style={{ marginTop: '8px' }}>
//                   <button type="button" onClick={() => setCurrentStep(2)} className="btn-secondary">
//                     Back
//                   </button>
//                   <button type="submit" disabled={isSubmitting} className="btn-primary">
//                     {isSubmitting ? 'Saving Assessment...' : 'Save Assessment & Enter Athlete Portal'}
//                   </button>
//                 </div>
//               </form>
//             )}
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

// ====================

"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Upload, Activity, Scale, Briefcase, Dumbbell, Lock, ArrowRight } from 'lucide-react';
import { dashboardAPI, UserSession } from '@/services/api';

export default function OpeningPortalPage() {
  const router = useRouter();

  // Opening screen role toggle
  const [selectedRole, setSelectedRole] = useState<'CLIENT' | 'COACH' | 'ADMIN'>('CLIENT');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // First-time login state (Step 1: Set New Password -> Step 2: Metrics -> Step 3: 3-Day Log)
  const [pendingUser, setPendingUser] = useState<UserSession | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [activeDay, setActiveDay] = useState('Day 1');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Coach Onboarding Fields
  const [coachSpecialization, setCoachSpecialization] = useState('hypertrophy');

  // Client Onboarding Fields (Matching your ProvisioningForm)
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('sedentary');
  const [primaryGoal, setPrimaryGoal] = useState('fat_loss');
  const [medicalNotes, setMedicalNotes] = useState('');

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

  const selectBg = 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23888888%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")';

  const days = ['Day 1', 'Day 2', 'Day 3'];
  const meals = ['Breakfast', 'Brunch', 'Lunch', 'Snacks', 'Dinner'];

  const routeByRole = (role: 'CLIENT' | 'COACH' | 'ADMIN') => {
    if (role === 'CLIENT') router.push('/client');
    else if (role === 'COACH') router.push('/coach');
    else router.push('/admin');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await dashboardAPI.login(selectedRole, identifier, password);
      if (user.mustChangePassword || user.onboardingCompleted === false) {
        setPendingUser(user);
        setCurrentStep(1);
      } else {
        routeByRole(user.role);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid ID or Password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError('Use at least 8 characters, with both letters and numbers.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword === password) {
      setError('New password must be different from your temporary password.');
      return;
    }
    setCurrentStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const extraPayload = pendingUser.role === 'COACH'
        ? { specialization: coachSpecialization }
        : {
            age: Number(age),
            height: Number(height),
            weight: Number(weight),
            activityLevel,
            primaryGoal,
            medicalNotes,
          };

      const updated = await dashboardAPI.completeFirstTimeSetup({
        userId: pendingUser.PK,
        currentPassword: password,
        newPassword,
        ...extraPayload,
      });

      routeByRole(updated.role);
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: pendingUser ? '800px' : '500px', justifyContent: 'center' }}>
      <div className="app-card fade-in">
        {/* Header */}
        <div className="section-header" style={{ flexDirection: 'column', alignItems: pendingUser ? 'flex-start' : 'center', gap: '4px', marginBottom: '32px', textAlign: pendingUser ? 'left' : 'center' }}>
          <h1 className="animated-gradient-text" style={{ fontSize: '32px', textTransform: 'none' }}>
            {pendingUser ? `Welcome, ${pendingUser.name} (${pendingUser.userCode})` : 'The Blue Fit'}
          </h1>
          <p className="label-text" style={{ textTransform: 'none', color: 'var(--text-secondary)', letterSpacing: '0', fontSize: '14px' }}>
            {pendingUser
              ? 'Set your personal password and complete your initial baseline profile.'
              : 'Select your portal and sign in with your Admin-issued ID & password.'}
          </p>
        </div>

        {/* ==================== OPENING LOGIN VIEW ==================== */}
        {!pendingUser && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="button-row" style={{ marginTop: 0 }}>
              <button
                type="button"
                className={selectedRole === 'CLIENT' ? 'btn-primary' : 'btn-secondary'}
                onClick={() => { setSelectedRole('CLIENT'); setError(null); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}
              >
                <Activity size={16} /> Athlete / Client
              </button>
              <button
                type="button"
                className={selectedRole === 'COACH' ? 'btn-primary' : 'btn-secondary'}
                onClick={() => { setSelectedRole('COACH'); setError(null); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}
              >
                <Dumbbell size={16} /> Coach / Trainer
              </button>
              <button
                type="button"
                className={selectedRole === 'ADMIN' ? 'btn-primary' : 'btn-secondary'}
                onClick={() => { setSelectedRole('ADMIN'); setError(null); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}
              >
                <Lock size={16} /> Admin
              </button>
            </div>

            <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label-text">
                  {selectedRole === 'CLIENT'
                    ? 'Athlete User ID (e.g. CLS001)'
                    : selectedRole === 'COACH'
                      ? 'Coach User ID (e.g. CHR001)'
                      : 'Admin User ID (e.g. ADH001)'}
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  style={inputStyle}
                  placeholder={
                    selectedRole === 'CLIENT'
                      ? 'CLS001'
                      : selectedRole === 'COACH'
                        ? 'CHR001'
                        : 'ADH001'
                  }
                />
              </div>

              <div>
                <label className="label-text">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  placeholder="Enter password (or Admin temp password)"
                />
              </div>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {isSubmitting
                ? 'Verifying...'
                : `Enter ${
                    selectedRole === 'CLIENT'
                      ? 'Athlete'
                      : selectedRole === 'COACH'
                        ? 'Coach'
                        : 'Admin'
                  } Portal`}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* ==================== FIRST-TIME SETUP & ONBOARDING ==================== */}
        {pendingUser && (
          <>
            <div className="progress-container">
              <div className="progress-line">
                <div
                  className="progress-line-fill"
                  style={{
                    width: currentStep === 1 ? '33%' : currentStep === 2 ? '66%' : '100%'
                  }}
                />
              </div>
              <div className="progress-step">
                <div className={`progress-dot ${currentStep >= 1 ? 'active' : ''}`} />
                <span className={`progress-label ${currentStep >= 1 ? 'active-label' : ''}`}>Password</span>
              </div>
              <div className="progress-step">
                <div className={`progress-dot ${currentStep >= 2 ? 'active' : ''}`} />
                <span className={`progress-label ${currentStep >= 2 ? 'active-label' : ''}`}>Metrics</span>
              </div>
              {pendingUser.role === 'CLIENT' && (
                <div className="progress-step">
                  <div className={`progress-dot ${currentStep >= 3 ? 'active' : ''}`} />
                  <span className={`progress-label ${currentStep >= 3 ? 'active-label' : ''}`}>3-Day Log</span>
                </div>
              )}
            </div>

            {/* STEP 1: Change Temporary Password */}
            {currentStep === 1 && (
              <form onSubmit={handlePasswordStep} className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
                    <Lock size={18} color="var(--accent-gold)" /> Set Your New Password
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div>
                      <label className="label-text">New Password</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={inputStyle}
                        placeholder="Minimum 6 characters"
                      />
                    </div>
                    <div>
                      <label className="label-text">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={inputStyle}
                        placeholder="Re-enter new password"
                      />
                    </div>
                  </div>
                </div>

                {error && <div className="error-banner">{error}</div>}

                <button type="submit" className="btn-primary">
                  Continue to Initial Onboarding
                </button>
              </form>
            )}

            {/* STEP 2: Coach Profile OR Client Physical & Lifestyle Metrics */}
            {currentStep === 2 && (
              <form onSubmit={handleFinalSubmit} className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {pendingUser.role === 'COACH' ? (
                  <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
                      <Briefcase size={18} color="var(--accent-gold)" /> Coach Profile
                    </h3>
                    <div>
                      <label className="label-text">Primary Specialization</label>
                      <select
                        value={coachSpecialization}
                        onChange={(e) => setCoachSpecialization(e.target.value)}
                        style={{...inputStyle, WebkitAppearance: 'none', backgroundImage: selectBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px top 50%', backgroundSize: '10px auto'}}
                      >
                        <option value="hypertrophy" style={{ background: '#111' }}>Muscle Hypertrophy & Bodybuilding</option>
                        <option value="nutrition" style={{ background: '#111' }}>Clinical Nutrition & Fat Loss</option>
                        <option value="mobility" style={{ background: '#111' }}>Mobility & Injury Rehab</option>
                        <option value="powerlifting" style={{ background: '#111' }}>Strength & Powerlifting</option>
                      </select>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: '24px', width: '100%' }}>
                      {isSubmitting ? 'Saving...' : 'Complete Setup & Enter Coach Portal'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
                        <Scale size={18} color="var(--accent-gold)" /> Physical Attributes
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                        <div>
                          <label className="label-text">Age</label>
                          <input type="number" required value={age} onChange={(e) => setAge(e.target.value)} style={inputStyle} placeholder="e.g. 28" />
                        </div>
                        <div>
                          <label className="label-text">Height (cm)</label>
                          <input type="number" step="0.1" required value={height} onChange={(e) => setHeight(e.target.value)} style={inputStyle} placeholder="e.g. 175" />
                        </div>
                        <div>
                          <label className="label-text">Current Weight (kg)</label>
                          <input type="number" step="0.1" required value={weight} onChange={(e) => setWeight(e.target.value)} style={inputStyle} placeholder="e.g. 82.5" />
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
                        <Activity size={18} color="#60A5FA" /> Lifestyle & Health
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                          <label className="label-text">Daily Activity Level</label>
                          <select
                            value={activityLevel}
                            onChange={(e) => setActivityLevel(e.target.value)}
                            style={{...inputStyle, WebkitAppearance: 'none', backgroundImage: selectBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px top 50%', backgroundSize: '10px auto'}}
                          >
                            <option value="sedentary" style={{ background: '#111' }}>Sedentary (Desk job, minimal movement)</option>
                            <option value="moderate" style={{ background: '#111' }}>Moderately Active (3-5 workouts/week)</option>
                            <option value="high" style={{ background: '#111' }}>Very Active (Heavy training / active work)</option>
                          </select>
                        </div>
                        <div>
                          <label className="label-text">Primary Fitness Goal</label>
                          <select
                            value={primaryGoal}
                            onChange={(e) => setPrimaryGoal(e.target.value)}
                            style={{...inputStyle, WebkitAppearance: 'none', backgroundImage: selectBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px top 50%', backgroundSize: '10px auto'}}
                          >
                            <option value="fat_loss" style={{ background: '#111' }}>Fat Loss & Definition</option>
                            <option value="hypertrophy" style={{ background: '#111' }}>Muscle Hypertrophy</option>
                            <option value="recomp" style={{ background: '#111' }}>Body Recomposition</option>
                          </select>
                        </div>
                        <div>
                          <label className="label-text">Medical Notes / Limitations</label>
                          <textarea
                            rows={3}
                            value={medicalNotes}
                            onChange={(e) => setMedicalNotes(e.target.value)}
                            style={{ ...inputStyle, resize: 'none' }}
                            placeholder="List any past injuries or dietary restrictions..."
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!age || !height || !weight}
                      onClick={() => setCurrentStep(3)}
                      className="btn-primary"
                    >
                      Continue to 3-Day Food Log
                    </button>
                  </>
                )}
              </form>
            )}

            {/* STEP 3: 3-Day Diet Recall (Clients Only) */}
            {currentStep === 3 && pendingUser.role === 'CLIENT' && (
              <form onSubmit={handleFinalSubmit} className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="button-row" style={{ marginTop: 0 }}>
                  {days.map((day) => (
                    <button
                      key={day}
                      type="button"
                      className={activeDay === day ? 'btn-primary' : 'btn-secondary'}
                      onClick={() => setActiveDay(day)}
                      style={{ padding: '12px', flex: 1 }}
                    >
                      {day}
                    </button>
                  ))}
                </div>

                <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', fontWeight: '600', margin: 0 }}>
                      <Camera size={18} color="#60A5FA" /> {activeDay} Dietary Recall
                    </h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                    {meals.map((meal) => (
                      <label
                        key={`${activeDay}-${meal}`}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.2)', cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'center', padding: '12px' }}
                      >
                        <Upload size={24} color="var(--text-secondary)" style={{ marginBottom: '12px' }} />
                        <span className="label-text" style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>{meal}</span>
                        <input type="file" accept="image/*" style={{ display: 'none' }} />
                      </label>
                    ))}
                  </div>
                </div>

                {error && <div className="error-banner">{error}</div>}

                <div className="button-row" style={{ marginTop: '8px' }}>
                  <button type="button" onClick={() => setCurrentStep(2)} className="btn-secondary">
                    Back
                  </button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary">
                    {isSubmitting ? 'Saving Assessment...' : 'Save Assessment & Enter Athlete Portal'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
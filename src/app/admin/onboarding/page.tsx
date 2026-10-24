//  "use client";
// import React, { useState } from 'react';
// import { Camera, CheckCircle2, Upload, Activity, Scale, HeartPulse, Shield, User, Briefcase } from 'lucide-react';
// import Link from 'next/link';

// export default function ProvisioningForm() {
//   const [currentStep, setCurrentStep] = useState(1);
//   const [submitted, setSubmitted] = useState(false);
//   const [activeDay, setActiveDay] = useState('Day 1');
//   const [isSubmitting, setIsSubmitting] = useState(false);
  
//   // Role Selector
//   const [role, setRole] = useState<'CLIENT' | 'COACH'>('CLIENT');

//   // Coach Fields
//   const [coachName, setCoachName] = useState('');
//   const [coachEmail, setCoachEmail] = useState('');
//   const [coachSpecialization, setCoachSpecialization] = useState('hypertrophy');

//   // Client Fields
//   const [clientName, setClientName] = useState('');
//   const [clientEmail, setClientEmail] = useState('');
//   const [age, setAge] = useState('');
//   const [height, setHeight] = useState('');
//   const [weight, setWeight] = useState('');
//   const [activityLevel, setActivityLevel] = useState('sedentary');
//   const [primaryGoal, setPrimaryGoal] = useState('fat_loss');
//   const [medicalNotes, setMedicalNotes] = useState('');

//   // Shared Styles
//   const inputStyle = {
//     width: '100%',
//     padding: '14px',
//     background: 'rgb(var(--well-rgb) / 0.4)',
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

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setIsSubmitting(true);

//     const payload = role === 'COACH' 
//       ? {
//           role: 'COACH',
//           name: coachName,
//           email: coachEmail,
//           specialization: coachSpecialization,
//         }
//       : {
//           role: 'CLIENT',
//           name: clientName,
//           email: clientEmail,
//           age: Number(age),
//           height: Number(height),
//           weight: Number(weight),
//           activityLevel,
//           primaryGoal,
//           medicalNotes,
//         };

//     try {
//       // Point this to your live API Gateway URL
//       const response = await fetch('<API_URL>/admin/onboarding', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload)
//       });

//       if (!response.ok) throw new Error('Failed to provision account');
//       setSubmitted(true);
//     } catch (err) {
//       console.error(err);
//       // Fallback for local testing if API isn't deployed yet
//       setSubmitted(true);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   if (submitted) {
//     return (
//       <div className="container" style={{ maxWidth: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
//         <div className="app-card fade-in" style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
//           <div style={{ width: '80px', height: '80px', background: 'rgb(var(--green-rgb) / 0.1)', border: '1px solid var(--accent-green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', boxShadow: '0 0 15px rgb(var(--green-rgb) / 0.2)' }}>
//             <CheckCircle2 className="neon-green" size={40} color="var(--accent-green)" />
//           </div>
//           <h2 className="glazy-title" style={{ fontSize: '28px', marginBottom: '12px', textTransform: 'none' }}>
//             {role === 'COACH' ? 'Coach Provisioned' : 'Client Profile Stored'}
//           </h2>
//           <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '15px' }}>
//             {role === 'COACH' 
//               ? `Account created for ${coachName || 'Coach'}. Credentials have been registered in DynamoDB.` 
//               : `Baseline metrics for ${clientName || 'Athlete'} successfully initialized.`}
//           </p>
//           <Link href="/admin" className="btn-primary full-width" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
//             Return to Admin Portal
//           </Link>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="container" style={{ maxWidth: '800px' }}>
//       <div className="app-card fade-in">
        
//         {/* Header */}
//         <div className="section-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', marginBottom: '32px' }}>
//           <h1 className="animated-gradient-text" style={{ fontSize: '32px', textTransform: 'none' }}>System Provisioning</h1>
//           <p className="label-text" style={{ textTransform: 'none', color: 'var(--text-secondary)', letterSpacing: '0', fontSize: '14px' }}>Create and configure platform access credentials.</p>
//         </div>

//         {/* Stepper only visible for Clients */}
//         {role === 'CLIENT' && (
//           <div className="progress-container">
//             <div className="progress-line">
//               <div className="progress-line-fill" style={{ width: currentStep === 1 ? '50%' : '100%' }}></div>
//             </div>
//             <div className="progress-step">
//               <div className={`progress-dot ${currentStep >= 1 ? 'active' : ''}`}></div>
//               <span className={`progress-label ${currentStep >= 1 ? 'active-label' : ''}`}>Metrics</span>
//             </div>
//             <div className="progress-step">
//               <div className={`progress-dot ${currentStep >= 2 ? 'active' : ''}`}></div>
//               <span className={`progress-label ${currentStep >= 2 ? 'active-label' : ''}`}>3-Day Log</span>
//             </div>
//           </div>
//         )}

//         <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
//           {/* STEP 1: Main Data Entry */}
//           {currentStep === 1 && (
//             <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
//               {/* Role Selection Dropdown */}
//               <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
//                 <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
//                   <Shield size={18} color="var(--blue)" /> Account Provisioning
//                 </h3>
//                 <div>
//                   <label className="label-text">Select Account Type</label>
//                   <select 
//                     value={role}
//                     onChange={(e) => {
//                       setRole(e.target.value as 'CLIENT' | 'COACH');
//                       setCurrentStep(1);
//                     }}
//                     required 
//                     style={{...inputStyle, WebkitAppearance: 'none', backgroundImage: selectBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px top 50%', backgroundSize: '10px auto'}}
//                   >
//                     <option value="CLIENT" style={{ background: 'var(--bg-elev)' }}>Athlete / Client</option>
//                     <option value="COACH" style={{ background: 'var(--bg-elev)' }}>Coach / Trainer</option>
//                   </select>
//                 </div>
//               </div>

//               {/* COACH FORM BRANCH */}
//               {role === 'COACH' && (
//                 <div className="fade-in" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
//                   <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
//                     <Briefcase size={18} color="var(--accent-gold)" /> Coach Profile
//                   </h3>
//                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
//                     <div>
//                       <label className="label-text">Full Name</label>
//                       <input 
//                         type="text" 
//                         required 
//                         value={coachName}
//                         onChange={(e) => setCoachName(e.target.value)}
//                         style={inputStyle} 
//                         placeholder="e.g. Marcus Vance" 
//                       />
//                     </div>
//                     <div>
//                       <label className="label-text">Email Address</label>
//                       <input 
//                         type="email" 
//                         required 
//                         value={coachEmail}
//                         onChange={(e) => setCoachEmail(e.target.value)}
//                         style={inputStyle} 
//                         placeholder="coach@thebluefit.com" 
//                       />
//                     </div>
//                     <div style={{ gridColumn: '1 / -1' }}>
//                       <label className="label-text">Primary Specialization</label>
//                       <select 
//                         value={coachSpecialization}
//                         onChange={(e) => setCoachSpecialization(e.target.value)}
//                         style={{...inputStyle, WebkitAppearance: 'none', backgroundImage: selectBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px top 50%', backgroundSize: '10px auto'}}
//                       >
//                         <option value="hypertrophy" style={{ background: 'var(--bg-elev)' }}>Muscle Hypertrophy & Bodybuilding</option>
//                         <option value="nutrition" style={{ background: 'var(--bg-elev)' }}>Clinical Nutrition & Fat Loss</option>
//                         <option value="mobility" style={{ background: 'var(--bg-elev)' }}>Mobility & Injury Rehab</option>
//                         <option value="powerlifting" style={{ background: 'var(--bg-elev)' }}>Strength & Powerlifting</option>
//                       </select>
//                     </div>
//                   </div>
//                   <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: '24px', width: '100%' }}>
//                     {isSubmitting ? 'Provisioning...' : 'Provision Coach Credentials'}
//                   </button>
//                 </div>
//               )}

//               {/* CLIENT FORM BRANCH */}
//               {role === 'CLIENT' && (
//                 <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
//                   <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
//                     <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
//                       <User size={18} color="var(--accent-gold)" /> Basic Identity
//                     </h3>
//                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
//                       <div>
//                         <label className="label-text">Full Name</label>
//                         <input 
//                           type="text" 
//                           required 
//                           value={clientName}
//                           onChange={(e) => setClientName(e.target.value)}
//                           style={inputStyle} 
//                           placeholder="e.g. Alex Morgan" 
//                         />
//                       </div>
//                       <div>
//                         <label className="label-text">Email Address</label>
//                         <input 
//                           type="email" 
//                           required 
//                           value={clientEmail}
//                           onChange={(e) => setClientEmail(e.target.value)}
//                           style={inputStyle} 
//                           placeholder="client@email.com" 
//                         />
//                       </div>
//                     </div>
//                   </div>

//                   <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
//                     <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
//                       <Scale size={18} color="var(--accent-gold)" /> Physical Attributes
//                     </h3>
//                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
//                       <div>
//                         <label className="label-text">Age</label>
//                         <input 
//                           type="number" 
//                           required 
//                           value={age}
//                           onChange={(e) => setAge(e.target.value)}
//                           style={inputStyle} 
//                           placeholder="e.g. 28" 
//                         />
//                       </div>
//                       <div>
//                         <label className="label-text">Height (cm)</label>
//                         <input 
//                           type="number" 
//                           step="0.1" 
//                           required 
//                           value={height}
//                           onChange={(e) => setHeight(e.target.value)}
//                           style={inputStyle} 
//                           placeholder="e.g. 175" 
//                         />
//                       </div>
//                       <div>
//                         <label className="label-text">Current Weight (kg)</label>
//                         <input 
//                           type="number" 
//                           step="0.1" 
//                           required 
//                           value={weight}
//                           onChange={(e) => setWeight(e.target.value)}
//                           style={inputStyle} 
//                           placeholder="e.g. 82.5" 
//                         />
//                       </div>
//                     </div>
//                   </div>

//                   <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
//                     <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
//                       <Activity size={18} color="var(--blue)" /> Lifestyle & Health
//                     </h3>
//                     <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
//                       <div>
//                         <label className="label-text">Daily Activity Level</label>
//                         <select 
//                           value={activityLevel}
//                           onChange={(e) => setActivityLevel(e.target.value)}
//                           style={{...inputStyle, WebkitAppearance: 'none', backgroundImage: selectBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px top 50%', backgroundSize: '10px auto'}}
//                         >
//                           <option value="sedentary" style={{ background: 'var(--bg-elev)' }}>Sedentary (Desk job, minimal movement)</option>
//                           <option value="moderate" style={{ background: 'var(--bg-elev)' }}>Moderately Active (3-5 workouts/week)</option>
//                           <option value="high" style={{ background: 'var(--bg-elev)' }}>Very Active (Heavy training / active work)</option>
//                         </select>
//                       </div>
//                       <div>
//                         <label className="label-text">Primary Fitness Goal</label>
//                         <select 
//                           value={primaryGoal}
//                           onChange={(e) => setPrimaryGoal(e.target.value)}
//                           style={{...inputStyle, WebkitAppearance: 'none', backgroundImage: selectBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px top 50%', backgroundSize: '10px auto'}}
//                         >
//                           <option value="fat_loss" style={{ background: 'var(--bg-elev)' }}>Fat Loss & Definition</option>
//                           <option value="hypertrophy" style={{ background: 'var(--bg-elev)' }}>Muscle Hypertrophy</option>
//                           <option value="recomp" style={{ background: 'var(--bg-elev)' }}>Body Recomposition</option>
//                         </select>
//                       </div>
//                       <div>
//                         <label className="label-text">Medical Notes / Limitations</label>
//                         <textarea 
//                           rows={3} 
//                           value={medicalNotes}
//                           onChange={(e) => setMedicalNotes(e.target.value)}
//                           style={{ ...inputStyle, resize: 'none' }} 
//                           placeholder="List any past injuries or dietary restrictions..."
//                         />
//                       </div>
//                     </div>
//                   </div>
                  
//                   <button type="button" onClick={() => setCurrentStep(2)} className="btn-primary" style={{ marginTop: '8px' }}>
//                     Continue to Food Log
//                   </button>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* STEP 2: 3-Day Diet Recall (Clients Only) */}
//           {currentStep === 2 && role === 'CLIENT' && (
//             <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
//               <div className="button-row" style={{ marginTop: 0 }}>
//                 {days.map((day) => (
//                   <button 
//                     key={day}
//                     type="button"
//                     className={activeDay === day ? 'btn-primary' : 'btn-secondary'}
//                     onClick={() => setActiveDay(day)}
//                     style={{ padding: '12px', flex: 1 }}
//                   >
//                     {day}
//                   </button>
//                 ))}
//               </div>

//               <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
//                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
//                   <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', fontWeight: '600', margin: 0 }}>
//                     <Camera size={18} color="var(--blue)" /> {activeDay} Dietary Recall
//                   </h3>
//                 </div>
//                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
//                   {meals.map((meal) => (
//                     <label 
//                       key={`${activeDay}-${meal}`} 
//                       style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'rgb(var(--well-rgb) / 0.2)', cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'center', padding: '12px' }}
//                     >
//                       <Upload size={24} color="var(--text-secondary)" style={{ marginBottom: '12px' }} />
//                       <span className="label-text" style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>{meal}</span>
//                       <input type="file" accept="image/*" style={{ display: 'none' }} />
//                     </label>
//                   ))}
//                 </div>
//               </div>

//               <div className="button-row" style={{ marginTop: '8px' }}>
//                 <button type="button" onClick={() => setCurrentStep(1)} className="btn-secondary">
//                   Back
//                 </button>
//                 <button type="submit" disabled={isSubmitting} className="btn-primary">
//                   {isSubmitting ? 'Saving Profile...' : 'Save Assessment'}
//                 </button>
//               </div>
//             </div>
//           )}

//         </form>
//       </div>
//     </div>
//   );
// }


// =======================================================

"use client";
import React, { useState } from 'react';
import { Camera, CheckCircle2, Upload, Activity, Scale, Shield, User, Briefcase, Copy, Key } from 'lucide-react';
import Link from 'next/link';
import { dashboardAPI } from '@/services/api';

export default function ProvisioningForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [activeDay, setActiveDay] = useState('Day 1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generated Credentials State (ID + Random Temp Password)
  const [generatedCreds, setGeneratedCreds] = useState<{
    userCode: string;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Role Selector
  const [role, setRole] = useState<'CLIENT' | 'COACH'>('CLIENT');

  // Coach Fields
  const [coachName, setCoachName] = useState('');
  const [coachEmail, setCoachEmail] = useState('');
  const [coachSpecialization, setCoachSpecialization] = useState('hypertrophy');

  // Client Fields
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('sedentary');
  const [primaryGoal, setPrimaryGoal] = useState('fat_loss');
  const [medicalNotes, setMedicalNotes] = useState('');

  // Shared Styles (Preserved Intact)
  const inputStyle = {
    width: '100%',
    padding: '14px',
    background: 'rgb(var(--well-rgb) / 0.4)',
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

  const provisionAccount = async (quickProvisionOnly = false) => {
    setError(null);
    setIsSubmitting(true);

    const payload = role === 'COACH'
      ? {
          role: 'COACH',
          name: coachName,
          email: coachEmail,
          specialization: coachSpecialization,
        }
      : {
          role: 'CLIENT',
          name: clientName,
          email: clientEmail,
          ...(age ? { age: Number(age) } : {}),
          ...(height ? { height: Number(height) } : {}),
          ...(weight ? { weight: Number(weight) } : {}),
          activityLevel,
          primaryGoal,
          medicalNotes,
          onboardingCompleted: !quickProvisionOnly && Boolean(age && height && weight),
        };

    try {
      // The server generates the ID and a one-time temporary password (only its hash is stored)
      const data = await dashboardAPI.saveOnboarding(payload);
      setGeneratedCreds({ userCode: data.userCode, tempPassword: data.tempPassword });
      setSubmitted(true);
    } catch (err: any) {
      // Never invent credentials: if the server did not create the account, say so
      setError(err.message || 'Could not provision this account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await provisionAccount(false);
  };

  const handleCopyCredentials = () => {
    if (!generatedCreds) return;
    const targetName = role === 'COACH' ? coachName : clientName;
    navigator.clipboard.writeText(
      `The Blue Fit Login Credentials\nName: ${targetName}\nRole: ${role}\nUser ID: ${generatedCreds.userCode}\nTemporary Password: ${generatedCreds.tempPassword}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (submitted) {
    return (
      <div className="container" style={{ maxWidth: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="app-card fade-in" style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgb(var(--green-rgb) / 0.1)', border: '1px solid var(--accent-green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', boxShadow: '0 0 15px rgb(var(--green-rgb) / 0.2)' }}>
            <CheckCircle2 className="neon-green" size={40} color="var(--accent-green)" />
          </div>
          <h2 className="glazy-title" style={{ fontSize: '28px', marginBottom: '12px', textTransform: 'none' }}>
            {role === 'COACH' ? 'Coach Provisioned' : 'Client Provisioned'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px' }}>
            Share these credentials with <strong style={{ color: 'var(--text-primary)' }}>{role === 'COACH' ? coachName : clientName}</strong>. They will be prompted to change this temporary password and complete onboarding on first sign-in.
          </p>

          {/* Generated User ID & Temporary Password Cards */}
          {generatedCreds && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', textAlign: 'left' }}>
              <div className="plan-card" style={{ padding: '16px 20px' }}>
                <div className="plan-card-left">
                  <span className="plan-item-category">Assigned User ID</span>
                  <span className="plan-item-name" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-gold)', letterSpacing: '1px' }}>
                    {generatedCreds.userCode}
                  </span>
                </div>
                <span className="plan-item-category">{role}</span>
              </div>

              <div className="plan-card" style={{ padding: '16px 20px' }}>
                <div className="plan-card-left">
                  <span className="plan-item-category">One-Time Temporary Password</span>
                  <span className="plan-item-name" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-green)', letterSpacing: '1px' }}>
                    {generatedCreds.tempPassword}
                  </span>
                </div>
                <Key size={20} color="var(--accent-green)" />
              </div>
            </div>
          )}

          <div className="button-row" style={{ marginTop: 0 }}>
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Copy size={16} /> {copied ? 'Copied!' : 'Copy ID & Password'}
            </button>
            <Link href="/admin" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', textAlign: 'center' }}>
              Return to Admin Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div className="app-card fade-in">
        
        {/* Header */}
        <div className="section-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', marginBottom: '32px' }}>
          <h1 className="animated-gradient-text" style={{ fontSize: '32px', textTransform: 'none' }}>System Provisioning</h1>
          <p className="label-text" style={{ textTransform: 'none', color: 'var(--text-secondary)', letterSpacing: '0', fontSize: '14px' }}>Create and configure platform access credentials.</p>
        </div>

        {/* Stepper only visible for Clients */}
        {role === 'CLIENT' && (
          <div className="progress-container">
            <div className="progress-line">
              <div className="progress-line-fill" style={{ width: currentStep === 1 ? '50%' : '100%' }}></div>
            </div>
            <div className="progress-step">
              <div className={`progress-dot ${currentStep >= 1 ? 'active' : ''}`}></div>
              <span className={`progress-label ${currentStep >= 1 ? 'active-label' : ''}`}>Metrics</span>
            </div>
            <div className="progress-step">
              <div className={`progress-dot ${currentStep >= 2 ? 'active' : ''}`}></div>
              <span className={`progress-label ${currentStep >= 2 ? 'active-label' : ''}`}>3-Day Log</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {error && <div className="error-banner">{error}</div>}
          
          {/* STEP 1: Main Data Entry */}
          {currentStep === 1 && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Role Selection Dropdown */}
              <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
                  <Shield size={18} color="var(--blue)" /> Account Provisioning
                </h3>
                <div>
                  <label className="label-text">Select Account Type</label>
                  <select 
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value as 'CLIENT' | 'COACH');
                      setCurrentStep(1);
                    }}
                    required 
                    style={{...inputStyle, WebkitAppearance: 'none', backgroundImage: selectBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px top 50%', backgroundSize: '10px auto'}}
                  >
                    <option value="CLIENT" style={{ background: 'var(--bg-elev)' }}>Athlete / Client</option>
                    <option value="COACH" style={{ background: 'var(--bg-elev)' }}>Coach / Trainer</option>
                  </select>
                </div>
              </div>

              {/* COACH FORM BRANCH */}
              {role === 'COACH' && (
                <div className="fade-in" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
                    <Briefcase size={18} color="var(--accent-gold)" /> Coach Profile
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div>
                      <label className="label-text">Full Name</label>
                      <input 
                        type="text" 
                        required 
                        value={coachName}
                        onChange={(e) => setCoachName(e.target.value)}
                        style={inputStyle} 
                        placeholder="e.g. Marcus Vance" 
                      />
                    </div>
                    <div>
                      <label className="label-text">Email Address</label>
                      <input 
                        type="email" 
                        required 
                        value={coachEmail}
                        onChange={(e) => setCoachEmail(e.target.value)}
                        style={inputStyle} 
                        placeholder="coach@thebluefit.com" 
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="label-text">Primary Specialization</label>
                      <select 
                        value={coachSpecialization}
                        onChange={(e) => setCoachSpecialization(e.target.value)}
                        style={{...inputStyle, WebkitAppearance: 'none', backgroundImage: selectBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px top 50%', backgroundSize: '10px auto'}}
                      >
                        <option value="hypertrophy" style={{ background: 'var(--bg-elev)' }}>Muscle Hypertrophy & Bodybuilding</option>
                        <option value="nutrition" style={{ background: 'var(--bg-elev)' }}>Clinical Nutrition & Fat Loss</option>
                        <option value="mobility" style={{ background: 'var(--bg-elev)' }}>Mobility & Injury Rehab</option>
                        <option value="powerlifting" style={{ background: 'var(--bg-elev)' }}>Strength & Powerlifting</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: '24px', width: '100%' }}>
                    {isSubmitting ? 'Provisioning...' : 'Provision Coach Credentials'}
                  </button>
                </div>
              )}

              {/* CLIENT FORM BRANCH */}
              {role === 'CLIENT' && (
                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
                      <User size={18} color="var(--accent-gold)" /> Basic Identity
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      <div>
                        <label className="label-text">Full Name</label>
                        <input 
                          type="text" 
                          required 
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          style={inputStyle} 
                          placeholder="e.g. Suresh" 
                        />
                      </div>
                      <div>
                        <label className="label-text">Email Address</label>
                        <input 
                          type="email" 
                          required 
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          style={inputStyle} 
                          placeholder="client@email.com" 
                        />
                      </div>
                    </div>

                    {/* Quick Provision Button: Generates ID & Temp Password immediately so Client fills metrics on 1st login */}
                    <button
                      type="button"
                      disabled={isSubmitting || !clientName.trim() || !clientEmail.trim()}
                      onClick={() => provisionAccount(true)}
                      className="btn-secondary"
                      style={{ marginTop: '20px', width: '100%', height: 'auto', minHeight: '48px', padding: '12px 16px', whiteSpace: 'normal', lineHeight: 1.35, border: '1px solid rgb(var(--gold-rgb) / 0.4)', color: 'var(--accent-gold)' }}
                    >
                      {isSubmitting ? 'Generating...' : 'Quick Provision ID & Temp Password (Client Fills Metrics on 1st Login)'}
                    </button>
                  </div>

                  <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
                      <Scale size={18} color="var(--accent-gold)" /> Physical Attributes
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                      <div>
                        <label className="label-text">Age</label>
                        <input 
                          type="number" 
                          required 
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          style={inputStyle} 
                          placeholder="e.g. 28" 
                        />
                      </div>
                      <div>
                        <label className="label-text">Height (cm)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          required 
                          value={height}
                          onChange={(e) => setHeight(e.target.value)}
                          style={inputStyle} 
                          placeholder="e.g. 175" 
                        />
                      </div>
                      <div>
                        <label className="label-text">Current Weight (kg)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          required 
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          style={inputStyle} 
                          placeholder="e.g. 82.5" 
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', backdropFilter: 'blur(10px)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '20px', fontWeight: '600' }}>
                      <Activity size={18} color="var(--blue)" /> Lifestyle & Health
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <label className="label-text">Daily Activity Level</label>
                        <select 
                          value={activityLevel}
                          onChange={(e) => setActivityLevel(e.target.value)}
                          style={{...inputStyle, WebkitAppearance: 'none', backgroundImage: selectBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px top 50%', backgroundSize: '10px auto'}}
                        >
                          <option value="sedentary" style={{ background: 'var(--bg-elev)' }}>Sedentary (Desk job, minimal movement)</option>
                          <option value="moderate" style={{ background: 'var(--bg-elev)' }}>Moderately Active (3-5 workouts/week)</option>
                          <option value="high" style={{ background: 'var(--bg-elev)' }}>Very Active (Heavy training / active work)</option>
                        </select>
                      </div>
                      <div>
                        <label className="label-text">Primary Fitness Goal</label>
                        <select 
                          value={primaryGoal}
                          onChange={(e) => setPrimaryGoal(e.target.value)}
                          style={{...inputStyle, WebkitAppearance: 'none', backgroundImage: selectBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px top 50%', backgroundSize: '10px auto'}}
                        >
                          <option value="fat_loss" style={{ background: 'var(--bg-elev)' }}>Fat Loss & Definition</option>
                          <option value="hypertrophy" style={{ background: 'var(--bg-elev)' }}>Muscle Hypertrophy</option>
                          <option value="recomp" style={{ background: 'var(--bg-elev)' }}>Body Recomposition</option>
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
                  
                  <button type="button" onClick={() => setCurrentStep(2)} className="btn-primary" style={{ marginTop: '8px' }}>
                    Continue to Food Log
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: 3-Day Diet Recall (Clients Only) */}
          {currentStep === 2 && role === 'CLIENT' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
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
                    <Camera size={18} color="var(--blue)" /> {activeDay} Dietary Recall
                  </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                  {meals.map((meal) => (
                    <label 
                      key={`${activeDay}-${meal}`} 
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'rgb(var(--well-rgb) / 0.2)', cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'center', padding: '12px' }}
                    >
                      <Upload size={24} color="var(--text-secondary)" style={{ marginBottom: '12px' }} />
                      <span className="label-text" style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>{meal}</span>
                      <input type="file" accept="image/*" style={{ display: 'none' }} />
                    </label>
                  ))}
                </div>
              </div>

              <div className="button-row" style={{ marginTop: '8px' }}>
                <button type="button" onClick={() => setCurrentStep(1)} className="btn-secondary">
                  Back
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Saving Profile...' : 'Save Assessment & Generate ID'}
                </button>
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
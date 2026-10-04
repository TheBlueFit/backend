// import React from 'react';
// import Link from 'next/link';
// import { Users, LayoutDashboard, Activity, LogOut, Dumbbell } from 'lucide-react';

// export default function CoachLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <div className="flex h-screen bg-black text-white font-sans selection:bg-blue-500/30">
//       {/* Sidebar (Frosted Glass) */}
//       <aside className="w-64 bg-white/5 backdrop-blur-3xl border-r border-white/10 flex flex-col z-40">
//         <div className="p-6 flex items-center gap-3 border-b border-white/10">
//           <div className="bg-blue-600 p-2 rounded-xl text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]">
//             <Dumbbell size={24} />
//           </div>
//           <span className="text-xl font-bold text-white tracking-tight">The Blue Fit</span>
//         </div>
        
//         <nav className="flex-1 px-4 py-6 space-y-2">
//           <Link href="/coach" className="flex items-center gap-3 px-4 py-3 bg-white/10 border border-white/5 text-white rounded-xl shadow-lg">
//             <LayoutDashboard size={20} className="text-blue-400" />
//             <span className="font-medium">Dashboard</span>
//           </Link>
//           <Link href="/coach/clients" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-white/70 hover:text-white">
//             <Users size={20} />
//             <span className="font-medium">Clients</span>
//           </Link>
//           <Link href="/coach/templates" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-white/70 hover:text-white">
//             <Activity size={20} />
//             <span className="font-medium">Plan Templates</span>
//           </Link>
//         </nav>

//         <div className="p-4 border-t border-white/10">
//           <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-white/5 transition-colors text-white/70 hover:text-white">
//             <LogOut size={20} className="text-rose-400" />
//             <span className="font-medium">Sign Out</span>
//           </button>
//         </div>
//       </aside>

//       {/* Main Content Area */}
//       <main className="flex-1 overflow-y-auto relative z-0">
//         {/* Subtle background glow for the whole dashboard */}
//         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
//         {children}
//       </main>
//     </div>
//   );
// }

import React from 'react';

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Subtle background glow for the coach dashboard */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
      
      {/* We removed the static sidebar. The global layout now handles the left menu, 
          and your coach/page.tsx handles the right tools drawer. */}
      {children}
    </>
  );
}






import React from 'react';
import ProgressChart from '@/components/shared/ProgressChart';
import { Target, TrendingDown, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

export default function ClientProgressView() {
  // Mock DynamoDB timeseries data
  const weightData = [
    { date: 'Week 1', weight: 68.0 },
    { date: 'Week 2', weight: 67.5 },
    { date: 'Week 3', weight: 67.2 },
    { date: 'Week 4', weight: 66.8 },
  ];

  const adherenceData = [
    { date: 'Week 1', score: 85 },
    { date: 'Week 2', score: 92 },
    { date: 'Week 3', score: 78 },
    { date: 'Week 4', score: 95 },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Progress Review</h1>
          <p className="text-slate-500 mt-1">Reviewing metrics and check-ins for Kiran M.</p>
        </div>
        <Link href="/coach/clients/123/plan" className="text-blue-600 font-bold hover:underline">
          Adjust Active Plan →
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Weight Trend Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><TrendingDown size={18}/> Body Weight</h3>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-full">-1.2 kg total</span>
          </div>
          <ProgressChart data={weightData} dataKey="weight" unit="kg" color="#2563eb" />
        </div>

        {/* Adherence Trend Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><Target size={18}/> Program Adherence</h3>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold text-xs rounded-full">Avg 87.5%</span>
          </div>
          <ProgressChart data={adherenceData} dataKey="score" unit="%" color="#10b981" />
        </div>
      </div>

      {/* Latest Check-in Snapshot */}
      <h2 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">Latest Weekly Check-In (Week 4)</h2>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-1">Diet Adherence</p>
                <p className="font-medium text-slate-900">Strictly followed the plan</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-1">Workout Quality</p>
                <p className="font-medium text-slate-900">Strong, progressed on lifts</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Client Notes</p>
              <p className="text-sm text-slate-700 leading-relaxed bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                "Core felt much more stable during the McGill Big 3 warmups this week. Glute bridges are improving. Energy was high despite the calorie deficit."
              </p>
            </div>
          </div>
          
          <div className="border-l border-slate-100 pl-6 flex flex-col justify-center">
            <p className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1"><ImageIcon size={14}/> Progress Photos</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="aspect-[3/4] bg-slate-200 rounded-lg flex items-center justify-center text-xs font-bold text-slate-400">Front</div>
              <div className="aspect-[3/4] bg-slate-200 rounded-lg flex items-center justify-center text-xs font-bold text-slate-400">Side</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
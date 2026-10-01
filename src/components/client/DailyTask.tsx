'use client';
import React, { useState } from 'react';
import { Check, Plus, Minus } from 'lucide-react';

type TaskProps = {
  id: string;
  title: string;
  target: number;
  unit: string;
  type: 'boolean' | 'numeric';
  initialProgress?: number;
};

export default function DailyTask({ id, title, target, unit, type, initialProgress = 0 }: TaskProps) {
  const [progress, setProgress] = useState(initialProgress);
  const isComplete = progress >= target;

  const handleToggle = () => {
    setProgress(isComplete ? 0 : target);
    // In production: trigger API update to DynamoDB here
  };

  const handleIncrement = (amount: number) => {
    const newVal = Math.min(Math.max(0, progress + amount), target);
    setProgress(newVal);
    // In production: trigger API update to DynamoDB here (ideally debounced)
  };

  return (
    <div className={`p-4 rounded-2xl border transition-all ${isComplete ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
      <div className="flex justify-between items-center">
        <div>
          <h4 className={`font-bold ${isComplete ? 'text-emerald-900 line-through opacity-70' : 'text-slate-900'}`}>{title}</h4>
          <p className={`text-sm ${isComplete ? 'text-emerald-700' : 'text-slate-500'}`}>
            {type === 'numeric' ? `${progress} / ${target} ${unit}` : `${target} ${unit}`}
          </p>
        </div>

        {type === 'boolean' ? (
          <button 
            onClick={handleToggle}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              isComplete ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Check size={20} />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={() => handleIncrement(-0.5)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 disabled:opacity-50" disabled={progress <= 0}>
              <Minus size={16} />
            </button>
            <span className="w-8 text-center font-bold text-slate-900">{progress}</span>
            <button onClick={() => handleIncrement(0.5)} className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 hover:bg-blue-200 disabled:opacity-50" disabled={isComplete}>
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar for Numeric types */}
      {type === 'numeric' && (
        <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`}
            style={{ width: `${(progress / target) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
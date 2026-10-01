'use client';
import React, { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

type Exercise = { id: string; name: string; sets: number; reps: string; rest: string; notes: string };

export default function WorkoutBuilder() {
  const [exercises, setExercises] = useState<Exercise[]>([
    { id: '1', name: 'McGill Big 3 (Curl-up, Bird-Dog, Side Plank)', sets: 3, reps: '10s holds', rest: '60s', notes: 'Core warm-up. Do not skip.' },
    { id: '2', name: 'Supine Pelvic Tilts', sets: 3, reps: '12-15', rest: '45s', notes: 'Focus on lower abdominal engagement.' },
    { id: '3', name: 'Glute Bridges', sets: 4, reps: '15', rest: '60s', notes: 'Squeeze glutes at the top.' },
    { id: '4', name: 'Machine Chest Press', sets: 3, reps: '8-10', rest: '90s', notes: 'Controlled eccentric.' },
  ]);

  const addExercise = () => {
    setExercises([...exercises, { id: Date.now().toString(), name: '', sets: 3, reps: '10', rest: '60s', notes: '' }]);
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-900">Workout Programming</h3>
        <button onClick={addExercise} className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
          <Plus size={16} /> Add Exercise
        </button>
      </div>
      
      <div className="divide-y divide-slate-100 p-6 space-y-4">
        {exercises.map((ex, index) => (
          <div key={ex.id} className="flex gap-4 items-start group">
            <div className="mt-2 text-slate-300 cursor-grab active:cursor-grabbing">
              <GripVertical size={20} />
            </div>
            
            <div className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Exercise Name</label>
                <input type="text" defaultValue={ex.name} className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500" placeholder="e.g. Dumbbell Row" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Sets</label>
                <input type="number" defaultValue={ex.sets} className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Reps/Time</label>
                <input type="text" defaultValue={ex.reps} className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500" />
              </div>
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Coach Notes</label>
                <input type="text" defaultValue={ex.notes} className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500" placeholder="Cues or instructions..." />
              </div>
            </div>

            <button onClick={() => removeExercise(ex.id)} className="mt-7 text-slate-400 hover:text-rose-500 transition-colors">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
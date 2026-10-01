'use client';
import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function DietAssigner({ clientId }: { clientId: string }) {
  const [menu, setMenu] = useState<Record<string, string[]>>({});
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dietPlan, setDietPlan] = useState<any>(null);
  const [error, setError] = useState('');

  // Form State
  const [meals, setMeals] = useState('3');
  const [goal, setGoal] = useState('fat_loss');
  const [calorieTier, setCalorieTier] = useState('1850');

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const url = process.env.NEXT_PUBLIC_DIET_API_URL;
        if (!url) throw new Error("API URL not configured in .env.local");

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_menu', service: 'Diet' })
        });
        const data = await res.json();
        if (data.status === 'success') setMenu(data.menu);
      } catch (err) {
        console.error('Failed to load menu database');
      }
    };
    fetchMenu();
  }, []);

  const handleGenerate = async () => {
    if (selectedItems.length === 0) {
      setError('Select at least one ingredient.');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_DIET_API_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'Diet',
          action: 'generate_diet',
          preferences: {
            mealsCount: Number(meals),
            goal: goal,
            targetCalories: Number(calorieTier),
            mustInclude: selectedItems
          }
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDietPlan(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const assignToClient = () => {
    // Not connected to the backend yet. (No client IDs or diet plans are logged to the console.)
    alert('Diet assignment is not connected to the backend yet.');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-8">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h3 className="font-bold text-slate-900">Diet Generation (Powered by AWS Optimizer)</h3>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Client Goal</label>
            <select value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full p-2.5 text-sm border border-slate-300 rounded-lg outline-none">
              <option value="fat_loss">Fat Loss</option>
              <option value="maintenance">Maintenance</option>
              <option value="weight_gain">Weight Gain</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Target Calorie Tier</label>
            <select value={calorieTier} onChange={(e) => setCalorieTier(e.target.value)} className="w-full p-2.5 text-sm border border-slate-300 rounded-lg outline-none">
              <option value="1550">1500 - 1600 kcal</option>
              <option value="1850">1800 - 1900 kcal</option>
              <option value="2150">2100 - 2200 kcal</option>
              <option value="2450">2400 - 2500 kcal</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Meal Split</label>
            <select value={meals} onChange={(e) => setMeals(e.target.value)} className="w-full p-2.5 text-sm border border-slate-300 rounded-lg outline-none">
              <option value="2">2 Meals (Intermittent)</option>
              <option value="3">3 Meals</option>
              <option value="4">4 Meals</option>
            </select>
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-xs font-semibold text-slate-500 mb-3">Allowed Ingredients</label>
          <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-4 bg-slate-50 grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.keys(menu).length === 0 ? <span className="text-sm text-slate-400">Loading S3 Database...</span> : null}
            {Object.entries(menu).map(([category, items]) => (
              items.map(item => (
                <label key={item} className="flex items-start gap-2 text-sm cursor-pointer text-slate-700">
                  <input 
                    type="checkbox" 
                    className="mt-1"
                    checked={selectedItems.includes(item)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedItems([...selectedItems, item]);
                      else setSelectedItems(selectedItems.filter(i => i !== item));
                    }}
                  />
                  <span className="leading-tight">{item}</span>
                </label>
              ))
            ))}
          </div>
        </div>

        <button 
          onClick={handleGenerate} 
          disabled={loading}
          className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex justify-center items-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={18}/> : 'Calculate Optimal Macros'}
        </button>

        {error && <p className="text-rose-600 text-sm mt-4">{error}</p>}

        {dietPlan && (
          <div className="mt-8 p-6 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 size={20}/> Plan Generated Successfully
                </h4>
                <p className="text-emerald-700 text-sm font-medium mt-1">
                  {dietPlan.summary['Total Calories']} kcal | {dietPlan.summary['Total Protein']}g Protein
                </p>
              </div>
              <button onClick={assignToClient} className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700">
                Assign to Client
              </button>
            </div>
            
            <div className="bg-white rounded-lg border border-emerald-100 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-emerald-100/50 text-emerald-900 font-semibold">
                  <tr>
                    <th className="p-3">Ingredient</th>
                    <th className="p-3">Portion</th>
                    <th className="p-3">Macros</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {dietPlan.plan.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-3 font-medium text-slate-800">{item.Item}</td>
                      <td className="p-3 font-bold text-emerald-600">{item['Portion (g)']}g</td>
                      <td className="p-3 text-slate-500">{item.Calories} kcal, {item.Protein}g pro</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
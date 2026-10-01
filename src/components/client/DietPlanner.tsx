"use client";
import React, { useState, useEffect } from 'react';

// --- Neon Icon Components ---
const FlameIcon = () => (
  <svg className="neon-icon neon-orange" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path>
  </svg>
);

const DumbbellIcon = () => (
  <svg className="neon-icon neon-green" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="12" x2="18" y2="12"></line>
    <rect x="4" y="9" width="2" height="6" rx="1"></rect>
    <rect x="18" y="9" width="2" height="6" rx="1"></rect>
    <rect x="2" y="10" width="2" height="4" rx="1"></rect>
    <rect x="20" y="10" width="2" height="4" rx="1"></rect>
  </svg>
);

const DietPlanner = () => {
  const [currentStep, setCurrentStep] = useState(1); 
  
  const [mealsCount, setMealsCount] = useState(1);
  const [dietType, setDietType] = useState('veg');
  const [goal, setGoal] = useState('maintenance');
  const [selectedCalorieTier, setSelectedCalorieTier] = useState(600); 
  
  // FIX: Explicit TypeScript definitions added to state
  const [menu, setMenu] = useState<Record<string, string[]>>({});
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Set NEXT_PUBLIC_DIET_API_URL in your .env file (kept out of source control)
  const API_URL = process.env.NEXT_PUBLIC_DIET_API_URL ?? '';

  const calorieTiers = [];
  for (let low = 500; low < 3000; low += 100) {
    const high = low + 100;
    const midpoint = low + 50;
    calorieTiers.push({ label: `${low} - ${high} kcal`, value: midpoint });
  }

  useEffect(() => {
    const fetchMenu = async () => {
      if (!API_URL) return;
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_menu', service: 'Diet' })
        });
        const data = await response.json();
        if (data.status === 'success') {
          setMenu(data.menu);
        }
      } catch (err) {
        console.error("Failed to fetch menu:", err);
      }
    };
    fetchMenu();
  }, []);

  // FIX: Added 'string' type to item parameter
  const handleCheckboxChange = (item: string) => {
    setSelectedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item) 
        : [...prev, item]
    );
  };

  // FIX: Added 'string' type to category parameter
  const toggleCategory = (category: string) => {
    setOpenCategory(prev => (prev === category ? null : category));
  };

  const nextStep = () => {
    setError('');
    setCurrentStep(prev => prev + 1);
  };
  
  const prevStep = () => {
    setError('');
    setCurrentStep(prev => prev - 1);
  };

  const triggerService = async () => {
    if (selectedItems.length === 0) {
      setError('Please select at least one ingredient.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    const payload = {
      service: 'Diet',
      action: 'generate_diet',
      preferences: {
        type: dietType,
        mealsCount: Number(mealsCount),
        goal: goal,
        targetCalories: Number(selectedCalorieTier),
        mustInclude: selectedItems
      }
    };

    if (!API_URL) {
      setError('The diet service is not configured yet.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'The request failed.');
      setResult(data);
      setCurrentStep(3); 
    } catch (err: any) { // FIX: Explicitly cast err to 'any'
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <div className="app-card">
          
          {/* Visual Progress Stepper */}
          <div className="progress-container">
            <div className="progress-line">
              <div 
                className="progress-line-fill" 
                style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
              ></div>
            </div>
            
            <div className="progress-step">
              <div className={`progress-dot ${currentStep >= 1 ? 'active' : ''}`}></div>
              <span className={`progress-label ${currentStep >= 1 ? 'active-label' : ''}`}>Goals</span>
            </div>
            <div className="progress-step">
              <div className={`progress-dot ${currentStep >= 2 ? 'active' : ''}`}></div>
              <span className={`progress-label ${currentStep >= 2 ? 'active-label' : ''}`}>Ingredients</span>
            </div>
            <div className="progress-step">
              <div className={`progress-dot ${currentStep >= 3 ? 'active' : ''}`}></div>
              <span className={`progress-label ${currentStep >= 3 ? 'active-label' : ''}`}>Plan</span>
            </div>
          </div>

          {/* STEP 1: CONFIG & GOAL */}
          {currentStep === 1 && (
            <div className="step-content fade-in">
              <div className="section-header">
                <span className="step-badge">1</span> 
                <h2 className="glazy-title">Meal Structure & Goals</h2>
              </div>
              
              <div className="form-grid">
                
                {/* Diet Type */}
                <div className="input-group">
                  <label className="label-text">Diet Type</label>
                  <div className={`accordion-item ${openCategory === 'dietType' ? 'open' : ''}`}>
                    <div className="accordion-header" onClick={() => toggleCategory('dietType')}>
                      <h4>{dietType === 'veg' ? 'Vegetarian' : dietType === 'non-veg' ? 'Non-Vegetarian' : 'Snacks Only'}</h4>
                      <span className="chevron">{openCategory === 'dietType' ? '▲' : '▼'}</span>
                    </div>
                    <div className="accordion-body">
                      <div className="checkbox-grid">
                        {[
                          { label: 'Vegetarian', value: 'veg' },
                          { label: 'Non-Vegetarian', value: 'non-veg' },
                          { label: 'Snacks Only', value: 'snack' }
                        ].map((opt) => (
                          <label 
                            key={opt.value} 
                            className={`custom-checkbox ${dietType === opt.value ? 'selected-item-row' : ''}`}
                          >
                            <input 
                              type="radio" 
                              name="dietType"
                              checked={dietType === opt.value}
                              onChange={() => { setDietType(opt.value); setOpenCategory(null); }}
                            />
                            <span className="checkmark"></span>
                            <span className="checkbox-text">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Number of Meals */}
                <div className="input-group">
                  <label className="label-text">Number of Meals</label>
                  <div className={`accordion-item ${openCategory === 'mealsCount' ? 'open' : ''}`}>
                    <div className="accordion-header" onClick={() => toggleCategory('mealsCount')}>
                      <h4>{mealsCount} {mealsCount === 1 ? 'Meal' : 'Meals'}</h4>
                      <span className="chevron">{openCategory === 'mealsCount' ? '▲' : '▼'}</span>
                    </div>
                    <div className="accordion-body">
                      <div className="checkbox-grid">
                        {[
                          { label: '1 Meal', value: 1 },
                          { label: '2 Meals', value: 2 },
                          { label: '3 Meals', value: 3 }
                        ].map((opt) => (
                          <label 
                            key={opt.value} 
                            className={`custom-checkbox ${Number(mealsCount) === opt.value ? 'selected-item-row' : ''}`}
                          >
                            <input 
                              type="radio" 
                              name="mealsCount"
                              checked={Number(mealsCount) === opt.value}
                              onChange={() => { setMealsCount(opt.value); setOpenCategory(null); }}
                            />
                            <span className="checkmark"></span>
                            <span className="checkbox-text">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fitness Goal */}
                <div className="input-group">
                  <label className="label-text">Fitness Goal</label>
                  <div className={`accordion-item ${openCategory === 'goal' ? 'open' : ''}`}>
                    <div className="accordion-header" onClick={() => toggleCategory('goal')}>
                      <h4>{goal === 'fat_loss' ? 'Fat Loss' : goal === 'weight_gain' ? 'Weight Gain' : 'Maintenance'}</h4>
                      <span className="chevron">{openCategory === 'goal' ? '▲' : '▼'}</span>
                    </div>
                    <div className="accordion-body">
                      <div className="checkbox-grid">
                        {[
                          { label: 'Fat Loss', value: 'fat_loss' },
                          { label: 'Weight Gain', value: 'weight_gain' },
                          { label: 'Maintenance', value: 'maintenance' }
                        ].map((opt) => (
                          <label 
                            key={opt.value} 
                            className={`custom-checkbox ${goal === opt.value ? 'selected-item-row' : ''}`}
                          >
                            <input 
                              type="radio" 
                              name="goal"
                              checked={goal === opt.value}
                              onChange={() => { setGoal(opt.value); setOpenCategory(null); }}
                            />
                            <span className="checkmark"></span>
                            <span className="checkbox-text">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Calorie Tier */}
              <div className="input-group full-width">
                <label className="label-text">Select Calorie Tier</label>
                <div className={`accordion-item ${openCategory === 'calorieTier' ? 'open' : ''}`}>
                  <div className="accordion-header" onClick={() => toggleCategory('calorieTier')}>
                    <h4>{calorieTiers.find(t => Number(t.value) === Number(selectedCalorieTier))?.label || 'Select Tier'}</h4>
                    <span className="chevron">{openCategory === 'calorieTier' ? '▲' : '▼'}</span>
                  </div>
                  <div className="accordion-body scrollable-body">
                    <div className="checkbox-grid">
                      {calorieTiers.map((tier) => (
                        <label 
                          key={tier.value} 
                          className={`custom-checkbox ${Number(selectedCalorieTier) === tier.value ? 'selected-item-row' : ''}`}
                        >
                          <input 
                            type="radio" 
                            name="calorieTier"
                            checked={Number(selectedCalorieTier) === tier.value}
                            onChange={() => { setSelectedCalorieTier(tier.value); setOpenCategory(null); }}
                          />
                          <span className="checkmark"></span>
                          <span className="checkbox-text">{tier.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={nextStep} className="btn-primary mt-24">
                Continue
              </button>
            </div>
          )}

          {/* STEP 2: INGREDIENT SELECTION */}
          {currentStep === 2 && (
            <div className="step-content fade-in">
              <div className="section-header">
                <span className="step-badge">2</span> 
                <h2 className="glazy-title">Select Ingredients</h2>
              </div>
              
              {Object.keys(menu).length === 0 ? (
                <div className="loading-state">Loading database...</div>
              ) : (
                <div className="accordion-container">
                  {Object.entries(menu)
                    .filter(([category]) => {
                      if (dietType === 'veg' && category === 'NonVeg') return false;
                      if (dietType === 'snack' && !['Fruits', 'Seeds'].includes(category)) return false;
                      return true;
                    })
                    .map(([category, items]) => {
                      const isOpen = openCategory === category;
                      
                      const sortedItems = [...items].sort((a, b) => {
                        const aSelected = selectedItems.includes(a);
                        const bSelected = selectedItems.includes(b);
                        if (aSelected && !bSelected) return -1;
                        if (!aSelected && bSelected) return 1;
                        return a.localeCompare(b);
                      });

                      return (
                        <div key={category} className={`accordion-item ${isOpen ? 'open' : ''}`}>
                          <div className="accordion-header" onClick={() => toggleCategory(category)}>
                            <h4>{category.replace(/_/g, ' ')}</h4>
                            <span className="chevron">{isOpen ? '▲' : '▼'}</span>
                          </div>
                          <div className="accordion-body scrollable-body">
                            <div className="checkbox-grid">
                              {sortedItems.map(item => {
                                const isSelected = selectedItems.includes(item);
                                return (
                                  <label key={item} className={`custom-checkbox ${isSelected ? 'selected-item-row' : ''}`}>
                                    <input 
                                      type="checkbox" 
                                      checked={isSelected}
                                      onChange={() => handleCheckboxChange(item)}
                                    />
                                    <span className="checkmark"></span>
                                    <span className="checkbox-text">{item}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                  })}
                </div>
              )}

              {error && <div className="error-banner">{error}</div>}

              <div className="button-row">
                <button onClick={prevStep} className="btn-secondary" disabled={loading}>
                  Back
                </button>
                <button onClick={triggerService} disabled={loading} className="btn-primary">
                  {loading ? 'Building...' : 'Generate Plan'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: RESULTS SECTION */}
          {currentStep === 3 && result && result.plan && (
            <div className="step-content fade-in">
               <div className="section-header">
                <span className="step-badge">3</span> 
                <h2 className="glazy-title">Your Custom Plan</h2>
              </div>
              
              <div className="results-summary">
                <p className="subtitle">({result.summary.Meals} Meal Split) — {result.summary.Goal}</p>
                <div className="macro-row">
                  <div className="macro-pill">
                    <FlameIcon /> 
                    <strong className="pulse-text">{result.summary['Total Calories']}</strong> kcal
                  </div>
                  <div className="macro-pill">
                    <DumbbellIcon /> 
                    <strong className="pulse-text">{result.summary['Total Protein']}</strong>g Protein
                  </div>
                </div>
              </div>

              {/* Modern Plan Cards List */}
              <div className="plan-cards-container">
                {result.plan.map((item: any, idx: number) => (
                  <div key={idx} className="plan-card">
                    <div className="plan-card-left">
                      <span className="plan-item-name">{item.Item}</span>
                      <span className="plan-item-category">{item.Category.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="plan-card-right">
                      <span className="plan-item-portion">{item['Portion (g)']}g</span>
                      <div className="plan-item-macros">
                        <span className="macro-stat"><FlameIcon /> {item.Calories} kcal</span>
                        <span className="macro-stat"><DumbbellIcon /> {item.Protein}g</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => setCurrentStep(1)} className="btn-secondary mt-24 full-width">
                Start Over
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DietPlanner;
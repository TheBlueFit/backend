// Exercise library + starter templates used by the coach template builder.
// Pure data: nothing here touches the backend. A picked exercise becomes a normal template exercise row.

export type CategoryId = "STRENGTH" | "CARDIO" | "HIIT" | "MAINTENANCE";

export interface LibraryDefaults { sets: string; reps: string; rest: string; tempo?: string; rpe?: string; notes?: string }
export interface Movement { name: string; group: string; variations: string[]; defaults?: Partial<LibraryDefaults> }
export interface Category { id: CategoryId; label: string; blurb: string; section: string; defaults: LibraryDefaults; movements: Movement[] }

export const CATEGORIES: Category[] = [
  {
    id: "STRENGTH", label: "Strength", blurb: "Build muscle and force", section: "Main lift",
    defaults: { sets: "3", reps: "8-12", rest: "90s", tempo: "2-0-1-0", rpe: "7-8" },
    movements: [
      { name: "Bench Press", group: "Push", variations: ["Barbell Bench Press", "Dumbbell Bench Press", "Incline Barbell Press", "Incline Dumbbell Press", "Decline Press", "Machine Chest Press", "Push-up", "Weighted Push-up", "Cable Fly", "Dumbbell Fly"] },
      { name: "Overhead Press", group: "Push", variations: ["Barbell Overhead Press", "Dumbbell Shoulder Press", "Arnold Press", "Machine Shoulder Press", "Pike Push-up", "Landmine Press"] },
      { name: "Shoulder Raise", group: "Push", variations: ["Dumbbell Lateral Raise", "Cable Lateral Raise", "Front Raise", "Rear Delt Fly", "Face Pull"], defaults: { reps: "12-15", rest: "60s" } },
      { name: "Triceps", group: "Push", variations: ["Triceps Pushdown", "Overhead Triceps Extension", "Skull Crusher", "Close-grip Bench Press", "Bench Dip", "Diamond Push-up"], defaults: { reps: "10-15", rest: "60s" } },
      { name: "Row", group: "Pull", variations: ["Barbell Row", "Dumbbell Row", "Seated Cable Row", "T-bar Row", "Chest-supported Row", "Machine Row", "Inverted Row"] },
      { name: "Pull-up / Pulldown", group: "Pull", variations: ["Pull-up", "Chin-up", "Assisted Pull-up", "Lat Pulldown", "Close-grip Pulldown", "Single-arm Pulldown"] },
      { name: "Biceps", group: "Pull", variations: ["Barbell Curl", "Dumbbell Curl", "Hammer Curl", "Incline Curl", "Preacher Curl", "Cable Curl"], defaults: { reps: "10-15", rest: "60s" } },
      { name: "Squat", group: "Legs", variations: ["Back Squat", "Front Squat", "Goblet Squat", "Box Squat", "Hack Squat", "Leg Press", "Smith Machine Squat", "Bodyweight Squat"] },
      { name: "Hinge", group: "Legs", variations: ["Conventional Deadlift", "Romanian Deadlift", "Sumo Deadlift", "Trap-bar Deadlift", "Good Morning", "Cable Pull-through", "Back Extension"] },
      { name: "Lunge", group: "Legs", variations: ["Walking Lunge", "Reverse Lunge", "Bulgarian Split Squat", "Step-up", "Lateral Lunge", "Split Squat"], defaults: { reps: "8-12 / side" } },
      { name: "Glutes", group: "Legs", variations: ["Hip Thrust", "Glute Bridge", "Single-leg Glute Bridge", "Cable Kickback", "Frog Pump"], defaults: { reps: "10-15" } },
      { name: "Leg Isolation", group: "Legs", variations: ["Leg Extension", "Lying Leg Curl", "Seated Leg Curl", "Standing Calf Raise", "Seated Calf Raise"], defaults: { reps: "12-15", rest: "60s" } },
      { name: "Core", group: "Core", variations: ["Plank", "Side Plank", "Hanging Knee Raise", "Cable Crunch", "Ab Wheel Rollout", "Pallof Press", "Dead Bug", "Bird-Dog"], defaults: { reps: "30-45s", rest: "45s", tempo: "", rpe: "6-7" } },
    ],
  },
  {
    id: "CARDIO", label: "Cardio", blurb: "Steady-state endurance", section: "Cardio",
    defaults: { sets: "1", reps: "20-30 min", rest: "", rpe: "5-6", notes: "Conversational pace (Zone 2)." },
    movements: [
      { name: "Walking", group: "Low impact", variations: ["Brisk Walk", "Incline Treadmill Walk", "Outdoor Walk", "Walk + Light Jog Intervals"], defaults: { reps: "30-45 min", rpe: "4-5" } },
      { name: "Running", group: "Running", variations: ["Easy Run", "Tempo Run", "Treadmill Run", "Long Slow Run", "Fartlek (play pace)"], defaults: { reps: "20-40 min", rpe: "6" } },
      { name: "Cycling", group: "Bike", variations: ["Stationary Bike", "Outdoor Cycling", "Spin Bike (steady)", "Assault / Air Bike (easy)"], defaults: { reps: "25-40 min" } },
      { name: "Rowing", group: "Machines", variations: ["Rowing Machine (steady)", "Ski Erg (steady)", "Elliptical", "Stair Climber", "Cross-trainer"] },
      { name: "Swimming", group: "Low impact", variations: ["Freestyle Laps", "Mixed-stroke Laps", "Aqua Jog", "Water Walking"], defaults: { reps: "20-30 min" } },
      { name: "Skipping", group: "Conditioning", variations: ["Skipping Rope (steady)", "Basic Bounce", "Alternate-foot Step"], defaults: { reps: "10-15 min", rpe: "6-7" } },
    ],
  },
  {
    id: "HIIT", label: "HIIT", blurb: "Short, hard intervals", section: "HIIT block",
    defaults: { sets: "6", reps: "30s on", rest: "30s", rpe: "8-9", notes: "All-out effort during work intervals." },
    movements: [
      { name: "Sprint Intervals", group: "Running", variations: ["Treadmill Sprints", "Hill Sprints", "Shuttle Runs", "Track 200 m Repeats"], defaults: { sets: "8", reps: "20s sprint", rest: "40s walk" } },
      { name: "Bike Intervals", group: "Bike", variations: ["Air Bike Sprints", "Spin Bike Tabata", "Hill Climb Intervals"], defaults: { sets: "8", reps: "20s on", rest: "10s off" } },
      { name: "Bodyweight Circuit", group: "Circuit", variations: ["Burpees", "Mountain Climbers", "Jump Squats", "High Knees", "Skater Jumps", "Squat Thrusts", "Jumping Jacks", "Plank Jacks"] },
      { name: "Plyometrics", group: "Power", variations: ["Box Jumps", "Broad Jumps", "Tuck Jumps", "Lateral Bounds", "Jump Lunges"], defaults: { sets: "4", reps: "8", rest: "45s" } },
      { name: "Kettlebell / Dumbbell Conditioning", group: "Weighted", variations: ["Kettlebell Swings", "Dumbbell Thrusters", "Dumbbell Snatch", "Goblet Squat Pulses", "Renegade Rows"] },
      { name: "Rope / Sled", group: "Equipment", variations: ["Battle Ropes", "Sled Push", "Sled Drag", "Skipping Rope Double-unders"], defaults: { reps: "30s on", rest: "30s" } },
      { name: "Rowing / Ski Erg Intervals", group: "Machines", variations: ["Rowing Sprints (500 m)", "Ski Erg Sprints", "Assault Runner Intervals"], defaults: { sets: "6", reps: "250-500 m", rest: "60s" } },
    ],
  },
  {
    id: "MAINTENANCE", label: "Maintenance", blurb: "Mobility, recovery, general fitness", section: "Maintenance",
    defaults: { sets: "2", reps: "10-12", rest: "30s", rpe: "4-5", notes: "Slow, controlled, pain-free range." },
    movements: [
      { name: "Warm-up", group: "Prep", variations: ["Cat-Cow", "World's Greatest Stretch", "Arm Circles", "Hip Circles", "Leg Swings", "Band Pull-aparts", "Jumping Jacks (easy)", "Glute Activation Walks"], defaults: { sets: "1", reps: "8-10 / side", rest: "" } },
      { name: "Mobility", group: "Mobility", variations: ["90/90 Hip Switch", "Thoracic Rotation", "Deep Squat Hold", "Couch Stretch", "Ankle Rocks", "Shoulder Dislocates (band)", "Spinal Wave"], defaults: { sets: "2", reps: "45-60s", rest: "" } },
      { name: "Stretching", group: "Recovery", variations: ["Hamstring Stretch", "Quad Stretch", "Hip Flexor Stretch", "Chest Doorway Stretch", "Child's Pose", "Pigeon Pose", "Upper Trap Stretch"], defaults: { sets: "2", reps: "30-45s hold", rest: "" } },
      { name: "Foam Rolling", group: "Recovery", variations: ["Foam Roll Quads", "Foam Roll Back", "Foam Roll Glutes", "Foam Roll Calves", "Lacrosse Ball Glutes"], defaults: { sets: "1", reps: "60s / area", rest: "" } },
      { name: "Posture & Core Stability", group: "Stability", variations: ["McGill Curl-up", "Bird-Dog", "Side Plank (short holds)", "Dead Bug", "Wall Slides", "Glute Bridge", "Supine Pelvic Tilt"], defaults: { sets: "3", reps: "10s holds", rest: "30s" } },
      { name: "Light Conditioning", group: "General fitness", variations: ["Easy Walk", "Easy Cycle", "Light Bodyweight Circuit", "Band Row", "Band Press", "Step-ups (light)"], defaults: { sets: "2", reps: "12-15", rest: "45s" } },
      { name: "Cool-down", group: "Recovery", variations: ["Box Breathing", "Easy Walk Cool-down", "Legs-up-the-wall", "Full-body Stretch Flow"], defaults: { sets: "1", reps: "3-5 min", rest: "" } },
    ],
  },
];

export interface LibraryItem { key: string; name: string; movement: string; group: string; category: CategoryId; section: string; defaults: LibraryDefaults }

/** Flat, searchable list: every variation of every movement becomes one pickable item. */
export const LIBRARY: LibraryItem[] = CATEGORIES.flatMap((c) =>
  c.movements.flatMap((m) =>
    m.variations.map((v) => ({
      key: `${c.id}:${v}`, name: v, movement: m.name, group: m.group, category: c.id, section: c.section,
      defaults: { ...c.defaults, ...(m.defaults || {}) } as LibraryDefaults,
    })),
  ),
);

const byKey = new Map(LIBRARY.map((i) => [i.key, i]));
const byName = new Map(LIBRARY.map((i) => [i.name, i]));

/** Build a template exercise row from a library item (the coach can edit every field afterwards). */
export function exerciseFromItem(item: LibraryItem, order: number, idSeed = Date.now()) {
  const d = item.defaults;
  return { id: `${idSeed}-${order}`, order, section: item.section, type: item.category === "MAINTENANCE" ? "Maintenance" : item.category[0] + item.category.slice(1).toLowerCase(), name: item.name, sets: d.sets, reps: d.reps, rest: d.rest || "", tempo: d.tempo || "", weight: "", rpe: d.rpe || "", notes: d.notes || "" };
}

export interface StarterTemplate { id: string; title: string; goal: string; level: string; workoutDays: string; estimatedDuration: string; equipment: string; description: string; category: CategoryId; names: string[] }

export const STARTERS: StarterTemplate[] = [
  { id: "s-full", title: "Strength – Full Body (3 days)", goal: "Strength", level: "Beginner", workoutDays: "3 days / week", estimatedDuration: "50-60 min", equipment: "Gym", category: "STRENGTH", description: "Compound-focused full-body session. Add load weekly while keeping reps clean.",
    names: ["Glute Bridge", "Goblet Squat", "Dumbbell Bench Press", "Seated Cable Row", "Romanian Deadlift", "Dumbbell Shoulder Press", "Plank"] },
  { id: "s-push", title: "Strength – Upper / Lower Split", goal: "Muscle gain", level: "Intermediate", workoutDays: "4 days / week", estimatedDuration: "60-70 min", equipment: "Gym", category: "STRENGTH", description: "Pair with a lower-body day. Rest 90-120 s between heavy sets.",
    names: ["Barbell Bench Press", "Barbell Row", "Barbell Overhead Press", "Lat Pulldown", "Dumbbell Lateral Raise", "Triceps Pushdown", "Dumbbell Curl"] },
  { id: "s-lower", title: "Strength – Lower Body", goal: "Strength", level: "Intermediate", workoutDays: "2 days / week", estimatedDuration: "60 min", equipment: "Gym", category: "STRENGTH", description: "Squat, hinge, single-leg and calves.",
    names: ["Back Squat", "Romanian Deadlift", "Bulgarian Split Squat", "Hip Thrust", "Lying Leg Curl", "Standing Calf Raise", "Cable Crunch"] },
  { id: "s-cardio", title: "Cardio – Zone 2 Base", goal: "Fat loss", level: "Beginner", workoutDays: "3-4 days / week", estimatedDuration: "35-45 min", equipment: "Treadmill / Bike", category: "CARDIO", description: "Easy conversational pace. Build duration before intensity.",
    names: ["Brisk Walk", "Easy Run", "Stationary Bike", "Full-body Stretch Flow"] },
  { id: "s-cardio2", title: "Cardio – Mixed Endurance", goal: "Endurance", level: "Intermediate", workoutDays: "3 days / week", estimatedDuration: "40-50 min", equipment: "Gym / Outdoor", category: "CARDIO", description: "Rotate machines to keep joints fresh.",
    names: ["Easy Run", "Rowing Machine (steady)", "Stair Climber", "Skipping Rope (steady)"] },
  { id: "s-hiit", title: "HIIT – 25 Minute Burner", goal: "Fat loss", level: "Intermediate", workoutDays: "2-3 days / week", estimatedDuration: "25 min", equipment: "Bodyweight", category: "HIIT", description: "Warm up well, then 30 s on / 30 s off for each block.",
    names: ["Jumping Jacks (easy)", "Burpees", "Mountain Climbers", "Jump Squats", "High Knees", "Skater Jumps", "Box Jumps"] },
  { id: "s-hiit2", title: "HIIT – Bike & Sled Power", goal: "Conditioning", level: "Advanced", workoutDays: "2 days / week", estimatedDuration: "30 min", equipment: "Gym", category: "HIIT", description: "Hard efforts with full recovery. Stop if form breaks.",
    names: ["Air Bike Sprints", "Kettlebell Swings", "Sled Push", "Battle Ropes", "Rowing Sprints (500 m)"] },
  { id: "s-maint", title: "Maintenance – Mobility & Core", goal: "Maintenance", level: "All levels", workoutDays: "Daily / as needed", estimatedDuration: "25-30 min", equipment: "Mat", category: "MAINTENANCE", description: "Low-load routine for recovery weeks, back-care or travel.",
    names: ["Cat-Cow", "World's Greatest Stretch", "McGill Curl-up", "Bird-Dog", "Side Plank (short holds)", "Glute Bridge", "Child's Pose", "Box Breathing"] },
  { id: "s-maint2", title: "Maintenance – Light Full Body", goal: "Maintenance", level: "All levels", workoutDays: "2-3 days / week", estimatedDuration: "35 min", equipment: "Bands / Dumbbells", category: "MAINTENANCE", description: "Keeps strength ticking over with low fatigue.",
    names: ["Arm Circles", "Bodyweight Squat", "Band Row", "Band Press", "Step-ups (light)", "Dead Bug", "Hamstring Stretch"] },
];

export function starterExercises(s: StarterTemplate) {
  const seed = Date.now();
  return s.names.map((n, i) => {
    const item = byKey.get(`${s.category}:${n}`) || byName.get(n);
    return item ? exerciseFromItem(item, i + 1, seed) : null;
  }).filter(Boolean) as ReturnType<typeof exerciseFromItem>[];
}

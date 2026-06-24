/* ==========================================================================
   1. CORE APPLICATION STATE
   ========================================================================== */
const STATE = {
  user: {
    isAuthenticated: false,
    email: ''
  },
  activeSection: 'auth-section',
  cardio: {
    points: 0,
    level: 1,
    logs: [],
    timerInterval: null,
    timerSeconds: 0,
    timerRunning: false,
    timerProfile: 'Treadmill',
    timerTargetMinutes: 25
  },
  protein: {
    goal: 150,
    entries: [
      { id: 1, name: 'Eggs (3)', val: 18 },
      { id: 2, name: 'Whey Protein Shake', val: 30 }
    ]
  },
  water: {
    goal: 3.0,
    entries: [
      { id: 1, name: 'Morning Flask', val: 1.0 },
      { id: 2, name: 'Workout Shaker', val: 0.75 }
    ]
  },
  attendance: [false, false, false, false, false, false, false], // Mon - Sun
  monthlyStats: [35, 50, 75, 45, 90, 110, 60], // Simulated monthly values for graph
  splits: {
    active: false,
    activeProgramId: null,
    startedAt: null,
    completions: {}, // maps day names to array of completed exercise names / "RECOVERY"
    programExpanded: {
      arnold: false,
      ppl: false,
      ppl_3day: false,
      bro: false,
      upper_lower: false,
      beginner: false,
      full_body: false
    }
  },
  welcome: {
    active: false,
    particlesInterval: null,
    dismissTimeout: null
  }
};

// Supabase Backend Configuration
let supabaseClient = null;

async function initSupabase() {
  try {
    const res = await fetch('config.json');
    if (res.ok) {
      const config = await res.json();
      if (config.supabaseUrl && config.supabaseAnonKey && config.supabaseUrl !== "YOUR_SUPABASE_PROJECT_URL" && typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        console.log('Supabase initialized successfully from config.json.');
      }
    }
  } catch (e) {
    console.warn('config.json not found or invalid. Falling back to localStorage.');
  }
}
initSupabase();

// Rank Titles corresponding to levels
const RANKS = {
  1: { title: 'Starter Spark', min: 0, max: 100 },
  2: { title: 'Momentum Maker', min: 100, max: 200 },
  3: { title: 'Endurance Rising', min: 200, max: 400 },
  4: { title: 'Cardio Crusher', min: 400, max: 1500 },
  5: { title: 'Beast Mode Activated', min: 1500, max: 99999 }
};

/* ==========================================================================
   2. DATABASES: EXERCISES & WORKOUT SPLITS
   ========================================================================== */
const EXERCISE_DB = {
  biceps: {
    name: 'Biceps',
    description: 'Arm flexor muscle groups targeting peaks, width, and thickness.',
    subsections: [
      {
        title: 'BICEPS LONG HEAD (Outer Biceps / Peak)',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Incline Dumbbell Curl', target: 'Long Head (Peak)', difficulty: 'Intermediate' },
          { name: 'Dumbbell Curl', target: 'Long Head & Short Head', difficulty: 'Foundational' },
          { name: 'Alternating Dumbbell Curl', target: 'Long Head', difficulty: 'Foundational' },
          { name: 'Close-Grip EZ Bar Curl', target: 'Long Head / Peak', difficulty: 'Intermediate' },
          { name: 'Drag Curl', target: 'Outer Long Head', difficulty: 'Advanced' },
          { name: 'Behind-the-Back Cable Curl', target: 'Long Head Peak Isolation', difficulty: 'Advanced' },
          { name: 'Concentration Curl', target: 'Long Head Peak', difficulty: 'Intermediate' }
        ]
      },
      {
        title: 'BICEPS SHORT HEAD (Inner Biceps / Width)',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Preacher Curl', target: 'Short Head (Inner)', difficulty: 'Intermediate' },
          { name: 'Wide-Grip EZ Bar Curl', target: 'Short Head / Width', difficulty: 'Foundational' },
          { name: 'Spider Curl', target: 'Short Head Peak contraction', difficulty: 'Advanced' },
          { name: 'Machine Preacher Curl', target: 'Short Head isolation', difficulty: 'Foundational' },
          { name: 'High Cable Curl', target: 'Short Head / Peak', difficulty: 'Intermediate' },
          { name: 'Bayesian Curl', target: 'Short Head stretch focus', difficulty: 'Advanced' },
          { name: 'Cable Curl', target: 'Short Head / continuous tension', difficulty: 'Foundational' }
        ]
      },
      {
        title: 'BRACHIALIS (Adds Arm Thickness)',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Hammer Curl', target: 'Brachialis, Brachioradialis', difficulty: 'Foundational' },
          { name: 'Cross-Body Hammer Curl', target: 'Brachialis thickness', difficulty: 'Intermediate' },
          { name: 'Rope Hammer Curl', target: 'Brachialis / continuous tension', difficulty: 'Foundational' },
          { name: 'Reverse Curl', target: 'Brachioradialis, Brachialis', difficulty: 'Foundational' },
          { name: 'EZ Bar Reverse Curl', target: 'Forearm flexors, Brachialis', difficulty: 'Intermediate' },
          { name: 'Dumbbell Hammer Curl', target: 'Brachialis / thickness', difficulty: 'Foundational' }
        ]
      },
      {
        title: 'BEST OVERALL BICEP EXERCISES',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Barbell Curl', target: 'Long Head, Short Head', difficulty: 'Foundational' },
          { name: 'Dumbbell Curl', target: 'Long Head, Short Head, Brachialis', difficulty: 'Foundational' },
          { name: 'Incline Dumbbell Curl', target: 'Long Head / Peak', difficulty: 'Intermediate' },
          { name: 'Preacher Curl', target: 'Short Head / Inner Bicep', difficulty: 'Intermediate' },
          { name: 'Hammer Curl', target: 'Brachialis, Brachioradialis', difficulty: 'Foundational' },
          { name: 'Cable Curl', target: 'Short Head & Long Head under continuous tension', difficulty: 'Foundational' },
          { name: 'Concentration Curl', target: 'Long Head Peak isolation', difficulty: 'Intermediate' }
        ]
      }
    ]
  },
  chest: {
    name: 'Chest',
    description: 'Pectoralis major and minor development.',
    subsections: [
      {
        title: 'UPPER CHEST',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Incline Dumbbell Press', target: 'Upper Chest / Clavicular Head', difficulty: 'Intermediate' },
          { name: 'Incline Barbell Bench Press', target: 'Upper Chest / Clavicular Head', difficulty: 'Intermediate' },
          { name: 'Incline Smith Machine Press', target: 'Upper Chest', difficulty: 'Foundational' },
          { name: 'Incline Machine Press', target: 'Upper Chest', difficulty: 'Foundational' },
          { name: 'Low-to-High Cable Fly', target: 'Upper Chest clavicular fibers', difficulty: 'Intermediate' }
        ]
      },
      {
        title: 'MIDDLE CHEST',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Flat Barbell Bench Press', target: 'Middle Chest / Sternal Head', difficulty: 'Intermediate' },
          { name: 'Flat Dumbbell Bench Press', target: 'Middle Chest / Deep stretch', difficulty: 'Intermediate' },
          { name: 'Machine Chest Press', target: 'Middle Chest isolation', difficulty: 'Foundational' },
          { name: 'Smith Machine Bench Press', target: 'Middle Chest', difficulty: 'Foundational' },
          { name: 'Push-Up', target: 'Middle Chest / core stabilization', difficulty: 'Foundational' }
        ]
      },
      {
        title: 'LOWER CHEST',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Chest Dips', target: 'Lower Chest / Costal Head', difficulty: 'Advanced' },
          { name: 'Decline Bench Press', target: 'Lower Chest', difficulty: 'Intermediate' },
          { name: 'Decline Dumbbell Press', target: 'Lower Chest', difficulty: 'Intermediate' },
          { name: 'High-to-Low Cable Fly', target: 'Lower Chest costal fibers', difficulty: 'Intermediate' },
          { name: 'Decline Push-Up', target: 'Lower Chest / costal focus', difficulty: 'Foundational' }
        ]
      },
      {
        title: 'CHEST ISOLATION / FLY MOVEMENTS',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Cable Fly', target: 'Chest Isolation / Inner Squeeze', difficulty: 'Foundational' },
          { name: 'Pec Deck Fly', target: 'Middle Chest Isolation', difficulty: 'Foundational' },
          { name: 'Dumbbell Fly', target: 'Outer Chest stretch focus', difficulty: 'Intermediate' },
          { name: 'Cable Crossover', target: 'Upper/Lower Chest intersection', difficulty: 'Intermediate' },
          { name: 'Svend Press', target: 'Inner Chest contraction', difficulty: 'Foundational' }
        ]
      },
      {
        title: 'BEST OVERALL CHEST EXERCISES',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Incline Dumbbell Press', target: 'Upper Chest / Clavicular Head', difficulty: 'Intermediate' },
          { name: 'Flat Barbell Bench Press', target: 'Middle Chest / Sternal Head', difficulty: 'Intermediate' },
          { name: 'Flat Dumbbell Bench Press', target: 'Middle Chest, Deep Fiber Stretch', difficulty: 'Intermediate' },
          { name: 'Chest Dips', target: 'Lower Chest / Costal Head', difficulty: 'Advanced' },
          { name: 'Cable Fly', target: 'Chest Isolation, Inner Squeeze', difficulty: 'Foundational' },
          { name: 'Pec Deck Fly', target: 'Middle Chest Isolation', difficulty: 'Foundational' },
          { name: 'Push-Up', target: 'Overall Chest Functional Base', difficulty: 'Foundational' },
          { name: 'Incline Barbell Bench Press', target: 'Upper Chest Strength', difficulty: 'Intermediate' }
        ]
      }
    ]
  },
  back: {
    name: 'Back',
    description: 'Latissimus dorsi, rhomboids, and lower back thickness.',
    subsections: [
      {
        title: 'UPPER LATS (Width)',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Pull-Up', target: 'Upper Lats, Teres Major', difficulty: 'Advanced' },
          { name: 'Wide-Grip Lat Pulldown', target: 'Upper Lats', difficulty: 'Foundational' },
          { name: 'Close-Grip Lat Pulldown', target: 'Upper Lats', difficulty: 'Foundational' }
        ]
      },
      {
        title: 'LOWER LATS',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Close-Grip Lat Pulldown', target: 'Lower Lats', difficulty: 'Foundational' },
          { name: 'Straight-Arm Cable Pulldown', target: 'Lower Lats stretch', difficulty: 'Intermediate' },
          { name: 'Seated Cable Row (V-Bar)', target: 'Lower Lats & Mid-Back', difficulty: 'Intermediate' }
        ]
      },
      {
        title: 'MID-BACK (Thickness)',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'T-Bar Row', target: 'Mid-Back Thickness / Rhomboids', difficulty: 'Intermediate' },
          { name: 'Seated Cable Row', target: 'Mid-Back Thickness', difficulty: 'Foundational' },
          { name: 'One-Arm Dumbbell Row', target: 'Lower Lat / Mid-Back stretch', difficulty: 'Intermediate' }
        ]
      },
      {
        title: 'UPPER BACK',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Bent-Over Barbell Row', target: 'Upper Back / Mid-Back / Spinal Erectors', difficulty: 'Advanced' },
          { name: 'Chest-Supported Row', target: 'Upper Back / Rhomboids', difficulty: 'Foundational' },
          { name: 'Face Pull', target: 'Upper Back / Rear Delts', difficulty: 'Foundational' }
        ]
      },
      {
        title: 'TRAPS',
        repsLabel: '(3 * Failure)',
        exercises: [
          { name: 'Barbell Shrug', target: 'Upper Traps', difficulty: 'Foundational' },
          { name: 'Dumbbell Shrug', target: 'Upper Traps', difficulty: 'Foundational' }
        ]
      },
      {
        title: 'REAR DELTS',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Face Pull', target: 'Rear Delts & Upper Back', difficulty: 'Foundational' },
          { name: 'Reverse Pec Deck', target: 'Rear Delts Isolation', difficulty: 'Foundational' }
        ]
      },
      {
        title: 'LOWER BACK',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Deadlift', target: 'Lower Back, Spinal Erectors, Hamstrings', difficulty: 'Advanced', reps: '(3 * 6-8 reps)' },
          { name: 'Back Extension', target: 'Lower Back / Spinal Erectors', difficulty: 'Foundational' }
        ]
      },
      {
        title: 'BEST OVERALL BACK EXERCISES',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Pull-Up', target: 'Upper Lats, Teres Major', difficulty: 'Advanced' },
          { name: 'Wide-Grip Lat Pulldown', target: 'Upper Lats', difficulty: 'Foundational' },
          { name: 'Seated Cable Row (V-Bar)', target: 'Lower Lats, Mid-Back', difficulty: 'Intermediate' },
          { name: 'T-Bar Row', target: 'Mid-Back Thickness, Rhomboids', difficulty: 'Intermediate' },
          { name: 'Bent-Over Barbell Row', target: 'Upper Back, Mid-Back, Erectors', difficulty: 'Advanced' },
          { name: 'Face Pull', target: 'Rear Delts, Upper Back', difficulty: 'Foundational' },
          { name: 'Deadlift', target: 'Lower Back, Spinal Erectors, Hamstrings', difficulty: 'Advanced', reps: '(3 * 6-8 reps)' },
          { name: 'Hyper Extension', target: 'Lower Back', difficulty: 'Foundational' },
          { name: 'Chest-Supported Row', target: 'Upper Back, Mid-Back Isolation', difficulty: 'Foundational' }
        ]
      }
    ]
  },
  legs: {
    name: 'Legs',
    description: 'Quadriceps, hamstrings, gluteals, and calf structures.',
    subsections: [
      {
        title: 'QUADRICEPS (Front Thighs)',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Barbell Back Squat', target: 'Quadriceps & Glutes', difficulty: 'Advanced', reps: '(3 * 6-8 reps)' },
          { name: 'Front Squat', target: 'Quadriceps Core Focus', difficulty: 'Advanced' },
          { name: 'Leg Press', target: 'Quads / Glutes dominant', difficulty: 'Foundational' },
          { name: 'Bulgarian Split Squat', target: 'Quadriceps & Glutes unilateral', difficulty: 'Advanced' },
          { name: 'Walking Lunges', target: 'Quadriceps & Glutes', difficulty: 'Intermediate' },
          { name: 'Leg Extension', target: 'Quadriceps Isolation', difficulty: 'Foundational' },
          { name: 'Hack Squat', target: 'Quadriceps dominant deep stretch', difficulty: 'Intermediate' }
        ]
      },
      {
        title: 'HAMSTRINGS (Back Thighs)',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Romanian Deadlift', target: 'Hamstrings, Glutes Hip-Hinge', difficulty: 'Intermediate' },
          { name: 'Lying Leg Curl', target: 'Hamstring Flexion Isolation', difficulty: 'Foundational' },
          { name: 'Seated Leg Curl', target: 'Hamstrings under deep seated stretch', difficulty: 'Foundational' },
          { name: 'Good Morning', target: 'Hamstrings, Glutes & Lower Back', difficulty: 'Advanced' },
          { name: 'Glute Ham Raise', target: 'Hamstrings / Glutes', difficulty: 'Advanced' },
          { name: 'Single-Leg Romanian Deadlift', target: 'Hamstrings, Glutes & Balance', difficulty: 'Advanced' }
        ]
      },
      {
        title: 'GLUTES',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Barbell Hip Thrust', target: 'Gluteus Maximus Isolation', difficulty: 'Intermediate' },
          { name: 'Glute Bridge', target: 'Glutes / Core stability', difficulty: 'Foundational' },
          { name: 'Bulgarian Split Squat', target: 'Quadriceps, Glutes unilateral', difficulty: 'Advanced' },
          { name: 'Walking Lunges', target: 'Quadriceps, Glutes dynamic load', difficulty: 'Intermediate' },
          { name: 'Romanian Deadlift', target: 'Hamstrings, Glutes Hip-Hinge', difficulty: 'Intermediate' },
          { name: 'Step-Ups', target: 'Glutes, Quads & Stability', difficulty: 'Intermediate' },
          { name: 'Cable Kickback', target: 'Gluteus Maximus Isolation', difficulty: 'Foundational' }
        ]
      },
      {
        title: 'CALVES',
        repsLabel: '(3 * Failure)',
        exercises: [
          { name: 'Standing Calf Raise', target: 'Gastrocnemius / Upper Calf', difficulty: 'Foundational' },
          { name: 'Seated Calf Raise', target: 'Soleus / Lower Calf', difficulty: 'Foundational' },
          { name: 'Leg Press Calf Raise', target: 'Gastrocnemius', difficulty: 'Foundational' },
          { name: 'Single-Leg Calf Raise', target: 'Calf Stability & Balance', difficulty: 'Foundational' },
          { name: 'Donkey Calf Raise', target: 'Gastrocnemius stretch focus', difficulty: 'Intermediate' },
          { name: 'Jump Rope', target: 'Calf Endurance', difficulty: 'Foundational' },
          { name: 'Farmer\'s Walk on Toes', target: 'Calf Endurance & Grip', difficulty: 'Foundational' }
        ]
      },
      {
        title: 'ADDUCTORS (Inner Thigh)',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Adductor Machine', target: 'Adductors / Inner Thigh', difficulty: 'Foundational' },
          { name: 'Sumo Squat', target: 'Adductors / Inner Thigh & Glutes', difficulty: 'Intermediate' },
          { name: 'Sumo Deadlift', target: 'Adductors / Glutes / Back', difficulty: 'Advanced' },
          { name: 'Cossack Squat', target: 'Adductors / Hip Mobility', difficulty: 'Advanced' },
          { name: 'Side Lunges', target: 'Adductors & Quadriceps', difficulty: 'Intermediate' },
          { name: 'Copenhagen Plank', target: 'Adductor Strength & Core', difficulty: 'Advanced' }
        ]
      },
      {
        title: 'ABDUCTORS (Outer Thigh / Side Glutes)',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Hip Abduction Machine', target: 'Outer Thigh / Side Glutes', difficulty: 'Foundational' },
          { name: 'Banded Lateral Walk', target: 'Gluteus Medius / Abductors', difficulty: 'Foundational' },
          { name: 'Cable Hip Abduction', target: 'Abductors', difficulty: 'Foundational' },
          { name: 'Clamshell', target: 'Gluteus Medius', difficulty: 'Foundational' },
          { name: 'Side-Lying Leg Raise', target: 'Abductors', difficulty: 'Foundational' },
          { name: 'Lateral Step-Up', target: 'Abductors & Balance', difficulty: 'Intermediate' }
        ]
      },
      {
        title: 'BEST OVERALL LEG EXERCISES',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Barbell Back Squat', target: 'Quadriceps, Glutes, Adductors', difficulty: 'Advanced', reps: '(3 * 6-8 reps)' },
          { name: 'Front Squat', target: 'Quadriceps Core Focus, Glutes', difficulty: 'Advanced' },
          { name: 'Leg Press', target: 'Quadriceps, Glutes Compound', difficulty: 'Foundational' },
          { name: 'Romanian Deadlift', target: 'Hamstrings, Glutes Hip-Hinge', difficulty: 'Intermediate' },
          { name: 'Bulgarian Split Squat', target: 'Quadriceps, Glutes Unilateral Isolation', difficulty: 'Advanced' },
          { name: 'Walking Lunges', target: 'Quadriceps, Glutes, Dynamic Balance', difficulty: 'Intermediate' },
          { name: 'Hip Thrust', target: 'Gluteus Maximus Isolation', difficulty: 'Intermediate' },
          { name: 'Hack Squat', target: 'Quadriceps Dominant Deep Target', difficulty: 'Intermediate' },
          { name: 'Lying Leg Curl', target: 'Hamstring Flexion Isolation', difficulty: 'Foundational' },
          { name: 'Seated Leg Curl', target: 'Hamstrings under deep seated stretch', difficulty: 'Foundational' },
          { name: 'Leg Extension', target: 'Quadriceps Extension Isolation', difficulty: 'Foundational' },
          { name: 'Standing Calf Raise', target: 'Gastrocnemius / Upper Calf', difficulty: 'Foundational' },
          { name: 'Seated Calf Raise', target: 'Soleus / Lower Calf', difficulty: 'Foundational' }
        ]
      }
    ]
  },
  abs: {
    name: 'Abs',
    description: 'Core stability and abdominal definition.',
    subsections: [
      {
        title: 'UPPER ABS (Upper Rectus Abdominis)',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Crunch', target: 'Upper Abs', difficulty: 'Foundational' },
          { name: 'Cable Crunch', target: 'Upper Abs under progressive load', difficulty: 'Intermediate' },
          { name: 'Machine Crunch', target: 'Upper Abs', difficulty: 'Foundational' },
          { name: 'Weighted Sit-Up', target: 'Upper Abs / Hip Flexors', difficulty: 'Intermediate' },
          { name: 'Decline Sit-Up', target: 'Upper Abs / hip flexion', difficulty: 'Intermediate' },
          { name: 'Sit-Up', target: 'Upper Abs', difficulty: 'Foundational' },
          { name: 'V-Ups', target: 'Upper & Lower Abs coordination', difficulty: 'Intermediate' }
        ]
      },
      {
        title: 'LOWER ABS (Lower Rectus Abdominis)',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Hanging Leg Raise', target: 'Lower Abs & Hip Flexors', difficulty: 'Intermediate' },
          { name: 'Lying Leg Raise', target: 'Lower Abs', difficulty: 'Foundational' },
          { name: 'Reverse Crunch', target: 'Lower Abs', difficulty: 'Foundational' },
          { name: 'Captain’s Chair Leg Raise', target: 'Lower Abs / hip stability', difficulty: 'Foundational' },
          { name: 'Flutter Kicks', target: 'Lower Abs endurance', difficulty: 'Foundational' },
          { name: 'Scissor Kicks', target: 'Lower Abs stability', difficulty: 'Foundational' },
          { name: 'Toe Touches', target: 'Lower Abs / hamstring stretch', difficulty: 'Foundational' }
        ]
      },
      {
        title: 'OBLIQUES (Side Abs)',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Russian Twist', target: 'Internal & External Obliques', difficulty: 'Foundational' },
          { name: 'Bicycle Crunch', target: 'Obliques & Rectus Abdominis coordination', difficulty: 'Foundational' },
          { name: 'Side Plank', target: 'Obliques / lateral stabilization', difficulty: 'Foundational' },
          { name: 'Cable Woodchopper (High to Low)', target: 'Obliques rotation strength', difficulty: 'Intermediate' },
          { name: 'Cable Woodchopper (Low to High)', target: 'Obliques rotational power', difficulty: 'Intermediate' },
          { name: 'Standing Cable Twist', target: 'Obliques rotational tension', difficulty: 'Intermediate' },
          { name: 'Heel Touches', target: 'Obliques / lateral flexion', difficulty: 'Foundational' },
          { name: 'Mountain Climbers', target: 'Obliques / core stabilization', difficulty: 'Foundational' }
        ]
      },
      {
        title: 'OVERALL BEST CORE EXERCISES',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Plank', target: 'Core Stability, Transverse Abdominis', difficulty: 'Foundational' },
          { name: 'Ab Wheel Rollout', target: 'Full Rectus Abdominis, Eccentric Core Strength', difficulty: 'Advanced' },
          { name: 'Hanging Leg Raise', target: 'Lower Abs, Hip Flexors', difficulty: 'Intermediate' },
          { name: 'Cable Crunch', target: 'Upper Abs under progressive load', difficulty: 'Intermediate' },
          { name: 'Reverse Crunch', target: 'Lower Abs', difficulty: 'Foundational' },
          { name: 'Russian Twist', target: 'Internal & External Obliques', difficulty: 'Foundational' },
          { name: 'Bicycle Crunch', target: 'Obliques & Rectus Abdominis Coordination', difficulty: 'Foundational' },
          { name: 'Dead Bug', target: 'Deep Core Stabilization', difficulty: 'Foundational' },
          { name: 'Hollow Hold', target: 'Transverse Abdominis static control', difficulty: 'Intermediate' }
        ]
      }
    ]
  },
  shoulder: {
    name: 'Shoulders',
    description: 'Anterior, lateral, and posterior deltoid caps.',
    subsections: [
      {
        title: 'FRONT DELTS (Anterior Shoulder)',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Overhead Barbell Press', target: 'Front Delts & Triceps strength', difficulty: 'Advanced' },
          { name: 'Dumbbell Shoulder Press', target: 'Front Delts & Triceps stability', difficulty: 'Intermediate' },
          { name: 'Arnold Press', target: 'Front Delts & Rotational work', difficulty: 'Intermediate' },
          { name: 'Front Raise (Dumbbell)', target: 'Anterior Deltoids isolation', difficulty: 'Foundational' },
          { name: 'Cable Front Raise', target: 'Anterior Deltoids continuous tension', difficulty: 'Foundational' }
        ]
      },
      {
        title: 'SIDE DELTS (Lateral Shoulder)',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Dumbbell Lateral Raise', target: 'Lateral Deltoids / Shoulder Width', difficulty: 'Intermediate' },
          { name: 'Cable Lateral Raise', target: 'Lateral Deltoids continuous tension', difficulty: 'Intermediate' },
          { name: 'Machine Lateral Raise', target: 'Lateral Deltoids isolation', difficulty: 'Foundational' },
          { name: 'Leaning Lateral Raise', target: 'Lateral Deltoids stretch focus', difficulty: 'Intermediate' },
          { name: 'Seated Dumbbell Lateral Raise', target: 'Lateral Deltoids', difficulty: 'Intermediate' }
        ]
      },
      {
        title: 'REAR DELTS (Posterior Shoulder)',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Rear Delt Fly (Dumbbell)', target: 'Posterior Deltoids', difficulty: 'Intermediate' },
          { name: 'Reverse Pec Deck', target: 'Rear Deltoids isolation', difficulty: 'Foundational' },
          { name: 'Cable Rear Delt Fly', target: 'Posterior Deltoids', difficulty: 'Intermediate' },
          { name: 'Face Pull', target: 'Rear Delts & Rotator Cuff', difficulty: 'Foundational' },
          { name: 'Bent-Over Rear Delt Raise', target: 'Posterior Deltoids', difficulty: 'Intermediate' }
        ]
      },
      {
        title: 'BEST OVERALL SHOULDER EXERCISES',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Overhead Barbell Press', target: 'Front Delts, Triceps, Trunks', difficulty: 'Advanced' },
          { name: 'Dumbbell Shoulder Press', target: 'Front Delts, Triceps Stability', difficulty: 'Intermediate' },
          { name: 'Lateral Raise', target: 'Side Delts Shoulder Width', difficulty: 'Intermediate' },
          { name: 'Rear Delt Fly', target: 'Rear Delts, Upper Back', difficulty: 'Intermediate' },
          { name: 'Face Pull', target: 'Rear Delts, Rotator Cuff, Upper Back', difficulty: 'Foundational' }
        ]
      }
    ]
  },
  forearms: {
    name: 'Forearms',
    description: 'Wrist flexors and extensors promoting strong grip strength.',
    subsections: [
      {
        title: 'FOREARMS (GRIP + FLEXORS)',
        repsLabel: '(3 * Failure)',
        exercises: [
          { name: 'Wrist Curl (Barbell)', target: 'Forearm Flexors', difficulty: 'Foundational' },
          { name: 'Wrist Curl (Dumbbell)', target: 'Forearm Flexors', difficulty: 'Foundational' },
          { name: 'Reverse Wrist Curl', target: 'Forearm Extensors', difficulty: 'Intermediate' },
          { name: 'Farmer’s Walk', target: 'Grip Endurance / Flexors', difficulty: 'Foundational' },
          { name: 'Dead Hang (Pull-Up Bar)', target: 'Static Hand Grip Strength', difficulty: 'Foundational' },
          { name: 'Plate Pinch Hold', target: 'Pinch Grip Strength', difficulty: 'Intermediate' },
          { name: 'Towel Hang', target: 'Finger & Thumb Grip strength', difficulty: 'Advanced' }
        ]
      },
      {
        title: 'FOREARM EXTENSORS (Outer Forearm)',
        repsLabel: '(3 * Failure)',
        exercises: [
          { name: 'Reverse Curl (EZ Bar)', target: 'Forearm Extensors', difficulty: 'Intermediate' },
          { name: 'Reverse Curl (Barbell)', target: 'Forearm Extensors', difficulty: 'Intermediate' },
          { name: 'Hammer Curl', target: 'Brachioradialis / Extensors', difficulty: 'Foundational' },
          { name: 'Zottman Curl', target: 'Brachioradialis & Extensors', difficulty: 'Intermediate' },
          { name: 'Cross-Body Hammer Curl', target: 'Brachioradialis thickness', difficulty: 'Intermediate' }
        ]
      },
      {
        title: 'BRACHIORADIALIS (Top/Side Forearm Thickness)',
        repsLabel: '(3 * Failure)',
        exercises: [
          { name: 'Hammer Curl', target: 'Brachioradialis', difficulty: 'Foundational' },
          { name: 'Rope Hammer Curl', target: 'Brachioradialis continuous tension', difficulty: 'Foundational' },
          { name: 'Reverse Curl', target: 'Brachioradialis', difficulty: 'Intermediate' },
          { name: 'Zottman Curl', target: 'Brachioradialis & Flexors', difficulty: 'Intermediate' },
          { name: 'Incline Dumbbell Curl', target: 'Brachioradialis / Peak stretch', difficulty: 'Intermediate' }
        ]
      },
      {
        title: 'GRIP STRENGTH (OVERALL)',
        repsLabel: '(3 * Failure)',
        exercises: [
          { name: 'Farmer’s Walk', target: 'Grip Endurance / Forearms', difficulty: 'Foundational' },
          { name: 'Dead Hang', target: 'Static Hand Grip', difficulty: 'Foundational' },
          { name: 'Plate Pinch Hold', target: 'Pinch Grip Strength', difficulty: 'Intermediate' },
          { name: 'Towel Pull-Up Hold', target: 'Advanced Grip Strength', difficulty: 'Advanced' },
          { name: 'Barbell Hold (Static)', target: 'Static Hand Grip Strength', difficulty: 'Intermediate' }
        ]
      },
      {
        title: 'OVERALL BEST FOREARM EXERCISES',
        repsLabel: '(3 * Failure)',
        exercises: [
          { name: 'Hammer Curl', target: 'Brachioradialis, Forearm Extensors', difficulty: 'Foundational' },
          { name: 'Reverse Curl', target: 'Forearm Extensors, Outer Forearm', difficulty: 'Intermediate' },
          { name: 'Wrist Curl', target: 'Forearm Flexors, Inner Wrist Grip', difficulty: 'Foundational' },
          { name: 'Farmer’s Walk', target: 'Overall Grip Endurance, Flexors', difficulty: 'Foundational' },
          { name: 'Dead Hang', target: 'Deep Finger & Static Hand Grip Strength', difficulty: 'Foundational' },
          { name: 'Zottman Curl', target: 'Brachioradialis & Flexor/Extensor Transition', difficulty: 'Intermediate' }
        ]
      }
    ]
  },
  triceps: {
    name: 'Triceps',
    description: 'Long, lateral, and medial heads encompassing arm extension.',
    subsections: [
      {
        title: 'LONG HEAD (Largest Triceps Head)',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Overhead Dumbbell Extension', target: 'Long Head Stretch', difficulty: 'Intermediate' },
          { name: 'Overhead Cable Extension', target: 'Long Head stretch & tension', difficulty: 'Intermediate' },
          { name: 'EZ Bar Skull Crusher', target: 'Long Head & Lateral Head mass', difficulty: 'Intermediate' },
          { name: 'Incline Dumbbell Triceps Extension', target: 'Long Head stretch', difficulty: 'Intermediate' },
          { name: 'Single-Arm Overhead Cable Extension', target: 'Long Head isolation', difficulty: 'Intermediate' }
        ]
      },
      {
        title: 'LATERAL HEAD (Outer Horseshoe Shape)',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Rope Pushdown', target: 'Lateral Head horseshoe contraction', difficulty: 'Foundational' },
          { name: 'Straight Bar Pushdown', target: 'Lateral Head continuous tension', difficulty: 'Foundational' },
          { name: 'V-Bar Pushdown', target: 'Lateral Head', difficulty: 'Foundational' },
          { name: 'Close-Grip Bench Press', target: 'Medial & Lateral Head Compound', difficulty: 'Advanced' },
          { name: 'Bench Dips', target: 'Lateral Head & Chest contraction', difficulty: 'Foundational' }
        ]
      },
      {
        title: 'MEDIAL HEAD (Deep Head Near Elbow)',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Reverse-Grip Pushdown', target: 'Medial Head deep emphasis', difficulty: 'Foundational' },
          { name: 'Cable Pushdown', target: 'Medial Head isolation', difficulty: 'Foundational' },
          { name: 'Diamond Push-Up', target: 'Medial Head & Core control', difficulty: 'Foundational' },
          { name: 'Close-Grip Bench Press', target: 'Medial & Lateral Head Compound', difficulty: 'Advanced' },
          { name: 'Dumbbell Kickback', target: 'Medial Head peak contraction', difficulty: 'Foundational' }
        ]
      },
      {
        title: 'BEST OVERALL TRICEP EXERCISES',
        repsLabel: '(3 * 8-12 reps)',
        exercises: [
          { name: 'Overhead Cable Extension', target: 'Triceps Long Head under stretch', difficulty: 'Intermediate' },
          { name: 'EZ Bar Skull Crusher', target: 'Long Head & Lateral Head mass', difficulty: 'Intermediate' },
          { name: 'Rope Pushdown', target: 'Lateral Head horseshoe contraction', difficulty: 'Foundational' },
          { name: 'Close-Grip Bench Press', target: 'Medial & Lateral Head Compound Strength', difficulty: 'Advanced' },
          { name: 'Reverse-Grip Pushdown', target: 'Medial Head deep emphasis', difficulty: 'Foundational' }
        ]
      }
    ]
  }
};

const PROGRAMS_DB = {
  arnold: {
    name: "ARNOLD SPLIT (6 DAYS/WEEK)",
    subtitle: "Classic Arnold Schwarzenegger-inspired chest/back, shoulders/arms, and legs split.",
    splits: [
      {
        day: 'MONDAY',
        title: '* CHEST + BACK DAY A',
        isRest: false,
        sections: [
          {
            name: 'Chest',
            exercises: [
              { name: 'Barbell Bench Press', reps: '4 × 6–10', desc: 'Chest (overall), triceps, front shoulders' },
              { name: 'Incline Dumbbell Press', reps: '3 × 8–12', desc: 'Upper chest focus' },
              { name: 'Pec Deck Fly', reps: '3 × 12–15', desc: 'Chest stretch + inner chest focus' }
            ]
          },
          {
            name: 'Back',
            exercises: [
              { name: 'Lat Pulldown', reps: '4 × 8–12', desc: 'Upper lats width' },
              { name: 'Seated Cable Row', reps: '3 × 8–12', desc: 'Mid back thickness' },
              { name: 'Straight Arm Pulldown', reps: '3 × 12–15', desc: 'Lower lats isolation' }
            ]
          }
        ]
      },
      {
        day: 'TUESDAY',
        title: '* SHOULDERS + ARMS DAY A',
        isRest: false,
        sections: [
          {
            name: 'Shoulders',
            exercises: [
              { name: 'Machine Shoulder Press', reps: '3 × 8–12', desc: 'Front delts' },
              { name: 'Dumbbell Lateral Raise', reps: '4 × 12–15', desc: 'Side delts width' },
              { name: 'Reverse Pec Deck', reps: '3 × 12–15', desc: 'Rear delts' }
            ]
          },
          {
            name: 'Arms',
            exercises: [
              { name: 'Dumbbell Curl', reps: '3 × 10–12', desc: 'Biceps overall' },
              { name: 'Hammer Curl', reps: '3 × 10–12', desc: 'Brachialis + forearm thickness' },
              { name: 'Rope Pushdown', reps: '3 × 10–15', desc: 'Triceps lateral + medial heads' },
              { name: 'Overhead Rope Extension', reps: '3 × 10–15', desc: 'Triceps long head' }
            ]
          }
        ]
      },
      {
        day: 'WEDNESDAY',
        title: '* LEGS DAY A',
        isRest: false,
        sections: [
          {
            name: 'Quads',
            exercises: [
              { name: 'Leg Press', reps: '3 × 10–12', desc: 'Quads + glutes dominant' },
              { name: 'Goblet Squat', reps: '3 × 10–12', desc: 'Quads + core stability' },
              { name: 'Leg Extension', reps: '3 × 12–15', desc: 'Quad isolation' }
            ]
          },
          {
            name: 'Hamstrings & Calves',
            exercises: [
              { name: 'Seated Leg Curl', reps: '3 × 10–15', desc: 'Hamstring isolation' },
              { name: 'Standing Calf Raise', reps: '4 × 12–20', desc: 'Upper calf' }
            ]
          }
        ]
      },
      {
        day: 'THURSDAY',
        title: '* CHEST + BACK DAY B',
        isRest: false,
        sections: [
          {
            name: 'Chest',
            exercises: [
              { name: 'Incline Machine Press', reps: '4 × 8–12', desc: 'Upper chest development' },
              { name: 'Dumbbell Bench Press', reps: '3 × 8–12', desc: 'Mid chest mass' },
              { name: 'Cable Fly', reps: '3 × 12–15', desc: 'Inner chest squeeze' }
            ]
          },
          {
            name: 'Back',
            exercises: [
              { name: 'Close-Grip Lat Pulldown', reps: '4 × 8–12', desc: 'Inner lat focus' },
              { name: 'Machine Row', reps: '3 × 10–12', desc: 'Mid back thickness' },
              { name: 'One-Arm Dumbbell Row', reps: '3 × 10–12', desc: 'Lower lat stretch' }
            ]
          }
        ]
      },
      {
        day: 'FRIDAY',
        title: '* SHOULDERS + ARMS DAY B',
        isRest: false,
        sections: [
          {
            name: 'Shoulders',
            exercises: [
              { name: 'Dumbbell Shoulder Press', reps: '3 × 8–12', desc: 'Front delts strength' },
              { name: 'Cable Lateral Raise', reps: '4 × 12–15', desc: 'Side delts width' },
              { name: 'Face Pull', reps: '3 × 12–15', desc: 'Rear delts + upper traps' }
            ]
          },
          {
            name: 'Arms',
            exercises: [
              { name: 'Incline Dumbbell Curl', reps: '3 × 10–12', desc: 'Biceps peak (long head)' },
              { name: 'Cable Curl', reps: '3 × 12–15', desc: 'Biceps constant tension' },
              { name: 'Assisted Dips Machine', reps: '3 × 8–12', desc: 'Triceps + lower chest' },
              { name: 'Rope Pushdown', reps: '3 × 10–15', desc: 'Triceps pump' }
            ]
          }
        ]
      },
      {
        day: 'SATURDAY',
        title: '* LEGS DAY B',
        isRest: false,
        sections: [
          {
            name: 'Quads & Glutes',
            exercises: [
              { name: 'Hack Squat / Leg Press', reps: '3 × 10–12', desc: 'Quads deep stretch focus' },
              { name: 'Walking Lunges', reps: '3 × 10–12 each leg', desc: 'Quads + glutes + stability' },
              { name: 'Leg Extension', reps: '3 × 12–15', desc: 'Quad burn' }
            ]
          },
          {
            name: 'Hamstrings & Glutes & Calves',
            exercises: [
              { name: 'Romanian Deadlift', reps: '3 × 8–12', desc: 'Hamstrings + glutes stretch' },
              { name: 'Seated Leg Curl', reps: '3 × 10–15', desc: 'Hamstrings isolation' },
              { name: 'Hip Thrust', reps: '3 × 10–12', desc: 'Glute max isolation' },
              { name: 'Seated Calf Raise', reps: '4 × 12–20', desc: 'Lower calf' }
            ]
          }
        ]
      },
      {
        day: 'SUNDAY',
        title: '*SUNDAY ---> REST',
        isRest: true,
        sections: []
      }
    ]
  },
  ppl_3day: {
    name: "PUSH-PULL-LEG (3 DAYS/WEEK)",
    subtitle: "Classic 3-day split training push, pull, and legs once a week with ample recovery.",
    splits: [
      {
        day: 'MONDAY',
        title: '* PUSH DAY — Chest + Shoulders + Triceps',
        isRest: false,
        sections: [
          {
            name: 'Chest',
            exercises: [
              { name: 'Machine Chest Press', reps: '3 × 8–12', desc: 'Chest press mechanical alignment' },
              { name: 'Incline Dumbbell Press', reps: '3 × 8–12', desc: 'Upper chest development' },
              { name: 'Pec Deck Fly', reps: '3 × 12–15', desc: 'Chest stretch + inner chest contraction' }
            ]
          },
          {
            name: 'Shoulders',
            exercises: [
              { name: 'Machine Shoulder Press', reps: '3 × 8–12', desc: 'Front delts push' },
              { name: 'Dumbbell Lateral Raise', reps: '3 × 12–15', desc: 'Side delts width' }
            ]
          },
          {
            name: 'Triceps',
            exercises: [
              { name: 'Rope Pushdown', reps: '3 × 10–15', desc: 'Triceps lateral head' },
              { name: 'Overhead Rope Extension', reps: '3 × 10–15', desc: 'Triceps long head' }
            ]
          }
        ]
      },
      {
        day: 'TUESDAY',
        title: '*TUESDAY ---> REST',
        isRest: true,
        sections: []
      },
      {
        day: 'WEDNESDAY',
        title: '* PULL DAY — Back + Biceps',
        isRest: false,
        sections: [
          {
            name: 'Back',
            exercises: [
              { name: 'Lat Pulldown', reps: '3 × 8–12', desc: 'Lats width V-shape' },
              { name: 'Seated Cable Row', reps: '3 × 8–12', desc: 'Rhomboids and middle back thickness' },
              { name: 'Machine Row', reps: '3 × 10–12', desc: 'Mid back depth' }
            ]
          },
          {
            name: 'Rear Delts',
            exercises: [
              { name: 'Reverse Pec Deck', reps: '3 × 12–15', desc: 'Rear shoulders' }
            ]
          },
          {
            name: 'Biceps',
            exercises: [
              { name: 'Dumbbell Curl', reps: '3 × 10–12', desc: 'Standard biceps build' },
              { name: 'Hammer Curl', reps: '3 × 10–12', desc: 'Forearms and arm thickness' }
            ]
          }
        ]
      },
      {
        day: 'THURSDAY',
        title: '*THURSDAY ---> REST',
        isRest: true,
        sections: []
      },
      {
        day: 'FRIDAY',
        title: '*FRIDAY ---> REST',
        isRest: true,
        sections: []
      },
      {
        day: 'SATURDAY',
        title: '* LEGS DAY — Quads + Hamstrings + Glutes + Calves',
        isRest: false,
        sections: [
          {
            name: 'Quads',
            exercises: [
              { name: 'Leg Press', reps: '3 × 10–12', desc: 'Quads and glutes load' },
              { name: 'Goblet Squat', reps: '3 × 10–12', desc: 'Foundational squat mechanics' },
              { name: 'Leg Extension', reps: '3 × 12–15', desc: 'Quad isolation' }
            ]
          },
          {
            name: 'Hamstrings',
            exercises: [
              { name: 'Seated Leg Curl', reps: '3 × 10–15', desc: 'Hamstring isolation' },
              { name: 'Romanian Deadlift', reps: '3 × 8–12', desc: 'Hamstrings glutes stretch' }
            ]
          },
          {
            name: 'Glutes',
            exercises: [
              { name: 'Hip Thrust', reps: '3 × 10–12', desc: 'Glutes dominant power' }
            ]
          },
          {
            name: 'Calves',
            exercises: [
              { name: 'Standing Calf Raise', reps: '3 × 12–20', desc: 'Gastrocnemius upper calf' }
            ]
          }
        ]
      },
      {
        day: 'SUNDAY',
        title: '*SUNDAY ---> REST',
        isRest: true,
        sections: []
      }
    ]
  },
  ppl: {
    name: "PUSH-PULL-LEG (6 DAYS/WEEK)",
    subtitle: "High-frequency push, pull, legs split alternating strength and hypertrophy focuses.",
    splits: [
      {
        day: 'MONDAY',
        title: '* PUSH A — Chest + Front/Side Shoulders + Triceps (Strength Focus)',
        isRest: false,
        sections: [
          {
            name: 'Chest (Pectorals)',
            exercises: [
              { name: 'Barbell Bench Press', reps: '3 × 5–8', desc: 'Chest (overall), triceps, front shoulders' },
              { name: 'Incline Dumbbell Press', reps: '3 × 8–10', desc: 'Upper chest, front shoulders' },
              { name: 'Cable / Dumbbell Fly', reps: '3 × 12–15', desc: 'Chest stretch + inner chest focus' }
            ]
          },
          {
            name: 'Shoulders (Front + Side)',
            exercises: [
              { name: 'Overhead Shoulder Press', reps: '3 × 6–10', desc: 'Front delts + side delts + triceps' },
              { name: 'Lateral Raise', reps: '3 × 12–20', desc: 'Side delts (width of shoulders)' }
            ]
          },
          {
            name: 'Triceps (Arms)',
            exercises: [
              { name: 'Close-Grip Bench Press', reps: '3 × 6–10', desc: 'Triceps (all heads, heavy strength)' },
              { name: 'Rope Pushdown', reps: '3 × 10–15', desc: 'Lateral + medial triceps heads' }
            ]
          }
        ]
      },
      {
        day: 'TUESDAY',
        title: '* PULL A — Back + Biceps + Rear Delts (Strength Focus)',
        isRest: false,
        sections: [
          {
            name: 'Back (Width + Thickness)',
            exercises: [
              { name: 'Pull-Ups / Lat Pulldown', reps: '3 × 6–12', desc: 'Upper lats (width)' },
              { name: 'Barbell Row', reps: '3 × 6–10', desc: 'Middle back, traps, thickness' },
              { name: 'Seated Cable Row', reps: '3 × 8–12', desc: 'Middle lats + rhomboids' },
              { name: 'Straight Arm Pulldown', reps: '3 × 12–15', desc: 'Lower lats isolation' }
            ]
          },
          {
            name: 'Rear Shoulders',
            exercises: [
              { name: 'Face Pulls', reps: '3 × 12–20', desc: 'Rear delts + upper traps' }
            ]
          },
          {
            name: 'Biceps (Arms)',
            exercises: [
              { name: 'Barbell Curl', reps: '3 × 6–10', desc: 'Overall biceps (strength)' },
              { name: 'Incline Dumbbell Curl', reps: '3 × 8–12', desc: 'Long head (peak)' },
              { name: 'Hammer Curl', reps: '3 × 10–12', desc: 'Brachialis + forearm thickness' }
            ]
          }
        ]
      },
      {
        day: 'WEDNESDAY',
        title: '* LEGS A — Quads + Hamstrings + Glutes + Calves (Strength Focus)',
        isRest: false,
        sections: [
          {
            name: 'Quads (Front thighs)',
            exercises: [
              { name: 'Back Squat', reps: '3 × 5–8', desc: 'Full legs (quad dominant)' },
              { name: 'Leg Press', reps: '3 × 10–12', desc: 'Quads + glutes' },
              { name: 'Leg Extension', reps: '3 × 12–15', desc: 'Quad isolation' }
            ]
          },
          {
            name: 'Hamstrings + Glutes',
            exercises: [
              { name: 'Romanian Deadlift', reps: '3 × 6–10', desc: 'Hamstrings + glutes (stretch focus)' },
              { name: 'Lying Leg Curl', reps: '3 × 10–15', desc: 'Hamstring isolation' },
              { name: 'Hip Thrust', reps: '3 × 8–12', desc: 'Glute maximum strength' }
            ]
          },
          {
            name: 'Calves',
            exercises: [
              { name: 'Standing Calf Raise', reps: '3 × 12–20', desc: 'Gastrocnemius (upper calf)' }
            ]
          }
        ]
      },
      {
        day: 'THURSDAY',
        title: '* PUSH B — Chest + Shoulders + Triceps (Hypertrophy Focus)',
        isRest: false,
        sections: [
          {
            name: 'Chest',
            exercises: [
              { name: 'Incline Barbell / Dumbbell Press', reps: '3 × 8–12', desc: 'Upper chest focus' },
              { name: 'Flat Dumbbell Press', reps: '3 × 8–12', desc: 'Mid chest' },
              { name: 'Cable Fly', reps: '3 × 12–15', desc: 'Chest squeeze + pump' }
            ]
          },
          {
            name: 'Shoulders',
            exercises: [
              { name: 'Machine Shoulder Press', reps: '3 × 10–12', desc: 'Front delts' },
              { name: 'Lateral Raise (slow reps)', reps: '3 × 15–20', desc: 'Side delts (width)' }
            ]
          },
          {
            name: 'Triceps',
            exercises: [
              { name: 'Overhead Triceps Extension', reps: '3 × 10–15', desc: 'Long head (big arm look)' },
              { name: 'Rope Pushdown', reps: '3 × 12–15', desc: 'Lateral head burn' }
            ]
          }
        ]
      },
      {
        day: 'FRIDAY',
        title: '* PULL B — Back + Biceps + Rear Delts (Hypertrophy Focus)',
        isRest: false,
        sections: [
          {
            name: 'Back (Width + Shape)',
            exercises: [
              { name: 'Lat Pulldown (wide grip)', reps: '3 × 8–12', desc: 'Upper lats (V-shape)' },
              { name: 'One-Arm Dumbbell Row', reps: '3 × 8–12', desc: 'Lower + mid back' },
              { name: 'Cable Row (close grip)', reps: '3 × 10–12', desc: 'Middle back thickness' }
            ]
          },
          {
            name: 'Rear Delts',
            exercises: [
              { name: 'Rear Delt Fly', reps: '3 × 12–20', desc: 'Rear shoulders + posture' }
            ]
          },
          {
            name: 'Biceps',
            exercises: [
              { name: 'Incline Dumbbell Curl', reps: '3 × 10–12', desc: 'Biceps peak' },
              { name: 'Cable Curl', reps: '3 × 12–15', desc: 'Constant tension biceps' }
            ]
          }
        ]
      },
      {
        day: 'SATURDAY',
        title: '* LEGS B — Quads + Hamstrings + Glutes + Calves (Hypertrophy Focus)',
        isRest: false,
        sections: [
          {
            name: 'Quads',
            exercises: [
              { name: 'Front Squat / Hack Squat', reps: '3 × 8–12', desc: 'Quads (deep stretch)' },
              { name: 'Walking Lunges', reps: '3 × 10–12 each leg', desc: 'Quads + glutes + balance' },
              { name: 'Leg Extension', reps: '3 × 12–15', desc: 'Quad burn' }
            ]
          },
          {
            name: 'Hamstrings & Glutes & Calves',
            exercises: [
              { name: 'Leg Curl', reps: '3 × 10–15', desc: 'Hamstrings' },
              { name: 'Hip Thrust', reps: '3 × 8–12', desc: 'Glutes power' },
              { name: 'Seated Calf Raise', reps: '3 × 12–20', desc: 'Lower calf' }
            ]
          }
        ]
      },
      {
        day: 'SUNDAY',
        title: '*SUNDAY ---> REST',
        isRest: true,
        sections: []
      }
    ]
  },
  bro: {
    name: "BRO SPLIT (6 DAYS/WEEK)",
    subtitle: "High-volume bodybuilding routine targeting a single major muscle group per session.",
    splits: [
      {
        day: 'MONDAY',
        title: '* CHEST DAY — Chest + Triceps (Push Focus)',
        isRest: false,
        sections: [
          {
            name: 'Chest',
            exercises: [
              { name: 'Barbell Bench Press', reps: '3 × 5–8', desc: 'Overall chest, strength' },
              { name: 'Incline Dumbbell Press', reps: '3 × 8–10', desc: 'Upper chest' },
              { name: 'Cable Fly', reps: '3 × 12–15', desc: 'Chest squeeze + inner chest' }
            ]
          },
          {
            name: 'Triceps',
            exercises: [
              { name: 'Close-Grip Bench Press', reps: '3 × 6–10', desc: 'Heavy triceps strength' },
              { name: 'Rope Pushdown', reps: '3 × 10–15', desc: 'Lateral + medial heads' },
              { name: 'Overhead Extension', reps: '3 × 10–15', desc: 'Long head (arm size)' }
            ]
          }
        ]
      },
      {
        day: 'TUESDAY',
        title: '* BACK DAY — Back + Biceps',
        isRest: false,
        sections: [
          {
            name: 'Back',
            exercises: [
              { name: 'Pull-Ups / Lat Pulldown', reps: '3 × 6–12', desc: 'Lat width' },
              { name: 'Barbell Row', reps: '3 × 6–10', desc: 'Thickness' },
              { name: 'Seated Cable Row', reps: '3 × 8–12', desc: 'Mid back control' },
              { name: 'Straight Arm Pulldown', reps: '3 × 12–15', desc: 'Lower lats isolation' }
            ]
          },
          {
            name: 'Biceps',
            exercises: [
              { name: 'Barbell Curl', reps: '3 × 6–10', desc: 'Overall biceps' },
              { name: 'Incline Dumbbell Curl', reps: '3 × 8–12', desc: 'Peak (long head)' },
              { name: 'Hammer Curl', reps: '3 × 10–12', desc: 'Forearm + brachialis' }
            ]
          }
        ]
      },
      {
        day: 'WEDNESDAY',
        title: '* LEG DAY — Quads + Hamstrings + Glutes + Calves',
        isRest: false,
        sections: [
          {
            name: 'Quads',
            exercises: [
              { name: 'Back Squat', reps: '3 × 5–8', desc: 'Full legs' },
              { name: 'Leg Press', reps: '3 × 10–12', desc: 'Quads + glutes' },
              { name: 'Leg Extension', reps: '3 × 12–15', desc: 'Quad isolation' }
            ]
          },
          {
            name: 'Hamstrings + Glutes',
            exercises: [
              { name: 'Romanian Deadlift', reps: '3 × 6–10', desc: 'Hamstrings + glutes' },
              { name: 'Lying Leg Curl', reps: '3 × 10–15', desc: 'Hamstrings isolation' },
              { name: 'Hip Thrust', reps: '3 × 8–12', desc: 'Glutes power' }
            ]
          },
          {
            name: 'Calves',
            exercises: [
              { name: 'Standing Calf Raise', reps: '3 × 12–20', desc: 'Upper calves' },
              { name: 'Seated Calf Raise', reps: '3 × 12–20', desc: 'Lower calves' }
            ]
          }
        ]
      },
      {
        day: 'THURSDAY',
        title: '* SHOULDER DAY — Shoulders + Traps',
        isRest: false,
        sections: [
          {
            name: 'Shoulders',
            exercises: [
              { name: 'Overhead Shoulder Press', reps: '3 × 6–10', desc: 'Front + side delts' },
              { name: 'Lateral Raise', reps: '3 × 12–20', desc: 'Side delts (width)' },
              { name: 'Rear Delt Fly', reps: '3 × 12–20', desc: 'Rear delts (posture)' }
            ]
          },
          {
            name: 'Traps',
            exercises: [
              { name: 'Dumbbell Shrugs', reps: '3 × 10–15', desc: 'Upper traps' }
            ]
          }
        ]
      },
      {
        day: 'FRIDAY',
        title: '* ARMS DAY — Biceps + Triceps Focus',
        isRest: false,
        sections: [
          {
            name: 'Biceps',
            exercises: [
              { name: 'Barbell Curl', reps: '3 × 6–10', desc: 'Mass builder' },
              { name: 'Incline Dumbbell Curl', reps: '3 × 8–12', desc: 'Peak' },
              { name: 'Cable Curl', reps: '3 × 12–15', desc: 'Constant tension' }
            ]
          },
          {
            name: 'Triceps',
            exercises: [
              { name: 'Close-Grip Bench Press', reps: '3 × 6–10', desc: 'Strength' },
              { name: 'Rope Pushdown', reps: '3 × 10–15', desc: 'Pump' },
              { name: 'Overhead Extension', reps: '3 × 10–15', desc: 'Long head' }
            ]
          }
        ]
      },
      {
        day: 'SATURDAY',
        title: '* ABS + WEAK POINT DAY (Optional / 6th day if needed)',
        isRest: false,
        sections: [
          {
            name: 'Core',
            exercises: [
              { name: 'Hanging Leg Raise', reps: '3 × 10–15', desc: 'Lower abs' },
              { name: 'Cable Crunch', reps: '3 × 12–15', desc: 'Upper abs' },
              { name: 'Plank', reps: '3 × 30–60 sec', desc: 'Core stability' }
            ]
          },
          {
            name: 'WEAK MUSCLE',
            exercises: [
              { name: 'Targeted Isolation Exercise', reps: '3 × 12–15', desc: 'Address specific lagging groups' }
            ]
          }
        ]
      },
      {
        day: 'SUNDAY',
        title: '*SUNDAY ---> REST',
        isRest: true,
        sections: []
      }
    ]
  },
  upper_lower: {
    name: "UPPER-LOWER BODY SPLIT (6 DAYS/WEEK)",
    subtitle: "Highly effective split alternating upper body push/pull and lower body quad/hamstring days.",
    splits: [
      {
        day: 'MONDAY',
        title: '* UPPER A — Chest + Back + Shoulders + Arms (Strength Focus)',
        isRest: false,
        sections: [
          {
            name: 'Chest & Back',
            exercises: [
              { name: 'Barbell Bench Press', reps: '3 × 5–8', desc: 'Chest (overall), front shoulders, triceps' },
              { name: 'Incline Dumbbell Press', reps: '3 × 8–10', desc: 'Upper chest' },
              { name: 'Pull-Ups / Lat Pulldown', reps: '3 × 6–12', desc: 'Lats (width)' },
              { name: 'Barbell Row', reps: '3 × 6–10', desc: 'Mid back thickness' }
            ]
          },
          {
            name: 'Shoulders & Arms',
            exercises: [
              { name: 'Overhead Shoulder Press', reps: '3 × 6–10', desc: 'Front + side delts' },
              { name: 'Barbell Curl', reps: '3 × 6–10', desc: 'Overall biceps' },
              { name: 'Rope Pushdown', reps: '3 × 10–15', desc: 'Triceps lateral + medial heads' }
            ]
          }
        ]
      },
      {
        day: 'TUESDAY',
        title: '* LOWER A — Quads + Hamstrings + Glutes + Calves (Strength Focus)',
        isRest: false,
        sections: [
          {
            name: 'Quads',
            exercises: [
              { name: 'Back Squat', reps: '3 × 5–8', desc: 'Full legs (quad dominant)' },
              { name: 'Leg Press', reps: '3 × 10–12', desc: 'Quads + glutes' }
            ]
          },
          {
            name: 'Hamstrings & Glutes & Calves',
            exercises: [
              { name: 'Romanian Deadlift', reps: '3 × 6–10', desc: 'Hamstrings + glutes' },
              { name: 'Lying Leg Curl', reps: '3 × 10–15', desc: 'Hamstring isolation' },
              { name: 'Standing Calf Raise', reps: '3 × 12–20', desc: 'Upper calves' }
            ]
          }
        ]
      },
      {
        day: 'WEDNESDAY',
        title: '* UPPER B — Chest + Back + Shoulders + Arms (Hypertrophy Focus)',
        isRest: false,
        sections: [
          {
            name: 'Chest & Back',
            exercises: [
              { name: 'Incline Barbell / Dumbbell Press', reps: '3 × 8–12', desc: 'Upper chest' },
              { name: 'Cable Fly', reps: '3 × 12–15', desc: 'Chest squeeze + pump' },
              { name: 'Lat Pulldown (Wide Grip)', reps: '3 × 8–12', desc: 'Lats (width)' },
              { name: 'Seated Cable Row', reps: '3 × 10–12', desc: 'Mid back thickness' }
            ]
          },
          {
            name: 'Shoulders & Arms',
            exercises: [
              { name: 'Lateral Raise', reps: '3 × 12–20', desc: 'Side delts (width)' },
              { name: 'Rear Delt Fly', reps: '3 × 12–20', desc: 'Rear delts' },
              { name: 'Incline Dumbbell Curl', reps: '3 × 10–12', desc: 'Biceps peak' },
              { name: 'Overhead Triceps Extension', reps: '3 × 10–15', desc: 'Long head' }
            ]
          }
        ]
      },
      {
        day: 'THURSDAY',
        title: '* LOWER B — Quads + Hamstrings + Glutes + Calves (Hypertrophy Focus)',
        isRest: false,
        sections: [
          {
            name: 'Quads',
            exercises: [
              { name: 'Front Squat / Hack Squat', reps: '3 × 8–12', desc: 'Quad focus' },
              { name: 'Walking Lunges', reps: '3 × 10–12 each leg', desc: 'Quads + glutes' },
              { name: 'Leg Extension', reps: '3 × 12–15', desc: 'Quad burn' }
            ]
          },
          {
            name: 'Hamstrings & Glutes & Calves',
            exercises: [
              { name: 'Leg Curl', reps: '3 × 10–15', desc: 'Hamstrings' },
              { name: 'Hip Thrust', reps: '3 × 8–12', desc: 'Glutes power' },
              { name: 'Seated Calf Raise', reps: '3 × 12–20', desc: 'Lower calves' }
            ]
          }
        ]
      },
      {
        day: 'FRIDAY',
        title: '* UPPER A(REPEAT) — Chest + Back + Shoulders + Arms (Strength Focus)',
        isRest: false,
        sections: [
          {
            name: 'Chest & Back',
            exercises: [
              { name: 'Barbell Bench Press', reps: '3 × 5–8', desc: 'Chest (overall), front shoulders, triceps' },
              { name: 'Incline Dumbbell Press', reps: '3 × 8–10', desc: 'Upper chest' },
              { name: 'Pull-Ups / Lat Pulldown', reps: '3 × 6–12', desc: 'Lats (width)' },
              { name: 'Barbell Row', reps: '3 × 6–10', desc: 'Mid back thickness' }
            ]
          },
          {
            name: 'Shoulders & Arms',
            exercises: [
              { name: 'Overhead Shoulder Press', reps: '3 × 6–10', desc: 'Front + side delts' },
              { name: 'Barbell Curl', reps: '3 × 6–10', desc: 'Overall biceps' },
              { name: 'Rope Pushdown', reps: '3 × 10–15', desc: 'Triceps lateral + medial heads' }
            ]
          }
        ]
      },
      {
        day: 'SATURDAY',
        title: '* LOWER A(REPEAT) — Quads + Hamstrings + Glutes + Calves (Strength Focus)',
        isRest: false,
        sections: [
          {
            name: 'Quads',
            exercises: [
              { name: 'Back Squat', reps: '3 × 5–8', desc: 'Full legs (quad dominant)' },
              { name: 'Leg Press', reps: '3 × 10–12', desc: 'Quads + glutes' }
            ]
          },
          {
            name: 'Hamstrings & Glutes & Calves',
            exercises: [
              { name: 'Romanian Deadlift', reps: '3 × 6–10', desc: 'Hamstrings + glutes' },
              { name: 'Lying Leg Curl', reps: '3 × 10–15', desc: 'Hamstring isolation' },
              { name: 'Standing Calf Raise', reps: '3 × 12–20', desc: 'Upper calves' }
            ]
          }
        ]
      },
      {
        day: 'SUNDAY',
        title: '*SUNDAY ---> REST',
        isRest: true,
        sections: []
      }
    ]
  },
  beginner: {
    name: "BEGINNER SPLIT (6 DAYS/WEEK)",
    subtitle: "A highly structured beginner friendly introduction targeting simple dynamic groups.",
    splits: [
      {
        day: 'MONDAY',
        title: '* CHEST AND TRICEPS',
        isRest: false,
        sections: [
          {
            name: 'Chest',
            exercises: [
              { name: 'Machine Chest Press', reps: '3 × 8–12', desc: 'Safe chest press setup' },
              { name: 'Incline Dumbbell Press', reps: '3 × 8–12', desc: 'Upper chest development' },
              { name: 'Pec Deck Fly', reps: '3 × 12–15', desc: 'Chest squeeze isolation' }
            ]
          },
          {
            name: 'Triceps',
            exercises: [
              { name: 'Rope Pushdown', reps: '3 × 10–15', desc: 'Outer triceps head focus' },
              { name: 'Overhead Rope Extension', reps: '3 × 10–15', desc: 'Long head stretch' }
            ]
          }
        ]
      },
      {
        day: 'TUESDAY',
        title: '* BACK AND BICEPS',
        isRest: false,
        sections: [
          {
            name: 'Back',
            exercises: [
              { name: 'Lat Pulldown', reps: '3 × 8–12', desc: 'V-shape lat building' },
              { name: 'Seated Cable Row', reps: '3 × 8–12', desc: 'Rhomboids and middle lats' },
              { name: 'Machine Row', reps: '3 × 10–12', desc: 'Safe rowing mechanics' }
            ]
          },
          {
            name: 'Biceps',
            exercises: [
              { name: 'Dumbbell Curl', reps: '3 × 10–12', desc: 'Standard biceps build' },
              { name: 'Hammer Curl', reps: '3 × 10–12', desc: 'Forearms and arm thickness' }
            ]
          }
        ]
      },
      {
        day: 'WEDNESDAY',
        title: '* SHOULDER DAY',
        isRest: false,
        sections: [
          {
            name: 'Shoulders & Traps',
            exercises: [
              { name: 'Machine Shoulder Press', reps: '3 × 8–12', desc: 'Front delts' },
              { name: 'Dumbbell Lateral Raise', reps: '4 × 12–15', desc: 'Side delts (width)' },
              { name: 'Reverse Pec Deck', reps: '3 × 12–15', desc: 'Rear delts (posture)' },
              { name: 'Dumbbell Shrugs', reps: '3 × 10–15', desc: 'Upper traps' }
            ]
          }
        ]
      },
      {
        day: 'THURSDAY',
        title: '* LEGS DAY A (Quad Focus)',
        isRest: false,
        sections: [
          {
            name: 'Quads & Hamstrings & Calves',
            exercises: [
              { name: 'Leg Press', reps: '3 × 10–12', desc: 'Quads and glutes load' },
              { name: 'Goblet Squat', reps: '3 × 10–12', desc: 'Foundational squat mechanics' },
              { name: 'Leg Extension', reps: '3 × 12–15', desc: 'Quad isolation' },
              { name: 'Seated Leg Curl', reps: '3 × 10–15', desc: 'Hamstring isolation' },
              { name: 'Standing Calf Raise', reps: '4 × 12–20', desc: 'Upper calf build' }
            ]
          }
        ]
      },
      {
        day: 'FRIDAY',
        title: '* ARMS DAY',
        isRest: false,
        sections: [
          {
            name: 'Biceps & Triceps',
            exercises: [
              { name: 'Dumbbell Curl', reps: '3 × 10–12', desc: 'Standard biceps curls' },
              { name: 'Incline Dumbbell Curl', reps: '3 × 10–12', desc: 'Incline stretch curl' },
              { name: 'Hammer Curl', reps: '3 × 10–12', desc: 'Brachialis thickness' },
              { name: 'Rope Pushdown', reps: '3 × 10–15', desc: 'Triceps pump' },
              { name: 'Overhead Rope Extension', reps: '3 × 10–15', desc: 'Long head size' },
              { name: 'Assisted Dips Machine', reps: '3 × 8–12', desc: 'Foundational triceps press' }
            ]
          }
        ]
      },
      {
        day: 'SATURDAY',
        title: '* LEGS DAY B (Hamstring & Glute Focus)',
        isRest: false,
        sections: [
          {
            name: 'Hamstrings & Glutes',
            exercises: [
              { name: 'Romanian Deadlift', reps: '3 × 8–12', desc: 'Hamstrings and glutes stretch' },
              { name: 'Seated Leg Curl', reps: '3 × 10–15', desc: 'Hamstring contraction' },
              { name: 'Hip Thrust', reps: '3 × 10–12', desc: 'Glutes dominant build' },
              { name: 'Walking Lunges', reps: '3 × 10–12 each leg', desc: 'Glutes + balance' }
            ]
          },
          {
            name: 'Quads & Calves',
            exercises: [
              { name: 'Leg Extension', reps: '3 × 12–15', desc: 'Quad pump' },
              { name: 'Seated Calf Raise', reps: '4 × 12–20', desc: 'Lower calf building' }
            ]
          }
        ]
      },
      {
        day: 'SUNDAY',
        title: '*SUNDAY ---> REST',
        isRest: true,
        sections: []
      }
    ]
  },
  full_body: {
    name: "FULL BODY (4 DAYS/WEEK)",
    subtitle: "Highly efficient full body workouts alternating split routines 4 days a week.",
    splits: [
      {
        day: 'MONDAY',
        title: '* FULL BODY A',
        isRest: false,
        sections: [
          {
            name: 'Chest & Back',
            exercises: [
              { name: 'Machine Chest Press', reps: '3 × 8–12', desc: 'Chest press setup' },
              { name: 'Pec Deck Fly', reps: '2 × 12–15', desc: 'Inner chest contraction' },
              { name: 'Lat Pulldown', reps: '3 × 8–12', desc: 'Lat width build' },
              { name: 'Seated Cable Row', reps: '2 × 8–12', desc: 'Middle lats density' }
            ]
          },
          {
            name: 'Shoulders & Arms',
            exercises: [
              { name: 'Machine Shoulder Press', reps: '3 × 8–12', desc: 'Front shoulder power' },
              { name: 'Dumbbell Lateral Raise', reps: '2 × 12–15', desc: 'Side delts width' },
              { name: 'Dumbbell Curl', reps: '2 × 10–12', desc: 'Biceps overall mass' },
              { name: 'Rope Pushdown', reps: '2 × 10–15', desc: 'Triceps lateral head' }
            ]
          },
          {
            name: 'Quads',
            exercises: [
              { name: 'Leg Press', reps: '3 × 10–12', desc: 'Quads and glutes load' },
              { name: 'Leg Extension', reps: '2 × 12–15', desc: 'Quad burn' }
            ]
          }
        ]
      },
      {
        day: 'TUESDAY',
        title: '* FULL BODY B',
        isRest: false,
        sections: [
          {
            name: 'Chest & Back',
            exercises: [
              { name: 'Incline Dumbbell Press', reps: '3 × 8–12', desc: 'Upper chest incline' },
              { name: 'Cable Fly', reps: '2 × 12–15', desc: 'Constant cable stretch' },
              { name: 'Machine Row', reps: '3 × 8–12', desc: 'Mid back depth' },
              { name: 'Close-Grip Lat Pulldown', reps: '2 × 8–12', desc: 'Lower lats focus' }
            ]
          },
          {
            name: 'Shoulders & Arms',
            exercises: [
              { name: 'Dumbbell Shoulder Press', reps: '3 × 8–12', desc: 'Front delts overhead press' },
              { name: 'Reverse Pec Deck', reps: '2 × 12–15', desc: 'Rear shoulders' },
              { name: 'Hammer Curl', reps: '2 × 10–12', desc: 'Brachialis mass' },
              { name: 'Overhead Rope Extension', reps: '2 × 10–15', desc: 'Triceps long head' }
            ]
          },
          {
            name: 'Legs & Calves',
            exercises: [
              { name: 'Romanian Deadlift', reps: '3 × 8–12', desc: 'Hamstrings glutes stretch' },
              { name: 'Seated Leg Curl', reps: '2 × 10–15', desc: 'Hamstring isolation' },
              { name: 'Standing Calf Raise', reps: '3 × 12–20', desc: 'Gastrocnemius' }
            ]
          }
        ]
      },
      {
        day: 'WEDNESDAY',
        title: '*WEDNESDAY ---> REST',
        isRest: true,
        sections: []
      },
      {
        day: 'THURSDAY',
        title: '* FULL BODY A',
        isRest: false,
        sections: [
          {
            name: 'Chest & Back',
            exercises: [
              { name: 'Machine Chest Press', reps: '3 × 8–12', desc: 'Chest press setup' },
              { name: 'Pec Deck Fly', reps: '2 × 12–15', desc: 'Inner chest contraction' },
              { name: 'Lat Pulldown', reps: '3 × 8–12', desc: 'Lat width build' },
              { name: 'Seated Cable Row', reps: '2 × 8–12', desc: 'Middle lats density' }
            ]
          },
          {
            name: 'Shoulders & Arms',
            exercises: [
              { name: 'Machine Shoulder Press', reps: '3 × 8–12', desc: 'Front shoulder power' },
              { name: 'Dumbbell Lateral Raise', reps: '2 × 12–15', desc: 'Side delts width' },
              { name: 'Dumbbell Curl', reps: '2 × 10–12', desc: 'Biceps overall mass' },
              { name: 'Rope Pushdown', reps: '2 × 10–15', desc: 'Triceps lateral head' }
            ]
          },
          {
            name: 'Quads',
            exercises: [
              { name: 'Leg Press', reps: '3 × 10–12', desc: 'Quads and glutes load' },
              { name: 'Leg Extension', reps: '2 × 12–15', desc: 'Quad burn' }
            ]
          }
        ]
      },
      {
        day: 'FRIDAY',
        title: '* FULL BODY B',
        isRest: false,
        sections: [
          {
            name: 'Chest & Back',
            exercises: [
              { name: 'Incline Dumbbell Press', reps: '3 × 8–12', desc: 'Upper chest incline' },
              { name: 'Cable Fly', reps: '2 × 12–15', desc: 'Constant cable stretch' },
              { name: 'Machine Row', reps: '3 × 8–12', desc: 'Mid back depth' },
              { name: 'Close-Grip Lat Pulldown', reps: '2 × 8–12', desc: 'Lower lats focus' }
            ]
          },
          {
            name: 'Shoulders & Arms',
            exercises: [
              { name: 'Dumbbell Shoulder Press', reps: '3 × 8–12', desc: 'Front delts overhead press' },
              { name: 'Reverse Pec Deck', reps: '2 × 12–15', desc: 'Rear shoulders' },
              { name: 'Hammer Curl', reps: '2 × 10–12', desc: 'Brachialis mass' },
              { name: 'Overhead Rope Extension', reps: '2 × 10–15', desc: 'Triceps long head' }
            ]
          },
          {
            name: 'Legs & Calves',
            exercises: [
              { name: 'Romanian Deadlift', reps: '3 × 8–12', desc: 'Hamstrings glutes stretch' },
              { name: 'Seated Leg Curl', reps: '2 × 10–15', desc: 'Hamstring isolation' },
              { name: 'Standing Calf Raise', reps: '3 × 12–20', desc: 'Gastrocnemius' }
            ]
          }
        ]
      },
      {
        day: 'SATURDAY',
        title: '*SATURDAY ---> REST',
        isRest: true,
        sections: []
      },
      {
        day: 'SUNDAY',
        title: '*SUNDAY ---> REST',
        isRest: true,
        sections: []
      }
    ]
  }
};

// SVG Icon Helpers for Gym Exercises
const EXERCISE_SVG_ICON = `
  <svg viewBox="0 0 24 24">
    <path d="M20.5 11h-2V9a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v2H9.5V9a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v2h-2a1 1 0 0 0 0 2h2v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2h5v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2h2a1 1 0 0 0 0-2zm-15 3H5v-4h.5zm10 0h-.5v-4h.5z"/>
    <path d="M12 4a3 3 0 1 0 3 3 3 3 0 0 0-3-3zm0 4.5A1.5 1.5 0 1 1 13.5 7 1.5 1.5 0 0 1 12 8.5z"/>
  </svg>
`;

/* ==========================================================================
   3. ROUTING & LOGIN UTILITIES
   ========================================================================== */
function switchSection(sectionId) {
  // If user is not authenticated or bypassed, they can only view auth-section
  if (!STATE.user.isAuthenticated && sectionId !== 'auth-section') {
    sectionId = 'auth-section';
  }

  STATE.activeSection = sectionId;

  // Toggle active views
  document.querySelectorAll('.app-section').forEach(section => {
    section.classList.remove('active');
    section.classList.remove('entrance-completed');
    if (section.entranceTimeout) {
      clearTimeout(section.entranceTimeout);
      section.entranceTimeout = null;
    }
  });
  document.getElementById(sectionId).classList.add('active');

  // Update navigation items
  document.querySelectorAll('.nav-item').forEach(nav => {
    nav.classList.remove('active');
    if (nav.getAttribute('data-section') === sectionId) {
      nav.classList.add('active');
    }
  });

  // Smooth scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Toggle Complete Box visibility
  const completeBox = document.getElementById('complete-box');
  if (completeBox) {
    if (sectionId === 'workout-splits' && STATE.splits.active) {
      completeBox.classList.add('active');
    } else {
      completeBox.classList.remove('active');
    }
  }

  // Trigger component entrance sequence if welcome sequence is not running
  if (STATE.user.isAuthenticated && !STATE.welcome.active) {
    setTimeout(triggerComponentEntrance, 40);
  }
}

function handleLoginSubmit() {
  const emailVal = document.getElementById('login-email').value;
  if (emailVal) {
    authenticateUser(emailVal);
  }
}

function handleSignUpSubmit() {
  const emailVal = document.getElementById('signup-email').value;
  if (emailVal) {
    authenticateUser(emailVal);
  }
}

function authenticateUser(email) {
  STATE.user.isAuthenticated = true;
  STATE.user.email = email;

  // Update UI Elements
  document.getElementById('main-nav').style.display = 'flex';
  document.getElementById('user-status-area').style.display = 'flex';
  document.getElementById('user-display-email').textContent = email;

  // Load custom splits from database/local storage
  loadCustomSplits(email);

  // Trigger Welcome sequence
  triggerWelcomeSequence();
}

function handleSignOut() {
  STATE.user.isAuthenticated = false;
  STATE.user.email = '';

  // Update Navigation display
  document.getElementById('main-nav').style.display = 'none';
  document.getElementById('user-status-area').style.display = 'none';
  
  // Remove custom splits from PROGRAMS_DB
  Object.keys(PROGRAMS_DB).forEach(id => {
    if (id.startsWith('custom_split_')) {
      delete PROGRAMS_DB[id];
    }
  });

  // Clear forms
  document.getElementById('form-login').reset();
  document.getElementById('form-signup').reset();

  // Clean welcome sequence state
  resetWelcomeState();

  initWorkoutSplits();
  switchSection('auth-section');
}

/* Welcome Sequence Logic */
function triggerWelcomeSequence() {
  resetWelcomeState();

  STATE.welcome.active = true;

  const container = document.getElementById('welcome-trainer-container');
  const sprite = document.getElementById('trainer-sprite');
  const sleepSvg = document.getElementById('sleeping-trainer-svg');
  const awakeSvg = document.getElementById('awake-trainer-svg');
  const tooltip = document.getElementById('trainer-tooltip');

  if (container && sprite && sleepSvg && awakeSvg && tooltip) {
    container.style.display = 'flex';
    container.classList.remove('dismissed');
    
    sprite.className = 'trainer-sprite sleeping';
    sleepSvg.style.display = 'block';
    awakeSvg.style.display = 'none';
    
    tooltip.textContent = 'Tap on your trainer to wake up';
    tooltip.className = 'trainer-tooltip';
  }

  // Activate Dark Room atmosphere
  document.body.classList.add('dark-room-active');

  // Start particles spawner
  startZParticles();

  // Dimmed Fitness Guide in background
  switchSection('fitness-guide');
}

function resetWelcomeState() {
  STATE.welcome.active = false;
  
  if (STATE.welcome.particlesInterval) {
    clearInterval(STATE.welcome.particlesInterval);
    STATE.welcome.particlesInterval = null;
  }
  if (STATE.welcome.dismissTimeout) {
    clearTimeout(STATE.welcome.dismissTimeout);
    STATE.welcome.dismissTimeout = null;
  }

  document.body.classList.remove('dark-room-active');
  
  const container = document.getElementById('welcome-trainer-container');
  if (container) {
    container.style.display = 'none';
    container.classList.add('dismissed');
  }

  const flash = document.getElementById('light-flash-overlay');
  if (flash) {
    flash.classList.remove('flashing');
  }

  const pContainer = document.getElementById('zzz-particles');
  if (pContainer) {
    pContainer.innerHTML = '';
  }
}

function startZParticles() {
  const pContainer = document.getElementById('zzz-particles');
  if (!pContainer) return;

  pContainer.innerHTML = '';

  STATE.welcome.particlesInterval = setInterval(() => {
    if (!STATE.welcome.active) return;

    const z = document.createElement('span');
    z.className = 'zzz-particle';
    z.textContent = Math.random() > 0.5 ? 'Z' : 'z';

    // Position Z near the trainer's sleeping head (SVG coordinate center 107, 58)
    const containerWidth = pContainer.offsetWidth || 200;
    const baseLeft = containerWidth * 0.65;
    const baseTop = 50;

    const leftOffset = Math.random() * 20 - 10;
    const topOffset = Math.random() * 10 - 5;
    const size = 10 + Math.random() * 12;

    z.style.left = `${baseLeft + leftOffset}px`;
    z.style.top = `${baseTop + topOffset}px`;
    z.style.fontSize = `${size}px`;
    z.style.animationDelay = '0s';

    pContainer.appendChild(z);

    // Remove particle after 3s
    setTimeout(() => {
      if (z.parentNode === pContainer) {
        pContainer.removeChild(z);
      }
    }, 3000);
  }, 700);
}

function solveCubicBezier(p1x, p1y, p2x, p2y, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const currentX = 3 * (1 - t) * (1 - t) * t * p1x + 3 * (1 - t) * t * t * p2x + t * t * t;
    const derivativeX = 3 * (1 - t) * (1 - t) * p1x + 6 * (1 - t) * t * (p2x - p1x) + 3 * t * t * (1 - p2x);
    if (Math.abs(currentX - x) < 0.001) break;
    t -= (currentX - x) / (derivativeX || 1);
  }
  return 3 * (1 - t) * (1 - t) * t * p1y + 3 * (1 - t) * t * t * p2y + t * t * t;
}

function wakeUpTrainer(e) {
  if (!STATE.welcome.active) return;

  // Prevent double tap triggers
  STATE.welcome.active = false;
  
  // Stop Z particles
  if (STATE.welcome.particlesInterval) {
    clearInterval(STATE.welcome.particlesInterval);
    STATE.welcome.particlesInterval = null;
  }

  const pContainer = document.getElementById('zzz-particles');
  if (pContainer) pContainer.innerHTML = '';

  const sprite = document.getElementById('trainer-sprite');
  const sleepSvg = document.getElementById('sleeping-trainer-svg');
  const awakeSvg = document.getElementById('awake-trainer-svg');
  const tooltip = document.getElementById('trainer-tooltip');

  if (sprite && sleepSvg && awakeSvg && tooltip) {
    sprite.className = 'trainer-sprite awake';
    sleepSvg.style.display = 'none';
    awakeSvg.style.display = 'block';

    tooltip.textContent = "Your trainer is awake, Let's train!";
    tooltip.classList.add('awake');
  }

  // Get exact coordinates of the click/tap relative to the viewport
  let clickX = window.innerWidth / 2;
  let clickY = 100; // default top center fallback

  if (e && e.clientX !== undefined) {
    clickX = e.clientX;
    clickY = e.clientY;
  } else if (e && e.touches && e.touches.length > 0) {
    clickX = e.touches[0].clientX;
    clickY = e.touches[0].clientY;
  }

  const overlay = document.getElementById('dark-room-overlay');
  if (overlay) {
    overlay.style.setProperty('--click-x', `${clickX}px`);
    overlay.style.setProperty('--click-y', `${clickY}px`);
    overlay.classList.add('animating');

    // Multi-stage neon flicker & radial mask expansion
    const duration = 500; // 500ms total
    const startTime = performance.now();
    let entranceTriggered = false;

    function animateWelcomeTimeline(time) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      let opacity = 0.98;
      let maskRadius = 0;

      if (elapsed <= 100) {
        // 0ms - 100ms: Quick pop of partial light (30% opacity reduction, from 0.98 to ~0.68)
        const t = elapsed / 100;
        opacity = 0.98 - 0.3 * t;
      } else if (elapsed <= 200) {
        // 100ms - 200ms: Micro-drop back to dark room visibility (0.98)
        const t = (elapsed - 100) / 100;
        opacity = 0.68 + 0.3 * t;
      } else if (elapsed <= 250) {
        // 200ms - 250ms: Second quick flicker pulse (50% light exposure, opacity ~0.49)
        const t = (elapsed - 200) / 50;
        opacity = 0.98 - 0.49 * t;
      } else {
        // 250ms - 500ms: A smooth, powerful, high-fidelity linear surge to 100% full clarity (opacity 0)
        // And expand the radial gradient mask using cubic-bezier(0.25, 1, 0.5, 1)
        const t = (elapsed - 250) / 250;

        if (!entranceTriggered) {
          entranceTriggered = true;
          triggerComponentEntrance();
        }
        
        // Solve custom cubic-bezier for the surge
        const easedT = solveCubicBezier(0.25, 1, 0.5, 1, t);

        opacity = 0.49 * (1 - easedT);
        maskRadius = easedT * 150; // expand transparent mask radius from 0% to 150%
      }

      overlay.style.opacity = opacity;
      overlay.style.setProperty('--mask-radius', `${maskRadius}%`);

      if (progress < 1) {
        requestAnimationFrame(animateWelcomeTimeline);
      } else {
        // Cleanup overlay and remove animating class
        overlay.style.display = 'none';
        overlay.classList.remove('animating');
        document.body.classList.remove('dark-room-active');
      }
    }

    requestAnimationFrame(animateWelcomeTimeline);
  }

  // Trigger 5-second automatic cleanup
  STATE.welcome.dismissTimeout = setTimeout(() => {
    const container = document.getElementById('welcome-trainer-container');
    if (container) {
      container.classList.add('dismissed');
      
      // Fully hide display once height collapses
      setTimeout(() => {
        container.style.display = 'none';
      }, 600);
    }
  }, 5000);
}

/* Premium Staggered Component Entrance Sequence */
function triggerComponentEntrance() {
  const activeSection = document.getElementById(STATE.activeSection);
  const header = document.querySelector('.vintage-header');
  
  const elementsToAnimate = [];

  // 1. Gather static header animatable items
  if (header) {
    header.querySelectorAll('.entrance-animate').forEach(el => elementsToAnimate.push(el));
  }

  // 2. Gather active section animatable items
  if (activeSection) {
    activeSection.querySelectorAll('.entrance-animate').forEach(el => elementsToAnimate.push(el));
    
    // Clear any previous completion states and timeouts
    activeSection.classList.remove('entrance-completed');
    if (activeSection.entranceTimeout) {
      clearTimeout(activeSection.entranceTimeout);
    }
  }

  // 3. Sort elements by their vertical screen coordinates to enforce top-to-bottom order
  elementsToAnimate.sort((a, b) => {
    const rectA = a.getBoundingClientRect();
    const rectB = b.getBoundingClientRect();
    return rectA.top - rectB.top;
  });

  // 4. Calculate step size dynamically to clamp the entire cascade sequence within a 250ms window
  // (leaving 350ms for the animation duration to resolve in exactly 600ms total)
  const maxTotalDelay = 250; // ms
  const count = elementsToAnimate.length;
  const step = count > 1 ? Math.min(40, maxTotalDelay / (count - 1)) : 40;

  // 5. Apply staggered delay and active class triggers
  elementsToAnimate.forEach((el, index) => {
    el.classList.remove('active');
    void el.offsetWidth; // trigger reflow
    el.style.animationDelay = `${index * step}ms`;
    el.classList.add('active');
  });

  // 6. Mark the section entrance as completed after 600ms to allow dynamic updates to render instantly visible
  if (activeSection) {
    activeSection.entranceTimeout = setTimeout(() => {
      activeSection.classList.add('entrance-completed');
      activeSection.entranceTimeout = null;
    }, 600);
  }
}

/* ==========================================================================
   4. SECTION 1: INTERACTIVE FITNESS GUIDE
   ========================================================================== */
function initFitnessGuide() {
  const gridContainer = document.getElementById('muscle-guide-grid');
  gridContainer.innerHTML = '';

  Object.keys(EXERCISE_DB).forEach(key => {
    const muscleGroup = EXERCISE_DB[key];
    // Calculate total exercises count
    let exCount = 0;
    muscleGroup.subsections.forEach(sub => exCount += sub.exercises.length);

    const card = document.createElement('div');
    card.className = 'card-tactile muscle-card entrance-animate';
    card.innerHTML = `
      <div class="muscle-card-header">
        <h3>${muscleGroup.name}</h3>
        <span class="muscle-card-count">${exCount} Exercises</span>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem;">
        ${muscleGroup.description}
      </p>
    `;

    card.addEventListener('click', () => {
      openMuscleDrilldown(key);
    });

    gridContainer.appendChild(card);
  });

  // Drilldown back button
  document.getElementById('btn-drilldown-back').addEventListener('click', () => {
    document.getElementById('muscle-drilldown').classList.remove('active');
    document.getElementById('muscle-guide-grid').style.display = 'grid';
    // Re-trigger guide entrance animations
    setTimeout(triggerComponentEntrance, 40);
  });
}

function openMuscleDrilldown(muscleKey) {
  const muscleGroup = EXERCISE_DB[muscleKey];
  document.getElementById('drilldown-muscle-title').textContent = muscleGroup.name;

  let totalEx = 0;
  muscleGroup.subsections.forEach(s => totalEx += s.exercises.length);
  document.getElementById('drilldown-exercise-count').textContent = `${totalEx} Exercises Loaded`;

  const subContainer = document.getElementById('subsections-container');
  subContainer.innerHTML = '';

  // Render Google Drive style boxes grid universally
  const gridDiv = document.createElement('div');
  gridDiv.className = 'biceps-category-grid entrance-animate';

  const svgIcons = {
    barbell: `<svg class="biceps-category-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
       <path d="M6 18h12M12 6v12M3 10v4M21 10v4M6 8v8M18 8v8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
       <path d="M12 6l-3 3M12 6l3 3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
     </svg>`,
    dumbbell: `<svg class="biceps-category-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
       <path d="M4 12h16M4 8v8M20 8v8M8 6v12M16 6v12" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
       <path d="M8 12h8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
     </svg>`,
    thickness: `<svg class="biceps-category-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
       <rect x="3" y="10" width="4" height="4" rx="1" stroke-width="1.5"/>
       <rect x="17" y="10" width="4" height="4" rx="1" stroke-width="1.5"/>
       <path d="M7 12h10M10 8v8M14 8v8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
     </svg>`,
    trophy: `<svg class="biceps-category-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
       <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
       <path d="M6 4v5c0 3.3 2.7 6 6 6s6-2.7 6-6V4H6zM12 15v4M8 20h8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
     </svg>`,
    kettlebell: `<svg class="biceps-category-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
       <path d="M12 2a3 3 0 0 0-3 3v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3V5a3 3 0 0 0-3-3zm-1 5V5a1 1 0 0 1 2 0v2h-2z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
     </svg>`,
    abs: `<svg class="biceps-category-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
       <rect x="4" y="4" width="6" height="6" rx="1" stroke-width="1.5"/>
       <rect x="14" y="4" width="6" height="6" rx="1" stroke-width="1.5"/>
       <rect x="4" y="14" width="6" height="6" rx="1" stroke-width="1.5"/>
       <rect x="14" y="14" width="6" height="6" rx="1" stroke-width="1.5"/>
     </svg>`
  };

  const typeIconSvg = `
    <svg class="biceps-category-type-icon" viewBox="0 0 24 24">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
    </svg>
  `;

  muscleGroup.subsections.forEach((sub, idx) => {
    let iconSvg = svgIcons.dumbbell;
    const titleLower = sub.title.toLowerCase();
    
    if (titleLower.includes('best overall') || titleLower.includes('overall best')) {
      iconSvg = svgIcons.trophy;
    } else if (titleLower.includes('thickness') || titleLower.includes('lower back') || titleLower.includes('brachialis')) {
      iconSvg = svgIcons.thickness;
    } else if (titleLower.includes('abs') || titleLower.includes('core')) {
      iconSvg = svgIcons.abs;
    } else if (idx === 0) {
      iconSvg = svgIcons.barbell;
    } else if (idx === 1) {
      iconSvg = svgIcons.dumbbell;
    } else {
      iconSvg = svgIcons.kettlebell;
    }

    const cleanTitle = sub.title.replace(/\s*\(.*\)/, '').replace('BICEPS ', '').replace('FOREARMS ', '');
    
    const card = document.createElement('div');
    card.className = `biceps-category-card entrance-animate ${idx === 0 ? 'active' : ''}`;
    card.innerHTML = `
      <div class="biceps-category-thumb">
        ${iconSvg}
      </div>
      <div class="biceps-category-bar">
        <div class="biceps-category-title-area">
          ${typeIconSvg}
          <span class="biceps-category-title">${cleanTitle}</span>
        </div>
        <button class="biceps-category-menu-btn" aria-label="Category options">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
          </svg>
        </button>
      </div>
    `;

    card.addEventListener('click', () => {
      subContainer.querySelectorAll('.biceps-category-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      positionAndRender(idx);
    });

    gridDiv.appendChild(card);
  });

  subContainer.appendChild(gridDiv);

  // Target container for exercises with transition styling
  const targetListDiv = document.createElement('div');
  targetListDiv.id = 'biceps-exercises-container';
  targetListDiv.className = 'exercises-collapse-container';

  // Position and render first category by default
  positionAndRender(0);

  function positionAndRender(idx) {
    // 1. Collapse first to allow smooth drawbridge effect
    targetListDiv.classList.remove('expanded');
    
    // Force reflow
    void targetListDiv.offsetHeight;
    
    // 2. Render exercise items inside
    renderMuscleExercises(idx);
    
    // 3. Move target container inline directly after the clicked card's row
    let cols = window.innerWidth <= 600 ? 1 : 2;
    let insertAfterIdx = cols === 1 ? idx : Math.min(muscleGroup.subsections.length - 1, Math.floor(idx / 2) * 2 + 1);
    
    const cardElements = gridDiv.querySelectorAll('.biceps-category-card');
    const targetCard = cardElements[insertAfterIdx];
    if (targetCard) {
      if (targetCard.nextSibling) {
        gridDiv.insertBefore(targetListDiv, targetCard.nextSibling);
      } else {
        gridDiv.appendChild(targetListDiv);
      }
    }
    
    // Force reflow to register position change
    void targetListDiv.offsetHeight;
    
    // 4. Slide open smoothly
    targetListDiv.classList.add('expanded');
  }

  function renderMuscleExercises(subIdx) {
    const sub = muscleGroup.subsections[subIdx];
    const repsStr = sub.repsLabel ? sub.repsLabel : '(3 * 8-12 reps)';
    
    targetListDiv.innerHTML = `
      <div class="entrance-animate" style="margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center;">
        <h3 style="font-family:var(--font-display); font-size:1.2rem; color:var(--color-gold); font-weight:800; text-transform:uppercase;">
          ${sub.title}
        </h3>
        <span style="font-size:0.75rem; color:var(--color-brass); font-family:var(--font-body); font-weight:500;">
          ${repsStr}
        </span>
      </div>
      <div class="exercises-grid">
        ${sub.exercises.map(ex => {
          let diffClass = 'diff-foundational';
          if (ex.difficulty === 'Intermediate') diffClass = 'diff-intermediate';
          if (ex.difficulty === 'Advanced') diffClass = 'diff-advanced';

          return `
            <div class="exercise-card entrance-animate">
              <div class="exercise-img-placeholder wipe-image">
                ${EXERCISE_SVG_ICON}
                <span>Illustration</span>
              </div>
              <div class="exercise-details">
                <div class="exercise-name">${ex.name}</div>
                <div class="exercise-meta">
                  <span class="exercise-label">Targeted:</span>
                  <span class="exercise-val">${ex.target}</span>
                </div>
                <div class="exercise-meta" style="align-items:center;">
                  <span class="exercise-label">Difficulty:</span>
                  <span class="difficulty-badge ${diffClass}">${ex.difficulty}</span>
                </div>
                <div class="exercise-reps">${ex.reps ? ex.reps : repsStr}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Trigger staggered entrance animation
    setTimeout(triggerComponentEntrance, 40);
  }

  // Swap grids
  document.getElementById('muscle-guide-grid').style.display = 'none';
  document.getElementById('muscle-drilldown').classList.add('active');

  // Trigger staggered entrance
  setTimeout(triggerComponentEntrance, 40);
}

/* ==========================================================================
   5. SECTION 2: WORKOUT SPLITS
   ========================================================================== */
function selectSplitsViewDay(day) {
  STATE.splits.viewDay = day;
  initWorkoutSplits();
}
window.selectSplitsViewDay = selectSplitsViewDay;

function getDayTotalExercises(dayName) {
  const activeProgramId = STATE.splits.activeProgramId;
  if (!activeProgramId) return 0;
  const program = PROGRAMS_DB[activeProgramId];
  if (!program) return 0;
  const split = program.splits.find(s => s.day === dayName);
  if (!split || split.isRest) return 0;
  let count = 0;
  split.sections.forEach(sec => count += sec.exercises.length);
  return count;
}

function checkAndUpdateAttendance(dayName) {
  const ATTENDANCE_MAP = { 'MONDAY': 0, 'TUESDAY': 1, 'WEDNESDAY': 2, 'THURSDAY': 3, 'FRIDAY': 4, 'SATURDAY': 5, 'SUNDAY': 6 };
  const idx = ATTENDANCE_MAP[dayName];
  if (idx === undefined) return;

  const activeProgramId = STATE.splits.activeProgramId;
  if (!activeProgramId) return;
  const program = PROGRAMS_DB[activeProgramId];
  if (!program) return;

  const split = program.splits.find(s => s.day === dayName);
  if (!split) return;

  let isDone = false;
  const dayCompletions = STATE.splits.completions[dayName] || [];

  if (split.isRest) {
    isDone = dayCompletions.includes('RECOVERY');
  } else {
    const totalEx = getDayTotalExercises(dayName);
    isDone = totalEx > 0 && dayCompletions.length >= totalEx;
  }

  STATE.attendance[idx] = isDone;
  updateAnalyticsUI();
}

function bindLongPressUndo(element, callback) {
  let pressTimer;
  
  const startPress = (e) => {
    if (e.type === 'click' && e.button !== 0) return;
    
    element.style.transform = 'scale(0.97)';
    element.style.transition = 'transform 0.8s linear';
    element.style.boxShadow = '0 0 15px rgba(255, 51, 102, 0.4)';
    
    pressTimer = setTimeout(() => {
      element.style.transform = '';
      element.style.transition = '';
      element.style.boxShadow = '';
      callback();
    }, 800);
  };
  
  const cancelPress = () => {
    clearTimeout(pressTimer);
    element.style.transform = '';
    element.style.transition = '';
    element.style.boxShadow = '';
  };
  
  element.addEventListener('mousedown', startPress);
  element.addEventListener('touchstart', startPress, { passive: true });
  
  element.addEventListener('mouseup', cancelPress);
  element.addEventListener('mouseleave', cancelPress);
  element.addEventListener('touchend', cancelPress, { passive: true });
  element.addEventListener('touchcancel', cancelPress, { passive: true });
}

function undoCompletion(dayName, itemName) {
  if (STATE.splits.completions[dayName]) {
    STATE.splits.completions[dayName] = STATE.splits.completions[dayName].filter(item => item !== itemName);
    checkAndUpdateAttendance(dayName);
    initWorkoutSplits();
  }
}

function setupCompleteBox() {
  const completeBox = document.getElementById('complete-box');
  if (!completeBox) return;

  completeBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    completeBox.classList.add('drag-over');
  });

  completeBox.addEventListener('dragleave', () => {
    completeBox.classList.remove('drag-over');
  });

  completeBox.addEventListener('drop', (e) => {
    e.preventDefault();
    completeBox.classList.remove('drag-over');

    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const data = JSON.parse(rawData);
      
      const dayName = data.day;
      if (!STATE.splits.completions[dayName]) {
        STATE.splits.completions[dayName] = [];
      }

      if (data.type === 'exercise') {
        const exName = data.name;
        if (!STATE.splits.completions[dayName].includes(exName)) {
          STATE.splits.completions[dayName].push(exName);
          completeBox.style.transform = 'scale(1.2)';
          setTimeout(() => completeBox.style.transform = '', 200);
        }
      } else if (data.type === 'recovery') {
        if (!STATE.splits.completions[dayName].includes('RECOVERY')) {
          STATE.splits.completions[dayName].push('RECOVERY');
          completeBox.style.transform = 'scale(1.2)';
          setTimeout(() => completeBox.style.transform = '', 200);
        }
      }

      checkAndUpdateAttendance(dayName);
      initWorkoutSplits();
    } catch (err) {
      console.error('Drop error:', err);
    }
  });
}

function initWorkoutSplits() {
  const container = document.getElementById('splits-container');
  container.innerHTML = '';
  
  const completeBox = document.getElementById('complete-box');
  const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const todayName = daysOfWeek[new Date().getDay()];
  
  const ATTENDANCE_MAP = { 'MONDAY': 0, 'TUESDAY': 1, 'WEDNESDAY': 2, 'THURSDAY': 3, 'FRIDAY': 4, 'SATURDAY': 5, 'SUNDAY': 6 };

  if (!STATE.splits.viewDay) {
    STATE.splits.viewDay = todayName;
  }

  // Check if loop has expired
  if (STATE.splits.active && STATE.splits.startedAt) {
    const elapsed = Date.now() - STATE.splits.startedAt;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (elapsed >= sevenDaysMs) {
      STATE.splits.active = false;
      STATE.splits.activeProgramId = null;
      STATE.splits.startedAt = null;
    }
  }

  // Toggle Complete Box
  if (completeBox) {
    if (STATE.splits.active && STATE.activeSection === 'workout-splits') {
      completeBox.classList.add('active');
    } else {
      completeBox.classList.remove('active');
    }
  }

  if (!STATE.splits.active) {
    Object.keys(PROGRAMS_DB).forEach(programId => {
      const program = PROGRAMS_DB[programId];
      const isExpanded = STATE.splits.programExpanded[programId] || false;

      const isCustom = program.isCustomSplit || programId.startsWith('custom_split_');
      const programWrapper = document.createElement('div');
      programWrapper.className = `program-wrapper ${isExpanded ? 'expanded' : ''} entrance-animate`;
      programWrapper.innerHTML = `
        <div class="program-header-bar">
          <div style="display:flex; flex-direction:column; gap:0.2rem;">
            <span style="font-family:var(--font-display); font-size:1.4rem; font-weight:800; color:var(--color-cyan);">${program.name}</span>
            <span style="font-size:0.75rem; color:var(--text-secondary);">${program.subtitle}</span>
          </div>
          <div style="display:flex; align-items:center; gap:1rem;">
            ${isCustom ? `
              <button class="btn-vintage btn-edit-program" id="btn-edit-program-${programId}" style="padding: 0.8rem 1.5rem; border-radius: 8px; border-color: rgba(127, 0, 255, 0.4); color: var(--color-cyan); font-weight: 700;">EDIT</button>
            ` : ''}
            <button class="btn-vintage btn-program-toggle" id="btn-program-toggle-${programId}" style="padding: 0.8rem 1.2rem; border-radius: 8px;" aria-label="Toggle program preview">
              <span class="toggle-arrow">▼</span>
            </button>
            <button class="btn-vintage btn-vintage-primary" id="btn-start-program-${programId}" style="padding: 0.8rem 2.2rem; font-size: 0.9rem; border-radius: 8px; box-shadow: var(--shadow-cyan-glow);">START LOOP</button>
          </div>
        </div>
        <div class="program-drawer" id="program-drawer-${programId}"></div>
      `;
      container.appendChild(programWrapper);

      if (isCustom) {
        const editBtn = programWrapper.querySelector(`#btn-edit-program-${programId}`);
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          editCustomSplit(programId);
        });
      }

      const toggleBtn = programWrapper.querySelector(`#btn-program-toggle-${programId}`);
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        STATE.splits.programExpanded[programId] = !STATE.splits.programExpanded[programId];
        if (STATE.splits.programExpanded[programId]) {
          programWrapper.classList.add('expanded');
        } else {
          programWrapper.classList.remove('expanded');
        }
      });

      const startBtn = programWrapper.querySelector(`#btn-start-program-${programId}`);
      startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        STATE.splits.active = true;
        STATE.splits.activeProgramId = programId;
        STATE.splits.startedAt = Date.now();
        STATE.splits.completions = {};
        STATE.splits.viewDay = todayName;
        STATE.attendance = [false, false, false, false, false, false, false];
        initWorkoutSplits();
        updateAnalyticsUI();
        setTimeout(triggerComponentEntrance, 40);
      });

      // Render Preview inside drawer
      const drawer = programWrapper.querySelector(`#program-drawer-${programId}`);
      const previewContainer = document.createElement('div');
      previewContainer.className = 'split-cards-container';
      
      program.splits.forEach(split => {
        const card = document.createElement('div');
        card.className = `split-card entrance-animate ${split.isRest ? 'rest-day' : ''}`;
        card.innerHTML = `
          <div class="split-header">
            <div class="split-title">
              <div class="split-day">${split.day}</div>
              <div class="split-info">${split.title}</div>
            </div>
            <div class="split-chevron">${split.isRest ? '❖' : '▼'}</div>
          </div>
          <div class="split-content" style="padding: 1.5rem;">
            ${split.isRest ? `
              <div style="font-size:0.8rem; color:var(--text-secondary); font-style:italic;">Recovery day. Focus on rest and stretching.</div>
            ` : `
              <div class="split-sections">
                ${split.sections.map(sec => `
                  <div class="split-section-box" style="padding:1rem;">
                    <div class="split-section-title" style="font-size:1rem; margin-bottom:0.6rem;">${sec.name}</div>
                    <ul class="split-exercise-list" style="gap:0.4rem;">
                      ${sec.exercises.map(ex => `
                        <li class="split-exercise-item" style="font-size:0.8rem;">
                          <div style="display:flex; flex-direction:column;">
                            <span class="split-ex-name" style="color:var(--text-secondary); font-weight:700;">${ex.name}</span>
                            ${ex.desc ? `<span class="split-ex-desc" style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">👉 ${ex.desc}</span>` : ''}
                          </div>
                          <span class="split-ex-reps">${ex.reps}</span>
                        </li>
                      `).join('')}
                    </ul>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        `;

        card.querySelector('.split-header').addEventListener('click', () => {
          card.classList.toggle('expanded');
        });
        previewContainer.appendChild(card);
      });

      drawer.appendChild(previewContainer);
    });

  } else {
    const elapsed = Date.now() - STATE.splits.startedAt;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const daysRemaining = Math.max(0, Math.ceil((sevenDaysMs - elapsed) / (24 * 60 * 60 * 1000)));

    const activeProgramId = STATE.splits.activeProgramId;
    const program = PROGRAMS_DB[activeProgramId];

    const activeHeader = document.createElement('div');
    activeHeader.style.display = 'flex';
    activeHeader.style.justifyContent = 'space-between';
    activeHeader.style.alignItems = 'center';
    activeHeader.style.marginBottom = '1rem';
    activeHeader.style.background = 'rgba(0, 242, 254, 0.03)';
    activeHeader.style.border = '1px solid rgba(0, 242, 254, 0.15)';
    activeHeader.style.borderRadius = '12px';
    activeHeader.style.padding = '1.2rem 1.8rem';
    activeHeader.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.2rem;">
        <span style="font-family:var(--font-display); font-size:1.3rem; font-weight:800; color:var(--color-cyan); display:flex; align-items:center; gap:0.5rem; text-transform:uppercase;">
          <span style="display:inline-block; width:8px; height:8px; background-color:var(--color-green); border-radius:50%; box-shadow:0 0 8px var(--color-green);"></span>
          ACTIVE: ${program.name.split(' (')[0]} — Day ${8 - daysRemaining} of 7
        </span>
        <span style="font-size:0.75rem; color:var(--text-secondary);">Rendered day is shown. Drag incomplete cards into the Complete Box.</span>
      </div>
      <button class="btn-signout" id="btn-reset-program" style="padding:0.5rem 1rem; border-radius:6px; font-weight:700;">RESET LOOP</button>
    `;
    
    activeHeader.querySelector('#btn-reset-program').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset the active 7-day program? All current completions will be cleared.')) {
        STATE.splits.active = false;
        STATE.splits.activeProgramId = null;
        STATE.splits.startedAt = null;
        STATE.splits.completions = {};
        STATE.splits.viewDay = todayName;
        STATE.attendance = [false, false, false, false, false, false, false];
        initWorkoutSplits();
        updateAnalyticsUI();
        setTimeout(triggerComponentEntrance, 40);
      }
    });
    container.appendChild(activeHeader);

    const tabsContainer = document.createElement('div');
    tabsContainer.style.display = 'flex';
    tabsContainer.style.gap = '0.5rem';
    tabsContainer.style.marginBottom = '1.8rem';
    tabsContainer.style.overflowX = 'auto';
    tabsContainer.style.paddingBottom = '0.5rem';
    
    ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(d => {
      const isSystemDay = d === todayName;
      const isSelected = d === STATE.splits.viewDay;
      const isCompleted = STATE.attendance[ATTENDANCE_MAP[d]];
      
      const btn = document.createElement('button');
      btn.className = `nav-item ${isSelected ? 'active' : ''}`;
      btn.style.padding = '0.5rem 1rem';
      btn.style.fontSize = '0.75rem';
      btn.style.borderRadius = '20px';
      btn.style.fontFamily = 'var(--font-body)';
      btn.style.flexShrink = '0';
      
      btn.innerHTML = `${d.substring(0, 3)} ${isSystemDay ? '<span style="color:var(--color-cyan); font-weight:900;">•</span>' : ''} ${isCompleted ? '<span style="color:var(--color-green); margin-left:2px;">✓</span>' : ''}`;
      
      btn.addEventListener('click', () => selectSplitsViewDay(d));
      tabsContainer.appendChild(btn);
    });
    container.appendChild(tabsContainer);

    const activeDayName = STATE.splits.viewDay;
    const split = program.splits.find(s => s.day === activeDayName);
    
    if (split) {
      const splitBox = document.createElement('div');
      
      if (split.isRest) {
        const isDone = (STATE.splits.completions[activeDayName] || []).includes('RECOVERY');
        
        splitBox.innerHTML = `
          <div class="recovery-drag-card entrance-animate ${isDone ? 'completed' : ''}" id="recovery-card" draggable="${!isDone}">
            <div class="recovery-drag-card-title">RECOVERY</div>
            <div class="recovery-drag-card-subtitle">
              System restoration cycle active. Rest the muscles, stretch, hydrate, and promote cellular recovery.
            </div>
            <div class="recovery-drag-card-instruction" id="recovery-card-label">
              ${isDone ? '✓ Completed (Hold to Undo)' : 'DRAG TO COMPLETE BOX TO FINALIZE'}
            </div>
          </div>
        `;
        
        const cardEl = splitBox.querySelector('#recovery-card');
        
        if (!isDone) {
          cardEl.addEventListener('dragstart', (e) => {
            cardEl.classList.add('dragging');
            e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'recovery', day: activeDayName }));
          });
          cardEl.addEventListener('dragend', () => {
            cardEl.classList.remove('dragging');
          });
        } else {
          bindLongPressUndo(cardEl, () => {
            undoCompletion(activeDayName, 'RECOVERY');
          });
        }
        
      } else {
        const completedList = STATE.splits.completions[activeDayName] || [];
        
        splitBox.innerHTML = `
          <div class="ppl-day-block" style="background:var(--bg-card); border:var(--border-glass); border-radius:12px; padding:2rem; box-shadow:var(--shadow-glass);">
            <div style="font-family:var(--font-display); font-size:1.3rem; color:var(--color-gold); margin-bottom:1.5rem; font-weight:800; border-bottom:1px dashed rgba(255,255,255,0.06); padding-bottom:0.8rem;">
              ${split.title.replace('* ', '')}
            </div>
            
            <div class="split-sections">
              ${split.sections.map((sec, secIdx) => `
                <div class="split-section-box">
                  <div class="split-section-title">${sec.name}</div>
                  <div style="display:flex; flex-direction:column; gap:1rem;" id="sec-list-${secIdx}">
                  </div>
                </div>
              `).join('')}
              ${(split.cardio && split.cardio.enabled) ? `
                <div class="split-section-box">
                  <div class="split-section-title">CARDIO</div>
                  <div style="display:flex; flex-direction:column; gap:1rem;" id="cardio-link-section">
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
        
        split.sections.forEach((sec, secIdx) => {
          const listDiv = splitBox.querySelector(`#sec-list-${secIdx}`);
          
          sec.exercises.forEach(ex => {
            const isDone = completedList.includes(ex.name);
            const card = document.createElement('div');
            card.className = `exercise-card entrance-animate ${isDone ? 'completed' : ''}`;
            card.setAttribute('draggable', !isDone);
            
            card.innerHTML = `
              <div class="exercise-img-placeholder wipe-image" style="height:120px;">
                ${EXERCISE_SVG_ICON}
                <span style="font-size:0.6rem;">Illustration</span>
              </div>
              <div class="exercise-details">
                <div class="exercise-name" style="font-size:1rem; font-weight:700;">${ex.name}</div>
                <div style="font-size:0.75rem; color:var(--text-secondary); font-weight:700; margin-top:2px;">
                  Sets: <span style="color:var(--color-cyan);">${ex.reps}</span>
                </div>
                ${ex.desc ? `
                  <div style="font-size:0.7rem; color:var(--text-muted); margin-top:6px; line-height:1.3; font-style:italic;">
                    👉 ${ex.desc}
                  </div>
                ` : ''}
              </div>
            `;
            
            if (!isDone) {
              card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'exercise', name: ex.name, day: activeDayName }));
              });
              card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
              });
            } else {
              bindLongPressUndo(card, () => {
                undoCompletion(activeDayName, ex.name);
              });
            }
            
            listDiv.appendChild(card);
          });
        });

        // Cardio Deep Linking Card Insertion
        if (split.cardio && split.cardio.enabled) {
          const cardioLinkDiv = splitBox.querySelector('#cardio-link-section');
          if (cardioLinkDiv) {
            const isDone = completedList.includes('CARDIO');
            const card = document.createElement('div');
            card.className = `exercise-card cardio-deep-link-card entrance-animate ${isDone ? 'completed' : ''}`;
            card.setAttribute('draggable', !isDone);
            card.innerHTML = `
              <div class="exercise-img-placeholder wipe-image" style="height:120px; background: rgba(127, 0, 255, 0.05);">
                <svg class="biceps-category-icon-svg" style="width: 44px; height: 44px; stroke: var(--color-cyan);" viewBox="0 0 24 24" fill="none">
                   <path d="M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span style="font-size:0.6rem; color:var(--text-secondary);">Deep Link</span>
              </div>
              <div class="exercise-details">
                <div class="exercise-name" style="font-size:1rem; font-weight:700; color: var(--color-cyan);">CARDIO TARGET</div>
                <div style="font-size:0.75rem; color:var(--text-secondary); font-weight:700; margin-top:2px;">
                  Duration: <span style="color:var(--color-violet); font-size:1rem;">${split.cardio.minutes} min</span>
                </div>
                <div style="font-size:0.7rem; color:var(--text-muted); margin-top:6px; line-height:1.3; font-style:italic;">
                  👉 Click to open Cardio clock and start your timer.
                </div>
              </div>
            `;
            
            if (!isDone) {
              card.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                switchSection('cardio-module');
                const mins = parseInt(split.cardio.minutes);
                STATE.cardio.timerTargetMinutes = isNaN(mins) ? 25 : mins;
                const inputEl = document.getElementById('cardio-target-input');
                if (inputEl) inputEl.value = STATE.cardio.timerTargetMinutes;
                const displayEl = document.getElementById('timer-target-display');
                if (displayEl) displayEl.textContent = `Target: ${STATE.cardio.timerTargetMinutes}:00`;
                resetCardioTimer();
                startCardioTimer();
              });
              
              card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'exercise', name: 'CARDIO', day: activeDayName }));
              });
              card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
              });
            } else {
              bindLongPressUndo(card, () => {
                undoCompletion(activeDayName, 'CARDIO');
              });
            }
            cardioLinkDiv.appendChild(card);
          }
        }
      }
      
      container.appendChild(splitBox);
    }
  }
}

function openRestModal() {
  document.getElementById('rest-modal').style.display = 'flex';
}

function closeRestModal() {
  document.getElementById('rest-modal').style.display = 'none';
}

/* ==========================================================================
   6. SECTION 3: CARDIO & AUTOMATED OCR SYSTEM
   ========================================================================== */
function initCardioModule() {
  // Setup selectors
  document.querySelectorAll('.cardio-select-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.cardio-select-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      const profile = e.target.getAttribute('data-profile');
      STATE.cardio.timerProfile = profile;
      document.getElementById('timer-profile-label').textContent = profile;
    });
  });

  // Timer controls
  document.getElementById('btn-timer-start').addEventListener('click', startCardioTimer);
  document.getElementById('btn-timer-pause').addEventListener('click', pauseCardioTimer);
  document.getElementById('btn-timer-reset').addEventListener('click', resetCardioTimer);
  document.getElementById('btn-timer-fastforward').addEventListener('click', () => {
    STATE.cardio.timerSeconds = Math.max(0, (STATE.cardio.timerTargetMinutes * 60) - 5);
    updateTimerFace();
  });

  // Target minute adjust
  document.getElementById('cardio-target-input').addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    if (!val || val < 1) val = 1;
    STATE.cardio.timerTargetMinutes = val;
    document.getElementById('timer-target-display').textContent = `Target: ${val}:00`;
  });

  // Setup file drag/drop
  const dropZone = document.getElementById('ocr-drop-zone');
  const fileInput = document.getElementById('ocr-file-input');

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-active');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
    if (e.dataTransfer.files.length > 0) {
      handleOCRFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleOCRFile(e.target.files[0]);
    }
  });

  // Victory closer
  document.getElementById('btn-close-victory').addEventListener('click', () => {
    document.getElementById('victory-overlay').classList.remove('active');
  });
}

function updateTimerFace() {
  const min = Math.floor(STATE.cardio.timerSeconds / 60);
  const sec = STATE.cardio.timerSeconds % 60;
  
  const minStr = min.toString().padStart(2, '0');
  const secStr = sec.toString().padStart(2, '0');
  document.getElementById('timer-display').textContent = `${minStr}:${secStr}`;
}

function startCardioTimer() {
  if (STATE.cardio.timerRunning) return;

  STATE.cardio.timerRunning = true;
  document.getElementById('btn-timer-start').style.display = 'none';
  document.getElementById('btn-timer-pause').style.display = 'inline-block';

  STATE.cardio.timerInterval = setInterval(() => {
    STATE.cardio.timerSeconds++;
    updateTimerFace();
    
    // Auto-stop when target is met
    const targetSeconds = STATE.cardio.timerTargetMinutes * 60;
    if (STATE.cardio.timerSeconds >= targetSeconds) {
      pauseCardioTimer();
      const logBox = document.getElementById('ocr-status-log');
      logBox.className = 'ocr-status-log success';
      logBox.style.display = 'block';
      logBox.innerHTML = `
        <strong>SESSION TARGET COMPLETED</strong><br>
        You have completed the target duration of <strong>${STATE.cardio.timerTargetMinutes} minutes</strong> on ${STATE.cardio.timerProfile}.<br>
        <span style="color: var(--color-cyan);">To claim your XP points, upload a photo of your machine console below for OCR verification.</span>
      `;
    }
  }, 1000);
}

function pauseCardioTimer() {
  if (!STATE.cardio.timerRunning) return;

  STATE.cardio.timerRunning = false;
  document.getElementById('btn-timer-start').style.display = 'inline-block';
  document.getElementById('btn-timer-pause').style.display = 'none';
  document.getElementById('btn-timer-start').textContent = 'Resume Clock';

  clearInterval(STATE.cardio.timerInterval);
}

function resetCardioTimer() {
  STATE.cardio.timerRunning = false;
  clearInterval(STATE.cardio.timerInterval);
  STATE.cardio.timerSeconds = 0;
  updateTimerFace();

  document.getElementById('btn-timer-start').style.display = 'inline-block';
  document.getElementById('btn-timer-pause').style.display = 'none';
  document.getElementById('btn-timer-start').textContent = 'Start Clock';
  document.getElementById('ocr-status-log').style.display = 'none';
}

function handleOCRFile(file) {
  // Trigger rotating plate scanner overlay
  const loader = document.getElementById('ocr-loader');
  loader.style.display = 'flex';

  // Simulate OCR Engine scan (2 seconds delay)
  setTimeout(() => {
    loader.style.display = 'none';

    // Generate random minutes based on target
    const target = STATE.cardio.timerTargetMinutes;
    // 80% chance of success (duration equal or greater), 20% chance of shorter duration
    const isSuccess = Math.random() > 0.2;
    const finalMinutes = isSuccess ? (target + Math.floor(Math.random() * 10)) : Math.max(1, target - 5 - Math.floor(Math.random() * 5));

    processOCRResults(finalMinutes);
  }, 2000);
}

// Global simulation bridge
window.simulateOCR = function(minutes) {
  const loader = document.getElementById('ocr-loader');
  loader.style.display = 'flex';

  setTimeout(() => {
    loader.style.display = 'none';
    processOCRResults(minutes);
  }, 1800);
};

function processOCRResults(minutesCompleted) {
  const logBox = document.getElementById('ocr-status-log');
  const target = STATE.cardio.timerTargetMinutes;
  
  if (minutesCompleted >= target) {
    // Determine scaling points
    let pointsAwarded = 0;
    if (minutesCompleted >= 15 && minutesCompleted < 20) pointsAwarded = 20;
    else if (minutesCompleted >= 20 && minutesCompleted < 25) pointsAwarded = 40;
    else if (minutesCompleted >= 25 && minutesCompleted < 30) pointsAwarded = 60;
    else if (minutesCompleted >= 30 && minutesCompleted <= 35) pointsAwarded = 80;
    else if (minutesCompleted > 35) pointsAwarded = 100;
    
    // Log Activity
    const newLog = {
      id: Date.now(),
      profile: STATE.cardio.timerProfile,
      minutes: minutesCompleted,
      points: pointsAwarded,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    STATE.cardio.logs.unshift(newLog);
    STATE.cardio.points += pointsAwarded;

    logBox.className = 'ocr-status-log success';
    logBox.innerHTML = `
      <strong>OCR VERIFICATION SUCCESS</strong><br>
      Console detected: <strong>${minutesCompleted} mins</strong> on ${STATE.cardio.timerProfile}.<br>
      Milestone Target (${target} mins) met.<br>
      Rewarded: <strong>+${pointsAwarded} Points</strong>
    `;

    // Process Level Up milestones
    checkMilestoneLeveling();
    
    // Update Analytics
    updateAnalyticsUI();

  } else {
    logBox.className = 'ocr-status-log error';
    logBox.innerHTML = `
      <strong>OCR VERIFICATION FRAUD DETECTED</strong><br>
      Console detected: <strong>${minutesCompleted} mins</strong> on ${STATE.cardio.timerProfile}.<br>
      Milestone Target requires <strong>${target} mins</strong>.<br>
      No points rewarded. Complete the full duration.
    `;
  }
}

function checkMilestoneLeveling() {
  const currentPoints = STATE.cardio.points;
  let newLevel = 1;

  if (currentPoints >= 1500) newLevel = 5;
  else if (currentPoints >= 400) newLevel = 4;
  else if (currentPoints >= 200) newLevel = 3;
  else if (currentPoints >= 100) newLevel = 2;

  // Level Up Trigger
  if (newLevel > STATE.cardio.level) {
    STATE.cardio.level = newLevel;
    
    if (newLevel === 5) {
      // Beast Mode activated Victory Graphic overlay
      document.getElementById('victory-overlay').classList.add('active');
    } else {
      // Trigger classic bottom-right Toast
      const toast = document.getElementById('level-up-toast');
      document.getElementById('level-up-toast-message').textContent = `You reached Level ${newLevel}: ${RANKS[newLevel].title}`;
      toast.classList.add('active');

      // Dismiss after 4 seconds
      setTimeout(() => {
        toast.classList.remove('active');
      }, 4000);
    }
  }

  updateGamificationUI();
}

function updateGamificationUI() {
  const level = STATE.cardio.level;
  const points = STATE.cardio.points;
  const rank = RANKS[level];

  document.getElementById('level-display-num').textContent = level;
  document.getElementById('level-display-title').textContent = rank.title;
  document.getElementById('points-current-lbl').textContent = points;

  const progressFill = document.getElementById('level-progress-fill');
  const nextRankLbl = document.getElementById('points-next-lbl');

  if (level === 5) {
    progressFill.style.width = '100%';
    nextRankLbl.textContent = 'MAX RANK ACHIEVED';
  } else {
    const nextRank = RANKS[level + 1];
    const range = nextRank.min - rank.min;
    const progress = points - rank.min;
    const pct = Math.min(100, Math.max(0, (progress / range) * 100));

    progressFill.style.width = `${pct}%`;
    nextRankLbl.textContent = `Next Rank: ${nextRank.min} pts`;
  }
}

/* ==========================================================================
   7. SECTION 4: ANALYTICS & ATTENDANCE LEDGER
   ========================================================================== */
function initAnalytics() {
  // Generate Attendance Grid
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const gridContainer = document.getElementById('attendance-grid-container');
  gridContainer.innerHTML = '';

  days.forEach((day, idx) => {
    const cell = document.createElement('div');
    cell.className = 'attendance-day-cell';
    cell.innerHTML = `
      <span class="attendance-day-lbl">${day}</span>
      <div class="attendance-status-indicator"></div>
    `;

    cell.addEventListener('click', () => {
      STATE.attendance[idx] = !STATE.attendance[idx];
      cell.classList.toggle('active', STATE.attendance[idx]);
      updateAnalyticsUI();
    });

    gridContainer.appendChild(cell);
  });

  // Ledger Tab panes
  document.querySelectorAll('.ledger-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.ledger-tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      const targetPane = e.target.getAttribute('data-pane');
      document.querySelectorAll('.ledger-pane').forEach(p => {
        p.classList.remove('active');
        if (p.id === targetPane) p.classList.add('active');
      });
    });
  });

  updateAnalyticsUI();
}

function updateAnalyticsUI() {
  // Total Cardio minutes
  let totalMins = 0;
  STATE.cardio.logs.forEach(log => totalMins += log.minutes);
  document.getElementById('analytics-cardio-minutes').textContent = totalMins;

  // Attendance count
  let attendedCount = 0;
  STATE.attendance.forEach(att => { if (att) attendedCount++; });
  document.getElementById('analytics-attendance-count').textContent = `${attendedCount}/7`;

  // Weekly & All Time logs lists
  const weeklyList = document.getElementById('weekly-logs-list');
  const allTimeList = document.getElementById('alltime-logs-list');

  const logsHtml = STATE.cardio.logs.length > 0 ? STATE.cardio.logs.map(log => `
    <li class="ledger-item">
      <div class="ledger-left">
        <span class="ledger-name">${log.profile} Activity (${log.minutes} mins)</span>
        <span class="ledger-date">Logged at ${log.timestamp}</span>
      </div>
      <span class="ledger-points-gained">+${log.points} XP</span>
    </li>
  `).join('') : `<li style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 2rem 0;">No active logs recorded.</li>`;

  weeklyList.innerHTML = logsHtml;
  allTimeList.innerHTML = logsHtml;

  // Draw monthly graph representation (simulated)
  const graphContainer = document.getElementById('monthly-graph-bars');
  graphContainer.innerHTML = '';
  
  const daysShort = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'Cur'];
  
  // Inject current minutes as the last bar
  const stats = [...STATE.monthlyStats];
  stats[stats.length - 1] = totalMins;

  stats.forEach((val, idx) => {
    const barHeight = Math.min(100, Math.max(10, (val / 150) * 100));
    const bar = document.createElement('div');
    bar.style.display = 'flex';
    bar.style.flexDirection = 'column';
    bar.style.alignItems = 'center';
    bar.style.gap = '4px';
    bar.innerHTML = `
      <span style="font-size:0.55rem; color:var(--text-secondary);">${val}m</span>
      <div style="width:16px; height:${barHeight}px; background:linear-gradient(180deg, var(--color-gold) 0%, var(--bg-input) 100%); border:1px solid var(--color-brass); border-radius:2px; box-shadow:var(--shadow-gold-glow);"></div>
      <span style="font-size:0.6rem; font-weight:700; color:var(--text-muted);">${daysShort[idx]}</span>
    `;
    graphContainer.appendChild(bar);
  });
}

/* ==========================================================================
   8. SECTION 5: WATER & PROTEIN INTAKE CALCULATORS
   ========================================================================== */
function initIntakeCalculators() {
  // Goal Input Handlers
  const pTarget = document.getElementById('protein-target');
  pTarget.addEventListener('input', (e) => {
    let goal = parseInt(e.target.value);
    if (!goal || goal < 1) goal = 1;
    STATE.protein.goal = goal;
    document.getElementById('protein-goal-lbl').textContent = goal;
    updateIntakeUI('protein');
  });

  const wTarget = document.getElementById('water-target');
  wTarget.addEventListener('input', (e) => {
    let goal = parseFloat(e.target.value);
    if (!goal || goal < 0.1) goal = 0.1;
    STATE.water.goal = goal;
    document.getElementById('water-goal-lbl').textContent = goal.toFixed(2);
    updateIntakeUI('water');
  });

  // Entry additions
  document.getElementById('btn-protein-add').addEventListener('click', addProteinEntry);
  document.getElementById('btn-water-add').addEventListener('click', addWaterEntry);

  updateIntakeUI('protein');
  updateIntakeUI('water');
}

function updateIntakeUI(type) {
  if (type === 'protein') {
    const list = document.getElementById('protein-log-list');
    list.innerHTML = '';

    let total = 0;
    STATE.protein.entries.forEach(entry => {
      total += entry.val;
      const li = document.createElement('li');
      li.className = 'intake-log-item';
      li.innerHTML = `
        <span class="intake-log-name">${entry.name}</span>
        <div>
          <span class="intake-log-val">+${entry.val}g</span>
          <span class="intake-log-delete" onclick="deleteIntakeEntry('protein', ${entry.id})">✖</span>
        </div>
      `;
      list.appendChild(li);
    });

    document.getElementById('protein-sum-lbl').textContent = total;
    document.getElementById('protein-goal-lbl').textContent = STATE.protein.goal;

    const banner = document.getElementById('protein-banner');
    const avatarWrapper = document.getElementById('protein-avatar-wrapper');
    const eyebrowL = document.getElementById('p-brow-l');
    const eyebrowR = document.getElementById('p-brow-r');
    const mouth = document.getElementById('p-mouth');
    const caption = document.getElementById('protein-avatar-caption');

    // State rules protein
    if (total < STATE.protein.goal) {
      banner.className = 'intake-banner banner-empty';
      banner.textContent = 'The Fuel Tank is Empty';
      avatarWrapper.className = 'avatar-container avatar-sad';
      eyebrowL.setAttribute('d', 'M33 48 L45 51');
      eyebrowR.setAttribute('d', 'M67 48 L55 51');
      mouth.setAttribute('d', 'M42 85 Q50 78 58 85');
      caption.textContent = 'Empty Tank';
    } else if (total === STATE.protein.goal) {
      banner.className = 'intake-banner banner-filled';
      banner.textContent = 'The Fuel Tank is Filled';
      avatarWrapper.className = 'avatar-container avatar-happy';
      eyebrowL.setAttribute('d', 'M33 48 L45 48');
      eyebrowR.setAttribute('d', 'M67 48 L55 48');
      mouth.setAttribute('d', 'M42 75 Q50 87 58 75');
      caption.textContent = 'Fueled Up';
    } else {
      banner.className = 'intake-banner banner-overfilled';
      banner.textContent = 'The Fuel Tank is overfilled';
      avatarWrapper.className = 'avatar-container avatar-elated';
      eyebrowL.setAttribute('d', 'M33 46 L45 43');
      eyebrowR.setAttribute('d', 'M67 46 L55 43');
      mouth.setAttribute('d', 'M40 73 Q50 92 60 73 Z');
      caption.textContent = 'Overflowing';
    }

  } else if (type === 'water') {
    const list = document.getElementById('water-log-list');
    list.innerHTML = '';

    let total = 0;
    STATE.water.entries.forEach(entry => {
      total += entry.val;
      const li = document.createElement('li');
      li.className = 'intake-log-item';
      li.innerHTML = `
        <span class="intake-log-name">${entry.name}</span>
        <div>
          <span class="intake-log-val">+${entry.val.toFixed(2)}L</span>
          <span class="intake-log-delete" onclick="deleteIntakeEntry('water', ${entry.id})">✖</span>
        </div>
      `;
      list.appendChild(li);
    });

    document.getElementById('water-sum-lbl').textContent = total.toFixed(2);
    document.getElementById('water-goal-lbl').textContent = STATE.water.goal.toFixed(2);

    const banner = document.getElementById('water-banner');
    const avatarWrapper = document.getElementById('water-avatar-wrapper');
    const eyebrowL = document.getElementById('w-brow-l');
    const eyebrowR = document.getElementById('w-brow-r');
    const mouth = document.getElementById('w-mouth');
    const caption = document.getElementById('water-avatar-caption');

    // State rules water
    if (total < STATE.water.goal) {
      banner.className = 'intake-banner banner-empty';
      banner.textContent = 'The Fuel Tank is Empty';
      avatarWrapper.className = 'avatar-container avatar-sad';
      eyebrowL.setAttribute('d', 'M33 48 L45 51');
      eyebrowR.setAttribute('d', 'M67 48 L55 51');
      mouth.setAttribute('d', 'M42 85 Q50 78 58 85');
      caption.textContent = 'Dehydrated';
    } else if (Math.abs(total - STATE.water.goal) < 0.01) { // Floating point precision check
      banner.className = 'intake-banner banner-filled';
      banner.textContent = 'The Fuel Tank is Filled';
      avatarWrapper.className = 'avatar-container avatar-happy';
      eyebrowL.setAttribute('d', 'M33 48 L45 48');
      eyebrowR.setAttribute('d', 'M67 48 L55 48');
      mouth.setAttribute('d', 'M42 75 Q50 87 58 75');
      caption.textContent = 'Hydrated';
    } else {
      banner.className = 'intake-banner banner-overfilled';
      banner.textContent = 'The Fuel Tank is overfilled';
      avatarWrapper.className = 'avatar-container avatar-elated';
      eyebrowL.setAttribute('d', 'M33 46 L45 43');
      eyebrowR.setAttribute('d', 'M67 46 L55 43');
      mouth.setAttribute('d', 'M40 73 Q50 92 60 73 Z');
      caption.textContent = 'Overhydrated';
    }
  }
}

function addProteinEntry() {
  const nameInput = document.getElementById('protein-meal-name');
  const valInput = document.getElementById('protein-meal-val');

  const name = nameInput.value.trim() || 'Meal Option';
  const val = parseInt(valInput.value);

  if (!val || val < 1) return;

  STATE.protein.entries.push({
    id: Date.now(),
    name: name,
    val: val
  });

  nameInput.value = '';
  valInput.value = '';
  updateIntakeUI('protein');
}

function addWaterEntry() {
  const nameInput = document.getElementById('water-entry-name');
  const valInput = document.getElementById('water-entry-val');

  const name = nameInput.value.trim() || 'Glass of Water';
  const val = parseFloat(valInput.value);

  if (!val || val <= 0.01) return;

  STATE.water.entries.push({
    id: Date.now(),
    name: name,
    val: val
  });

  nameInput.value = '';
  valInput.value = '';
  updateIntakeUI('water');
}

window.deleteIntakeEntry = function(type, id) {
  if (type === 'protein') {
    STATE.protein.entries = STATE.protein.entries.filter(e => e.id !== id);
    updateIntakeUI('protein');
  } else if (type === 'water') {
    STATE.water.entries = STATE.water.entries.filter(e => e.id !== id);
    updateIntakeUI('water');
  }
};

/* ==========================================================================
   9. INITIALIZATION BINDINGS
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Navigation Bindings
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const targetSec = e.target.getAttribute('data-section');
      switchSection(targetSec);
    });
  });

  // Auth Toggle tabs
  const tabLogin = document.getElementById('tab-login');
  const tabSignUp = document.getElementById('tab-signup');
  const formLogin = document.getElementById('form-login');
  const formSignUp = document.getElementById('form-signup');

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabSignUp.classList.remove('active');
    formLogin.classList.add('active');
    formSignUp.classList.remove('active');
  });

  tabSignUp.addEventListener('click', () => {
    tabSignUp.classList.add('active');
    tabLogin.classList.remove('active');
    formSignUp.classList.add('active');
    formLogin.classList.remove('active');
  });

  // Eye toggle password
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Find parent/sibling element
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      
      if (input.type === 'password') {
        input.type = 'text';
        btn.style.color = 'var(--color-gold)';
      } else {
        input.type = 'password';
        btn.style.color = 'var(--text-secondary)';
      }
    });
  });

  // Sign out button
  document.getElementById('btn-signout').addEventListener('click', handleSignOut);

  // Form Submits
  formLogin.addEventListener('submit', handleLoginSubmit);
  formSignUp.addEventListener('submit', handleSignUpSubmit);

  // Guest Bypass
  document.getElementById('btn-guest-login').addEventListener('click', () => {
    authenticateUser('guest@ironclub.com');
  });

  // Init sections
  initFitnessGuide();
  initWorkoutSplits();
  initCardioModule();
  initAnalytics();
  initIntakeCalculators();
  setupCompleteBox();
  initCustomSplitsFeature();

  // Welcome sequence click binding
  const welcomeTrainer = document.getElementById('welcome-trainer-container');
  if (welcomeTrainer) {
    welcomeTrainer.addEventListener('click', wakeUpTrainer);
  }
});

// Global placeholder for custom split builder state
let customSplitData = {
  duration: 7,
  days: {
    MONDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 },
    TUESDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 },
    WEDNESDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 },
    THURSDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 },
    FRIDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 },
    SATURDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 },
    SUNDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 }
  }
};
let currentSelectedDay = 'MONDAY';
let activeFocusedInput = null;
let editingProgramId = null;

function initCustomSplitsFeature() {
  const triggerBtn = document.getElementById('btn-add-custom-split-trigger');
  const modal = document.getElementById('custom-split-modal');
  const closeBtn = document.getElementById('btn-close-custom-split-modal');
  const saveBtn = document.getElementById('btn-save-custom-split');

  if (!triggerBtn || !modal || !closeBtn) return;

  // Custom splits are dynamically synced and loaded upon authentication.

  // Open Modal
  triggerBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
    document.getElementById('form-custom-split').reset();
    editingProgramId = null;
    
    // Reset Modal title
    const modalTitle = document.querySelector('#custom-split-modal .rest-modal-title');
    if (modalTitle) {
      modalTitle.textContent = 'CUSTOM SPLIT';
    }

    customSplitData = {
      duration: 7,
      days: {
        MONDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 },
        TUESDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 },
        WEDNESDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 },
        THURSDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 },
        FRIDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 },
        SATURDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 },
        SUNDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 }
      }
    };
    currentSelectedDay = 'MONDAY';
    activeFocusedInput = null;

    // Reset duration wheel UI
    const durationWheel = document.getElementById('custom-split-duration-wheel');
    if (durationWheel) {
      durationWheel.querySelectorAll('.duration-wheel-item').forEach(i => {
        if (i.getAttribute('data-value') === '7') {
          i.classList.add('active');
        } else {
          i.classList.remove('active');
        }
      });
    }

    buildDaysAccordion();
  });

  // Close Modal
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Initialize Duration Wheel Trigger
  initDurationWheel();


  // Save Program
  saveBtn.addEventListener('click', async () => {
    const progName = document.getElementById('custom-split-name').value.trim();
    const progSubtitle = document.getElementById('custom-split-subtitle').value.trim();

    if (!progName || !progSubtitle) {
      alert('Please fill out the Program Name and Subtitle.');
      return;
    }

    // Count active training days
    let activeDaysCount = 0;
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    days.forEach(day => {
      if (!customSplitData.days[day].isRest) {
        activeDaysCount++;
      }
    });

    if (activeDaysCount !== customSplitData.duration) {
      alert(`Validation Failed: You have selected a duration of ${customSplitData.duration} day(s), but you have configured ${activeDaysCount} active training day(s). Please configure exactly ${customSplitData.duration} active workout day(s).`);
      return;
    }

    const splitsArray = [];
    days.forEach(dayKey => {
      const dayData = customSplitData.days[dayKey];
      const sectionsArray = [];

      if (!dayData.isRest) {
        // Primary muscle exercises
        if (dayData.primaryMuscle && dayData.primaryExercises.length > 0) {
          sectionsArray.push({
            name: dayData.primaryMuscle.toUpperCase(),
            exercises: dayData.primaryExercises.map(ex => {
              const name = typeof ex === 'object' ? ex.name : ex;
              const reps = typeof ex === 'object' ? ex.reps : '3 x 8-12';
              return {
                name: name,
                reps: reps,
                desc: ''
              };
            })
          });
        }

        // Secondary muscle exercises
        if (dayData.secondaryMuscle && dayData.secondaryExercises.length > 0) {
          sectionsArray.push({
            name: dayData.secondaryMuscle.toUpperCase(),
            exercises: dayData.secondaryExercises.map(ex => {
              const name = typeof ex === 'object' ? ex.name : ex;
              const reps = typeof ex === 'object' ? ex.reps : '3 x 8-12';
              return {
                name: name,
                reps: reps,
                desc: ''
              };
            })
          });
        }

        // Tertiary muscle exercises (if enabled)
        if (dayData.tertiaryEnabled && dayData.tertiaryMuscle && dayData.tertiaryExercises.length > 0) {
          sectionsArray.push({
            name: dayData.tertiaryMuscle.toUpperCase(),
            exercises: dayData.tertiaryExercises.map(ex => {
              const name = typeof ex === 'object' ? ex.name : ex;
              const reps = typeof ex === 'object' ? ex.reps : '3 x 8-12';
              return {
                name: name,
                reps: reps,
                desc: ''
              };
            })
          });
        }
      }

      splitsArray.push({
        day: dayKey,
        title: dayData.isRest ? `* ${dayKey} ---> REST` : `* WORKOUT DAY`,
        isRest: dayData.isRest,
        sections: sectionsArray,
        cardio: dayData.cardioEnabled ? { enabled: true, minutes: dayData.cardioMinutes } : { enabled: false, minutes: 20 }
      });
    });

    const programId = editingProgramId ? editingProgramId : `custom_split_${Date.now()}`;
    const newProgram = {
      name: `${progName.toUpperCase()} (CUSTOM)`,
      subtitle: progSubtitle,
      splits: splitsArray,
      isCustomSplit: true
    };

    PROGRAMS_DB[programId] = newProgram;
    if (!editingProgramId) {
      STATE.splits.programExpanded[programId] = false;
    }

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('custom_splits')
          .upsert({
            id: programId,
            user_email: STATE.user.email || 'guest@ironclub.com',
            name: newProgram.name,
            subtitle: newProgram.subtitle,
            duration: customSplitData.duration,
            splits: newProgram.splits,
            updated_at: new Date().toISOString()
          });
        if (error) throw error;
      } catch (err) {
        console.warn('Failed to save custom split to Supabase, saving locally to localStorage:', err);
      }
    }

    try {
      const storedCustom = localStorage.getItem('IRON_CLUB_CUSTOM_SPLITS') || '{}';
      const parsed = JSON.parse(storedCustom);
      parsed[programId] = newProgram;
      localStorage.setItem('IRON_CLUB_CUSTOM_SPLITS', JSON.stringify(parsed));
    } catch (e) {
      console.error('Failed to save custom split to localStorage:', e);
    }

    editingProgramId = null;
    initWorkoutSplits();
    modal.style.display = 'none';
  });
}

function buildDaysAccordion() {
  const container = document.getElementById('custom-split-accordion-container');
  if (!container) return;
  container.innerHTML = '';

  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const dayLabels = {
    MONDAY: 'Monday',
    TUESDAY: 'Tuesday',
    WEDNESDAY: 'Wednesday',
    THURSDAY: 'Thursday',
    FRIDAY: 'Friday',
    SATURDAY: 'Saturday',
    SUNDAY: 'Sunday'
  };

  days.forEach(day => {
    const dayData = customSplitData.days[day];
    const item = document.createElement('div');
    item.className = 'day-accordion-item';
    item.id = `day-accordion-item-${day}`;

    // Calculate dynamic summary string
    let summary = 'Rest Day';
    if (!dayData.isRest) {
      const parts = [];
      if (dayData.primaryMuscle) parts.push(dayData.primaryMuscle);
      if (dayData.secondaryMuscle) parts.push(dayData.secondaryMuscle);
      if (dayData.tertiaryEnabled && dayData.tertiaryMuscle) parts.push(dayData.tertiaryMuscle);
      const musclesText = parts.length > 0 ? parts.join('/') : 'General';
      const cardioText = dayData.cardioEnabled ? ` + ${dayData.cardioMinutes}m Cardio` : '';
      summary = `Workout: ${musclesText}${cardioText}`;
    }

    item.innerHTML = `
      <div class="day-accordion-header" id="day-header-${day}">
        <div style="display:flex; flex-direction:column; gap:2px;">
          <span class="day-name-label">${dayLabels[day]}</span>
          <span class="day-summary-text" id="day-summary-${day}">${summary}</span>
        </div>
        <span class="day-chevron-indicator">▼</span>
      </div>
      <div class="day-accordion-content" id="day-content-${day}" style="display: none;">
        <!-- Rest/Workout Toggle -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; border-bottom: 1px dashed rgba(255, 255, 255, 0.05); padding-bottom: 0.8rem;">
          <span style="font-size: 0.85rem; color: var(--color-cyan); font-weight: 700; text-transform: uppercase;">Configuration</span>
          <div class="switch-slider-container">
            <span class="switch-toggle-label" id="day-type-label-${day}">${dayData.isRest ? 'Enable Workout Day' : 'Enable Rest Day'}</span>
            <label style="position: relative; display: inline-block;">
              <input type="checkbox" class="switch-input-check day-type-toggle" id="day-type-toggle-${day}" data-day="${day}" ${!dayData.isRest ? 'checked' : ''}>
              <div class="switch-track"><div class="switch-thumb"></div></div>
            </label>
          </div>
        </div>
        
        <!-- Workout Workspace -->
        <div id="workout-workspace-${day}" style="${dayData.isRest ? 'display: none;' : 'display: block;'}">
          <!-- Primary and Secondary muscles dropdown pickers -->
          <div style="display: flex; gap: 0.8rem; margin-bottom: 1rem; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 140px; display: flex; flex-direction: column; gap: 0.4rem;">
              <label style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-secondary); font-weight: 700;">Primary Muscle</label>
              <select class="input-vintage muscle-select" id="primary-muscle-${day}" data-day="${day}" data-tier="primary">
                <!-- Populated dynamically -->
              </select>
            </div>
            <div style="flex: 1; min-width: 140px; display: flex; flex-direction: column; gap: 0.4rem;">
              <label style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-secondary); font-weight: 700;">Secondary Muscle</label>
              <select class="input-vintage muscle-select" id="secondary-muscle-${day}" data-day="${day}" data-tier="secondary">
                <!-- Populated dynamically -->
              </select>
            </div>
          </div>
          
          <!-- Primary muscle exercise row builder -->
          <div class="muscle-entry-block">
            <div class="muscle-block-title" id="primary-block-title-${day}">PRIMARY MUSCLE</div>
            <div class="chip-matrix" id="primary-chips-${day}"></div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
              <div class="autocomplete-panel" style="flex: 2; min-width: 150px;">
                <input type="text" class="input-vintage search-type-input" id="primary-input-${day}" placeholder="Type exercise name..." data-day="${day}" data-tier="primary" autocomplete="off" style="width: 100%;">
                <div class="autocomplete-suggestions" id="primary-suggestions-${day}"></div>
              </div>
              <div style="display: flex; gap: 0.3rem; align-items: center;">
                <input type="number" class="input-vintage sets-input" id="primary-sets-${day}" placeholder="Sets" data-day="${day}" data-tier="primary" style="width: 55px; text-align: center;" min="1" value="3" title="Number of Sets">
                <span style="font-size: 0.75rem; color: var(--text-secondary);">x</span>
                <input type="text" class="input-vintage reps-input" id="primary-reps-${day}" placeholder="Reps" data-day="${day}" data-tier="primary" style="width: 75px; text-align: center;" value="8-12" title="Reps Range">
              </div>
            </div>
          </div>
          
          <!-- Secondary muscle exercise row builder -->
          <div class="muscle-entry-block">
            <div class="muscle-block-title" id="secondary-block-title-${day}">SECONDARY MUSCLE</div>
            <div class="chip-matrix" id="secondary-chips-${day}"></div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
              <div class="autocomplete-panel" style="flex: 2; min-width: 150px;">
                <input type="text" class="input-vintage search-type-input" id="secondary-input-${day}" placeholder="Type exercise name..." data-day="${day}" data-tier="secondary" autocomplete="off" style="width: 100%;">
                <div class="autocomplete-suggestions" id="secondary-suggestions-${day}"></div>
              </div>
              <div style="display: flex; gap: 0.3rem; align-items: center;">
                <input type="number" class="input-vintage sets-input" id="secondary-sets-${day}" placeholder="Sets" data-day="${day}" data-tier="secondary" style="width: 55px; text-align: center;" min="1" value="3" title="Number of Sets">
                <span style="font-size: 0.75rem; color: var(--text-secondary);">x</span>
                <input type="text" class="input-vintage reps-input" id="secondary-reps-${day}" placeholder="Reps" data-day="${day}" data-tier="secondary" style="width: 75px; text-align: center;" value="8-12" title="Reps Range">
              </div>
            </div>
          </div>
          
          <!-- Tertiary Muscle Toggle Slider -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Tertiary Muscle</span>
            <div class="switch-slider-container">
              <label style="position: relative; display: inline-block;">
                <input type="checkbox" class="switch-input-check tertiary-toggle" id="tertiary-toggle-${day}" data-day="${day}" ${dayData.tertiaryEnabled ? 'checked' : ''}>
                <div class="switch-track"><div class="switch-thumb"></div></div>
              </label>
            </div>
          </div>
          
          <!-- Tertiary Muscle Block -->
          <div id="tertiary-block-${day}" style="${dayData.tertiaryEnabled ? 'display: block;' : 'display: none;'} border-top: 1px dashed rgba(255,255,255,0.06); padding-top: 1rem; margin-bottom: 1rem;">
            <div style="display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem;">
              <label style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-secondary); font-weight: 700;">Tertiary Muscle</label>
              <select class="input-vintage muscle-select" id="tertiary-muscle-${day}" data-day="${day}" data-tier="tertiary">
                <!-- Populated dynamically -->
              </select>
            </div>
            <div class="muscle-entry-block">
              <div class="muscle-block-title" id="tertiary-block-title-${day}">TERTIARY MUSCLE</div>
              <div class="chip-matrix" id="tertiary-chips-${day}"></div>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                <div class="autocomplete-panel" style="flex: 2; min-width: 150px;">
                  <input type="text" class="input-vintage search-type-input" id="tertiary-input-${day}" placeholder="Type exercise name..." data-day="${day}" data-tier="tertiary" autocomplete="off" style="width: 100%;">
                  <div class="autocomplete-suggestions" id="tertiary-suggestions-${day}"></div>
                </div>
                <div style="display: flex; gap: 0.3rem; align-items: center;">
                  <input type="number" class="input-vintage sets-input" id="tertiary-sets-${day}" placeholder="Sets" data-day="${day}" data-tier="tertiary" style="width: 55px; text-align: center;" min="1" value="3" title="Number of Sets">
                  <span style="font-size: 0.75rem; color: var(--text-secondary);">x</span>
                  <input type="text" class="input-vintage reps-input" id="tertiary-reps-${day}" placeholder="Reps" data-day="${day}" data-tier="tertiary" style="width: 75px; text-align: center;" value="8-12" title="Reps Range">
                </div>
              </div>
            </div>
          </div>
          
          <!-- Cardio Toggle -->
          <div style="border-top: 1px dashed rgba(255,255,255,0.06); padding-top: 1rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Cardio</span>
            <div class="switch-slider-container">
              <label style="position: relative; display: inline-block;">
                <input type="checkbox" class="switch-input-check cardio-toggle" id="cardio-toggle-${day}" data-day="${day}" ${dayData.cardioEnabled ? 'checked' : ''}>
                <div class="switch-track"><div class="switch-thumb"></div></div>
              </label>
            </div>
          </div>
          
          <!-- Cardio Minutes Block -->
          <div id="cardio-block-${day}" style="${dayData.cardioEnabled ? 'display: block;' : 'display: none;'} margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 0.75rem; color: var(--text-secondary);">Minutes Target:</span>
              <select class="input-vintage cardio-minutes-select" id="cardio-minutes-${day}" data-day="${day}" style="width: 120px; padding: 0.4rem;">
                <option value="15" ${dayData.cardioMinutes == 15 ? 'selected' : ''}>15 minutes</option>
                <option value="20" ${dayData.cardioMinutes == 20 ? 'selected' : ''}>20 minutes</option>
                <option value="25" ${dayData.cardioMinutes == 25 ? 'selected' : ''}>25 minutes</option>
                <option value="30" ${dayData.cardioMinutes == 30 ? 'selected' : ''}>30 minutes</option>
                <option value="35" ${dayData.cardioMinutes == 35 ? 'selected' : ''}>35+ minutes</option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- Recovery Block -->
        <div id="recovery-workspace-${day}" style="${dayData.isRest ? 'display: block;' : 'display: none;'} text-align: center; padding: 1.5rem 0;">
          <p style="font-style: italic; font-size: 0.85rem; color: var(--text-secondary);">"No pump today. Feed the muscles, rest the spine, and clear the mind."</p>
        </div>
      </div>
    `;
    container.appendChild(item);

    // Populate Muscle selectors inside this accordion item
    populateMuscleSelects(day);

    // Load chip lists for this day
    renderChips(day, 'primary');
    renderChips(day, 'secondary');
    renderChips(day, 'tertiary');

    // Bind listeners inside this accordion item
    bindAccordionItemListeners(day);
  });

  // Expand the current selected day
  toggleAccordion(currentSelectedDay, true);
}

function populateMuscleSelects(day) {
  const dayData = customSplitData.days[day];
  const muscleKeys = Object.keys(EXERCISE_DB);

  ['primary', 'secondary', 'tertiary'].forEach(tier => {
    const select = document.getElementById(`${tier}-muscle-${day}`);
    if (!select) return;
    select.innerHTML = '';

    // Add a default option
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = `Select ${tier} muscle...`;
    select.appendChild(defaultOpt);

    muscleKeys.forEach(key => {
      const dbName = EXERCISE_DB[key].name;
      const opt = document.createElement('option');
      opt.value = dbName;
      opt.textContent = dbName;
      if (dayData[`${tier}Muscle`] === dbName) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
    
    // Set headers appropriately
    const titleEl = document.getElementById(`${tier}-block-title-${day}`);
    if (titleEl) {
      titleEl.textContent = dayData[`${tier}Muscle`] 
        ? `${dayData[`${tier}Muscle`].toUpperCase()} (${tier.toUpperCase()} MUSCLE)` 
        : `${tier.toUpperCase()} MUSCLE`;
    }
  });
}

function renderChips(day, tier) {
  const chipsContainer = document.getElementById(`${tier}-chips-${day}`);
  if (!chipsContainer) return;
  chipsContainer.innerHTML = '';

  const exercises = customSplitData.days[day][`${tier}Exercises`] || [];
  exercises.forEach((ex, idx) => {
    const chip = document.createElement('span');
    chip.className = 'exercise-chip';
    
    const name = typeof ex === 'object' ? ex.name : ex;
    const reps = typeof ex === 'object' ? ex.reps : '3 x 8-12';
    
    chip.innerHTML = `
      <span>${name}</span>
      <span style="opacity: 0.65; font-size: 0.65rem; font-weight: normal; margin-left: 2px;">(${reps})</span>
      <span class="delete-chip-btn" data-day="${day}" data-tier="${tier}" data-index="${idx}">×</span>
    `;
    chipsContainer.appendChild(chip);
  });

  // Bind delete chip events
  chipsContainer.querySelectorAll('.delete-chip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const d = e.target.getAttribute('data-day');
      const t = e.target.getAttribute('data-tier');
      const index = parseInt(e.target.getAttribute('data-index'));

      customSplitData.days[d][`${t}Exercises`].splice(index, 1);
      renderChips(d, t);
      updateDaySummary(d);
    });
  });
}

function updateDaySummary(day) {
  const dayData = customSplitData.days[day];
  const summaryEl = document.getElementById(`day-summary-${day}`);
  if (!summaryEl) return;

  let summary = 'Rest Day';
  if (!dayData.isRest) {
    const parts = [];
    if (dayData.primaryMuscle) parts.push(dayData.primaryMuscle);
    if (dayData.secondaryMuscle) parts.push(dayData.secondaryMuscle);
    if (dayData.tertiaryEnabled && dayData.tertiaryMuscle) parts.push(dayData.tertiaryMuscle);
    const musclesText = parts.length > 0 ? parts.join('/') : 'General';
    const cardioText = dayData.cardioEnabled ? ` + ${dayData.cardioMinutes}m Cardio` : '';
    summary = `Workout: ${musclesText}${cardioText}`;
  }
  summaryEl.textContent = summary;
}

function toggleAccordion(day, shouldExpand) {
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  days.forEach(d => {
    const header = document.getElementById(`day-header-${d}`);
    const content = document.getElementById(`day-content-${d}`);
    const item = document.getElementById(`day-accordion-item-${d}`);

    if (d === day && shouldExpand) {
      if (header) header.classList.add('active');
      if (content) content.style.display = 'block';
      if (item) {
        item.style.background = 'rgba(255, 255, 255, 0.04)';
        item.style.borderColor = 'rgba(127, 0, 255, 0.2)';
      }
    } else {
      if (header) header.classList.remove('active');
      if (content) content.style.display = 'none';
      if (item) {
        item.style.background = 'rgba(255, 255, 255, 0.02)';
        item.style.borderColor = 'rgba(255, 255, 255, 0.06)';
      }
    }
  });
}

function bindAccordionItemListeners(day) {
  const header = document.getElementById(`day-header-${day}`);
  header.addEventListener('click', () => {
    if (currentSelectedDay !== day) {
      currentSelectedDay = day;
      toggleAccordion(day, true);
    } else {
      toggleAccordion(day, false);
      currentSelectedDay = '';
    }
  });

  // Day Type Toggle
  const typeToggle = document.getElementById(`day-type-toggle-${day}`);
  const typeLabel = document.getElementById(`day-type-label-${day}`);
  const workoutWorkspace = document.getElementById(`workout-workspace-${day}`);
  const recoveryWorkspace = document.getElementById(`recovery-workspace-${day}`);

  typeToggle.addEventListener('change', (e) => {
    const isRest = !e.target.checked;
    customSplitData.days[day].isRest = isRest;

    if (!isRest) {
      typeLabel.textContent = 'Enable Rest Day';
      workoutWorkspace.style.display = 'block';
      recoveryWorkspace.style.display = 'none';
    } else {
      typeLabel.textContent = 'Enable Workout Day';
      workoutWorkspace.style.display = 'none';
      recoveryWorkspace.style.display = 'block';
    }

    updateDaySummary(day);
  });

  // dropdown picks
  ['primary', 'secondary', 'tertiary'].forEach(tier => {
    const select = document.getElementById(`${tier}-muscle-${day}`);
    select.addEventListener('change', (e) => {
      customSplitData.days[day][`${tier}Muscle`] = e.target.value;

      const titleEl = document.getElementById(`${tier}-block-title-${day}`);
      if (titleEl) {
        titleEl.textContent = e.target.value 
          ? `${e.target.value.toUpperCase()} (${tier.toUpperCase()} MUSCLE)` 
          : `${tier.toUpperCase()} MUSCLE`;
      }

      updateDaySummary(day);
    });
  });

  // Tertiary Slider
  const tertToggle = document.getElementById(`tertiary-toggle-${day}`);
  const tertBlock = document.getElementById(`tertiary-block-${day}`);
  tertToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    customSplitData.days[day].tertiaryEnabled = enabled;
    tertBlock.style.display = enabled ? 'block' : 'none';
    updateDaySummary(day);
  });

  // Cardio Slider
  const cardToggle = document.getElementById(`cardio-toggle-${day}`);
  const cardBlock = document.getElementById(`cardio-block-${day}`);
  cardToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    customSplitData.days[day].cardioEnabled = enabled;
    cardBlock.style.display = enabled ? 'block' : 'none';
    updateDaySummary(day);
  });

  // Cardio Minutes dropdown picker
  const cardMinutes = document.getElementById(`cardio-minutes-${day}`);
  cardMinutes.addEventListener('change', (e) => {
    customSplitData.days[day].cardioMinutes = parseInt(e.target.value);
    updateDaySummary(day);
  });

  // Focus & Input Autocomplete
  ['primary', 'secondary', 'tertiary'].forEach(tier => {
    const input = document.getElementById(`${tier}-input-${day}`);
    const setsInput = document.getElementById(`${tier}-sets-${day}`);
    const repsInput = document.getElementById(`${tier}-reps-${day}`);

    if (input) {
      input.addEventListener('focus', (e) => {
        activeFocusedInput = e.target;
      });

      input.addEventListener('input', (e) => {
        showSuggestions(day, tier, e.target.value.trim());
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmAddExercise(day, tier);
        }
      });
    }

    if (setsInput) {
      setsInput.addEventListener('focus', (e) => {
        activeFocusedInput = e.target;
      });
      setsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmAddExercise(day, tier);
        }
      });
    }

    if (repsInput) {
      repsInput.addEventListener('focus', (e) => {
        activeFocusedInput = e.target;
      });
      repsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmAddExercise(day, tier);
        }
      });
    }
  });
}

function showSuggestions(day, tier, query) {
  const suggestionsDiv = document.getElementById(`${tier}-suggestions-${day}`);
  if (!suggestionsDiv) return;
  suggestionsDiv.innerHTML = '';

  if (!query) {
    suggestionsDiv.style.display = 'none';
    return;
  }

  const selectedMuscle = customSplitData.days[day][`${tier}Muscle`].toLowerCase();
  let searchPool = [];

  if (selectedMuscle && EXERCISE_DB[selectedMuscle]) {
    EXERCISE_DB[selectedMuscle].subsections.forEach(sub => {
      sub.exercises.forEach(ex => {
        searchPool.push(ex.name);
      });
    });
  } else {
    Object.keys(EXERCISE_DB).forEach(key => {
      EXERCISE_DB[key].subsections.forEach(sub => {
        sub.exercises.forEach(ex => {
          searchPool.push(ex.name);
        });
      });
    });
  }

  const matches = searchPool.filter(exName => exName.toLowerCase().includes(query.toLowerCase()));
  const uniqueMatches = [...new Set(matches)].slice(0, 5);

  if (uniqueMatches.length === 0) {
    suggestionsDiv.style.display = 'none';
    return;
  }

  uniqueMatches.forEach(match => {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    item.textContent = match;
    item.addEventListener('click', () => {
      const input = document.getElementById(`${tier}-input-${day}`);
      input.value = match;
      suggestionsDiv.style.display = 'none';
      confirmAddExercise(day, tier);
    });
    suggestionsDiv.appendChild(item);
  });
  suggestionsDiv.style.display = 'block';
}

function confirmAddExercise(day, tier) {
  const input = document.getElementById(`${tier}-input-${day}`);
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;

  const setsEl = document.getElementById(`${tier}-sets-${day}`);
  const repsEl = document.getElementById(`${tier}-reps-${day}`);
  const sets = setsEl ? setsEl.value.trim() || '3' : '3';
  const reps = repsEl ? repsEl.value.trim() || '8-12' : '8-12';
  const repsStr = `${sets} x ${reps}`;

  customSplitData.days[day][`${tier}Exercises`].push({
    name: value,
    reps: repsStr
  });
  
  input.value = '';

  const suggestionsDiv = document.getElementById(`${tier}-suggestions-${day}`);
  if (suggestionsDiv) suggestionsDiv.style.display = 'none';

  renderChips(day, tier);
  updateDaySummary(day);
  showSuccessToast();
}

function showSuccessToast() {
  const toast = document.getElementById('custom-split-toast');
  const msgEl = document.getElementById('custom-split-toast-msg');
  if (!toast) return;

  msgEl.textContent = 'Exercise Added Successfully';
  toast.classList.add('active');

  if (window.toastTimeout) {
    clearTimeout(window.toastTimeout);
  }

  window.toastTimeout = setTimeout(() => {
    toast.classList.remove('active');
  }, 4000);
}

function initDurationWheel() {
  const wheel = document.getElementById('custom-split-duration-wheel');
  if (!wheel) return;

  wheel.querySelectorAll('.duration-wheel-item').forEach(item => {
    item.addEventListener('click', (e) => {
      wheel.querySelectorAll('.duration-wheel-item').forEach(i => i.classList.remove('active'));
      e.target.classList.add('active');

      const val = parseInt(e.target.getAttribute('data-value'));
      customSplitData.duration = val;

      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  });
}

function editCustomSplit(programId) {
  const program = PROGRAMS_DB[programId];
  if (!program) return;

  editingProgramId = programId;

  // Set Modal title
  const modalTitle = document.querySelector('#custom-split-modal .rest-modal-title');
  if (modalTitle) {
    modalTitle.textContent = 'EDIT CUSTOM SPLIT';
  }

  // Populate Name & Subtitle
  let baseName = program.name || '';
  if (baseName.endsWith(' (CUSTOM)')) {
    baseName = baseName.substring(0, baseName.length - 9);
  }
  document.getElementById('custom-split-name').value = baseName;
  document.getElementById('custom-split-subtitle').value = program.subtitle || '';

  // Initialize customSplitData with default values
  customSplitData = {
    duration: 7,
    days: {
      MONDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 },
      TUESDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 },
      WEDNESDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 },
      THURSDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 },
      FRIDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 },
      SATURDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 },
      SUNDAY: { isRest: true, primaryMuscle: '', primaryExercises: [], secondaryMuscle: '', secondaryExercises: [], tertiaryEnabled: false, tertiaryMuscle: '', tertiaryExercises: [], cardioEnabled: false, cardioMinutes: 20 }
    }
  };

  // Populate customSplitData from program.splits
  if (program.splits && Array.isArray(program.splits)) {
    // Determine active duration
    let activeDaysCount = 0;
    program.splits.forEach(split => {
      const dayKey = split.day;
      if (!customSplitData.days[dayKey]) return;

      const dayData = customSplitData.days[dayKey];
      dayData.isRest = split.isRest;
      if (!split.isRest) {
        activeDaysCount++;
      }

      // Cardio
      if (split.cardio) {
        dayData.cardioEnabled = !!split.cardio.enabled;
        dayData.cardioMinutes = split.cardio.minutes || 20;
      }

      // Sections
      if (split.sections && Array.isArray(split.sections)) {
        // First section -> Primary
        if (split.sections[0]) {
          dayData.primaryMuscle = capitalizeFirstLetter(split.sections[0].name);
          dayData.primaryExercises = split.sections[0].exercises.map(ex => ({
            name: ex.name,
            reps: ex.reps || '3 x 8-12'
          }));
        }
        // Second section -> Secondary
        if (split.sections[1]) {
          dayData.secondaryMuscle = capitalizeFirstLetter(split.sections[1].name);
          dayData.secondaryExercises = split.sections[1].exercises.map(ex => ({
            name: ex.name,
            reps: ex.reps || '3 x 8-12'
          }));
        }
        // Third section -> Tertiary
        if (split.sections[2]) {
          dayData.tertiaryEnabled = true;
          dayData.tertiaryMuscle = capitalizeFirstLetter(split.sections[2].name);
          dayData.tertiaryExercises = split.sections[2].exercises.map(ex => ({
            name: ex.name,
            reps: ex.reps || '3 x 8-12'
          }));
        }
      }
    });

    customSplitData.duration = activeDaysCount || 7;
  }

  // Update Duration Wheel UI
  const durationWheel = document.getElementById('custom-split-duration-wheel');
  if (durationWheel) {
    durationWheel.querySelectorAll('.duration-wheel-item').forEach(i => {
      if (parseInt(i.getAttribute('data-value')) === customSplitData.duration) {
        i.classList.add('active');
      } else {
        i.classList.remove('active');
      }
    });
  }

  currentSelectedDay = 'MONDAY';
  activeFocusedInput = null;

  buildDaysAccordion();

  // Show Modal
  const modal = document.getElementById('custom-split-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function capitalizeFirstLetter(str) {
  if (!str) return '';
  return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

async function loadCustomSplits(email) {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('custom_splits')
        .select('*')
        .eq('user_email', email);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        data.forEach(item => {
          PROGRAMS_DB[item.id] = {
            name: item.name,
            subtitle: item.subtitle,
            splits: item.splits,
            isCustomSplit: true
          };
          STATE.splits.programExpanded[item.id] = false;
        });
        initWorkoutSplits();
        return;
      }
    } catch (err) {
      console.warn('Failed to load custom splits from Supabase, falling back to localStorage:', err);
    }
  }

  // Fallback to localStorage
  try {
    const storedCustom = localStorage.getItem('IRON_CLUB_CUSTOM_SPLITS');
    if (storedCustom) {
      const parsed = JSON.parse(storedCustom);
      Object.keys(parsed).forEach(id => {
        PROGRAMS_DB[id] = parsed[id];
        STATE.splits.programExpanded[id] = false;
      });
      initWorkoutSplits();
    }
  } catch (e) {
    console.error('Failed to load custom splits from localStorage:', e);
  }
}


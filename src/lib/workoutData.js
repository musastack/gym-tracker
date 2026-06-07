export const WORKOUT_DAYS = [
  {
    day: 1,
    name: 'Upper Push',
    focus: 'Chest · Shoulders · Triceps',
    accent: '#a855f7',
    icon: '🏋️',
    exercises: [
      { name: 'Dumbbell Chest Press', type: 'Compound', sets: 4, repsMin: 6, repsMax: 8 },
      { name: 'Incline Dumbbell Press', type: 'Compound', sets: 3, repsMin: 8, repsMax: 10 },
      { name: 'Smith Machine Shoulder Press', type: 'Compound', sets: 3, repsMin: 8, repsMax: 10 },
      { name: 'Dips', type: 'Isolation', sets: 3, repsMin: 8, repsMax: 12 },
      { name: 'Cable Lateral Raises', type: 'Isolation', sets: 3, repsMin: 12, repsMax: 15 },
    ],
  },
  {
    day: 2,
    name: 'Lower Quad',
    focus: 'Quads · Glutes',
    accent: '#3b82f6',
    icon: '🦵',
    exercises: [
      { name: 'Barbell Back Squat', type: 'Compound', sets: 4, repsMin: 6, repsMax: 8 },
      { name: 'Leg Press', type: 'Compound', sets: 3, repsMin: 10, repsMax: 12 },
      { name: 'Leg Extensions', type: 'Isolation', sets: 3, repsMin: 12, repsMax: 15 },
    ],
  },
  {
    day: 4,
    name: 'Upper Pull',
    focus: 'Back · Biceps',
    accent: '#22c55e',
    icon: '💪',
    exercises: [
      { name: 'Bent Over Barbell Row', type: 'Compound', sets: 4, repsMin: 6, repsMax: 8 },
      { name: 'Pull-ups / Assisted Pull-ups', type: 'Compound', sets: 3, repsMin: 6, repsMax: 10 },
      { name: 'Cable Curl', type: 'Isolation', sets: 3, repsMin: 10, repsMax: 12 },
      { name: 'Face Pulls', type: 'Accessory', sets: 3, repsMin: 15, repsMax: 20 },
    ],
  },
  {
    day: 5,
    name: 'Lower Hinge',
    focus: 'Hamstrings · Glutes · Core',
    accent: '#f59e0b',
    icon: '🔥',
    exercises: [
      { name: 'Romanian Deadlift', type: 'Compound', sets: 4, repsMin: 8, repsMax: 10 },
      { name: 'Leg Curl Machine', type: 'Isolation', sets: 3, repsMin: 10, repsMax: 12 },
      { name: 'Plank', type: 'Core', sets: 3, repsMin: 45, repsMax: 60, unit: 'sec' },
      { name: 'Cable Crunch', type: 'Core', sets: 3, repsMin: 12, repsMax: 15 },
    ],
  },
]

export const getDay = (dayNumber) => WORKOUT_DAYS.find((d) => d.day === dayNumber)

export const getTotalSets = (day) =>
  day.exercises.reduce((sum, ex) => sum + ex.sets, 0)

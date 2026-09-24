export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Food = {
  id: string;
  source: 'off' | 'custom';
  barcode: string | null;
  name: string;
  brand: string | null;
  servingSizeG: number | null;
  servingDescription: string | null;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
};

export type FoodLogEntry = {
  id: string;
  foodId: string;
  foodName: string;
  loggedDate: string;
  mealType: MealType;
  quantity: number;
  quantityUnit: 'g' | 'serving';
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
};

export type NutritionGoals = {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
};

export type ExerciseCategory = 'strength' | 'cardio';

export type Exercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  muscleGroup: string | null;
  equipment: string | null;
  isCustom: boolean;
};

export type WorkoutTemplateExercise = {
  exercise: Exercise;
  targetSets: number | null;
  targetReps: number | null;
  targetWeightKg: number | null;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  exercises: WorkoutTemplateExercise[];
};

export type WorkoutSet = {
  id: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  durationS: number | null;
  distanceM: number | null;
};

export type WorkoutLogExercise = {
  id: string;
  exercise: Exercise;
  position: number;
  sets: WorkoutSet[];
};

export type WorkoutLog = {
  id: string;
  templateId: string | null;
  name: string;
  startedAt: string;
  completedAt: string | null;
  exercises: WorkoutLogExercise[];
};

export type WorkoutLogSummary = {
  id: string;
  name: string;
  startedAt: string;
  completedAt: string | null;
};

export type BodyWeight = {
  date: string;
  weightKg: number;
};

export type DailyCalories = {
  date: string;
  caloriesKcal: number;
};

export type WorkoutVolume = {
  id: string;
  startedAt: string;
  volumeKg: number;
};

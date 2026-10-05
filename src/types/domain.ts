export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Food = {
  id: string;
  source: 'off' | 'custom' | 'slv';
  barcode: string | null;
  name: string;
  brand: string | null;
  servingSizeG: number | null;
  servingDescription: string | null;
  createdBy: string | null;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
};

// A serving size the user saved for a food (e.g. "1 slice" = 30 g).
export type FoodServing = {
  id: string;
  name: string;
  grams: number;
};

export type FoodLogEntry = {
  id: string;
  // Null for quick-add entries (no food behind them).
  foodId: string | null;
  foodName: string;
  loggedDate: string;
  mealType: MealType;
  quantity: number;
  quantityUnit: 'g' | 'serving';
  // Grams per serving when logged in servings; null for grams and older entries.
  servingG: number | null;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
};

export type SavedMealItem = {
  food: Food;
  quantity: number;
  quantityUnit: 'g' | 'serving';
  servingG: number | null;
};

export type SavedMeal = {
  id: string;
  name: string;
  items: SavedMealItem[];
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
  movementPattern: string | null;
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
  isArchived: boolean;
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

export type ExerciseSession = {
  logId: string;
  startedAt: string;
  sets: WorkoutSet[];
};

export type BodyWeight = {
  date: string;
  weightKg: number;
};

export type DailyNutrition = {
  date: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};


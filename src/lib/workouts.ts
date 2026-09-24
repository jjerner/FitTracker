import { supabase } from './supabase';
import type {
  Exercise,
  ExerciseCategory,
  WorkoutLog,
  WorkoutLogSummary,
  WorkoutSet,
  WorkoutTemplate,
  WorkoutTemplateExercise,
} from '../types/domain';

function mapExerciseRow(row: any): Exercise {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    muscleGroup: row.muscle_group,
    equipment: row.equipment,
    isCustom: row.created_by != null,
  };
}

function mapSetRow(row: any): WorkoutSet {
  return {
    id: row.id,
    setNumber: row.set_number,
    weightKg: row.weight_kg,
    reps: row.reps,
    durationS: row.duration_s,
    distanceM: row.distance_m,
  };
}

// --- Exercises ---

export async function getExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase.from('exercises').select('*').order('name');
  if (error) throw error;
  return (data ?? []).map(mapExerciseRow);
}

export async function createCustomExercise(input: {
  userId: string;
  name: string;
  category: ExerciseCategory;
  muscleGroup: string | null;
}): Promise<Exercise> {
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      name: input.name,
      category: input.category,
      muscle_group: input.muscleGroup,
      created_by: input.userId,
    })
    .select()
    .single();

  if (error) throw error;
  return mapExerciseRow(data);
}

// --- Templates ---

export async function getTemplates(userId: string): Promise<WorkoutTemplate[]> {
  const { data, error } = await supabase
    .from('workout_templates')
    .select('*, workout_template_exercises(*, exercises(*))')
    .eq('user_id', userId)
    .order('name');

  if (error) throw error;
  return (data ?? []).map(mapTemplateRow);
}

export async function getTemplate(id: string): Promise<WorkoutTemplate> {
  const { data, error } = await supabase
    .from('workout_templates')
    .select('*, workout_template_exercises(*, exercises(*))')
    .eq('id', id)
    .single();

  if (error) throw error;
  return mapTemplateRow(data);
}

function mapTemplateRow(row: any): WorkoutTemplate {
  const exercises = [...(row.workout_template_exercises ?? [])]
    .sort((a, b) => a.position - b.position)
    .map(
      (te: any): WorkoutTemplateExercise => ({
        exercise: mapExerciseRow(te.exercises),
        targetSets: te.target_sets,
        targetReps: te.target_reps,
        targetWeightKg: te.target_weight_kg,
      })
    );

  return { id: row.id, name: row.name, exercises };
}

// Creates the template if `id` is null, otherwise updates it. Exercises are
// replaced wholesale — simpler than diffing, and templates are small.
export async function saveTemplate(input: {
  id: string | null;
  userId: string;
  name: string;
  exercises: WorkoutTemplateExercise[];
}): Promise<string> {
  let templateId = input.id;

  if (templateId) {
    const { error } = await supabase
      .from('workout_templates')
      .update({ name: input.name, updated_at: new Date().toISOString() })
      .eq('id', templateId);
    if (error) throw error;

    const { error: deleteError } = await supabase
      .from('workout_template_exercises')
      .delete()
      .eq('template_id', templateId);
    if (deleteError) throw deleteError;
  } else {
    const { data, error } = await supabase
      .from('workout_templates')
      .insert({ user_id: input.userId, name: input.name })
      .select('id')
      .single();
    if (error) throw error;
    templateId = data.id as string;
  }

  if (input.exercises.length > 0) {
    const { error } = await supabase.from('workout_template_exercises').insert(
      input.exercises.map((te, index) => ({
        template_id: templateId,
        exercise_id: te.exercise.id,
        position: index,
        target_sets: te.targetSets,
        target_reps: te.targetReps,
        target_weight_kg: te.targetWeightKg,
      }))
    );
    if (error) throw error;
  }

  return templateId;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('workout_templates').delete().eq('id', id);
  if (error) throw error;
}

// --- Workout logs ---
// An in-progress workout is a workout_logs row with completed_at = null.
// Sets are written as soon as they're added, so a killed app loses nothing.

export async function startWorkout(input: {
  userId: string;
  template: WorkoutTemplate | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from('workout_logs')
    .insert({
      user_id: input.userId,
      template_id: input.template?.id ?? null,
      name: input.template?.name ?? 'Workout',
    })
    .select('id')
    .single();
  if (error) throw error;

  const logId = data.id as string;

  if (input.template && input.template.exercises.length > 0) {
    const { error: exError } = await supabase.from('workout_log_exercises').insert(
      input.template.exercises.map((te, index) => ({
        log_id: logId,
        exercise_id: te.exercise.id,
        position: index,
      }))
    );
    if (exError) throw exError;
  }

  return logId;
}

export async function getWorkoutLog(id: string): Promise<WorkoutLog> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*, workout_log_exercises(*, exercises(*), workout_log_sets(*))')
    .eq('id', id)
    .single();

  if (error) throw error;

  const exercises = [...(data.workout_log_exercises ?? [])]
    .sort((a: any, b: any) => a.position - b.position)
    .map((le: any) => ({
      id: le.id,
      exercise: mapExerciseRow(le.exercises),
      position: le.position,
      sets: [...(le.workout_log_sets ?? [])]
        .sort((a: any, b: any) => a.set_number - b.set_number)
        .map(mapSetRow),
    }));

  return {
    id: data.id,
    templateId: data.template_id,
    name: data.name,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    exercises,
  };
}

export async function getWorkoutHistory(userId: string): Promise<WorkoutLogSummary[]> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('id, name, started_at, completed_at')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  }));
}

export async function addExerciseToLog(input: {
  logId: string;
  exerciseId: string;
  position: number;
}): Promise<void> {
  const { error } = await supabase.from('workout_log_exercises').insert({
    log_id: input.logId,
    exercise_id: input.exerciseId,
    position: input.position,
  });
  if (error) throw error;
}

export async function removeExerciseFromLog(logExerciseId: string): Promise<void> {
  const { error } = await supabase.from('workout_log_exercises').delete().eq('id', logExerciseId);
  if (error) throw error;
}

export async function addSet(input: {
  logExerciseId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  durationS: number | null;
  distanceM: number | null;
}): Promise<void> {
  const { error } = await supabase.from('workout_log_sets').insert({
    log_exercise_id: input.logExerciseId,
    set_number: input.setNumber,
    weight_kg: input.weightKg,
    reps: input.reps,
    duration_s: input.durationS,
    distance_m: input.distanceM,
  });
  if (error) throw error;
}

export async function deleteSet(id: string): Promise<void> {
  const { error } = await supabase.from('workout_log_sets').delete().eq('id', id);
  if (error) throw error;
}

export async function finishWorkout(id: string): Promise<void> {
  const { error } = await supabase
    .from('workout_logs')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteWorkoutLog(id: string): Promise<void> {
  const { error } = await supabase.from('workout_logs').delete().eq('id', id);
  if (error) throw error;
}

export function formatSet(set: WorkoutSet): string {
  if (set.durationS != null || set.distanceM != null) {
    const parts = [];
    if (set.durationS != null) parts.push(`${Math.round(set.durationS / 60)} min`);
    if (set.distanceM != null) parts.push(`${set.distanceM / 1000} km`);
    return parts.join(' · ');
  }
  return `${set.weightKg ?? 0} kg × ${set.reps ?? 0}`;
}

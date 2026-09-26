-- Movement pattern per exercise, used to suggest similar exercises when swapping mid-workout.

alter table public.exercises add column movement_pattern text;

update public.exercises e
set movement_pattern = v.pattern
from (values
  ('Bench Press', 'horizontal_press'),
  ('Incline Bench Press', 'incline_press'),
  ('Dumbbell Bench Press', 'horizontal_press'),
  ('Push-up', 'horizontal_press'),
  ('Chest Fly', 'chest_fly'),
  ('Back Squat', 'squat'),
  ('Front Squat', 'squat'),
  ('Leg Press', 'squat'),
  ('Lunge', 'lunge'),
  ('Romanian Deadlift', 'hinge'),
  ('Leg Curl', 'knee_flexion'),
  ('Leg Extension', 'knee_extension'),
  ('Calf Raise', 'calf'),
  ('Deadlift', 'hinge'),
  ('Pull-up', 'vertical_pull'),
  ('Lat Pulldown', 'vertical_pull'),
  ('Barbell Row', 'horizontal_pull'),
  ('Dumbbell Row', 'horizontal_pull'),
  ('Seated Cable Row', 'horizontal_pull'),
  ('Overhead Press', 'vertical_press'),
  ('Dumbbell Shoulder Press', 'vertical_press'),
  ('Lateral Raise', 'lateral_raise'),
  ('Face Pull', 'rear_delt'),
  ('Barbell Curl', 'biceps'),
  ('Dumbbell Curl', 'biceps'),
  ('Tricep Pushdown', 'triceps'),
  ('Skull Crusher', 'triceps'),
  ('Dip', 'triceps'),
  ('Plank', 'core'),
  ('Hanging Leg Raise', 'core'),
  ('Running', 'cardio'),
  ('Cycling', 'cardio'),
  ('Rowing', 'cardio'),
  ('Walking', 'cardio')
) as v(name, pattern)
where e.name = v.name and e.created_by is null;

-- Common machine/cable/dumbbell alternatives so swaps have options.
insert into public.exercises (name, category, muscle_group, equipment, movement_pattern) values
  ('Chest Press', 'strength', 'chest', 'machine', 'horizontal_press'),
  ('Smith Machine Bench Press', 'strength', 'chest', 'machine', 'horizontal_press'),
  ('Incline Dumbbell Press', 'strength', 'chest', 'dumbbell', 'incline_press'),
  ('Incline Chest Press', 'strength', 'chest', 'machine', 'incline_press'),
  ('Pec Deck', 'strength', 'chest', 'machine', 'chest_fly'),
  ('Dumbbell Fly', 'strength', 'chest', 'dumbbell', 'chest_fly'),
  ('Machine Shoulder Press', 'strength', 'shoulders', 'machine', 'vertical_press'),
  ('Arnold Press', 'strength', 'shoulders', 'dumbbell', 'vertical_press'),
  ('Cable Lateral Raise', 'strength', 'shoulders', 'cable', 'lateral_raise'),
  ('Machine Lateral Raise', 'strength', 'shoulders', 'machine', 'lateral_raise'),
  ('Reverse Pec Deck', 'strength', 'shoulders', 'machine', 'rear_delt'),
  ('Hack Squat', 'strength', 'legs', 'machine', 'squat'),
  ('Goblet Squat', 'strength', 'legs', 'dumbbell', 'squat'),
  ('Smith Machine Squat', 'strength', 'legs', 'machine', 'squat'),
  ('Bulgarian Split Squat', 'strength', 'legs', 'dumbbell', 'lunge'),
  ('Walking Lunge', 'strength', 'legs', 'dumbbell', 'lunge'),
  ('Hip Thrust', 'strength', 'legs', 'barbell', 'hinge'),
  ('Dumbbell Romanian Deadlift', 'strength', 'legs', 'dumbbell', 'hinge'),
  ('Seated Leg Curl', 'strength', 'legs', 'machine', 'knee_flexion'),
  ('Seated Calf Raise', 'strength', 'legs', 'machine', 'calf'),
  ('Assisted Pull-up', 'strength', 'back', 'machine', 'vertical_pull'),
  ('Chin-up', 'strength', 'back', 'bodyweight', 'vertical_pull'),
  ('Chest-Supported Row', 'strength', 'back', 'machine', 'horizontal_pull'),
  ('Machine Row', 'strength', 'back', 'machine', 'horizontal_pull'),
  ('Hammer Curl', 'strength', 'arms', 'dumbbell', 'biceps'),
  ('Cable Curl', 'strength', 'arms', 'cable', 'biceps'),
  ('Overhead Tricep Extension', 'strength', 'arms', 'cable', 'triceps'),
  ('Cable Crunch', 'strength', 'core', 'cable', 'core');

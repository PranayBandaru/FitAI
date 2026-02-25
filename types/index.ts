// ─── User / Profile ──────────────────────────────────────────────────────────

export type Sex = "male" | "female" | "other";

export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "extra_active";

export interface UserProfile {
  user_id: string;
  height_cm: number;
  weight_kg: number;
  age: number;
  sex: Sex;
  activity_level: ActivityLevel;
  protein_goal_g: number;
}

// ─── Nutrition ────────────────────────────────────────────────────────────────

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type FoodSource = "usda" | "llm_estimate";

export interface FoodItem {
  food_name: string;
  quantity: number;
  unit: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  source: FoodSource;
}

export interface FoodLog extends FoodItem {
  id: string;
  user_id: string;
  logged_at: string; // ISO
  meal_type: MealType;
  raw_message: string;
}

export interface DailyNutrition {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

// ─── Health / Activity ────────────────────────────────────────────────────────

export interface WorkoutSummary {
  type: string;
  duration_min: number;
  calories_kcal: number;
  startDate: string;
  endDate: string;
}

export interface DailyEnergy {
  active_kcal: number;
  resting_kcal: number;
  total_kcal: number;
  workouts: WorkoutSummary[];
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export interface Goal {
  id: string;
  user_id: string;
  target_weight_kg: number;
  target_date: string; // ISO date string YYYY-MM-DD
  created_at: string;
}

export interface GoalProgress {
  required_daily_deficit_kcal: number;
  days_remaining: number;
  total_deficit_needed_kcal: number;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  foodItems?: FoodItem[]; // attached when assistant extracts food
}

export interface ChatSession {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  messages: ChatMessage[];
}

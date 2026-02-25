import {
    ActivityLevel,
    DailyNutrition,
    GoalProgress,
    UserProfile,
} from "../types";

// ─── Mifflin-St Jeor BMR ──────────────────────────────────────────────────────

export function calculateBMR(profile: UserProfile): number {
  const { weight_kg, height_cm, age, sex } = profile;
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

// ─── TDEE ─────────────────────────────────────────────────────────────────────

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export function calculateTDEE(
  bmr: number,
  activityLevel: ActivityLevel,
): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activityLevel]);
}

// ─── Goal-based deficit ───────────────────────────────────────────────────────

/** 1 kg of fat ≈ 7700 kcal */
const KCAL_PER_KG = 7700;

export function calculateGoalProgress(
  currentWeight_kg: number,
  targetWeight_kg: number,
  targetDate: string,
): GoalProgress {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(targetDate);
  const days_remaining = Math.max(
    1,
    Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const weight_delta_kg = currentWeight_kg - targetWeight_kg; // positive = need to lose
  const total_deficit_needed_kcal = weight_delta_kg * KCAL_PER_KG;
  const required_daily_deficit_kcal = Math.round(
    total_deficit_needed_kcal / days_remaining,
  );

  return {
    required_daily_deficit_kcal,
    days_remaining,
    total_deficit_needed_kcal,
  };
}

// ─── Net calories ─────────────────────────────────────────────────────────────

export function calculateNetCalories(
  intake_kcal: number,
  expenditure_kcal: number,
): number {
  return intake_kcal - expenditure_kcal;
}

// ─── Sum daily logs ───────────────────────────────────────────────────────────

export function sumNutrition(items: DailyNutrition[]): DailyNutrition {
  return items.reduce(
    (acc, item) => ({
      calories_kcal: acc.calories_kcal + item.calories_kcal,
      protein_g: acc.protein_g + item.protein_g,
      carbs_g: acc.carbs_g + item.carbs_g,
      fat_g: acc.fat_g + item.fat_g,
      fiber_g: acc.fiber_g + (item.fiber_g ?? 0),
    }),
    { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
  );
}

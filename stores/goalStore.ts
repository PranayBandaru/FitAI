import { create } from "zustand";
import { calculateGoalProgress } from "../lib/nutrition";
import { supabase } from "../lib/supabase";
import { Goal, GoalProgress } from "../types";

interface GoalState {
  goal: Goal | null;
  progress: GoalProgress | null;
  currentWeight_kg: number;
  loading: boolean;
  fetchGoal: () => Promise<void>;
  saveGoal: (targetWeight_kg: number, targetDate: string) => Promise<void>;
  setCurrentWeight: (weight: number) => void;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goal: null,
  progress: null,
  currentWeight_kg: 0,
  loading: false,

  setCurrentWeight: (weight) => {
    set({ currentWeight_kg: weight });
    const { goal } = get();
    if (goal) {
      const progress = calculateGoalProgress(
        weight,
        goal.target_weight_kg,
        goal.target_date,
      );
      set({ progress });
    }
  },

  fetchGoal: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      const goal = data as Goal;
      set({ goal });
      const { currentWeight_kg } = get();
      if (currentWeight_kg > 0) {
        const progress = calculateGoalProgress(
          currentWeight_kg,
          goal.target_weight_kg,
          goal.target_date,
        );
        set({ progress });
      }
    }
    set({ loading: false });
  },

  saveGoal: async (targetWeight_kg, targetDate) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { data, error } = await supabase
      .from("goals")
      .upsert(
        {
          user_id: userData.user.id,
          target_weight_kg: targetWeight_kg,
          target_date: targetDate,
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();

    if (!error && data) {
      const goal = data as Goal;
      set({ goal });
      const { currentWeight_kg } = get();
      const progress = calculateGoalProgress(
        currentWeight_kg,
        goal.target_weight_kg,
        goal.target_date,
      );
      set({ progress });
    }
  },
}));

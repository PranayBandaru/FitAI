import { format } from "date-fns";
import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { ResolvedFoodItem } from "../lib/usda";
import { FoodLog, MealType } from "../types";

interface FoodLogState {
  logs: FoodLog[];
  selectedDate: string; // YYYY-MM-DD
  loading: boolean;
  fetchLogsForDate: (date: string) => Promise<void>;
  addFoodLogs: (
    items: ResolvedFoodItem[],
    mealType: MealType,
    rawMessage: string,
  ) => Promise<void>;
  removeFoodLog: (id: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
}

export const useFoodLogStore = create<FoodLogState>((set, get) => ({
  logs: [],
  selectedDate: format(new Date(), "yyyy-MM-dd"),
  loading: false,

  setSelectedDate: (date) => {
    set({ selectedDate: date });
    get().fetchLogsForDate(date);
  },

  fetchLogsForDate: async (date) => {
    set({ loading: true });
    // Build UTC bounds from local-date midnight so users in any timezone get
    // their own "today" rather than UTC midnight-to-midnight.
    const startLocal = new Date(`${date}T00:00:00`); // local midnight
    const endLocal = new Date(`${date}T23:59:59.999`); // local end-of-day
    const { data, error } = await supabase
      .from("food_logs")
      .select("*")
      .gte("logged_at", startLocal.toISOString())
      .lte("logged_at", endLocal.toISOString())
      .order("logged_at", { ascending: true });

    if (error)
      console.error("[foodLog] fetchLogsForDate failed:", error.message);
    else {
      console.log(`[foodLog] fetched ${data?.length ?? 0} rows for ${date}`);
      set({ logs: (data ?? []) as FoodLog[] });
    }
    set({ loading: false });
  },

  addFoodLogs: async (items, mealType, rawMessage) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const rows = items.map((item) => ({
      user_id: userData.user.id,
      logged_at: new Date().toISOString(),
      meal_type: mealType,
      food_name: item.food_name,
      quantity: item.quantity,
      unit: item.unit,
      calories_kcal: item.calories_kcal,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      fiber_g: item.fiber_g ?? 0,
      source: item.source,
      raw_message: rawMessage,
    }));

    const { data, error } = await supabase
      .from("food_logs")
      .insert(rows)
      .select();

    if (error) console.error("[foodLog] addFoodLogs failed:", error.message);
    else if (data)
      set((state) => ({ logs: [...state.logs, ...(data as FoodLog[])] }));
  },

  removeFoodLog: async (id) => {
    await supabase.from("food_logs").delete().eq("id", id);
    set((state) => ({ logs: state.logs.filter((l) => l.id !== id) }));
  },
}));

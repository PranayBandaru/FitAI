import { create } from "zustand";
import {
    getDailyEnergyBurned,
    requestHealthPermissions,
} from "../lib/healthkit";
import { DailyEnergy } from "../types";

interface HealthState {
  dailyEnergy: DailyEnergy | null;
  permissionsGranted: boolean;
  loading: boolean;
  requestPermissions: () => Promise<void>;
  fetchDailyEnergy: (date?: Date) => Promise<void>;
}

export const useHealthStore = create<HealthState>((set) => ({
  dailyEnergy: null,
  permissionsGranted: false,
  loading: false,

  requestPermissions: async () => {
    const granted = await requestHealthPermissions();
    set({ permissionsGranted: granted });
  },

  fetchDailyEnergy: async (date = new Date()) => {
    set({ loading: true });
    const energy = await getDailyEnergyBurned(date);
    set({ dailyEnergy: energy, loading: false });
  },
}));

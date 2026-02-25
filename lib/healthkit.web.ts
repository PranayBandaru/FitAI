/**
 * Web stub for HealthKit — HealthKit is iOS-only.
 * Metro picks this file for web bundles instead of healthkit.ts.
 */
import { DailyEnergy } from "../types";

export function requestHealthPermissions(): Promise<boolean> {
  return Promise.resolve(false);
}

export function getDailyEnergyBurned(_date: Date): Promise<DailyEnergy> {
  return Promise.resolve({
    active_kcal: 0,
    resting_kcal: 0,
    total_kcal: 0,
    workouts: [],
  });
}

/**
 * HealthKit wrapper using react-native-health.
 *
 * NOTE: HealthKit only works on a physical iOS device with a native build.
 * Requires expo prebuild (or EAS Build) to link the native module.
 * Run: npx expo prebuild --platform ios
 *
 * In app.json, ensure the 'react-native-health' plugin is added and
 * NSHealthShareUsageDescription / NSHealthUpdateUsageDescription are set.
 */

import AppleHealthKit, { HealthKitPermissions } from "react-native-health";
import { DailyEnergy, WorkoutSummary } from "../types";

const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.BasalEnergyBurned,
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.Workout,
    ],
    write: [],
  },
};

// ─── Request permissions ──────────────────────────────────────────────────────

export function requestHealthPermissions(): Promise<boolean> {
  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(PERMISSIONS, (error) => {
      if (error) {
        console.warn("[HealthKit] initHealthKit error", error);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

// ─── Promisified helpers ──────────────────────────────────────────────────────

function queryEnergy(
  getter: (
    opts: { startDate: string; endDate: string; ascending?: boolean },
    cb: (err: any, results: { value: number }[]) => void,
  ) => void,
  startDate: string,
  endDate: string,
): Promise<number> {
  return new Promise((resolve) => {
    getter({ startDate, endDate, ascending: false }, (err, results) => {
      if (err || !results) {
        resolve(0);
        return;
      }
      const total = results.reduce((s, r) => s + (r.value ?? 0), 0);
      resolve(Math.round(total));
    });
  });
}

function queryWorkouts(
  startDate: string,
  endDate: string,
): Promise<WorkoutSummary[]> {
  return new Promise((resolve) => {
    AppleHealthKit.getSamples(
      {
        startDate,
        endDate,
        type: "Workout",
      } as any,
      (err: any, results: any[]) => {
        if (err || !results) {
          resolve([]);
          return;
        }
        const workouts: WorkoutSummary[] = results.map((w) => ({
          type: w.activityName ?? "Workout",
          duration_min: (w.duration ?? 0) / 60,
          calories_kcal: Math.round(w.calories ?? 0),
          startDate: w.startDate,
          endDate: w.endDate,
        }));
        resolve(workouts);
      },
    );
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getDailyEnergyBurned(date: Date): Promise<DailyEnergy> {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  const start = startDate.toISOString();
  const end = endDate.toISOString();

  const [active_kcal, resting_kcal, workouts] = await Promise.all([
    queryEnergy(
      AppleHealthKit.getActiveEnergyBurned.bind(AppleHealthKit),
      start,
      end,
    ),
    queryEnergy(
      AppleHealthKit.getBasalEnergyBurned.bind(AppleHealthKit),
      start,
      end,
    ),
    queryWorkouts(start, end),
  ]);

  return {
    active_kcal,
    resting_kcal,
    total_kcal: active_kcal + resting_kcal,
    workouts,
  };
}

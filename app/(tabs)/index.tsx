import { format } from "date-fns";
import { useEffect } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DeficitSummary from "../../components/dashboard/DeficitSummary";
import EnergyRing from "../../components/dashboard/EnergyRing";
import MacroBar from "../../components/dashboard/MacroBar";
import { calculateBMR, calculateTDEE, sumNutrition } from "../../lib/nutrition";
import { useAuthStore } from "../../stores/authStore";
import { useFoodLogStore } from "../../stores/foodLogStore";
import { useGoalStore } from "../../stores/goalStore";
import { useHealthStore } from "../../stores/healthStore";

export default function DashboardScreen() {
  const {
    dailyEnergy,
    fetchDailyEnergy,
    loading: healthLoading,
  } = useHealthStore();
  const { logs, fetchLogsForDate, loading: logsLoading } = useFoodLogStore();
  const { fetchGoal, progress } = useGoalStore();
  const { profile } = useAuthStore();

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    fetchLogsForDate(today);
    fetchDailyEnergy(new Date());
    fetchGoal();
  }, [today]);

  const nutrition = sumNutrition(logs);
  const estimatedTDEE = profile
    ? calculateTDEE(calculateBMR(profile), profile.activity_level)
    : 0;
  const totalExpenditure =
    (dailyEnergy?.total_kcal ?? 0) > 0
      ? (dailyEnergy?.total_kcal ?? 0)
      : estimatedTDEE;
  const todayDeficit = totalExpenditure - nutrition.calories_kcal;
  const requiredDailyDeficit = progress?.required_daily_deficit_kcal ?? 500;
  const loading = healthLoading || logsLoading;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.date}>{format(new Date(), "EEEE, MMM d")}</Text>
          <Text style={styles.heading}>Today's Summary</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#4ADE80" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.ringRow}>
              <EnergyRing
                intake={nutrition.calories_kcal}
                expenditure={totalExpenditure}
                size={180}
              />
              <View style={styles.ringStats}>
                <StatItem
                  label="Intake"
                  value={`${nutrition.calories_kcal} kcal`}
                  color="#fff"
                />
                <StatItem
                  label="Burned"
                  value={`${totalExpenditure} kcal`}
                  color="#60A5FA"
                />
                <StatItem
                  label="Active"
                  value={`${dailyEnergy?.active_kcal ?? "—"} kcal`}
                  color="#A78BFA"
                />
                <StatItem
                  label="Resting"
                  value={`${dailyEnergy?.resting_kcal ?? "—"} kcal`}
                  color="#F9A8D4"
                />
              </View>
            </View>

            <MacroBar
              protein_g={nutrition.protein_g}
              carbs_g={nutrition.carbs_g}
              fat_g={nutrition.fat_g}
              fiber_g={nutrition.fiber_g}
              protein_goal_g={profile?.protein_goal_g}
            />

            <DeficitSummary
              todayDeficit={todayDeficit}
              goalProgress={progress}
              requiredDailyDeficit={requiredDailyDeficit}
            />

            {dailyEnergy && dailyEnergy.workouts.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Workouts Today</Text>
                {dailyEnergy.workouts.map((w, i) => (
                  <View key={i} style={styles.workoutRow}>
                    <Text style={styles.workoutName}>{w.type}</Text>
                    <Text style={styles.workoutMeta}>
                      {Math.round(w.duration_min)} min · {w.calories_kcal} kcal
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f0f0f" },
  container: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  header: { gap: 4, marginBottom: 4 },
  date: { fontSize: 13, color: "#666" },
  heading: { fontSize: 26, fontWeight: "800", color: "#fff" },
  ringRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1c1e",
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  ringStats: { flex: 1, gap: 10 },
  statItem: { gap: 2 },
  statLabel: { fontSize: 12, color: "#888" },
  statValue: { fontSize: 15, fontWeight: "700" },
  card: { backgroundColor: "#1c1c1e", borderRadius: 16, padding: 16, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
  workoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#2c2c2e",
  },
  workoutName: { color: "#fff", fontWeight: "600" },
  workoutMeta: { color: "#888", fontSize: 13 },
});

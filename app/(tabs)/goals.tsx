import { addDays, format } from "date-fns";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { calculateBMR, calculateTDEE } from "../../lib/nutrition";
import { useAuthStore } from "../../stores/authStore";
import { useGoalStore } from "../../stores/goalStore";

export default function GoalsScreen() {
  const { goal, progress, fetchGoal, saveGoal, setCurrentWeight, loading } =
    useGoalStore();
  const { profile, signOut, saveProfile } = useAuthStore();

  const [targetWeight, setTargetWeight] = useState("");
  const [targetDate, setTargetDate] = useState(
    format(addDays(new Date(), 90), "yyyy-MM-dd"),
  );
  const [currentWeight, setCurrentWeightInput] = useState("");
  // Default protein goal: 1.6 g/kg body weight (evidence-based minimum for muscle retention)
  const [proteinGoal, setProteinGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingProtein, setSavingProtein] = useState(false);

  useEffect(() => {
    fetchGoal();
    if (profile) {
      setCurrentWeightInput(String(profile.weight_kg));
      setCurrentWeight(profile.weight_kg);
      // Pre-fill protein goal from saved value, or compute 1.6 g/kg default
      setProteinGoal(
        String(profile.protein_goal_g ?? Math.round(profile.weight_kg * 1.6)),
      );
    }
  }, [profile]);

  useEffect(() => {
    if (goal) {
      setTargetWeight(String(goal.target_weight_kg));
      setTargetDate(goal.target_date);
    }
  }, [goal]);

  const handleSave = async () => {
    const tw = parseFloat(targetWeight);
    const cw = parseFloat(currentWeight);
    if (!tw || !targetDate) return;
    setSaving(true);
    if (cw) setCurrentWeight(cw);
    await saveGoal(tw, targetDate);
    setSaving(false);
  };

  const handleSaveProtein = async () => {
    const pg = parseFloat(proteinGoal);
    if (!pg || pg <= 0) return;
    setSavingProtein(true);
    await saveProfile({ protein_goal_g: pg });
    setSavingProtein(false);
  };

  const tdee = profile
    ? calculateTDEE(calculateBMR(profile), profile.activity_level)
    : 0;
  const targetCalories = progress
    ? tdee - progress.required_daily_deficit_kcal
    : tdee;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Goals</Text>

        {/* Current weight */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Weight</Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="70.0"
              placeholderTextColor="#555"
              value={currentWeight}
              onChangeText={(v) => {
                setCurrentWeightInput(v);
                const n = parseFloat(v);
                if (n) setCurrentWeight(n);
              }}
            />
            <Text style={styles.unit}>kg</Text>
          </View>
        </View>

        {/* Protein goal */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Protein Goal</Text>
          <Text style={styles.cardHint}>
            Recommended: {profile ? Math.round(profile.weight_kg * 1.6) : "—"}–
            {profile ? Math.round(profile.weight_kg * 2.2) : "—"} g (
            {profile ? Math.round(profile.weight_kg * 1.6) : "—"} g = 1.6 g/kg
            body weight)
          </Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="120"
              placeholderTextColor="#555"
              value={proteinGoal}
              onChangeText={setProteinGoal}
            />
            <Text style={styles.unit}>g / day</Text>
          </View>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveProtein}
            disabled={savingProtein}
          >
            {savingProtein ? (
              <ActivityIndicator color="#0f0f0f" />
            ) : (
              <Text style={styles.saveBtnText}>Save Protein Goal</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Target */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Target Weight</Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="65.0"
              placeholderTextColor="#555"
              value={targetWeight}
              onChangeText={setTargetWeight}
            />
            <Text style={styles.unit}>kg</Text>
          </View>

          <Text style={[styles.cardTitle, { marginTop: 14 }]}>Target Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#555"
            value={targetDate}
            onChangeText={setTargetDate}
          />

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#0f0f0f" />
            ) : (
              <Text style={styles.saveBtnText}>Save Goal</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Progress metrics */}
        {progress && (
          <>
            <View style={styles.metricsRow}>
              <MetricCard
                label="Daily Deficit Needed"
                value={`${progress.required_daily_deficit_kcal} kcal`}
                color="#4ADE80"
              />
              <MetricCard
                label="Days Remaining"
                value={String(progress.days_remaining)}
                color="#60A5FA"
              />
            </View>
            <View style={styles.metricsRow}>
              <MetricCard
                label="Total Deficit Needed"
                value={`${Math.round(progress.total_deficit_needed_kcal)} kcal`}
                color="#FBBF24"
              />
              <MetricCard
                label="Target Daily Intake"
                value={`${Math.max(0, targetCalories)} kcal`}
                color="#F9A8D4"
              />
            </View>

            <View style={styles.tdeeCard}>
              <Text style={styles.tdeeLabel}>Your Estimated TDEE</Text>
              <Text style={styles.tdeeVal}>{tdee} kcal / day</Text>
              <Text style={styles.tdeeSubtext}>
                Based on your profile · {progress.required_daily_deficit_kcal}{" "}
                kcal/day deficit required to reach goal
              </Text>
            </View>
          </>
        )}

        {/* Account actions */}
        <View style={styles.accountRow}>
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => router.push("/(auth)/onboarding")}
          >
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={async () => {
              await signOut();
              router.replace("/(auth)/login");
            }}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f0f0f" },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  heading: { fontSize: 26, fontWeight: "800", color: "#fff", marginBottom: 4 },
  card: { backgroundColor: "#1c1c1e", borderRadius: 16, padding: 16, gap: 10 },
  cardTitle: { fontSize: 14, color: "#999", fontWeight: "600" },
  cardHint: { fontSize: 12, color: "#666", lineHeight: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: {
    flex: 1,
    backgroundColor: "#2c2c2e",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#fff",
  },
  unit: { fontSize: 15, color: "#888" },
  saveBtn: {
    backgroundColor: "#4ADE80",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#0f0f0f" },
  metricsRow: { flexDirection: "row", gap: 12 },
  metricCard: {
    flex: 1,
    backgroundColor: "#1c1c1e",
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  metricLabel: { fontSize: 12, color: "#888" },
  metricValue: { fontSize: 20, fontWeight: "800" },
  tdeeCard: {
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  tdeeLabel: { fontSize: 13, color: "#888" },
  tdeeVal: { fontSize: 22, fontWeight: "800", color: "#fff" },
  tdeeSubtext: { fontSize: 13, color: "#666", lineHeight: 18 },
  accountRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  editProfileBtn: {
    flex: 1,
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  editProfileText: { fontSize: 14, fontWeight: "600", color: "#4ADE80" },
  signOutBtn: {
    flex: 1,
    backgroundColor: "#2c1a1a",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  signOutText: { fontSize: 14, fontWeight: "600", color: "#F87171" },
});

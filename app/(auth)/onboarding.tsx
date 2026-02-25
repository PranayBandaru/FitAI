import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuthStore } from "../../stores/authStore";
import { useHealthStore } from "../../stores/healthStore";
import { ActivityLevel, Sex } from "../../types";

const SEX_OPTIONS: { label: string; value: Sex }[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

const ACTIVITY_OPTIONS: {
  label: string;
  value: ActivityLevel;
  desc: string;
}[] = [
  { label: "Sedentary", value: "sedentary", desc: "Little to no exercise" },
  { label: "Lightly Active", value: "lightly_active", desc: "1-3 days/week" },
  {
    label: "Moderately Active",
    value: "moderately_active",
    desc: "3-5 days/week",
  },
  { label: "Very Active", value: "very_active", desc: "6-7 days/week" },
  {
    label: "Extra Active",
    value: "extra_active",
    desc: "Physical job + training",
  },
];

export default function OnboardingScreen() {
  const saveProfile = useAuthStore((s) => s.saveProfile);
  const existingProfile = useAuthStore((s) => s.profile);
  const requestPermissions = useHealthStore((s) => s.requestPermissions);

  const [height, setHeight] = useState(
    existingProfile ? String(existingProfile.height_cm) : "",
  );
  const [weight, setWeight] = useState(
    existingProfile ? String(existingProfile.weight_kg) : "",
  );
  const [age, setAge] = useState(
    existingProfile ? String(existingProfile.age) : "",
  );
  const [sex, setSex] = useState<Sex>(existingProfile?.sex ?? "male");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    existingProfile?.activity_level ?? "moderately_active",
  );
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    await saveProfile({
      height_cm: parseFloat(height) || 170,
      weight_kg: parseFloat(weight) || 70,
      age: parseInt(age) || 25,
      sex,
      activity_level: activityLevel,
    });
    await requestPermissions();
    router.replace("/(tabs)");
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {existingProfile ? "Edit Profile" : "Tell us about yourself"}
      </Text>
      <Text style={styles.subtitle}>
        We'll use this to calculate your daily energy needs.
      </Text>

      <Text style={styles.label}>Height (cm)</Text>
      <TextInput
        style={styles.input}
        placeholder="170"
        placeholderTextColor="#555"
        keyboardType="decimal-pad"
        value={height}
        onChangeText={setHeight}
      />

      <Text style={styles.label}>Weight (kg)</Text>
      <TextInput
        style={styles.input}
        placeholder="70"
        placeholderTextColor="#555"
        keyboardType="decimal-pad"
        value={weight}
        onChangeText={setWeight}
      />

      <Text style={styles.label}>Age</Text>
      <TextInput
        style={styles.input}
        placeholder="25"
        placeholderTextColor="#555"
        keyboardType="number-pad"
        value={age}
        onChangeText={setAge}
      />

      <Text style={styles.label}>Sex</Text>
      <View style={styles.row}>
        {SEX_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, sex === opt.value && styles.chipSelected]}
            onPress={() => setSex(opt.value)}
          >
            <Text
              style={[
                styles.chipText,
                sex === opt.value && styles.chipTextSelected,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Activity Level</Text>
      {ACTIVITY_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.activityRow,
            activityLevel === opt.value && styles.activitySelected,
          ]}
          onPress={() => setActivityLevel(opt.value)}
        >
          <Text
            style={[
              styles.activityLabel,
              activityLevel === opt.value && styles.activityLabelSelected,
            ]}
          >
            {opt.label}
          </Text>
          <Text style={styles.activityDesc}>{opt.desc}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.button}
        onPress={handleContinue}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#0f0f0f" />
        ) : (
          <Text style={styles.buttonText}>Continue to App</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0f" },
  content: { padding: 24, paddingTop: 60, gap: 12 },
  title: { fontSize: 28, fontWeight: "800", color: "#fff", marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#888", marginBottom: 16 },
  label: { fontSize: 14, color: "#999", fontWeight: "600", marginTop: 8 },
  input: {
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#1c1c1e",
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  chipSelected: { backgroundColor: "#4ADE80", borderColor: "#4ADE80" },
  chipText: { color: "#999", fontWeight: "600" },
  chipTextSelected: { color: "#0f0f0f" },
  activityRow: {
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  activitySelected: { borderColor: "#4ADE80", backgroundColor: "#1a2e1a" },
  activityLabel: { fontSize: 15, fontWeight: "700", color: "#fff" },
  activityLabelSelected: { color: "#4ADE80" },
  activityDesc: { fontSize: 13, color: "#666", marginTop: 2 },
  button: {
    backgroundColor: "#4ADE80",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 40,
  },
  buttonText: { fontSize: 16, fontWeight: "700", color: "#0f0f0f" },
});

import { StyleSheet, Text, View } from "react-native";
import { GoalProgress } from "../../types";

interface Props {
  todayDeficit: number; // positive = deficit, negative = surplus
  goalProgress: GoalProgress | null;
  requiredDailyDeficit: number;
}

export default function DeficitSummary({
  todayDeficit,
  goalProgress,
  requiredDailyDeficit,
}: Props) {
  const onTrack = todayDeficit >= requiredDailyDeficit;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deficit Tracker</Text>

      <View style={styles.row}>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Today's Deficit</Text>
          <Text
            style={[
              styles.cellValue,
              { color: todayDeficit >= 0 ? "#4ADE80" : "#FF6B6B" },
            ]}
          >
            {todayDeficit >= 0 ? "+" : ""}
            {todayDeficit} kcal
          </Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Daily Target</Text>
          <Text style={styles.cellValue}>{requiredDailyDeficit} kcal</Text>
        </View>
      </View>

      {goalProgress && (
        <View style={styles.goalRow}>
          <Text style={styles.goalText}>
            {goalProgress.days_remaining} days remaining ·{" "}
            <Text style={{ color: onTrack ? "#4ADE80" : "#FBBF24" }}>
              {onTrack ? "On track ✓" : "Adjust intake ↑"}
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  title: { fontSize: 15, fontWeight: "700", color: "#fff" },
  row: { flexDirection: "row", gap: 12 },
  cell: {
    flex: 1,
    backgroundColor: "#2c2c2e",
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  cellLabel: { fontSize: 12, color: "#888" },
  cellValue: { fontSize: 18, fontWeight: "700", color: "#fff" },
  goalRow: { paddingTop: 4 },
  goalText: { fontSize: 13, color: "#888" },
});

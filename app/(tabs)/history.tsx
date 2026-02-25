import { addDays, format, parseISO, subDays } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { sumNutrition } from "../../lib/nutrition";
import { useFoodLogStore } from "../../stores/foodLogStore";
import { FoodLog, MealType } from "../../types";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export default function HistoryScreen() {
  const {
    logs,
    fetchLogsForDate,
    removeFoodLog,
    loading,
    setSelectedDate,
    selectedDate,
  } = useFoodLogStore();
  const [date, setDate] = useState(selectedDate);

  useEffect(() => {
    fetchLogsForDate(date);
  }, [date]);

  const changeDate = (direction: number) => {
    const next =
      direction > 0 ? addDays(parseISO(date), 1) : subDays(parseISO(date), 1);
    const formatted = format(next, "yyyy-MM-dd");
    setDate(formatted);
    setSelectedDate(formatted);
  };

  const handleDelete = useCallback(
    (log: FoodLog) => {
      Alert.alert("Remove Entry", `Remove "${log.food_name}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeFoodLog(log.id),
        },
      ]);
    },
    [removeFoodLog],
  );

  const nutrition = sumNutrition(logs);

  const groupedByMeal: Record<string, FoodLog[]> = {};
  logs.forEach((log) => {
    if (!groupedByMeal[log.meal_type]) groupedByMeal[log.meal_type] = [];
    groupedByMeal[log.meal_type].push(log);
  });

  const isToday = date === format(new Date(), "yyyy-MM-dd");

  return (
    <SafeAreaView style={styles.safe}>
      {/* Date navigator */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.navBtn}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navDate}>
          {isToday ? "Today" : format(parseISO(date), "EEE, MMM d")}
        </Text>
        <TouchableOpacity
          onPress={() => changeDate(1)}
          style={styles.navBtn}
          disabled={isToday}
        >
          <Text style={[styles.navArrow, isToday && styles.disabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Daily totals */}
      <View style={styles.totalsRow}>
        <TotalPill
          label="Calories"
          value={`${nutrition.calories_kcal}`}
          color="#4ADE80"
        />
        <TotalPill
          label="Protein"
          value={`${nutrition.protein_g}g`}
          color="#60A5FA"
        />
        <TotalPill
          label="Carbs"
          value={`${nutrition.carbs_g}g`}
          color="#FBBF24"
        />
        <TotalPill label="Fat" value={`${nutrition.fat_g}g`} color="#F87171" />
        <TotalPill
          label="Fiber"
          value={`${nutrition.fiber_g}g`}
          color="#A78BFA"
        />
      </View>

      {loading ? (
        <ActivityIndicator color="#4ADE80" style={{ marginTop: 40 }} />
      ) : logs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No food logged on this day.</Text>
          <Text style={styles.emptySubtext}>
            Use the Log Food tab to add meals.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {MEAL_ORDER.filter((m) => groupedByMeal[m]?.length).map((meal) => (
            <View key={meal} style={styles.mealGroup}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealTitle}>
                  {meal.charAt(0).toUpperCase() + meal.slice(1)}
                </Text>
                <Text style={styles.mealCals}>
                  {groupedByMeal[meal].reduce((s, l) => s + l.calories_kcal, 0)}{" "}
                  kcal
                </Text>
              </View>
              {groupedByMeal[meal].map((log) => (
                <TouchableOpacity
                  key={log.id}
                  style={styles.logRow}
                  onLongPress={() => handleDelete(log)}
                >
                  <View style={styles.logInfo}>
                    <Text style={styles.logName}>{log.food_name}</Text>
                    <Text style={styles.logMeta}>
                      {log.quantity} {log.unit} · P {log.protein_g}g · C{" "}
                      {log.carbs_g}g · F {log.fat_g}g · Fi {log.fiber_g ?? 0}g
                      {log.source === "llm_estimate" && (
                        <Text style={styles.estimated}> ~est</Text>
                      )}
                    </Text>
                  </View>
                  <Text style={styles.logCals}>{log.calories_kcal}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function TotalPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={[styles.pillVal, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f0f0f" },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1c1c1e",
  },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 28, color: "#4ADE80", fontWeight: "300" },
  disabled: { color: "#333" },
  navDate: { fontSize: 17, fontWeight: "700", color: "#fff" },
  totalsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1c1c1e",
  },
  pill: {
    flex: 1,
    backgroundColor: "#1c1c1e",
    borderRadius: 10,
    padding: 8,
    gap: 2,
  },
  pillLabel: { fontSize: 10, color: "#666" },
  pillVal: { fontSize: 14, fontWeight: "700" },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  mealGroup: { gap: 6 },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 4,
  },
  mealTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
  },
  mealCals: { fontSize: 13, color: "#888" },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  logInfo: { flex: 1, gap: 2 },
  logName: { fontSize: 15, fontWeight: "600", color: "#fff" },
  logMeta: { fontSize: 12, color: "#888" },
  estimated: { color: "#FBBF24" },
  logCals: { fontSize: 16, fontWeight: "700", color: "#4ADE80" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 80,
  },
  emptyText: { fontSize: 17, color: "#888", fontWeight: "600" },
  emptySubtext: { fontSize: 14, color: "#555" },
});

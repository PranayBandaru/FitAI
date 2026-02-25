import { useRef, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { ResolvedFoodItem } from "../../lib/usda";
import { MealType } from "../../types";

const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
  { value: "breakfast", label: "Breakfast", emoji: "🌅" },
  { value: "lunch", label: "Lunch", emoji: "☀️" },
  { value: "dinner", label: "Dinner", emoji: "🌙" },
  { value: "snack", label: "Snack", emoji: "🍎" },
];

interface Props {
  items: ResolvedFoodItem[];
  mealType: MealType;
  onMealTypeChange: (m: MealType) => void;
  onConfirm: (items: ResolvedFoodItem[], mealType: MealType) => void;
  onCancel: () => void;
}

export default function FoodConfirmCard({
  items: initialItems,
  mealType,
  onMealTypeChange,
  onConfirm,
  onCancel,
}: Props) {
  const [items, setItems] = useState(initialItems);
  // Keep originals so quantity rescaling always uses the resolved baseline
  const baseItems = useRef(initialItems);

  // Rescale all macros from the original resolved values
  const updateQuantity = (index: number, qty: string) => {
    const parsed = parseFloat(qty);
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        // While typing (empty / partial), just update the display value
        if (isNaN(parsed) || parsed <= 0)
          return { ...item, quantity: isNaN(parsed) ? 0 : parsed };
        const base = baseItems.current[i];
        const ratio = base.quantity > 0 ? parsed / base.quantity : 1;
        return {
          ...item,
          quantity: parsed,
          calories_kcal: Math.round(base.calories_kcal * ratio),
          protein_g: parseFloat((base.protein_g * ratio).toFixed(1)),
          carbs_g: parseFloat((base.carbs_g * ratio).toFixed(1)),
          fat_g: parseFloat((base.fat_g * ratio).toFixed(1)),
          fiber_g: parseFloat((base.fiber_g * ratio).toFixed(1)),
        };
      }),
    );
  };

  // Direct macro edit — recompute kcal from macros using Atwater factors
  const updateMacro = (
    index: number,
    field: "protein_g" | "carbs_g" | "fat_g" | "fiber_g" | "calories_kcal",
    val: string,
  ) => {
    const parsed = parseFloat(val);
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: isNaN(parsed) ? 0 : parsed };
        if (field !== "calories_kcal" && field !== "fiber_g") {
          // Atwater: protein 4 kcal/g, carbs 4, fat 9 (fiber not counted)
          updated.calories_kcal = Math.round(
            updated.protein_g * 4 + updated.carbs_g * 4 + updated.fat_g * 9,
          );
        }
        return updated;
      }),
    );
  };

  const totalCals = items.reduce((s, i) => s + (i.calories_kcal || 0), 0);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Confirm Food Items</Text>

      {/* Meal type selector */}
      <View style={styles.mealRow}>
        {MEAL_TYPES.map((m) => (
          <TouchableOpacity
            key={m.value}
            style={[
              styles.mealChip,
              mealType === m.value && styles.mealChipActive,
            ]}
            onPress={() => onMealTypeChange(m.value)}
          >
            <Text style={styles.mealEmoji}>{m.emoji}</Text>
            <Text
              style={[
                styles.mealLabel,
                mealType === m.value && styles.mealLabelActive,
              ]}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView>
        {items.map((item, idx) => (
          <View key={idx} style={styles.itemBlock}>
            <View style={styles.itemHeader}>
              <Text style={styles.foodName}>{item.food_name}</Text>
              {item.source === "llm_estimate" && (
                <Text style={styles.estimated}>~ estimated</Text>
              )}
            </View>
            {/* Quantity + kcal row */}
            <View style={styles.row}>
              <Text style={styles.fieldLabel}>Qty</Text>
              <TextInput
                style={styles.macroInput}
                keyboardType="decimal-pad"
                value={String(item.quantity)}
                onChangeText={(v) => updateQuantity(idx, v)}
              />
              <Text style={styles.unit}>{item.unit}</Text>
              <Text style={styles.fieldLabel}>kcal</Text>
              <TextInput
                style={[styles.macroInput, styles.kcalInput]}
                keyboardType="decimal-pad"
                value={String(item.calories_kcal || 0)}
                onChangeText={(v) => updateMacro(idx, "calories_kcal", v)}
              />
            </View>
            {/* P / C / F / Fiber row */}
            <View style={styles.row}>
              <Text style={styles.fieldLabel}>P</Text>
              <TextInput
                style={styles.macroInput}
                keyboardType="decimal-pad"
                value={String(item.protein_g)}
                onChangeText={(v) => updateMacro(idx, "protein_g", v)}
              />
              <Text style={styles.fieldUnit}>g</Text>
              <Text style={styles.fieldLabel}>C</Text>
              <TextInput
                style={styles.macroInput}
                keyboardType="decimal-pad"
                value={String(item.carbs_g)}
                onChangeText={(v) => updateMacro(idx, "carbs_g", v)}
              />
              <Text style={styles.fieldUnit}>g</Text>
              <Text style={styles.fieldLabel}>F</Text>
              <TextInput
                style={styles.macroInput}
                keyboardType="decimal-pad"
                value={String(item.fat_g)}
                onChangeText={(v) => updateMacro(idx, "fat_g", v)}
              />
              <Text style={styles.fieldUnit}>g</Text>
              <Text style={styles.fieldLabel}>Fi</Text>
              <TextInput
                style={styles.macroInput}
                keyboardType="decimal-pad"
                value={String(item.fiber_g ?? 0)}
                onChangeText={(v) => updateMacro(idx, "fiber_g", v)}
              />
              <Text style={styles.fieldUnit}>g</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.total}>Total: {totalCals} kcal</Text>
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => onConfirm(items, mealType)}
          >
            <Text style={styles.confirmText}>Log It ✓</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    margin: 12,
    padding: 16,
    maxHeight: 480,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#fff", marginBottom: 10 },
  mealRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  mealChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#2c2c2e",
    borderWidth: 1,
    borderColor: "#3c3c3e",
    gap: 2,
  },
  mealChipActive: { backgroundColor: "#1a2e1a", borderColor: "#4ADE80" },
  mealEmoji: { fontSize: 14 },
  mealLabel: { fontSize: 10, color: "#888", fontWeight: "600" },
  mealLabelActive: { color: "#4ADE80" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  itemBlock: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2c2c2e",
    gap: 6,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  foodName: { fontSize: 14, fontWeight: "600", color: "#fff", flex: 1 },
  estimated: { fontSize: 10, color: "#FBBF24" },
  fieldLabel: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
    width: 14,
    textAlign: "right",
  },
  fieldUnit: { fontSize: 11, color: "#666" },
  macroInput: {
    backgroundColor: "#2c2c2e",
    borderRadius: 7,
    padding: 5,
    width: 52,
    color: "#fff",
    textAlign: "center",
    fontSize: 13,
  },
  kcalInput: { width: 58, color: "#4ADE80" },
  unit: { fontSize: 11, color: "#666" },
  footer: { marginTop: 12, gap: 10 },
  total: { fontSize: 16, fontWeight: "700", color: "#fff", textAlign: "right" },
  btnRow: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#2c2c2e",
    alignItems: "center",
  },
  cancelText: { color: "#888", fontWeight: "600" },
  confirmBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#4ADE80",
    alignItems: "center",
  },
  confirmText: { color: "#0f0f0f", fontWeight: "700" },
});

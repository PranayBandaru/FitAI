import { StyleSheet, Text, View } from "react-native";

interface Props {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  protein_goal_g?: number;
}

function Bar({
  label,
  value,
  max,
  color,
  subtitle,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  subtitle?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.trackCol}>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${pct}%` as any, backgroundColor: color },
            ]}
          />
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.value}>{Math.round(value)}g</Text>
    </View>
  );
}

export default function MacroBar({
  protein_g,
  carbs_g,
  fat_g,
  fiber_g,
  protein_goal_g,
}: Props) {
  const macroTotal = carbs_g + fat_g || 1;
  const proteinMax =
    protein_goal_g && protein_goal_g > 0
      ? protein_goal_g
      : protein_g + macroTotal || 1;
  const proteinSubtitle = protein_goal_g
    ? `${Math.round(protein_g)} / ${Math.round(protein_goal_g)} g goal`
    : undefined;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Macros</Text>
      <Bar
        label="Protein"
        value={protein_g}
        max={proteinMax}
        color="#4ADE80"
        subtitle={proteinSubtitle}
      />
      <Bar label="Carbs" value={carbs_g} max={macroTotal} color="#FBBF24" />
      <Bar label="Fat" value={fat_g} max={macroTotal} color="#F87171" />
      <Bar label="Fiber" value={fiber_g} max={macroTotal} color="#A78BFA" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  title: { fontSize: 15, fontWeight: "700", color: "#fff", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { width: 52, fontSize: 13, color: "#888" },
  trackCol: { flex: 1, gap: 2 },
  track: {
    height: 8,
    backgroundColor: "#2c2c2e",
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 4 },
  subtitle: { fontSize: 10, color: "#666" },
  value: { width: 44, fontSize: 13, color: "#fff", textAlign: "right" },
});

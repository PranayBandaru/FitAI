import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface Props {
  intake: number;
  expenditure: number;
  size?: number;
}

export default function EnergyRing({ intake, expenditure, size = 160 }: Props) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = expenditure > 0 ? Math.min(intake / expenditure, 1) : 0;
  const strokeDashoffset = circumference * (1 - ratio);
  const deficit = expenditure - intake;
  const isDeficit = deficit >= 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1c1c1e"
          strokeWidth={12}
          fill="none"
        />
        {/* Progress ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDeficit ? "#4ADE80" : "#FF6B6B"}
          strokeWidth={12}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text
          style={[
            styles.deficitValue,
            { color: isDeficit ? "#4ADE80" : "#FF6B6B" },
          ]}
        >
          {Math.abs(deficit)}
        </Text>
        <Text style={styles.deficitLabel}>
          kcal {isDeficit ? "deficit" : "surplus"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  deficitValue: { fontSize: 24, fontWeight: "800" },
  deficitLabel: { fontSize: 12, color: "#888", marginTop: 2 },
});

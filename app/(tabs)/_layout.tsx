import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Redirect, Tabs } from "expo-router";
import { useAuthStore } from "../../stores/authStore";

function TabIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const profileLoaded = useAuthStore((s) => s.profileLoaded);

  if (!session) return <Redirect href="/(auth)/login" />;
  if (profileLoaded && !profile) return <Redirect href="/(auth)/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#4ADE80",
        tabBarInactiveTintColor: "#666",
        tabBarStyle: {
          backgroundColor: "#0f0f0f",
          borderTopColor: "#1c1c1e",
        },
        headerStyle: { backgroundColor: "#0f0f0f" },
        headerTintColor: "#fff",
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Log Food",
          tabBarIcon: ({ color }) => <TabIcon name="comments" color={color} />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: "Goals",
          tabBarIcon: ({ color }) => <TabIcon name="bullseye" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} />,
        }}
      />
    </Tabs>
  );
}

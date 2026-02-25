import { Redirect, Stack, usePathname } from "expo-router";
import { useAuthStore } from "../../stores/authStore";

export default function AuthLayout() {
  const session = useAuthStore((s) => s.session);
  const pathname = usePathname();
  // Allow logged-in users to access onboarding (e.g. to edit profile)
  if (session && pathname !== "/onboarding") return <Redirect href="/(tabs)" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}

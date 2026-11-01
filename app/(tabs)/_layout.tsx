import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, FONT } from "@/components/ui/tetap-ui";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: C.accent,
      tabBarInactiveTintColor: "#8193A7",
      tabBarLabelStyle: { fontFamily: FONT.semi, fontSize: 10, marginTop: -2 },
      tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.border, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 7, paddingBottom: bottomPadding, height: 56 + bottomPadding },
      tabBarIcon: ({ color, size }) => {
        const icon = route.name === "index" ? "sun" : route.name === "family" ? "heart" : route.name === "community" ? "users" : route.name === "savings" ? "target" : "activity";
        return <Feather name={icon} color={color} size={size - 2} />;
      },
    })}>
      <Tabs.Screen name="index" options={{ title: "Hari ini" }} />
      <Tabs.Screen name="family" options={{ title: "Keluarga" }} />
      <Tabs.Screen name="progress" options={{ title: "Progres" }} />
      <Tabs.Screen name="savings" options={{ title: "Target" }} />
      <Tabs.Screen name="community" options={{ title: "Komunitas" }} />
    </Tabs>
  );
}

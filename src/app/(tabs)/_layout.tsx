import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { LogSheet } from '@/features/logging/LogSheet';
import { useUiStore } from '@/state/useUiStore';
import { accentGlowShadow, colors, font } from '@/theme';

/** The raised teal "+" in the middle of the tab bar — opens the log sheet. */
function LogTabButton() {
  const setLogSheetOpen = useUiStore((s) => s.setLogSheetOpen);
  return (
    <View style={styles.logSlot} pointerEvents="box-none">
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setLogSheetOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Log a smoke or vape"
        style={({ pressed }) => [styles.logButton, pressed && { transform: [{ scale: 0.94 }] }]}
      >
        <Ionicons name="add" size={30} color={colors.onAccent} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const logSheetOpen = useUiStore((s) => s.logSheetOpen);
  const setLogSheetOpen = useUiStore((s) => s.setLogSheetOpen);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.bg,
            borderTopColor: colors.hairline,
            height: 62,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontFamily: font.medium, fontSize: 10 },
          sceneStyle: { backgroundColor: colors.bg },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="log"
          options={{
            title: '',
            tabBarButton: () => <LogTabButton />,
          }}
        />
        <Tabs.Screen
          name="sos"
          options={{
            title: 'SOS',
            tabBarActiveTintColor: colors.amber,
            tabBarInactiveTintColor: 'rgba(245,166,35,0.55)',
            tabBarIcon: ({ color, size }) => <Ionicons name="flame" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="room"
          options={{
            title: 'Room',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="heart-circle-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ranks"
          options={{
            title: 'Ranks',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trophy-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      <LogSheet visible={logSheetOpen} onClose={() => setLogSheetOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  logSlot: {
    flex: 1,
    alignItems: 'center',
  },
  logButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginTop: -14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...accentGlowShadow,
  },
});

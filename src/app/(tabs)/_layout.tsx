import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { LogSheet } from '@/features/logging/LogSheet';
import { useAuthStore } from '@/state/useAuthStore';
import { useUiStore } from '@/state/useUiStore';
import { accentGlowShadow, colors, font } from '@/theme';

/**
 * The teal "+" in the middle of the tab bar — opens the log sheet.
 * The WHOLE slot is the hit target (a protruding circle loses the touches
 * that land outside its parent's bounds on Android).
 */
function LogTabButton() {
  const setLogSheetOpen = useUiStore((s) => s.setLogSheetOpen);
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setLogSheetOpen(true);
      }}
      accessibilityRole="button"
      accessibilityLabel="Log a smoke or vape"
      style={styles.logSlot}
    >
      {({ pressed }) => (
        <View style={[styles.logButton, pressed && { transform: [{ scale: 0.94 }] }]}>
          <Ionicons name="add" size={28} color={colors.onAccent} />
        </View>
      )}
    </Pressable>
  );
}

export default function TabsLayout() {
  const logSheetOpen = useUiStore((s) => s.logSheetOpen);
  const setLogSheetOpen = useUiStore((s) => s.setLogSheetOpen);
  const isPremium = useAuthStore((s) => s.isPremium);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          // No fixed height — React Navigation adds the system navigation
          // bar inset itself (edge-to-edge Android needs this).
          tabBarStyle: {
            backgroundColor: colors.bg,
            borderTopColor: colors.hairline,
            paddingTop: 4,
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
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={isPremium ? 'flame' : 'lock-closed'} size={size} color={color} />
            ),
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
    justifyContent: 'center',
  },
  logButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...accentGlowShadow,
  },
});

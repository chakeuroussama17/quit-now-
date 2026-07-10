import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { LogSheet } from '@/features/logging/LogSheet';
import { useT } from '@/i18n';
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
  const t = useT();
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
          // Six tabs plus the "+" leaves ~50dp per slot on a 360dp phone.
          // Shrink the label and drop the item padding so nothing truncates,
          // and refuse system font scaling here — it has nowhere to grow.
          tabBarLabelStyle: { fontFamily: font.medium, fontSize: 9 },
          tabBarItemStyle: { paddingHorizontal: 0 },
          tabBarAllowFontScaling: false,
          sceneStyle: { backgroundColor: colors.bg },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.home'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: t('tabs.stats'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ranks"
          options={{
            title: t('tabs.ranks'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trophy-outline" size={size} color={color} />
            ),
          }}
        />
        {/* Centre slot: three tabs each side. Everything left of the "+" is
            your own data; everything right of it is somewhere to turn. */}
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
            title: t('tabs.sos'),
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
            title: t('tabs.room'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name={isPremium ? 'heart-circle-outline' : 'lock-closed-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: t('tabs.community'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
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

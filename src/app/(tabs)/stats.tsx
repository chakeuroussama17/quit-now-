import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/theme';

export default function StatsScreen() {
  return (
    <Screen>
      <View style={styles.empty}>
        <View style={styles.iconWrap}>
          <Ionicons name="pulse-outline" size={32} color={colors.accent} />
        </View>
        <AppText variant="h2" style={styles.title}>
          Your patterns will show here
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.body}>
          Trends, your trigger heatmap and craving win-rate arrive in Phase 2. Keep logging — the
          data is already being collected.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { textAlign: 'center' },
  body: { textAlign: 'center', marginTop: spacing.sm },
});

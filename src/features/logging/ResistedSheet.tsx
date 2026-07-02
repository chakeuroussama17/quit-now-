import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { IntensityPicker } from '@/components/ui/IntensityPicker';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useLogsStore } from '@/state/useLogsStore';
import { colors, durations, spacing } from '@/theme';

import { randomResistedLine } from './copy';

interface ResistedSheetProps {
  visible: boolean;
  onClose: () => void;
}

/** Logging a victory — deliberately more celebrated than a smoke log. */
export function ResistedSheet({ visible, onClose }: ResistedSheetProps) {
  const logResistedCraving = useLogsStore((s) => s.logResistedCraving);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);

  const close = () => {
    onClose();
    setTimeout(() => {
      setIntensity(null);
      setCelebration(null);
    }, durations.slow);
  };

  const logWin = async () => {
    await logResistedCraving(intensity);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCelebration(randomResistedLine());
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      {celebration == null ? (
        <View>
          <AppText variant="h2">You beat a craving.</AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
            How strong was it? (optional)
          </AppText>
          <View style={styles.picker}>
            <IntensityPicker value={intensity} onChange={setIntensity} />
          </View>
          <PrimaryButton label="Log the win" onPress={logWin} />
        </View>
      ) : (
        <Animated.View entering={FadeInDown.duration(durations.base)}>
          <AppText variant="micro" color={colors.accent}>
            Craving resisted
          </AppText>
          <AppText variant="title" style={styles.celebration}>
            {celebration}
          </AppText>
          <PrimaryButton label="Done" onPress={close} />
        </Animated.View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.xs },
  picker: { marginVertical: spacing.lg },
  celebration: { marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 26 },
});

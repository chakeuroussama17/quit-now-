import { useEffect, useState, type PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, durations, radii, spacing } from '@/theme';

interface BottomSheetProps extends PropsWithChildren {
  visible: boolean;
  onClose: () => void;
}

/**
 * Minimal dark bottom sheet (Modal + reanimated slide). Content taller than
 * ~85% of the screen scrolls inside the sheet instead of crawling up behind
 * the status bar.
 */
export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  // Keep the Modal mounted briefly after close so the exit animation can play.
  const [rendered, setRendered] = useState(visible);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  // Derived-state adjustment during render (the "you might not need an effect" pattern).
  if (visible && !rendered) setRendered(true);

  useEffect(() => {
    if (visible) return;
    const t = setTimeout(() => setRendered(false), durations.base + 40);
    return () => clearTimeout(t);
  }, [visible]);

  if (!rendered) return null;

  return (
    <Modal transparent statusBarTranslucent visible onRequestClose={onClose} animationType="none">
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        {visible && (
          <Animated.View
            entering={FadeIn.duration(durations.fast)}
            exiting={FadeOut.duration(durations.fast)}
            style={styles.backdrop}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={onClose}
              accessibilityLabel="Close"
            />
          </Animated.View>
        )}
        {visible && (
          <Animated.View
            entering={SlideInDown.duration(durations.slow)}
            exiting={SlideOutDown.duration(durations.base)}
            style={[
              styles.sheet,
              {
                paddingBottom: insets.bottom + spacing.lg,
                maxHeight: windowHeight * 0.85,
              },
            ]}
          >
            <View style={styles.handle} />
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: spacing.lg,
  },
});

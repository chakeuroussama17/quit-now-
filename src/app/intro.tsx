import { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { useT } from '@/i18n';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors, spacing } from '@/theme';

interface Slide {
  image: ImageSourcePropType;
  title: string;
  body: string;
}

// Replace assets/images/intro-{1,2,3}.png with real artwork (same filenames).
const IMAGES = [
  require('../../assets/images/intro-1.png'),
  require('../../assets/images/intro-2.png'),
  require('../../assets/images/intro-3.png'),
];

export default function IntroScreen() {
  const t = useT();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const setSetting = useSettingsStore((s) => s.set);

  const SLIDES: Slide[] = [
    { image: IMAGES[0], title: t('intro.1.title'), body: t('intro.1.body') },
    { image: IMAGES[1], title: t('intro.2.title'), body: t('intro.2.body') },
    { image: IMAGES[2], title: t('intro.3.title'), body: t('intro.3.body') },
  ];
  const isLast = index === SLIDES.length - 1;

  const finish = () => setSetting('intro_seen', 'true'); // guard flips → /auth

  const next = () => {
    if (isLast) {
      finish();
      return;
    }
    // Advance the index ourselves: react-native-web doesn't fire
    // onMomentumScrollEnd after a programmatic scrollToIndex, so relying on it
    // alone leaves the button stuck on the first slide.
    const target = index + 1;
    setIndex(target);
    listRef.current?.scrollToIndex({ index: target, animated: true });
  };

  return (
    <Screen edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.skipRow}>
        <Pressable onPress={finish} accessibilityRole="button" hitSlop={12}>
          <AppText variant="bodyMedium" color={colors.textMuted}>
            {t('common.skip')}
          </AppText>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Image source={item.image} style={styles.image} resizeMode="contain" />
            <AppText variant="h1" style={styles.title}>
              {item.title}
            </AppText>
            <AppText variant="body" color={colors.textSecondary} style={styles.body}>
              {item.body}
            </AppText>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <PrimaryButton label={isLast ? t('common.getStarted') : t('common.next')} onPress={next} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  // Fills the free vertical space; portrait or square art both letterbox cleanly.
  image: { flex: 1, width: '100%', marginBottom: spacing.lg },
  title: { textAlign: 'center', marginBottom: spacing.md },
  body: { textAlign: 'center', lineHeight: 24 },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dotActive: { backgroundColor: colors.accent, width: 22 },
});

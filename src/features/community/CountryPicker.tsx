import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useT } from '@/i18n';
import { colors, radii, spacing } from '@/theme';

import { flagEmoji, GLOBAL_ROOM, searchCountries } from './countries';

interface CountryPickerProps {
  visible: boolean;
  selected: string;
  onSelect: (roomCode: string) => void;
  onClose: () => void;
}

function Row({
  code,
  name,
  selected,
  onPress,
}: {
  code: string;
  name: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.cardPressed }]}
    >
      <AppText variant="body" style={styles.flag}>
        {flagEmoji(code)}
      </AppText>
      <AppText variant="body" style={styles.name} numberOfLines={1}>
        {name}
      </AppText>
      {selected && <Ionicons name="checkmark" size={18} color={colors.accent} />}
    </Pressable>
  );
}

/**
 * Room switcher. Every room is open to everyone — picking "France" is a
 * choice of who you want to talk to, not a claim about where you live.
 */
export function CountryPicker({ visible, selected, onSelect, onClose }: CountryPickerProps) {
  const t = useT();
  const [query, setQuery] = useState('');
  const results = searchCountries(query);

  const choose = (code: string) => {
    setQuery('');
    onSelect(code);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText variant="h2">{t('community.chooseRoom')}</AppText>
      <AppText variant="caption" color={colors.textMuted} style={styles.subtitle}>
        {t('community.chooseRoomHint')}
      </AppText>

      <AppTextInput
        placeholder={t('community.searchCountry')}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        style={styles.search}
      />

      {!query && (
        <Row
          code={GLOBAL_ROOM}
          name={t('community.worldwide')}
          selected={selected === GLOBAL_ROOM}
          onPress={() => choose(GLOBAL_ROOM)}
        />
      )}

      {results.map((country) => (
        <Row
          key={country.code}
          code={country.code}
          name={country.name}
          selected={selected === country.code}
          onPress={() => choose(country.code)}
        />
      ))}

      {results.length === 0 && (
        <View style={styles.empty}>
          <AppText variant="caption" color={colors.textMuted}>
            {t('community.noCountry')}
          </AppText>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.xs },
  search: { marginTop: spacing.lg, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
  flag: { fontSize: 22 },
  name: { flex: 1 },
  empty: { paddingVertical: spacing.xl, alignItems: 'center' },
});

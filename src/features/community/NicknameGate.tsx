import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useT } from '@/i18n';
import { colors, radii, spacing } from '@/theme';

import { claimNickname, isValidNickname } from './communityService';

interface NicknameGateProps {
  avatarUrl: string | null;
  onJoined: (nickname: string) => void;
}

function Rule({ text }: { text: string }) {
  return (
    <View style={styles.rule}>
      <Ionicons name="ellipse" size={4} color={colors.textMuted} style={styles.bullet} />
      <AppText variant="caption" color={colors.textSecondary} style={styles.ruleText}>
        {text}
      </AppText>
    </View>
  );
}

/**
 * Shown once, before a user can post. Two jobs: pick a public handle that is
 * NOT the real name from onboarding, and see the house rules — Google Play
 * requires users to accept content terms before they can post.
 */
export function NicknameGate({ avatarUrl, onJoined }: NicknameGateProps) {
  const t = useT();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    const candidate = name.trim();
    if (!isValidNickname(candidate)) {
      setError(t('community.nameInvalid'));
      return;
    }
    setBusy(true);
    setError(null);
    const result = await claimNickname(candidate, avatarUrl);
    setBusy(false);
    if (result.ok) {
      onJoined(candidate);
      return;
    }
    setError(result.reason === 'taken' ? t('community.nameTaken') : t('community.joinFailed'));
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <Ionicons name="people-outline" size={26} color={colors.accent} />
        </View>
        <AppText variant="h1" style={styles.title}>
          {t('community.gateTitle')}
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
          {t('community.gateSubtitle')}
        </AppText>
      </View>

      <AppTextInput
        placeholder={t('community.namePlaceholder')}
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (error) setError(null);
        }}
        onSubmitEditing={join}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        returnKeyType="go"
        accessibilityLabel={t('community.namePlaceholder')}
      />
      <AppText variant="caption" color={error ? colors.danger : colors.textMuted} style={styles.hint}>
        {error ?? t('community.nameHint')}
      </AppText>

      <View style={styles.rules}>
        <AppText variant="micro" color={colors.textMuted}>
          {t('community.rulesTitle')}
        </AppText>
        <Rule text={t('community.rule1')} />
        <Rule text={t('community.rule2')} />
        <Rule text={t('community.rule3')} />
      </View>

      <PrimaryButton
        label={t('community.join')}
        onPress={join}
        loading={busy}
        disabled={name.trim().length < 3}
      />
      <AppText variant="caption" color={colors.textMuted} style={styles.consent}>
        {t('community.consent')}
      </AppText>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', gap: spacing.sm, paddingBottom: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', lineHeight: 22 },
  hint: { marginTop: spacing.sm, marginBottom: spacing.lg },
  rules: {
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bullet: { marginTop: 7 },
  ruleText: { flex: 1, lineHeight: 19 },
  consent: { textAlign: 'center', marginTop: spacing.md, lineHeight: 18 },
});

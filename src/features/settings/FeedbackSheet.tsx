import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Chip } from '@/components/ui/Chip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useT, type TKey } from '@/i18n';
import {
  FEEDBACK_CATEGORIES,
  MAX_FEEDBACK_LENGTH,
  submitFeedback,
  type FeedbackCategory,
} from '@/services/feedbackService';
import { colors, radii, spacing } from '@/theme';

interface FeedbackSheetProps {
  visible: boolean;
  onClose: () => void;
}

/** Bug, idea, complaint or other — a category makes a pile of reports triageable. */
export function FeedbackSheet({ visible, onClose }: FeedbackSheetProps) {
  const t = useT();
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  const close = () => {
    onClose();
    // Reset only after the sheet has slid away.
    setTimeout(() => {
      setMessage('');
      setCategory('bug');
      setSent(false);
      setFailed(false);
    }, 300);
  };

  const send = async () => {
    if (!message.trim() || busy) return;
    setBusy(true);
    setFailed(false);
    const { ok } = await submitFeedback(category, message);
    setBusy(false);
    if (ok) setSent(true);
    else setFailed(true);
  };

  if (sent) {
    return (
      <BottomSheet visible={visible} onClose={close}>
        <View style={styles.thanks}>
          <AppText variant="h2">{t('feedback.thanks')}</AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.thanksBody}>
            {t('feedback.thanksBody')}
          </AppText>
          <PrimaryButton label={t('common.done')} onPress={close} />
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet visible={visible} onClose={close}>
      <AppText variant="h2">{t('feedback.heading')}</AppText>

      <View style={styles.chips}>
        {FEEDBACK_CATEGORIES.map((value) => (
          <Chip
            key={value}
            label={t(`feedback.cat.${value}` as TKey)}
            selected={category === value}
            size="sm"
            onPress={() => setCategory(value)}
          />
        ))}
      </View>

      <AppTextInput
        placeholder={t('feedback.placeholder')}
        value={message}
        onChangeText={(text) => {
          setMessage(text);
          if (failed) setFailed(false);
        }}
        multiline
        maxLength={MAX_FEEDBACK_LENGTH}
        style={styles.input}
        accessibilityLabel={t('feedback.placeholder')}
      />
      <AppText variant="caption" color={colors.textMuted} style={styles.counter}>
        {message.length}/{MAX_FEEDBACK_LENGTH}
      </AppText>

      <AppText variant="caption" color={colors.textMuted} style={styles.attach}>
        {t('feedback.attach')}
      </AppText>

      {failed && (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {t('feedback.failed')}
        </AppText>
      )}

      <PrimaryButton
        label={t('feedback.send')}
        onPress={send}
        loading={busy}
        disabled={message.trim().length === 0}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.lg },
  input: { minHeight: 130, borderRadius: radii.md, textAlignVertical: 'top', paddingTop: spacing.md },
  counter: { alignSelf: 'flex-end', marginTop: spacing.xs },
  attach: { marginTop: spacing.md, marginBottom: spacing.lg, lineHeight: 18 },
  error: { marginBottom: spacing.md },
  thanks: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  thanksBody: { textAlign: 'center', marginBottom: spacing.lg },
});

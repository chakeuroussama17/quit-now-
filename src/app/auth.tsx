import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { useT } from '@/i18n';
import { landingRoute, useAuthStore } from '@/state/useAuthStore';
import { colors, radii, spacing } from '@/theme';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const t = useT();
  const router = useRouter();
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  // A deep-link sign-in that failed dumps the user back here. Say why.
  const authError = useAuthStore((s) => s.authError);
  const clearAuthError = useAuthStore((s) => s.clearAuthError);

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const banner = message ?? (authError ? { text: authError, error: true } : null);

  const google = async () => {
    setBusy(true);
    setMessage(null);
    clearAuthError();
    const { error } = await signInWithGoogle();
    setBusy(false);
    if (error) {
      setMessage({ text: error, error: true });
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Explicit navigation — never leave the router hanging between guards.
    router.replace(landingRoute());
  };

  const submitEmail = async () => {
    if (!email.trim() || password.length < 6) {
      setMessage({ text: t('auth.invalid'), error: true });
      return;
    }
    setBusy(true);
    setMessage(null);
    clearAuthError();
    if (mode === 'login') {
      const { error } = await signInWithEmail(email.trim(), password);
      setBusy(false);
      if (error) {
        setMessage({ text: error, error: true });
        return;
      }
      router.replace(landingRoute());
    } else {
      const { error, needsConfirmation } = await signUpWithEmail(email.trim(), password);
      setBusy(false);
      if (error) {
        setMessage({ text: error, error: true });
        return;
      }
      if (needsConfirmation) {
        setMessage({ text: t('auth.confirmEmail'), error: false });
        return;
      }
      router.replace(landingRoute());
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Image source={require('../../assets/images/splash-icon.png')} style={styles.logo} />
          <AppText variant="h1" style={styles.title}>
            {mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
            {t('auth.subtitle')}
          </AppText>

          <Pressable
            onPress={google}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.googleButton, (pressed || busy) && { opacity: 0.8 }]}
          >
            <Ionicons name="logo-google" size={19} color={colors.text} />
            <AppText variant="title">{t('auth.google')}</AppText>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <AppText variant="caption" color={colors.textMuted}>
              {t('auth.orEmail')}
            </AppText>
            <View style={styles.divider} />
          </View>

          <AppTextInput
            placeholder={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={styles.field}
            accessibilityLabel="Email"
          />
          <AppTextInput
            placeholder={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'login' ? 'password' : 'new-password'}
            style={styles.field}
            accessibilityLabel="Password"
          />

          {banner && (
            <AppText
              variant="caption"
              color={banner.error ? colors.danger : colors.accent}
              style={styles.message}
            >
              {banner.text}
            </AppText>
          )}

          <PrimaryButton
            label={mode === 'login' ? t('auth.login') : t('auth.register')}
            onPress={submitEmail}
            loading={busy}
          />

          <Pressable
            onPress={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setMessage(null);
            }}
            accessibilityRole="button"
            style={styles.switchMode}
          >
            <AppText variant="body" color={colors.textSecondary}>
              {mode === 'login' ? t('auth.newHere') : t('auth.haveAccount')}
              <AppText variant="bodyMedium" color={colors.accent}>
                {mode === 'login' ? t('auth.createLink') : t('auth.loginLink')}
              </AppText>
            </AppText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingBottom: spacing.xl },
  logo: { width: 72, height: 72, alignSelf: 'center', marginBottom: spacing.lg },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    minHeight: 52,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  divider: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline },
  field: { marginBottom: spacing.md },
  message: { marginBottom: spacing.md, lineHeight: 18 },
  switchMode: { alignItems: 'center', marginTop: spacing.lg, padding: spacing.sm },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { landingRoute, useAuthStore } from '@/state/useAuthStore';
import { colors, radii, spacing } from '@/theme';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const router = useRouter();
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const google = async () => {
    setBusy(true);
    setMessage(null);
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
      setMessage({
        text: 'Enter your email and a password of at least 6 characters.',
        error: true,
      });
      return;
    }
    setBusy(true);
    setMessage(null);
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
        setMessage({
          text: 'Check your email to confirm your account, then log in here.',
          error: false,
        });
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
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
            Your quit journey, synced to you. Logs stay private on your device.
          </AppText>

          <Pressable
            onPress={google}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.googleButton, (pressed || busy) && { opacity: 0.8 }]}
          >
            <Ionicons name="logo-google" size={19} color={colors.text} />
            <AppText variant="title">Continue with Google</AppText>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <AppText variant="caption" color={colors.textMuted}>
              or with email
            </AppText>
            <View style={styles.divider} />
          </View>

          <AppTextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={styles.field}
            accessibilityLabel="Email"
          />
          <AppTextInput
            placeholder="Password (min 6 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'login' ? 'password' : 'new-password'}
            style={styles.field}
            accessibilityLabel="Password"
          />

          {message && (
            <AppText
              variant="caption"
              color={message.error ? colors.danger : colors.accent}
              style={styles.message}
            >
              {message.text}
            </AppText>
          )}

          <PrimaryButton
            label={mode === 'login' ? 'Log in' : 'Register'}
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
              {mode === 'login' ? 'New here? ' : 'Already have an account? '}
              <AppText variant="bodyMedium" color={colors.accent}>
                {mode === 'login' ? 'Create an account' : 'Log in'}
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

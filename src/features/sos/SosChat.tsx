import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { getLang, t as tStatic, useT } from '@/i18n';
import { aiConfigured } from '@/services/aiClient';
import { sosChatReply } from '@/services/aiService';
import { randomFallbackSos } from '@/services/fallbacks';
import { colors, durations, radii, spacing } from '@/theme';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <Animated.View
      entering={FadeInDown.duration(durations.fast)}
      style={[styles.bubble, isUser ? styles.userBubble : styles.coachBubble]}
    >
      <AppText variant="body" color={isUser ? colors.onAccent : colors.text}>
        {message.content}
      </AppText>
    </Animated.View>
  );
}

/** Craving SOS chat — real-time coaching through the wave. Session is ephemeral. */
export function SosChat() {
  const t = useT();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: tStatic('soschat.greeting') },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const quickReplies = [t('soschat.q1'), t('soschat.q2'), t('soschat.q3'), t('soschat.q4')];

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    Haptics.selectionAsync();
    const withUser: Message[] = [...messages, { role: 'user', content }];
    setMessages(withUser);
    setInput('');
    setBusy(true);
    try {
      const reply = aiConfigured() ? await sosChatReply(withUser) : randomFallbackSos(getLang());
      setMessages([...withUser, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...withUser, { role: 'assistant', content: randomFallbackSos(getLang()) }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Close chat"
          style={styles.closeButton}
        >
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.headerText}>
          <AppText variant="title">{t('soschat.title')}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {t('soschat.disclaimer')}
          </AppText>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        // 'padding' on BOTH platforms: edge-to-edge Android doesn't resize
        // the window for the keyboard, so the input must move itself.
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m, i) => (
            <Bubble key={i} message={m} />
          ))}
          {busy && (
            <View style={[styles.bubble, styles.coachBubble]}>
              <AppText variant="body" color={colors.textMuted}>
                …
              </AppText>
            </View>
          )}
        </ScrollView>

        <View style={styles.quickRow}>
          {quickReplies.map((q) => (
            <Chip key={q} label={q} size="sm" onPress={() => send(q)} disabled={busy} />
          ))}
        </View>

        <View style={styles.inputRow}>
          <AppTextInput
            placeholder={t('soschat.placeholder')}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
            style={styles.input}
            accessibilityLabel="Message to coach"
          />
          <Pressable
            onPress={() => send(input)}
            disabled={busy || input.trim().length === 0}
            accessibilityLabel="Send"
            style={({ pressed }) => [
              styles.sendButton,
              (busy || input.trim().length === 0) && styles.sendDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="arrow-up" size={20} color={colors.onAccent} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  closeButton: { padding: spacing.xs },
  headerText: { gap: 1 },
  messages: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },
  bubble: {
    maxWidth: '84%',
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    borderBottomRightRadius: 6,
  },
  coachBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    borderBottomLeftRadius: 6,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  input: { flex: 1 },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
});

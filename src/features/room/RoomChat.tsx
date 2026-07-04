import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import {
  appendRoomMessage,
  getOrCreateActiveSession,
  getSessionMessages,
  type RoomMessage,
} from '@/db/roomRepo';
import { useT } from '@/i18n';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors, durations, radii, spacing } from '@/theme';

import { mindReply } from './roomService';

/**
 * The Room (mockup 3): a private, judgment-free space with "Mind".
 * Deliberately outside the game — no stats, no XP, warmer tone, more air.
 * Conversations persist locally in room_sessions / room_messages and never
 * appear anywhere else in the app.
 */

interface UiMessage {
  role: 'user' | 'assistant';
  content: string;
}

function Bubble({ message }: { message: UiMessage }) {
  const isUser = message.role === 'user';
  return (
    <Animated.View
      entering={FadeInDown.duration(durations.fast)}
      style={[styles.bubble, isUser ? styles.userBubble : styles.mindBubble]}
    >
      <AppText
        variant="body"
        color={isUser ? colors.accent : colors.text}
        style={styles.bubbleText}
      >
        {message.content}
      </AppText>
    </Animated.View>
  );
}

export function RoomChat() {
  const t = useT();
  const scrollRef = useRef<ScrollView>(null);
  const disclaimerSeen = useSettingsStore((s) => s.values['room_disclaimer_seen'] === 'true');
  const setSetting = useSettingsStore((s) => s.set);
  const starters = [t('room.s1'), t('room.s2'), t('room.s3'), t('room.s4')];

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = await getOrCreateActiveSession();
      const stored = await getSessionMessages(id);
      if (cancelled) return;
      setSessionId(id);
      setMessages(stored.map((m: RoomMessage) => ({ role: m.role, content: m.content })));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy || sessionId == null) return;
    Haptics.selectionAsync();
    const withUser: UiMessage[] = [...messages, { role: 'user', content }];
    setMessages(withUser);
    setInput('');
    setBusy(true);
    try {
      await appendRoomMessage(sessionId, 'user', content);
      const reply = await mindReply(withUser);
      await appendRoomMessage(sessionId, 'assistant', reply);
      setMessages([...withUser, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...withUser, { role: 'assistant', content: t('room.offline') }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <View>
          <AppText variant="h2">{t('room.title')}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {t('room.subtitle')}
          </AppText>
        </View>
        <View style={styles.presenceDot} />
      </View>

      {/* 'padding' on BOTH platforms: edge-to-edge Android doesn't resize
          the window for the keyboard, so the input must move itself. */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {!disclaimerSeen && (
            <View style={styles.disclaimer}>
              <AppText variant="caption" color={colors.textSecondary} style={styles.disclaimerText}>
                {t('room.disclaimer')}
              </AppText>
              <Pressable
                onPress={() => setSetting('room_disclaimer_seen', 'true')}
                accessibilityRole="button"
              >
                <AppText variant="caption" color={colors.accent}>
                  {t('room.understood')}
                </AppText>
              </Pressable>
            </View>
          )}

          {messages.length === 0 && (
            <View style={styles.starters}>
              <AppText variant="caption" color={colors.textMuted}>
                {t('room.startWith')}
              </AppText>
              {starters.map((s) => (
                <Chip key={s} label={s} onPress={() => send(s)} disabled={busy} />
              ))}
            </View>
          )}

          {messages.map((m, i) => (
            <Bubble key={i} message={m} />
          ))}
          {busy && (
            <View style={[styles.bubble, styles.mindBubble]}>
              <AppText variant="body" color={colors.textMuted}>
                …
              </AppText>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <AppTextInput
            placeholder={t('room.placeholder')}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
            style={styles.input}
            accessibilityLabel="Message to Mind"
          />
          <Pressable
            onPress={() => send(input)}
            disabled={busy || input.trim().length === 0}
            accessibilityLabel="Send"
            style={({ pressed }) => [
              styles.sendButton,
              (busy || input.trim().length === 0) && { opacity: 0.4 },
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
  // Slightly warmer dark than the rest of the app — this space is different.
  screen: { backgroundColor: '#0D0C0B' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  presenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  messages: { paddingVertical: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  disclaimer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  disclaimerText: { lineHeight: 19 },
  starters: { gap: spacing.sm, alignItems: 'flex-start' },
  bubble: {
    maxWidth: '86%',
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(74,222,181,0.35)',
    borderBottomRightRadius: 6,
  },
  mindBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#161412',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    borderBottomLeftRadius: 6,
  },
  // The Room breathes more than the rest of the app.
  bubbleText: { lineHeight: 24 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  input: { flex: 1, borderRadius: radii.pill },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

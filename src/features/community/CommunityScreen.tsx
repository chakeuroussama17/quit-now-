import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Screen } from '@/components/ui/Screen';
import { useT, type TFunction } from '@/i18n';
import { useAuthStore } from '@/state/useAuthStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors, radii, spacing } from '@/theme';

import {
  blockUser,
  deleteMessage,
  fetchBlockedIds,
  fetchMessages,
  fetchMyNickname,
  MAX_MESSAGE_LENGTH,
  reportMessage,
  sendMessage,
  subscribeToRoom,
  type CommunityMessage,
} from './communityService';
import { countryName, flagEmoji, GLOBAL_ROOM, isValidRoom } from './countries';
import { CountryPicker } from './CountryPicker';
import { NicknameGate } from './NicknameGate';

const ROOM_KEY = 'community_room';
const NAME_KEY = 'community_name';

/** "15m", "3h", "2d" — the transcript needs age, not a timestamp. */
function timeAgo(iso: string, t: TFunction): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return t('community.now');
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function Avatar({ uri, name }: { uri: string | null; name: string }) {
  if (uri) return <Image source={{ uri }} style={styles.avatar} />;
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <AppText variant="bodyMedium" color={colors.textSecondary}>
        {name.charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
}

function MessageRow({
  message,
  isMine,
  onLongPress,
  t,
}: {
  message: CommunityMessage;
  isMine: boolean;
  onLongPress: () => void;
  t: TFunction;
}) {
  return (
    <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
      {!isMine && <Avatar uri={message.avatarUrl} name={message.displayName} />}
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={300}
        accessibilityRole="button"
        accessibilityLabel={`${message.displayName}: ${message.body}`}
        accessibilityHint={t('community.longPressHint')}
        style={({ pressed }) => [
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
          pressed && { opacity: 0.85 },
        ]}
      >
        {!isMine && (
          <AppText variant="caption" color={colors.accent} style={styles.author}>
            {message.displayName}
          </AppText>
        )}
        <AppText variant="body" style={styles.body}>
          {message.body}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} style={styles.time}>
          {timeAgo(message.createdAt, t)}
        </AppText>
      </Pressable>
    </View>
  );
}

/**
 * Country chat rooms. Any user can enter any room — the room is a choice of
 * audience, not a residency check. Nothing said here feeds streaks, XP or
 * stats, and none of it is ever mixed with The Room.
 */
export function CommunityScreen() {
  const t = useT();
  const listRef = useRef<FlatList<CommunityMessage>>(null);
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const setSetting = useSettingsStore((s) => s.set);
  const storedRoom = useSettingsStore((s) => s.values[ROOM_KEY]);
  const storedName = useSettingsStore((s) => s.values[NAME_KEY]);
  const avatarUri = useSettingsStore((s) => s.values['avatar_uri']);

  // A local file:// avatar means nothing to other devices — only ship URLs.
  const avatarUrl = avatarUri?.startsWith('http') ? avatarUri : null;
  const room = storedRoom && isValidRoom(storedRoom) ? storedRoom : GLOBAL_ROOM;

  const [nickname, setNickname] = useState<string | null>(storedName ?? null);
  const [checkingName, setCheckingName] = useState(storedName == null);
  // The transcript is tagged with the room it belongs to, so switching country
  // shows a spinner rather than the previous room's messages for a frame.
  const [transcript, setTranscript] = useState<{ room: string; rows: CommunityMessage[] } | null>(
    null,
  );
  const [blocked, setBlocked] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // A reinstall clears the local setting but not the claimed nickname.
  useEffect(() => {
    if (storedName != null) return;
    let cancelled = false;
    (async () => {
      const existing = await fetchMyNickname();
      if (cancelled) return;
      if (existing) {
        setNickname(existing);
        setSetting(NAME_KEY, existing);
      }
      setCheckingName(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [storedName, setSetting]);

  useEffect(() => {
    let cancelled = false;
    fetchBlockedIds().then((ids) => {
      if (!cancelled) setBlocked(ids);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Ignores echoes of messages we already hold, and rooms we've since left. */
  const append = useCallback((message: CommunityMessage) => {
    setTranscript((prev) => {
      if (!prev || prev.room !== message.roomCode) return prev;
      if (prev.rows.some((m) => m.id === message.id)) return prev;
      return { room: prev.room, rows: [...prev.rows, message] };
    });
  }, []);

  // Load the room, then listen. Re-runs whenever the user switches country.
  useEffect(() => {
    if (!nickname) return;
    let cancelled = false;
    fetchMessages(room).then((rows) => {
      if (!cancelled) setTranscript({ room, rows });
    });
    const unsubscribe = subscribeToRoom(room, append);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [room, nickname, append]);

  const loading = transcript?.room !== room;
  const rows = transcript?.room === room ? transcript.rows : null;

  const visible = useMemo(
    () => (rows ?? []).filter((m) => !blocked.includes(m.userId)).reverse(),
    [rows, blocked],
  );

  const refresh = async () => {
    setRefreshing(true);
    const [fresh, ids] = await Promise.all([fetchMessages(room), fetchBlockedIds()]);
    setTranscript({ room, rows: fresh });
    setBlocked(ids);
    setRefreshing(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !nickname) return;
    Haptics.selectionAsync();
    setSending(true);
    const result = await sendMessage(room, text, nickname, avatarUrl);
    setSending(false);
    if (result.ok) {
      setInput('');
      append(result.message);
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      return;
    }
    Alert.alert(
      t('community.notSent'),
      result.reason === 'rate_limited' ? t('community.tooFast') : t('community.offline'),
    );
  };

  const openActions = (message: CommunityMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (message.userId === userId) {
      Alert.alert(t('community.messageActions'), undefined, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('community.delete'),
          style: 'destructive',
          onPress: async () => {
            if (!(await deleteMessage(message.id))) return;
            setTranscript((prev) =>
              prev ? { room: prev.room, rows: prev.rows.filter((m) => m.id !== message.id) } : prev,
            );
          },
        },
      ]);
      return;
    }
    Alert.alert(message.displayName, undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('community.report'),
        onPress: async () => {
          await reportMessage(message, 'user_report');
          Alert.alert(t('community.reported'), t('community.reportedBody'));
        },
      },
      {
        text: t('community.block'),
        style: 'destructive',
        onPress: async () => {
          if (await blockUser(message.userId)) {
            setBlocked((prev) => [...prev, message.userId]);
          }
        },
      },
    ]);
  };

  if (checkingName) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  if (!nickname) {
    return (
      <Screen>
        <NicknameGate
          avatarUrl={avatarUrl}
          onJoined={(name) => {
            setNickname(name);
            setSetting(NAME_KEY, name);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="h2">{t('community.title')}</AppText>
          <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
            {t('community.postingAs', { name: nickname })}
          </AppText>
        </View>
        <Pressable
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('community.chooseRoom')}
          style={({ pressed }) => [styles.roomPill, pressed && { opacity: 0.85 }]}
        >
          <AppText variant="body" style={styles.pillFlag}>
            {flagEmoji(room)}
          </AppText>
          <AppText variant="caption" color={colors.text} numberOfLines={1} style={styles.pillLabel}>
            {countryName(room, t('community.worldwide'))}
          </AppText>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* 'padding' on both platforms — edge-to-edge Android never resizes the
          window for the keyboard, so the composer has to move itself. */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            inverted
            data={visible}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageRow
                message={item}
                isMine={item.userId === userId}
                onLongPress={() => openActions(item)}
                t={t}
              />
            )}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={colors.accent}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>
                  {t('community.emptyTitle', {
                    room: countryName(room, t('community.worldwide')),
                  })}
                </AppText>
                <AppText variant="caption" color={colors.textMuted} style={styles.emptyText}>
                  {t('community.emptyBody')}
                </AppText>
              </View>
            }
          />
        )}

        <View style={styles.inputRow}>
          <AppTextInput
            placeholder={t('community.placeholder')}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            maxLength={MAX_MESSAGE_LENGTH}
            multiline
            returnKeyType="send"
            style={styles.input}
            accessibilityLabel={t('community.placeholder')}
          />
          <Pressable
            onPress={send}
            disabled={sending || input.trim().length === 0}
            accessibilityRole="button"
            accessibilityLabel={t('community.send')}
            style={({ pressed }) => [
              styles.sendButton,
              (sending || input.trim().length === 0) && { opacity: 0.4 },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="arrow-up" size={20} color={colors.onAccent} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <CountryPicker
        visible={pickerOpen}
        selected={room}
        onSelect={(code) => setSetting(ROOM_KEY, code)}
        onClose={() => setPickerOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.md },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  headerText: { flex: 1 },
  roomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 170,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  pillFlag: { fontSize: 16 },
  pillLabel: { flexShrink: 1 },
  list: { paddingVertical: spacing.md, gap: spacing.md, flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyText: { textAlign: 'center' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  messageRowMine: { justifyContent: 'flex-end' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  bubble: {
    maxWidth: '80%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
  },
  bubbleTheirs: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 6,
  },
  bubbleMine: {
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(74,222,181,0.3)',
    borderBottomRightRadius: 6,
  },
  author: { marginBottom: 2 },
  body: { lineHeight: 21 },
  time: { alignSelf: 'flex-end', marginTop: 2 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  input: { flex: 1, borderRadius: radii.lg, maxHeight: 110 },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Share,
  Alert,
  ActivityIndicator,
  Platform,
  Pressable,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Chess } from 'chess.js';
import { Ionicons } from '@expo/vector-icons';

import { Text, Card } from '@/ui/atoms';
import BoardSkia from '@/features/chess/components/board/BoardSkia';
import { getTheme } from '@/ui/tokens';
import { useColorScheme } from 'react-native';
import { useSettings } from '@/features/settings/settings.store';
import { deleteGame as dbDeleteGame, getGame, addFavorite, removeFavorite } from '@/archive/db';
import { useReplay } from '@/replay/replay.store';
import { analyzeFen, disposeEvalEngine } from '@/replay/analyze';
import { getEval, setEval, EvalEntry } from '@/replay/cache';
import { toast } from '@/ui/toast';
// Optional: eval bar (guarded for missing module)
let EvalBar: any;
try { EvalBar = require('@/replay/EvalBar').EvalBar; } catch {}

type ReplaySnapshot = {
  plies: string[];
  fens: string[];
  moves: string[];
};

function EmptyState() {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, padding: 32 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>Game not found</Text>
      <Text muted style={{ marginTop: 8 }}>Return to the archive and pick another game.</Text>
    </View>
  );
}

function buildReplay(pgn?: string): ReplaySnapshot {
  if (!pgn) return { plies: [], fens: ['startpos'], moves: [] };
  const c = new Chess();
  const moves = pgn
    .replace(/\{[^}]*\}/g, '')
    .replace(/\([^)]*\)/g, '')
    .split(/\s+/)
    .filter((tok) => tok && !/^\d+\.|\d+\.\.\./.test(tok));
  const plies: string[] = [];
  const fens: string[] = [c.fen()];
  for (const token of moves) {
    try {
      const res = c.move(token, { sloppy: true } as any);
      if (res) {
        plies.push(res.san);
        fens.push(c.fen());
      }
    } catch {}
  }
  return { plies, fens, moves: plies };
}

function PlayerRow({ name, side, isYou, result }: { name?: string; side: 'white' | 'black'; isYou?: boolean; result?: string | null }) {
  const label = name || (side === 'white' ? 'White' : 'Black');
  const outcome = result === '1-0' ? 'Win' : result === '0-1' ? 'Loss' : result === '1/2-1/2' ? 'Draw' : '';
  return (
    <View style={styles.playerRow}>
      <View style={[styles.playerAvatar, side === 'white' ? styles.playerAvatarLight : styles.playerAvatarDark]}>
        <Ionicons
          name={side === 'white' ? 'ellipse-outline' : 'ellipse'}
          size={18}
          color={side === 'white' ? '#fff' : '#111'}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.playerName}>
          {label}
          {isYou ? ' (you)' : ''}
        </Text>
        {outcome ? <Text muted style={styles.playerOutcome}>{outcome}</Text> : null}
      </View>
      <View style={styles.scorePill}>
        <Text style={styles.scorePillText}>{result || '—'}</Text>
      </View>
    </View>
  );
}

type MovePair = { white?: string; black?: string };
function chunkMoves(plies: string[]): MovePair[] {
  const pairs: MovePair[] = [];
  for (let i = 0; i < plies.length; i += 2) {
    pairs.push({ white: plies[i], black: plies[i + 1] });
  }
  return pairs;
}

type MoveListProps = { moves: string[]; plyIndex: number; palette: any; onSelect: (idx: number) => void; isDark?: boolean };
function MoveList({ moves, plyIndex, palette, onSelect, isDark }: MoveListProps) {
  const pairs = useMemo(() => chunkMoves(moves), [moves]);
  const activeRow = Math.floor(plyIndex / 2);
  const activeSide = plyIndex % 2 === 0 ? 'white' : 'black';
  return (
    <View style={styles.moveList}>
      {pairs.map((pair, idx) => {
        const plyWhite = idx * 2;
        const plyBlack = idx * 2 + 1;
        const isWhiteActive = activeRow === idx && activeSide === 'white';
        const isBlackActive = activeRow === idx && activeSide === 'black';
        return (
          <View key={idx} style={styles.moveRow}>
            <Text style={[styles.moveIndex, { color: palette.muted }]}>{idx + 1}.</Text>
            <Pressable
              onPress={() => onSelect(plyWhite)}
              style={[styles.moveCell, isWhiteActive && styles.moveCellActive]}
              accessibilityRole="button"
              accessibilityLabel={`Move ${idx + 1} white ${pair.white ?? 'none'}`}
            >
            <Text style={[styles.moveText, { color: isDark ? '#EDEDED' : palette.text }]}>{pair.white ?? '—'}</Text>
            </Pressable>
            <Pressable
              onPress={() => onSelect(plyBlack)}
              disabled={!pair.black}
              style={[styles.moveCell, !pair.black && styles.moveCellDisabled, isBlackActive && styles.moveCellActive]}
              accessibilityRole="button"
              accessibilityLabel={`Move ${idx + 1} black ${pair.black ?? 'none'}`}
            >
              <Text style={[styles.moveText, { color: isDark ? '#EDEDED' : palette.text }]}>{pair.black ?? '—'}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function TransportButton({ icon, onPress, accessibilityLabel, disabled }: { icon: any; onPress: () => void; accessibilityLabel: string; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.transportButton, disabled && styles.transportButtonDisabled]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
    >
      <Ionicons name={icon as any} size={20} color={disabled ? 'rgba(255,255,255,0.4)' : '#fff'} />
    </Pressable>
  );
}

function ActionButton({ icon, label, onPress, tone }: { icon: any; label: string; onPress?: () => void; tone?: 'danger' }) {
  const isDanger = tone === 'danger';
  return (
    <Pressable onPress={onPress} style={[styles.actionButton, isDanger && styles.actionButtonDanger]} accessibilityRole="button">
      <Ionicons name={icon as any} size={18} color={isDanger ? '#fff' : '#111'} />
      <Text style={[styles.actionButtonText, isDanger && styles.actionButtonTextDanger]}>{label}</Text>
    </Pressable>
  );
}

type PlayHeadProps = { plyIndex: number; total: number; onScrub: (idx: number) => void };
function PlayHead({ plyIndex, total, onScrub }: PlayHeadProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = total === 0 ? 0 : Math.min(1, plyIndex / total);

  const handleLayout = (event: any) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const handlePress = (event: any) => {
    if (!trackWidth) return;
    const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / trackWidth));
    const target = Math.round(ratio * total);
    onScrub(target);
  };

  return (
    <Pressable
      onLayout={handleLayout}
      onPress={handlePress}
      style={styles.playheadTrack}
      accessibilityRole="adjustable"
      accessibilityLabel="Replay scrubber"
      accessibilityValue={{ min: 0, max: total, now: plyIndex }}
    >
      <View style={[styles.playheadProgress, { width: `${progress * 100}%` }]} />
      <View style={styles.playheadThumb}>
        <Text style={styles.playheadLabel}>{total === 0 ? '0/0' : `${plyIndex}/${total}`}</Text>
      </View>
    </Pressable>
  );
}

export default function ArchiveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const rnScheme = useColorScheme();
  const sysTheme = settings.theme === 'system' ? (rnScheme === 'dark' ? 'dark' : 'light') : (settings.theme as 'dark' | 'light');
  const activeTheme = sysTheme === 'dark' ? 'dark' : 'light';
  const palette = getTheme(activeTheme, { highContrast: settings.highContrast });
  const isDark = activeTheme === 'dark';
  const highContrast = settings.highContrast;
  const largeUI = settings.largeUI;
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ReplaySnapshot | null>(null);
  const [principalVariation, setPrincipalVariation] = useState<string[]>([]);
  const [showFullPV, setShowFullPV] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [evalEntry, setEvalEntry] = useState<EvalEntry | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const moveListRef = useRef<ScrollView | null>(null);
  const boardSize = largeUI ? 320 : 300;
  const { plyIndex, setPly, next, prev, start, end } = useReplay();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const result = await getGame(String(id));
        if (!mounted) return;
        setGame(result);
        const snap = buildReplay(result?.pgn);
        setSnapshot(snap);
        const total = snap.moves.length;
        const initialPly = total;
        setPly(initialPly, total);
        const cached = result ? getEval(result.id, initialPly) : null;
        setEvalEntry(cached);
        setPrincipalVariation(cached?.pv ?? []);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError('Unable to load this archive entry.');
        setGame(null);
        setSnapshot(null);
        setEvalEntry(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      abortController.current?.abort();
      disposeEvalEngine();
    };
  }, [id]);

  const handleShare = async () => {
    if (!game?.pgn) return;
    try {
      await Share.share({ message: game.pgn, title: `${game.whiteName || 'White'} vs ${game.blackName || 'Black'}` });
      Haptics.selectionAsync();
    } catch {}
  };

  const handleCopyPGN = async () => {
    if (!game?.pgn) return;
    try {
      await Clipboard.setStringAsync(game.pgn);
      Haptics.selectionAsync();
    } catch {}
  };

  const handleToggleFavorite = async () => {
    if (!game) return;
    try {
      const next = !game.is_favorite;
      setGame({ ...game, is_favorite: next });
      if (next) await addFavorite(game.id);
      else await removeFavorite(game.id);
      Haptics.selectionAsync();
    } catch (err) {
      setGame(game);
      Alert.alert('Unable to update favorite', String(err instanceof Error ? err.message : err));
    }
  };

  const handleDelete = async () => {
    if (!game) return;
    Alert.alert('Delete game', 'This cannot be undone. Delete this game?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await dbDeleteGame(game.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch (err) {
            Alert.alert('Delete failed', String(err instanceof Error ? err.message : err));
          }
        },
      },
    ]);
  };

  const totalPlies = snapshot?.moves?.length ?? 0;
  const boardFen = useMemo(() => {
    const fallback = game?.finalFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    if (!snapshot || !snapshot.fens || snapshot.fens.length === 0) {
      return fallback;
    }
    const clamped = Math.min(Math.max(plyIndex, 0), snapshot.fens.length - 1);
    return snapshot.fens[clamped] || fallback;
  }, [snapshot, plyIndex, game?.finalFen]);
  const lastMove = useMemo(() => {
    if (!snapshot || !snapshot.moves || snapshot.moves.length === 0 || plyIndex === 0) {
      return { from: null, to: null };
    }
    const c = new Chess();
    const max = Math.min(plyIndex, snapshot.moves.length);
    for (let i = 0; i < max; i++) {
      try { c.move(snapshot.moves[i], { sloppy: true } as any); } catch {}
    }
    const history = c.history({ verbose: true });
    const mv = history[history.length - 1];
    return { from: mv?.from ?? null, to: mv?.to ?? null };
  }, [snapshot, plyIndex]);

  const handleAnalyze = async () => {
    if (!snapshot || !game) return;
    if (analyzing) return;
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;
    setAnalyzing(true);
    try {
      const cached = getEval(game.id, plyIndex);
      if (cached) {
        setEvalEntry(cached);
        setPrincipalVariation(cached.pv ?? []);
        setAnalyzing(false);
        toast('Loaded saved evaluation');
        return;
      }
      const fen = snapshot?.fens?.[Math.min(Math.max(plyIndex, 0), (snapshot.fens?.length ?? 1) - 1)];
      const result = await analyzeFen({
        fen,
        gameId: game.id,
        ply: plyIndex,
        signal: controller.signal,
        budgetMs: 240,
      });
      const entry = { cp: result.cp, mate: result.mate, pv: result.pvSan ?? [] };
      setEvalEntry(entry);
      setPrincipalVariation(result.pvSan ?? []);
      setEval(game.id, plyIndex, entry);
      toast('Eval ready');
    } catch (err) {
      if (!(err as Error)?.message?.includes('aborted')) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[Replay] analyze error', err);
        toast(message || 'Analysis failed');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!snapshot) return;
    const timer = setTimeout(() => {
      const row = Math.floor(plyIndex / 2);
      moveListRef.current?.scrollTo({ y: Math.max(0, row * 44 - 80), animated: true });
    }, 120);
    return () => clearTimeout(timer);
  }, [plyIndex, snapshot]);

  useEffect(() => {
    if (!snapshot || !game) return;
    const cached = getEval(game.id, plyIndex);
    setEvalEntry(cached);
    setPrincipalVariation(cached?.pv ?? []);
    setShowFullPV(false);
  }, [plyIndex, snapshot, game?.id]);

  const handleAction = (action: 'toggle' | 'share' | 'copy' | 'delete') => {
    if (!game) return;
    switch (action) {
      case 'toggle':
        handleToggleFavorite();
        break;
      case 'share':
        handleShare();
        break;
      case 'copy':
        handleCopyPGN();
        break;
      case 'delete':
        handleDelete();
        break;
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={palette.primary as string} />
      </View>
    );
  }

  if (error || !game) {
    return (
      <>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: palette.text }}>Archive entry not found</Text>
          <Text muted style={{ marginTop: 8, textAlign: 'center' }}>{error || 'This game may have been removed.'}</Text>
        </View>
      </>
    );
  }

  const infoChips = [
    game.result,
    game.mode === 'ai' ? 'VS AI' : game.mode === 'local' ? 'Local' : game.mode === '1v1' ? 'Online' : 'Archived',
    `${game.moves} moves`,
    new Date(game.createdAt).toLocaleString(),
  ].filter(Boolean);

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: Math.max(insets.bottom + 32, 32) }}
        scrollIndicatorInsets={{ bottom: insets.bottom + 30 }}
      >
        <View style={[styles.heroContainer, { paddingHorizontal: 20 }]}>
          <Card style={[styles.boardCard, highContrast && { borderColor: palette.text, borderWidth: 2 }]}>
            <View style={{ width: '100%', alignItems: 'center' }}>
              <BoardSkia
                fen={boardFen}
                size={boardSize}
                enabled={false}
                lastFrom={lastMove?.from ?? undefined}
                lastTo={lastMove?.to ?? undefined}
              />
              <View style={styles.resultPill}>
                <Text style={styles.resultText}>{game.result || '—'}</Text>
              </View>
            </View>
            <View style={[styles.transportBar, highContrast && { borderColor: palette.text, borderWidth: 2 }]}>
              <TransportButton icon="play-back" onPress={() => start()} accessibilityLabel="Go to start" disabled={plyIndex === 0} />
              <TransportButton icon="play-back-outline" onPress={() => prev()} accessibilityLabel="Previous move" disabled={plyIndex === 0} />
              <PlayHead plyIndex={plyIndex} total={totalPlies} onScrub={(v) => setPly(v, totalPlies)} />
              <TransportButton icon="play-forward-outline" onPress={() => next(totalPlies)} accessibilityLabel="Next move" disabled={plyIndex >= totalPlies} />
              <TransportButton icon="play-forward" onPress={() => end(totalPlies)} accessibilityLabel="End" disabled={plyIndex >= totalPlies} />
            </View>
            <View style={styles.playerStack}>
              <PlayerRow
                name={game.whiteName}
                side="white"
                isYou={false}
                result={game.result}
              />
              <PlayerRow
                name={game.blackName}
                side="black"
                isYou={false}
                result={game.result}
              />
            </View>
            <View style={styles.heroMetaRow}>
              {infoChips.map((chip) => (
                <View key={chip} style={[styles.metaChip, highContrast && { borderColor: palette.text }]}> 
                  <Text style={[styles.metaChipText, highContrast && { color: palette.text }]}>{chip}</Text>
                </View>
              ))}
            </View>
            <View style={styles.heroActions}>
              <ActionButton icon={game.is_favorite ? 'heart' : 'heart-outline'} label={game.is_favorite ? 'Saved' : 'Save'} onPress={() => handleAction('toggle')} />
              <ActionButton icon="share-outline" label="Share" onPress={() => handleAction('share')} />
              <ActionButton icon="document-text-outline" label="Copy PGN" onPress={() => handleAction('copy')} />
              <ActionButton icon="trash-outline" label="Delete" tone="danger" onPress={() => handleAction('delete')} />
            </View>
          </Card>
        </View>

        <View style={[styles.replayContainer, { paddingHorizontal: 20, marginTop: 20 }]}> 
          <View style={[styles.replayPanel, highContrast && { borderColor: palette.text, borderWidth: 2 }]}> 
            <View style={[styles.replayHeader, { borderColor: highContrast ? palette.text : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)') }]}> 
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Moves</Text>
              <Pressable
                onPress={handleAnalyze}
                style={[styles.analyzeButton, analyzing && { opacity: 0.75 }]}
                disabled={analyzing}
              >
                {analyzing && (
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                )}
                {!analyzing && (
                  <Ionicons name="sparkles-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.analyzeButtonText}>{analyzing ? 'Analyzing…' : 'Analyze'}</Text>
              </Pressable>
            </View>
            <View style={styles.panelContent}>
              <View style={[styles.moveListShell, isDark ? styles.moveListShellDark : styles.moveListShellLight]}>
                <ScrollView
                  ref={moveListRef}
                  style={{ maxHeight: 200 }}
                  nestedScrollEnabled
                  contentInset={{ bottom: 12 }}
                >
                  <MoveList moves={snapshot?.moves ?? []} plyIndex={plyIndex} palette={palette} isDark={isDark} onSelect={(idx) => setPly(idx, totalPlies)} />
                </ScrollView>
              </View>
              <View style={styles.evalSection}>
                <Text style={[styles.sectionSubtitle, { color: palette.text }]}>Evaluation</Text>
                {EvalBar ? (
                  <EvalBar
                    cp={evalEntry?.cp}
                    mate={evalEntry?.mate}
                    sideToMove={boardFen.includes(' w ') ? 'w' : 'b'}
                  />
                ) : null}
                {principalVariation.length > 0 ? (
                  <View style={styles.pvRow}>
                    <Text style={[styles.pvLabel, { color: palette.muted }]}>PV</Text>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[styles.pvValue, { color: palette.text }]}>
                        {(showFullPV ? principalVariation : principalVariation.slice(0, 6)).join(' ')}
                        {principalVariation.length > 6 && !showFullPV ? ' …' : ''}
                      </Text>
                      {principalVariation.length > 6 ? (
                        <Pressable onPress={() => setShowFullPV((prev) => !prev)}>
                          <Text style={{ color: palette.primary, fontWeight: '600' }}>
                            {showFullPV ? 'Hide line' : 'Show line'}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.pgnSection, { paddingHorizontal: 20, marginTop: 32 }]}> 
          <Text style={[styles.sectionTitle, { color: palette.text }]}>PGN</Text>
          <Pressable onPress={handleCopyPGN} style={[styles.pgnBox, { borderColor: palette.muted }, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}> 
            <Text style={[styles.pgnText, { color: palette.text }]}> 
              {game.pgn?.trim() || 'PGN unavailable'} 
            </Text> 
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}


const styles = StyleSheet.create({
  heroContainer: {
    gap: 16,
  },
  boardCard: {
    width: '100%',
    alignItems: 'stretch',
    padding: 18,
    borderRadius: 24,
    gap: 18,
  },
  resultPill: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(124,77,255,0.18)',
  },
  resultText: {
    color: '#5146D8',
    fontWeight: '700',
  },
  playerStack: {
    gap: 12,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarLight: {
    backgroundColor: '#F2F2F2',
  },
  playerAvatarDark: {
    backgroundColor: '#1C1C1E',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  playerOutcome: {
    fontSize: 12,
  },
  scorePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  scorePillText: {
    fontWeight: '600',
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  metaChipText: {
    fontWeight: '600',
    fontSize: 13,
  },
  heroActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F2F2F7',
  },
  actionButtonDanger: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    fontWeight: '600',
    color: '#111',
  },
  actionButtonTextDanger: {
    color: '#fff',
  },
  replayContainer: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  transportBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Platform.select({ ios: 'rgba(24,24,28,0.92)', android: '#1c1c22', default: '#1c1c22' }),
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
  },
  transportButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  transportButtonDisabled: {
    opacity: 0.5,
  },
  playheadTrack: {
    flex: 1,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  playheadProgress: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  playheadThumb: {
    position: 'absolute',
    alignSelf: 'center',
  },
  playheadLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  moveListShell: {
    borderRadius: 18,
    paddingVertical: 10,
  },
  moveListShellLight: {
    backgroundColor: '#FFFFFF',
  },
  moveListShellDark: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  moveList: {
    gap: 6,
    paddingHorizontal: 16,
  },
  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  moveIndex: {
    width: 26,
    textAlign: 'right',
    fontWeight: '600',
  },
  moveCell: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
  },
  moveCellActive: {
    backgroundColor: 'rgba(124,77,255,0.24)',
  },
  moveCellDisabled: {
    opacity: 0.5,
  },
  moveText: {
    fontWeight: '500',
  },
  evalSection: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: Platform.select({ ios: 'rgba(22,22,26,0.92)', android: '#15151A', default: '#15151A' }),
    gap: 8,
  },
  evalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7C5CFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  analyzeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  pvRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'baseline',
  },
  pvLabel: {
    fontWeight: '600',
  },
  pvValue: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  pgnSection: {
    gap: 12,
  },
  pgnBox: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  pgnText: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  replayPanel: {
    borderRadius: 24,
    backgroundColor: Platform.select({ ios: 'rgba(240,240,244,0.92)', android: '#FFFFFF', default: '#F2F2F7' }),
    padding: 14,
    gap: 12,
  },
  replayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  panelContent: {
    gap: 14,
  },
});



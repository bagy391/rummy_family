import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, ArrowLeft, Copy, Check, Info, Smartphone
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import { gameAudio } from "@/lib/audio";
import {
  Rank,
  createShuffledDeck, dealCards, selectWildJokerCard, resolveWildJoker,
  validateShow, findOptimalGrouping,
  isPureSequence, isImpureSequence, isValidSet, isLondon
} from "@rummy/shared";
import type { Card, WildJokerInfo } from "@rummy/shared";
import GameScreen from "@/components/game/GameScreen";
import PostRoundModal from "@/components/game/PostRoundModal";
import PlayingCard from "@/components/game/PlayingCard";
import { decodeCleanUTF8 } from "@/lib/utils";


interface Room {
  id: string;
  room_code: string;
  created_by: string;
  status: "waiting" | "active" | "finished";
  bet_amount: number;
  current_round_number: number;
}

interface RoomPlayer {
  id: string;
  player_id: string;
  name: string;
  seat_position: number;
  status: "waiting" | "active" | "eliminated" | "spectating" | "disconnected";
  is_admin: boolean;
  total_score: number;
  opted_leave_share: boolean;
  upi_id: string;
  avatarUrl?: string | null;
  disconnected_at?: string | null;
}

interface Round {
  id: string;
  round_number: number;
  status: "dealing" | "active" | "completed";
  current_turn_player_id: string | null;
  turn_order_index: number;
  wild_joker: WildJokerInfo | null;
  discard_pile: Card[];
}

interface RoundPlayer {
  id: string;
  player_id: string;
  status: "active" | "dropped_first" | "dropped_second" | "shown_wrong" | "shown_valid" | "winner";
  hand: Card[];
  score_this_round: number | null;
  seat_position: number;
  has_drawn_this_turn: boolean;
}

interface PaymentRecord {
  id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  status: "pending" | "completed";
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
}

interface FloatingEmoji {
  id: string;
  senderId: string;
  emoji: string;
}

interface QuitVoteState {
  requesterId: string;
  requesterName: string;
  votes: Record<string, "agree" | "disagree" | "pending">;
}

interface LeaveShareVoteState {
  requesterId: string;
  requesterName: string;
  votes: Record<string, "agree" | "disagree" | "pending">;
}

interface PauseVoteState {
  requesterId: string;
  requesterName: string;
  votes: Record<string, "agree" | "disagree" | "pending">;
}

export default function RoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user } = useAuthStore();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const playersRef = useRef<RoomPlayer[]>([]);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const [channelStatus, setChannelStatus] = useState<string>("CONNECTING");
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [isBrowserOnline, setIsBrowserOnline] = useState(navigator.onLine);
  const lastSeenMap = useRef<Record<string, number>>({});
  const presenceOnlineIdsRef = useRef<string[]>([]);
  const [chatChannelReady, setChatChannelReady] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsBrowserOnline(true);
      toast.success("Internet connection restored!");
    };
    const handleOffline = () => {
      setIsBrowserOnline(false);
      toast.error("Internet connection lost!");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const [round, setRound] = useState<Round | null>(null);
  const roundRef = useRef<Round | null>(null);
  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  const submittedRoundScoresRef = useRef<Set<string>>(new Set());
  const isSubmittingScoresRef = useRef<boolean>(false);

  const [roundPlayers, setRoundPlayers] = useState<RoundPlayer[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [scoreHistory, setScoreHistory] = useState<any[]>([]);
  const [onlinePlayerIds, setOnlinePlayerIds] = useState<string[]>([]);
  const onlinePlayerIdsRef = useRef<string[]>([]);
  useEffect(() => {
    onlinePlayerIdsRef.current = onlinePlayerIds;
  }, [onlinePlayerIds]);


  // Client game state
  const [myHand, setMyHand] = useState<Card[]>([]);
  const [rowSizes, setRowSizes] = useState<{ id: string; size: number }[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]); // card IDs
  const [copied, setCopied] = useState(false);
  const [nowTime, setNowTime] = useState(new Date().getTime());
  const [showCardToConfirm, setShowCardToConfirm] = useState<Card | null>(null);

  // Chat & Reaction state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const chatChannelRef = useRef<any>(null);

  // Mutual Quit voting state
  const [activeQuitVote, setActiveQuitVote] = useState<QuitVoteState | null>(null);

  // Leave Share voting state
  const [activeLeaveShareVote, setActiveLeaveShareVote] = useState<LeaveShareVoteState | null>(null);

  // Pause voting state
  const [activePauseVote, setActivePauseVote] = useState<PauseVoteState | null>(null);

  // Audio & Haptic state
  const [soundOn, setSoundOn] = useState(gameAudio.isSoundEnabled());
  const [vibrationOn, setVibrationOn] = useState(gameAudio.isVibrationEnabled());

  const [isChartVisible, setIsChartVisible] = useState(false);

  const prevRoundStatusRef = useRef<string | null>(null);
  const prevRoundPlayersStatusRef = useRef<Record<string, { status: string; has_drawn_this_turn: boolean }>>({});

  const syncOnlinePlayerIds = useCallback(() => {
    const currentTimes = new Date().getTime();
    const activeIds: string[] = [];
    const presenceOnlineIds = presenceOnlineIdsRef.current;

    playersRef.current.forEach(p => {
      if (p.player_id === user?.id) {
        if (isBrowserOnline) {
          activeIds.push(p.player_id);
        }
      } else {
        const isOnlineInPresence = presenceOnlineIds.includes(p.player_id);
        const lastSeen = lastSeenMap.current[p.player_id];
        const isHeartbeatFresh = lastSeen ? (currentTimes - lastSeen < 12000) : false;

        if (isOnlineInPresence || isHeartbeatFresh) {
          activeIds.push(p.player_id);
        }
      }
    });

    setOnlinePlayerIds(prev => {
      const isSame = prev.length === activeIds.length && prev.every(id => activeIds.includes(id));
      if (!isSame) {
        return activeIds;
      }
      return prev;
    });
  }, [user?.id, isBrowserOnline]);

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setNowTime(new Date().getTime());
      syncOnlinePlayerIds();
    }, 1000);
    return () => clearInterval(clockInterval);
  }, [syncOnlinePlayerIds]);

  // Initialize lastSeenMap for players
  useEffect(() => {
    const now = new Date().getTime();
    players.forEach(p => {
      if (lastSeenMap.current[p.player_id] === undefined) {
        lastSeenMap.current[p.player_id] = p.status === "disconnected" ? 0 : now;
      }
    });
  }, [players]);

  // Keep broadcasting user_ping heartbeats every 3 seconds
  useEffect(() => {
    if (!room || !user || !isBrowserOnline || !chatChannelReady) return;

    const sendPing = () => {
      const chatChannel = chatChannelRef.current;
      if (chatChannel && isBrowserOnline) {
        chatChannel.send({
          type: "broadcast",
          event: "user_ping",
          payload: { userId: user.id },
        });
      }
    };

    const initialTimeout = setTimeout(sendPing, 1000);
    const interval = setInterval(sendPing, 3000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [room?.id, user?.id, isBrowserOnline, chatChannelReady]);

  const getTimeoutText = (p: RoomPlayer) => {
    if (p.status !== "disconnected" || !p.disconnected_at) return "";
    const disconnectTime = new Date(p.disconnected_at).getTime();
    const elapsed = (nowTime - disconnectTime) / 1000;
    const remaining = Math.max(0, Math.ceil(300 - elapsed));
    if (remaining === 0) return "Timed out";
    return `Offline (${remaining}s)`;
  };

  const [loadingAction, setLoadingAction] = useState(false);

  const me = players.find(p => p.player_id === user?.id);
  const myRoundState = roundPlayers.find(p => p.player_id === user?.id);
  const isAdmin = me?.is_admin || false;
  const isMyTurn = round?.current_turn_player_id === user?.id && round?.status === "active";
  const isDropped = myRoundState?.status === "dropped_first" || myRoundState?.status === "dropped_second";

  const isSpectator: boolean =
    me?.status === "spectating" ||
    me?.status === "eliminated" ||
    (room?.status === "active" && round && round.status === "active" && me?.status !== "active" && !myRoundState) ||
    (round?.status === "active" && isDropped) ||  // only during active round
    false;

  // Track turn changes to trigger intense beep and vibration pattern
  const prevIsMyTurnRef = useRef(false);
  useEffect(() => {
    const isNowMyTurn = isMyTurn && round?.status === "active";
    if (isNowMyTurn && !prevIsMyTurnRef.current) {
      gameAudio.playYourTurn();
      gameAudio.triggerHapticYourTurn();
    }
    prevIsMyTurnRef.current = isNowMyTurn;
  }, [isMyTurn, round?.status]);

  // 1. Initial Load & Subscriptions
  useEffect(() => {
    if (!roomCode || !user) return;

    let roomChannel: any;
    let playersChannel: any;
    let active = true;

    async function loadRoom() {
      try {
        // Fetch room
        const { data: roomData, error: roomErr } = await supabase
          .from("rooms")
          .select("*")
          .eq("room_code", roomCode)
          .single();

        if (roomErr || !roomData) {
          if (active) {
            toast.error("Room not found");
            window.location.href = "/dashboard";
          }
          return;
        }
        if (!active) return;
        setRoom(roomData);

        // Fetch players
        await fetchPlayers(roomData.id);
        if (!active) return;

        // Fetch payments if finished
        if (roomData.status === "finished") {
          await fetchPayments(roomData.id);
        }
        if (!active) return;

        // Fetch current active round
        await fetchActiveRound(roomData.id);
        if (!active) return;

        // Clean up duplicate cached channels before registering callbacks
        const roomChannelName = `room-state-${roomData.id}`;
        const playersChannelName = `room-players-${roomData.id}`;
        const chatChannelName = `room-chat-${roomData.id}`;

        await supabase.removeChannel(supabase.channel(roomChannelName));
        await supabase.removeChannel(supabase.channel(playersChannelName));
        await supabase.removeChannel(supabase.channel(chatChannelName));

        if (!active) return;

        // Set up Realtime subscriptions
        roomChannel = supabase
          .channel(roomChannelName)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomData.id}` },
            (payload: any) => {
              if (active) {
                const updatedRoom = payload.new as Room;
                setRoom(updatedRoom);
                if (updatedRoom.status === "active") {
                  fetchActiveRound(updatedRoom.id);
                } else if (updatedRoom.status === "finished") {
                  fetchPayments(updatedRoom.id);
                }
              }
            }
          )
          .subscribe();

        playersChannel = supabase
          .channel(playersChannelName)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomData.id}` },
            () => {
              if (active) {
                fetchPlayers(roomData.id);
              }
            }
          )
          .subscribe();

        // Subscribe to chat channel
        const chatChannel = supabase.channel(chatChannelName)
          .on("broadcast", { event: "chat_message" }, (payload: any) => {
            if (!active) return;
            const { id, senderId, senderName, message, timestamp } = payload.payload;
            setChatMessages((prev) => [...prev, { id, senderId, senderName, message, timestamp }]);

            // Increment unread count if chat is closed
            setIsChatOpen((open) => {
              if (!open) {
                setUnreadCount((c) => c + 1);
                toast.info(`${senderName}: ${message}`, { duration: 3000 });
              }
              return open;
            });
          })
          .on("broadcast", { event: "user_ping" }, (payload: any) => {
            if (!active) return;
            const { userId } = payload.payload;
            lastSeenMap.current[userId] = new Date().getTime();
            syncOnlinePlayerIds();
          })
          .on("broadcast", { event: "emoji_reaction" }, (payload: any) => {
            if (!active) return;
            const { senderId, emoji } = payload.payload;
            const emojiId = `${senderId}-${Date.now()}-${Math.random()}`;
            setFloatingEmojis((prev) => [...prev, { id: emojiId, senderId, emoji }]);
            setTimeout(() => {
              if (active) {
                setFloatingEmojis((prev) => prev.filter((x) => x.id !== emojiId));
              }
            }, 2000);
          })
          .on("broadcast", { event: "mutual_quit_initiated" }, (payload: any) => {
            if (!active) return;
            const { requesterId, requesterName, activePlayerIds } = payload.payload;
            const initialVotes: Record<string, "agree" | "disagree" | "pending"> = {};
            activePlayerIds.forEach((pid: string) => {
              initialVotes[pid] = pid === requesterId ? "agree" : "pending";
            });

            setActiveQuitVote({
              requesterId,
              requesterName,
              votes: initialVotes
            });
            toast.info(`${requesterName} proposed a mutual quit to end the game.`);
          })
          .on("broadcast", { event: "mutual_quit_vote" }, (payload: any) => {
            if (!active) return;
            const { voterId, vote, voterName } = payload.payload;
            setActiveQuitVote((prev) => {
              if (!prev) return null;
              const newVotes = { ...prev.votes, [voterId]: vote };
              if (vote === "disagree") {
                toast.error(`Mutual quit proposal rejected by ${voterName}`);
                return null;
              }
              return { ...prev, votes: newVotes };
            });
          })
          .on("broadcast", { event: "mutual_quit_rejected" }, (payload: any) => {
            if (!active) return;
            const { voterName, reason } = payload.payload;
            setActiveQuitVote(null);
            if (reason === "cancelled") {
              toast.info(`Mutual quit proposal cancelled by ${voterName}`);
            } else {
              toast.error(`Mutual quit proposal rejected by ${voterName}`);
            }
          })
          .on("broadcast", { event: "pause_initiated" }, (payload: any) => {
            if (!active) return;
            const { requesterId, requesterName, activePlayerIds } = payload.payload;
            const initialVotes: Record<string, "agree" | "disagree" | "pending"> = {};
            activePlayerIds.forEach((pid: string) => {
              initialVotes[pid] = pid === requesterId ? "agree" : "pending";
            });

            setActivePauseVote({
              requesterId,
              requesterName,
              votes: initialVotes
            });
            toast.info(`${requesterName} proposed to pause the game.`);
          })
          .on("broadcast", { event: "pause_vote" }, (payload: any) => {
            if (!active) return;
            const { voterId, vote, voterName } = payload.payload;
            setActivePauseVote((prev) => {
              if (!prev) return null;
              const newVotes = { ...prev.votes, [voterId]: vote };
              if (vote === "disagree") {
                toast.error(`Pause proposal rejected by ${voterName}`);
                return null;
              }
              return { ...prev, votes: newVotes };
            });
          })
          .on("broadcast", { event: "pause_rejected" }, (payload: any) => {
            if (!active) return;
            const { voterName, reason } = payload.payload;
            setActivePauseVote(null);
            if (reason === "cancelled") {
              toast.info(`Pause proposal cancelled by ${voterName}`);
            } else {
              toast.error(`Pause proposal rejected by ${voterName}`);
            }
          })
          .on("broadcast", { event: "player_kicked" }, (payload: any) => {
            if (!active) return;
            const { playerId } = payload.payload;
            if (playerId === user?.id) {
              toast.error("You have been removed from the lobby");
              window.location.href = "/dashboard";
            }
          })
          .on("broadcast", { event: "leave_share_initiated" }, (payload: any) => {
            if (!active) return;
            const { requesterId, requesterName, activePlayerIds } = payload.payload;
            const initialVotes: Record<string, "agree" | "disagree" | "pending"> = {};
            activePlayerIds.forEach((pid: string) => {
              initialVotes[pid] = pid === requesterId ? "agree" : "pending";
            });

            setActiveLeaveShareVote({
              requesterId,
              requesterName,
              votes: initialVotes
            });
            toast.info(`${requesterName} proposed a Leave Share vote.`);
          })
          .on("broadcast", { event: "leave_share_vote" }, (payload: any) => {
            if (!active) return;
            const { voterId, vote, voterName } = payload.payload;
            setActiveLeaveShareVote((prev) => {
              if (!prev) return null;
              const newVotes = { ...prev.votes, [voterId]: vote };
              if (vote === "disagree") {
                toast.error(`Leave Share proposal rejected by ${voterName}`);
                return null;
              }
              return { ...prev, votes: newVotes };
            });
          })
          .on("broadcast", { event: "leave_share_rejected" }, (payload: any) => {
            if (!active) return;
            const { voterName, reason } = payload.payload;
            setActiveLeaveShareVote(null);
            if (reason === "cancelled") {
              toast.info(`Leave Share proposal cancelled by ${voterName}`);
            } else {
              toast.error(`Leave Share proposal rejected by ${voterName}`);
            }
          })
          .on("broadcast", { event: "leave_share_activated" }, () => {
            if (!active) return;
            fetchPlayers(roomData.id);
          })
          .subscribe();



        chatChannelRef.current = chatChannel;
        setChatChannelReady(true);

      } catch (err) {
        console.error(err);
      }
    }

    loadRoom();

    return () => {
      active = false;
      if (roomChannel) supabase.removeChannel(roomChannel);
      if (playersChannel) supabase.removeChannel(playersChannel);
      if (chatChannelRef.current) {
        supabase.removeChannel(chatChannelRef.current);
        chatChannelRef.current = null;
        setChatChannelReady(false);
      }
    };
  }, [roomCode, user]);

  // Redirect player to dashboard if they are kicked from the lobby
  useEffect(() => {
    if (room && room.status === "waiting" && players.length > 0) {
      const isStillInRoom = players.some(p => p.player_id === user?.id);
      if (!isStillInRoom) {
        toast.error("You have been removed from the lobby");
        window.location.href = "/dashboard";
      }
    }
  }, [players, room, user]);

  // Handle round state subscriptions once active round is known
  useEffect(() => {
    if (!round || !room) return;

    const roundId = round.id;
    const roundChannelName = `round-state-${roundId}`;
    const roundPlayersChannelName = `round-players-${roundId}`;

    let roundChannel: any;
    let roundPlayersChannel: any;
    let active = true;

    async function setupRoundSubscriptions() {
      // Clean up duplicate cached channels before registering callbacks
      await supabase.removeChannel(supabase.channel(roundChannelName));
      await supabase.removeChannel(supabase.channel(roundPlayersChannelName));

      if (!active) return;

      roundChannel = supabase
        .channel(roundChannelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rounds", filter: `id=eq.${roundId}` },
          (payload: any) => {
            if (active) {
              const updatedRound = payload.new as Round;
              setRound(updatedRound);
              fetchRoundPlayers(roundId, updatedRound.status);
            }
          }
        )
        .subscribe();

      roundPlayersChannel = supabase
        .channel(roundPlayersChannelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "round_players", filter: `round_id=eq.${roundId}` },
          () => {
            if (active) {
              fetchRoundPlayers(roundId);
            }
          }
        )
        .subscribe();
    }

    setupRoundSubscriptions();

    return () => {
      active = false;
      if (roundChannel) supabase.removeChannel(roundChannel);
      if (roundPlayersChannel) supabase.removeChannel(roundPlayersChannel);
    };
  }, [round?.id, room?.id]);

  // Load and refresh score history when round completes or room completes
  useEffect(() => {
    if (room && (round?.status === "completed" || room.status === "finished")) {
      fetchScoreHistory(room.id);
    }
  }, [room?.status, round?.status, room?.id, players.length]);

  const roomStatusRef = useRef(room?.status);
  useEffect(() => {
    roomStatusRef.current = room?.status;
  }, [room?.status]);

  const userNameRef = useRef(user?.displayName);
  useEffect(() => {
    userNameRef.current = user?.displayName;
  }, [user?.displayName]);

  const syncOnlinePlayerIdsRef = useRef(syncOnlinePlayerIds);
  useEffect(() => {
    syncOnlinePlayerIdsRef.current = syncOnlinePlayerIds;
  }, [syncOnlinePlayerIds]);

  // 1.2 Presence Connection Tracking
  useEffect(() => {
    if (!room || !user) return;

    const roomId = room.id;
    const userId = user.id;

    const presenceChannelName = `room-presence-${roomId}`;
    let channel: any;
    let active = true;

    async function setupPresence() {
      // Clean up duplicate cached channels before registering callbacks
      await supabase.removeChannel(supabase.channel(presenceChannelName));

      if (!active) return;

      // Reset subscription status trackers for the new room/connection
      setChannelStatus("CONNECTING");
      setHasSubscribed(false);

      channel = supabase.channel(presenceChannelName, {
        config: {
          presence: {
            key: userId,
          },
        },
      });

      channel
        .on("presence", { event: "sync" }, async () => {
          if (!active) return;
          const presenceState = channel.presenceState();
          const onlineIds = Object.keys(presenceState);
          presenceOnlineIdsRef.current = onlineIds;
          if (syncOnlinePlayerIdsRef.current) {
            syncOnlinePlayerIdsRef.current();
          }

          const currentPlayers = playersRef.current;
          if (currentPlayers.length === 0) return;

          const onlinePlayers = currentPlayers.filter(p => onlineIds.includes(p.player_id));
          const amIPrimary = onlinePlayers[0]?.player_id === userId;



          // 2. Update status of players who disconnected/reconnected
          for (const p of currentPlayers) {
            const isOnline = onlineIds.includes(p.player_id);

            if (!isOnline && (p.status === "active" || p.status === "waiting") && amIPrimary) {
              await supabase
                .from("room_players")
                .update({ status: "disconnected", disconnected_at: new Date().toISOString() })
                .eq("id", p.id);
            } else if (isOnline && p.status === "disconnected" && (isAdmin || p.player_id === userId)) {
              await supabase
                .from("room_players")
                .update({ status: roomStatusRef.current === "waiting" ? "waiting" : "active", disconnected_at: null })
                .eq("id", p.id);
            }
          }
        })
        .subscribe(async (status: string) => {
          if (active) {
            setChannelStatus(status);
            if (status === "SUBSCRIBED") {
              setHasSubscribed(true);
            }
          }
          if (status === "SUBSCRIBED" && active) {
            await channel.track({
              player_id: userId,
              name: userNameRef.current || "",
              online_at: new Date().toISOString(),
            });
          }
        });
    }

    setupPresence();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [room?.id, user?.id]);

  // 1.3 Auto-drop Countdown Timer
  useEffect(() => {
    if (!round || round.status !== "active" || roundPlayers.length === 0) return;

    const autoDropInterval = setInterval(async () => {
      const disconnectedRoundPlayers = roundPlayers.filter(rp => {
        const roomPlayer = players.find(p => p.player_id === rp.player_id);
        const isOnline = onlinePlayerIds.includes(rp.player_id) || rp.player_id === user?.id;
        return rp.status === "active" && !isOnline && roomPlayer?.status === "disconnected" && roomPlayer.disconnected_at;
      });

      for (const rp of disconnectedRoundPlayers) {
        const roomPlayer = players.find(p => p.player_id === rp.player_id);
        if (!roomPlayer || !roomPlayer.disconnected_at) continue;

        const disconnectTime = new Date(roomPlayer.disconnected_at).getTime();
        const elapsed = (new Date().getTime() - disconnectTime) / 1000;

        if (elapsed >= 300) {
          const currentMe = playersRef.current.find(p => p.player_id === user?.id);
          const amIAdmin = currentMe?.is_admin || false;

          if (amIAdmin) {
            toast.info(`Player ${roomPlayer.name} timed out. Auto-dropping...`);
            await autoDropPlayer(rp.player_id);
          }
        }
      }
    }, 5000);

    return () => clearInterval(autoDropInterval);
  }, [round, roundPlayers, players, user]);

  // Sync hand when own hand changes, preserving user's manual sorting order
  useEffect(() => {
    if (myRoundState?.hand) {
      const handCardIds = myRoundState.hand.map(c => c.id);
      const myHandIds = myHand.map(c => c.id);

      const isSync =
        myHandIds.length === handCardIds.length &&
        myHandIds.every(id => handCardIds.includes(id));

      if (!isSync) {
        const preservedHand = myHand.filter(c => handCardIds.includes(c.id));
        const preservedHandIds = preservedHand.map(c => c.id);
        const newCards = myRoundState.hand.filter(c => !preservedHandIds.includes(c.id));

        setMyHand([...preservedHand, ...newCards]);
      }
    } else {
      setMyHand([]);
    }
  }, [myRoundState?.hand]);

  // Helper fetches
  async function fetchPlayers(roomId: string) {
    const { data } = await supabase
      .from("room_players")
      .select("id, player_id, seat_position, status, is_admin, total_score, opted_leave_share, disconnected_at, profiles(name, upi_id, avatar_url)")
      .eq("room_id", roomId)
      .order("seat_position");

    if (data) {
      const mapped = data.map((x: any) => ({
        id: x.id,
        player_id: x.player_id,
        name: decodeCleanUTF8(x.profiles?.name || "Player"),
        seat_position: x.seat_position,
        status: x.status,
        is_admin: x.is_admin,
        total_score: x.total_score,
        opted_leave_share: x.opted_leave_share,
        upi_id: x.profiles?.upi_id || "",
        avatarUrl: x.profiles?.avatar_url || null,
        disconnected_at: x.disconnected_at,
      }));
      setPlayers(mapped);
    }
  }

  async function fetchPayments(roomId: string) {
    const { data } = await supabase
      .from("payment_records")
      .select("*")
      .eq("room_id", roomId);
    if (data) {
      setPayments(data);
    }
  }

  async function fetchActiveRound(roomId: string) {
    const { data: roundData } = await supabase
      .from("rounds")
      .select("*")
      .eq("room_id", roomId)
      .order("round_number", { ascending: false })
      .limit(1);

    if (roundData && roundData.length > 0) {
      setRound(roundData[0]);
      await fetchRoundPlayers(roundData[0].id, roundData[0].status);
    } else {
      setRound(null);
      setRoundPlayers([]);
    }
  }

  async function fetchRoundPlayers(roundId: string, forceStatus?: string) {
    const currentStatus = forceStatus || roundRef.current?.status;
    if (currentStatus === "completed") {
      // If round is completed, RLS allows viewing other players' hands too
      const { data } = await supabase
        .from("round_players")
        .select("*")
        .eq("round_id", roundId)
        .order("seat_position");

      if (data) {
        setRoundPlayers(data);

        // Self-healing check
        if (data.some(p => p.score_this_round === null)) {
          let winner = data.find(p => p.status === "winner" || p.status === "shown_valid");
          if (!winner) {
            // Fallback: if no winner is found but round is completed, find the only active player
            const activePlayers = data.filter(p => p.status === "active");
            if (activePlayers.length === 1) {
              winner = activePlayers[0];
            }
          }
          const currentMe = playersRef.current.find(p => p.player_id === user?.id);
          const amIAdmin = currentMe?.is_admin || false;

          if (winner && roundRef.current && amIAdmin) {
            calculateAndSubmitRoundScores(roundRef.current, data, winner.player_id);
          }
        }
      }
    } else {
      // Fetch metadata for all players in this round from the view (no RLS blocks)
      const { data: metaData } = await supabase
        .from("round_player_metadata")
        .select("*")
        .eq("round_id", roundId)
        .order("seat_position");

      // Fetch own full record (including hand) from table
      const { data: ownData } = await supabase
        .from("round_players")
        .select("*")
        .eq("round_id", roundId)
        .eq("player_id", user?.id)
        .maybeSingle();

      if (metaData) {
        const merged = metaData.map(p => {
          if (p.player_id === user?.id && ownData) {
            return { ...p, hand: ownData.hand || [] };
          }
          return { ...p, hand: [] };
        });

        setRoundPlayers(merged);

        // Auto-declare winner if only 1 active player remains
        if (currentStatus === "active") {
          const activeRoundPlayers = merged.filter(p => p.status === "active");
          if (activeRoundPlayers.length === 1 && activeRoundPlayers[0]) {
            const winnerId = activeRoundPlayers[0].player_id;
            const amIWinner = winnerId === user?.id;
            const currentMe = playersRef.current.find(p => p.player_id === user?.id);
            const amIAdmin = currentMe?.is_admin || false;

            if (amIWinner || amIAdmin) {
              declareRoundWinner(winnerId);
            }
          }
        }
      }
    }
  }

  async function fetchScoreHistory(roomId: string) {
    try {
      const { data: roundsData, error: rErr } = await supabase
        .from("rounds")
        .select("id, round_number")
        .eq("room_id", roomId)
        .order("round_number", { ascending: true });

      if (rErr || !roundsData || roundsData.length === 0) return;

      const roundIds = roundsData.map(r => r.id);

      const { data: rpData, error: rpErr } = await supabase
        .from("round_players")
        .select("round_id, player_id, score_this_round")
        .in("round_id", roundIds);

      if (rpErr || !rpData) return;

      const roundNumMap = new Map<string, number>();
      roundsData.forEach(r => roundNumMap.set(r.id, r.round_number));

      const playerTotals: Record<string, number> = {};
      players.forEach(p => {
        playerTotals[p.player_id] = 0;
      });

      const roundDataMap: Record<number, Record<string, number>> = {};

      // Round 0 (start state)
      const roundZero: Record<string, number> = {};
      players.forEach(p => {
        roundZero[p.player_id] = 0;
      });
      roundDataMap[0] = roundZero;

      const sortedRp = [...rpData].sort((a, b) => {
        const numA = roundNumMap.get(a.round_id) || 0;
        const numB = roundNumMap.get(b.round_id) || 0;
        return numA - numB;
      });

      sortedRp.forEach(rp => {
        const roundNum = roundNumMap.get(rp.round_id);
        if (roundNum === undefined) return;

        if (!roundDataMap[roundNum]) {
          roundDataMap[roundNum] = {};
        }

        const score = rp.score_this_round || 0;
        const currentTotal = playerTotals[rp.player_id] ?? 0;
        const newTotal = currentTotal + score;
        playerTotals[rp.player_id] = newTotal;

        const rMap = roundDataMap[roundNum];
        if (rMap) {
          rMap[rp.player_id] = newTotal;
        }
      });

      const historyArray = Object.keys(roundDataMap)
        .map(rKey => {
          const rNum = parseInt(rKey);
          return {
            roundNumber: rNum,
            scores: roundDataMap[rNum]
          };
        })
        .sort((a, b) => a.roundNumber - b.roundNumber);

      setScoreHistory(historyArray);
    } catch (err) {
      console.error("Failed to fetch score history:", err);
    }
  }

  const promoteNextAdmin = async (adminPlayer: RoomPlayer) => {
    const currentPlayers = playersRef.current;
    const onlinePlayers = currentPlayers.filter(p => onlinePlayerIdsRef.current.includes(p.player_id));
    const amIPrimary = onlinePlayers[0]?.player_id === user?.id;

    if (!amIPrimary) return;

    let nextAdmin = currentPlayers.find(
      p => p.player_id !== adminPlayer.player_id &&
        p.status !== "eliminated" &&
        onlinePlayerIdsRef.current.includes(p.player_id)
    );

    // Fallback: if no online player is available, promote any remaining active/disconnected player
    if (!nextAdmin) {
      nextAdmin = currentPlayers.find(
        p => p.player_id !== adminPlayer.player_id && p.status !== "eliminated"
      );
    }

    if (nextAdmin) {
      const reason = adminPlayer.status === "eliminated" ? "eliminated" : "disconnected";
      toast.info(`Host ${reason}. Promoting ${nextAdmin.name} to host.`);
      try {
        await supabase.from("room_players").update({ is_admin: true }).eq("id", nextAdmin.id);
        await supabase.from("room_players").update({ is_admin: false }).eq("id", adminPlayer.id);
      } catch (e) {
        console.error("Failed to promote next admin:", e);
      }
    }
  };


  useEffect(() => {
    if (!room || room.status === "finished" || !user) return;

    const currentPlayers = players;
    const onlinePlayers = currentPlayers.filter(p => onlinePlayerIds.includes(p.player_id));
    const amIPrimary = onlinePlayers[0]?.player_id === user.id;

    // 1. Self-healing connection status sync (run by primary player)
    if (amIPrimary) {
      currentPlayers.forEach(async (p) => {
        if (p.player_id === user.id) return;
        const isOnline = onlinePlayerIds.includes(p.player_id);

        if (!isOnline && (p.status === "active" || p.status === "waiting")) {
          await supabase
            .from("room_players")
            .update({ status: "disconnected", disconnected_at: new Date().toISOString() })
            .eq("id", p.id);
        } else if (isOnline && p.status === "disconnected" && isAdmin) {
          await supabase
            .from("room_players")
            .update({ status: room.status === "waiting" ? "waiting" : "active", disconnected_at: null })
            .eq("id", p.id);
        }
      });
    }

    // 2. Host Timeout Promotion
    const adminPlayer = currentPlayers.find(p => p.is_admin);
    if (!adminPlayer) return;

    const isAdminOnline = onlinePlayerIds.includes(adminPlayer.player_id);

    // Case A: Host is eliminated -> promote instantly
    if (adminPlayer.status === "eliminated") {
      promoteNextAdmin(adminPlayer);
      return;
    }

    // Case B: Host is active/playing/offline -> promote after 1 minute
    if (!isAdminOnline) {
      if (adminPlayer.status === "disconnected" && adminPlayer.disconnected_at) {
        const disconnectedTime = new Date(adminPlayer.disconnected_at).getTime();
        const elapsedMs = Date.now() - disconnectedTime;

        if (elapsedMs >= 60 * 1000) {
          promoteNextAdmin(adminPlayer);
        }
      }
    }
  }, [nowTime, players, onlinePlayerIds, room?.status, user?.id]);

  // Self-heal own status to active when rejoining/online
  useEffect(() => {
    if (!room || room.status === "finished" || !user || !isBrowserOnline) return;
    const me = players.find(p => p.player_id === user.id);
    if (me && me.status === "disconnected") {
      supabase
        .from("room_players")
        .update({
          status: room.status === "waiting" ? "waiting" : "active",
          disconnected_at: null
        })
        .eq("id", me.id)
        .then(({ error }) => {
          if (!error) {
            fetchPlayers(room.id);
          }
        });
    }
  }, [players, room?.id, room?.status, user?.id, isBrowserOnline]);


  useEffect(() => {
    if (!room || room.status === "finished" || !user) return;

    // Find if the current user is the temporary admin
    const mePlayer = players.find(p => p.player_id === user.id);
    const isMeTempAdmin = mePlayer?.is_admin === true && room.created_by !== user.id;

    if (isMeTempAdmin) {
      // Find the original host player record
      const originalHost = players.find(p => p.player_id === room.created_by);
      const isOriginalHostOnline = originalHost && onlinePlayerIds.includes(room.created_by);

      if (isOriginalHostOnline && originalHost.status !== "eliminated") {
        toast.info(`Original host ${originalHost.name} has rejoined. Handing back host rights.`);
        const executeHandoverBack = async () => {
          try {
            await supabase
              .from("room_players")
              .update({
                is_admin: true,
                status: room.status === "waiting" ? "waiting" : "active",
                disconnected_at: null,
              })
              .eq("id", originalHost.id);
            await supabase.from("room_players").update({ is_admin: false }).eq("id", mePlayer.id);
          } catch (e) {
            console.error("Failed to hand back host rights:", e);
          }
        };
        executeHandoverBack();
      }
    }
  }, [players, onlinePlayerIds, room?.status, room?.created_by, user?.id]);

  // Admin Kick/Drop & Auto Drop Handlers
  const handleAdminKick = async (targetPlayerId: string, action: "ELIMINATE" | "DROP") => {
    if (!room || !isAdmin) return;

    const targetPlayer = players.find(p => p.player_id === targetPlayerId);
    const targetName = targetPlayer ? targetPlayer.name : "Player";

    if (action === "ELIMINATE") {
      const msg = room.status === "waiting"
        ? `Are you sure you want to kick ${targetName} from the lobby?`
        : `Are you sure you want to kick ${targetName} from the game? They will be eliminated.`;
      if (!window.confirm(msg)) return;
    } else if (action === "DROP") {
      if (!window.confirm(`Are you sure you want to drop ${targetName} for the current round?`)) return;
    }

    setLoadingAction(true);

    try {
      if (room.status === "waiting") {
        // Lobby kick: remove user completely from the room players
        const { error: deleteErr } = await supabase
          .from("room_players")
          .delete()
          .eq("room_id", room.id)
          .eq("player_id", targetPlayerId);

        if (deleteErr) throw deleteErr;

        // Prevent kicked player from rejoining
        await supabase
          .from("kicked_players")
          .insert({ room_id: room.id, player_id: targetPlayerId });

        if (chatChannelRef.current) {
          await chatChannelRef.current.send({
            type: "broadcast",
            event: "player_kicked",
            payload: { playerId: targetPlayerId },
          });
        }

        toast.success("Player removed from lobby");


      } else {
        // In-game kick
        if (action === "ELIMINATE") {
          const { error: rpErr } = await supabase
            .from("room_players")
            .update({ status: "eliminated" })
            .eq("room_id", room.id)
            .eq("player_id", targetPlayerId);

          if (rpErr) throw rpErr;

          if (round && round.status === "active") {
            await supabase
              .from("round_players")
              .update({ status: "dropped_second", score_this_round: 0 })
              .eq("round_id", round.id)
              .eq("player_id", targetPlayerId);

            const remainingActive = roundPlayers.filter(
              p => p.player_id !== targetPlayerId && p.status === "active"
            );
            if (remainingActive.length > 1 && round.current_turn_player_id === targetPlayerId) {
              const nextPlayerId = getNextPlayerId(targetPlayerId);
              await supabase
                .from("rounds")
                .update({
                  current_turn_player_id: nextPlayerId,
                  turn_order_index: round.turn_order_index + 1,
                })
                .eq("id", round.id);
            }
          }
          toast.success("Player eliminated from game");
        } else {
          if (round && round.status === "active") {
            const rp = roundPlayers.find(p => p.player_id === targetPlayerId);
            const score = rp?.has_drawn_this_turn ? 40 : 20;
            const dbStatus = rp?.has_drawn_this_turn ? "dropped_second" : "dropped_first";

            await supabase
              .from("round_players")
              .update({ status: dbStatus, score_this_round: score })
              .eq("round_id", round.id)
              .eq("player_id", targetPlayerId);

            const remainingActive = roundPlayers.filter(
              p => p.player_id !== targetPlayerId && p.status === "active"
            );
            if (remainingActive.length > 1 && round.current_turn_player_id === targetPlayerId) {
              const nextPlayerId = getNextPlayerId(targetPlayerId);
              await supabase
                .from("rounds")
                .update({
                  current_turn_player_id: nextPlayerId,
                  turn_order_index: round.turn_order_index + 1,
                })
                .eq("id", round.id);
            }
          }
          toast.success("Player dropped for current round");
        }
      }

      await fetchPlayers(room.id);
      if (round) await fetchRoundPlayers(round.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to kick player");
    } finally {
      setLoadingAction(false);
    }
  };

  const autoDropPlayer = async (targetPlayerId: string) => {
    const currentRound = roundRef.current;
    if (!currentRound) return;

    try {
      const rp = roundPlayers.find(p => p.player_id === targetPlayerId);
      if (!rp) return;

      const score = rp.has_drawn_this_turn ? 40 : 20;
      const dbStatus = rp.has_drawn_this_turn ? "dropped_second" : "dropped_first";
      const nextPlayerId = getNextPlayerId(targetPlayerId);

      await supabase
        .from("round_players")
        .update({ status: dbStatus, score_this_round: score, has_drawn_this_turn: false })
        .eq("round_id", currentRound.id)
        .eq("player_id", targetPlayerId);

      const remainingActive = roundPlayers.filter(
        p => p.player_id !== targetPlayerId && p.status === "active"
      );

      if (remainingActive.length > 1 && currentRound.current_turn_player_id === targetPlayerId) {
        await supabase
          .from("rounds")
          .update({
            current_turn_player_id: nextPlayerId,
            turn_order_index: currentRound.turn_order_index + 1,
          })
          .eq("id", currentRound.id);
      } else if (remainingActive.length === 1 && remainingActive[0]) {
        await supabase
          .from("rounds")
          .update({
            status: "completed",
            current_turn_player_id: null
          })
          .eq("id", currentRound.id);

        const winnerId = remainingActive[0].player_id;
        await supabase.from("game_events").insert({
          round_id: currentRound.id,
          room_id: room?.id,
          player_id: winnerId,
          sequence_number: currentRound.turn_order_index + 1,
          event_type: "ROUND_ENDED",
          event_data: { winnerId, reason: "Last player remaining after auto-drop" },
        });
      }

      toast.success(`Player auto-dropped due to timeout.`);
      await fetchPlayers(room!.id);
      await fetchRoundPlayers(currentRound.id);
    } catch (err) {
      console.error("Auto drop failed:", err);
    }
  };

  // 2. Game Lifecycle Handlers
  const handleStartGame = async () => {
    if (!room || players.length < 2) {
      toast.error("Need at least 2 players to start!");
      return;
    }
    setLoadingAction(true);

    try {
      // 1. Update room status to in_progress
      const { error: roomErr } = await supabase
        .from("rooms")
        .update({ status: "active", current_round_number: 1 })
        .eq("id", room.id);

      if (roomErr) throw roomErr;

      // 2. Start round 1
      await startNewRound(1);
    } catch (err: any) {
      toast.error(err.message || "Failed to start game");
    } finally {
      setLoadingAction(false);
    }
  };

  const startNewRound = async (roundNumber: number) => {
    if (!room) return;

    // Filter only active room players (not eliminated)
    // so auto-drop timer starts fresh from round start
    await supabase
      .from("room_players")
      .update({ disconnected_at: new Date().toISOString() })
      .eq("room_id", room.id)
      .eq("status", "disconnected");
    const activePlayers = players.filter(p => p.status === "active" || p.status === "waiting" || p.status === "disconnected");

    if (activePlayers.length < 2) {
      toast.error("Not enough players left!");
      return;
    }

    // Shuffle and deal cards using the shared game engine
    const deck = createShuffledDeck();
    const hands = dealCards(deck, activePlayers.length, 13);
    const wildJokerCard = selectWildJokerCard(deck);
    const wildJokerInfo = resolveWildJoker(wildJokerCard);

    // Initial discard pile has 1 card
    const firstDiscard = deck.shift();
    const discardPile = firstDiscard ? [firstDiscard] : [];

    try {
      // Create round record
      const { data: newRound, error: roundErr } = await supabase
        .from("rounds")
        .insert({
          room_id: room.id,
          round_number: roundNumber,
          status: "active",
          current_turn_player_id: activePlayers[(roundNumber - 1) % activePlayers.length]?.player_id || null, // clockwise player starts next rounds
          turn_order_index: 0,
          wild_joker: wildJokerInfo,
          draw_pile: deck, // stored on server
          discard_pile: discardPile,
        })
        .select()
        .single();

      if (roundErr) throw roundErr;

      // Create round player records
      const rpRecords = activePlayers.map((player, idx) => ({
        round_id: newRound.id,
        player_id: player.player_id,
        status: "active",
        hand: hands[idx],
        seat_position: idx,
        has_drawn_this_turn: false,
      }));

      const { error: rpErr } = await supabase
        .from("round_players")
        .insert(rpRecords);

      if (rpErr) throw rpErr;

      // Update room current_round_number to trigger realtime channel sync for all players
      const { error: roomUpdateErr } = await supabase
        .from("rooms")
        .update({ current_round_number: roundNumber })
        .eq("id", room.id);

      if (roomUpdateErr) throw roomUpdateErr;

      // Record round started event
      await supabase.from("game_events").insert({
        round_id: newRound.id,
        room_id: room.id,
        player_id: null,
        sequence_number: 1,
        event_type: "ROUND_STARTED",
        event_data: { roundNumber, wildJoker: wildJokerInfo },
      });

      toast.success(`Round ${roundNumber} started!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to start round");
    }
  };

  // 3. Card Action Handlers
  const handleDrawCard = async () => {
    if (!round || !isMyTurn || myRoundState?.has_drawn_this_turn) return;
    setLoadingAction(true);

    try {
      const { data, error } = await supabase.rpc("draw_card_from_pile", {
        p_round_id: round.id,
        p_player_id: user?.id,
      });

      if (error) throw error;
      gameAudio.playDraw();
      gameAudio.triggerHapticDraw();
      toast.success(`Drawn card: ${data.rank} of ${data.suit}`);
    } catch (err: any) {
      toast.error(err.message || "Draw card failed");
    } finally {
      setLoadingAction(false);
    }
  };

  const handlePickDiscard = async () => {
    if (!round || !isMyTurn || myRoundState?.has_drawn_this_turn) return;
    setLoadingAction(true);

    try {
      const { error } = await supabase.rpc("pick_card_from_discard", {
        p_round_id: round.id,
        p_player_id: user?.id,
      });

      if (error) throw error;
      gameAudio.playDraw();
      gameAudio.triggerHapticDraw();
      toast.success("Picked discard card");
    } catch (err: any) {
      toast.error(err.message || "Pick card failed");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDiscardCard = async (card: Card) => {
    if (!round || !isMyTurn || !myRoundState?.has_drawn_this_turn) return;
    setLoadingAction(true);

    // Calculate next active player id
    const nextPlayerId = getNextPlayerId();

    try {
      const { error } = await supabase.rpc("discard_card", {
        p_round_id: round.id,
        p_player_id: user?.id,
        p_card_id: card.id,
        p_next_player_id: nextPlayerId,
      });

      if (error) throw error;
      gameAudio.playDiscard();
      gameAudio.triggerHapticDiscard();
      setSelectedCards([]);
      toast.success("Card discarded");
    } catch (err: any) {
      toast.error(err.message || "Discard failed");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDrop = async (dropType: "FIRST" | "SECOND") => {
    if (!round || !isMyTurn) return;
    setLoadingAction(true);

    const score = dropType === "FIRST" ? 20 : 40;
    if (me && me.total_score + score >= 250) {
      toast.error(`Cannot drop! Adding ${score} points will eliminate you. You must play.`);
      setLoadingAction(false);
      return;
    }

    const dbStatus = dropType === "FIRST" ? "dropped_first" : "dropped_second";
    const nextPlayerId = getNextPlayerId();

    try {
      // 1. Update own status and score
      const { error: rpErr } = await supabase
        .from("round_players")
        .update({ status: dbStatus, score_this_round: score, has_drawn_this_turn: false })
        .eq("round_id", round.id)
        .eq("player_id", user?.id);

      if (rpErr) throw rpErr;
      gameAudio.playDrop();
      gameAudio.triggerHapticDrop();

      // 2. Log event
      await supabase.from("game_events").insert({
        round_id: round.id,
        room_id: room?.id,
        player_id: user?.id,
        sequence_number: round.turn_order_index + 1,
        event_type: dropType === "FIRST" ? "FIRST_DROP" : "SECOND_DROP",
        event_data: { score },
      });

      // 3. Check if only 1 active player remains in this round
      const remainingActive = roundPlayers.filter(
        p => p.player_id !== user?.id && p.status === "active"
      );

      if (remainingActive.length > 1) {
        // Pass turn to next player
        await supabase
          .from("rounds")
          .update({
            current_turn_player_id: nextPlayerId,
            turn_order_index: round.turn_order_index + 1,
          })
          .eq("id", round.id);
      } else if (remainingActive.length === 1 && remainingActive[0]) {
        // Complete the round immediately as only 1 player remains
        await supabase
          .from("rounds")
          .update({
            status: "completed",
            current_turn_player_id: null
          })
          .eq("id", round.id);

        // Log ROUND_ENDED event
        const winnerId = remainingActive[0].player_id;
        await supabase.from("game_events").insert({
          round_id: round.id,
          room_id: room?.id,
          player_id: winnerId,
          sequence_number: round.turn_order_index + 1,
          event_type: "ROUND_ENDED",
          event_data: { winnerId, reason: "Last player remaining after drop" },
        });
      }

      toast.success(`Dropped out of round (${score} points)`);
    } catch (err: any) {
      toast.error(err.message || "Drop failed");
    } finally {
      setLoadingAction(false);
    }
  };

  const executeDeclareShow = async (showCard: Card) => {
    if (!round || !isMyTurn || !myRoundState?.has_drawn_this_turn || !round.wild_joker) return;
    setLoadingAction(true);

    // Filter show card from the hand
    const remainingCards = myHand.filter(c => c.id !== showCard.id);

    // Local validation of the 13 remaining cards
    const jokerInfo = round.wild_joker;
    const wildRank = jokerInfo.wildRank !== undefined ? jokerInfo.wildRank : ((jokerInfo as any).rank === Rank.PRINTED_JOKER ? Rank.ACE : (jokerInfo as any).rank);

    const validGroups = findValidShowGroups(remainingCards, wildRank);
    const localResult = validGroups
      ? validateShow(validGroups, wildRank)
      : { isValid: false, errors: ["No valid sequences/sets satisfy Rummy show rules. You must have at least 1 pure sequence and 1 other sequence."], unmatchedPoints: 80 };

    try {
      if (localResult.isValid) {
        // Valid Show:
        // 1. Update own status to 'winner'
        const { error: rpErr } = await supabase
          .from("round_players")
          .update({ status: "winner" })
          .eq("round_id", round.id)
          .eq("player_id", user?.id);

        if (rpErr) throw rpErr;

        // 2. Discard the show card (add to discard pile) and complete the round
        const updatedDiscard = [...round.discard_pile, showCard];
        const { error: rErr } = await supabase
          .from("rounds")
          .update({ status: "completed", discard_pile: updatedDiscard })
          .eq("id", round.id);

        if (rErr) throw rErr;

        // 3. Log event
        await supabase.from("game_events").insert({
          round_id: round.id,
          room_id: room?.id,
          player_id: user?.id,
          sequence_number: round.turn_order_index + 1,
          event_type: "SHOW_DECLARED",
          event_data: { isValid: true, groups: validGroups || [], showCard },
        });

        gameAudio.playWinner();
        gameAudio.triggerHapticWinner();
        toast.success("VALID SHOW! You won the round!");
      } else {
        // Wrong Show: 80 points penalty. The round continues.
        const nextPlayerId = getNextPlayerId();

        // 1. Update player status
        const { error: rpErr } = await supabase
          .from("round_players")
          .update({ status: "shown_wrong", score_this_round: 80, has_drawn_this_turn: false })
          .eq("round_id", round.id)
          .eq("player_id", user?.id);

        if (rpErr) throw rpErr;
        gameAudio.playWrongShow();
        gameAudio.triggerHapticWrongShow();

        // 2. Discard the card, pass turn
        const updatedDiscard = [...round.discard_pile, showCard];

        // Remove card from player hand
        const updatedHand = myRoundState?.hand?.filter(c => c.id !== showCard.id) || [];
        const { error: handErr } = await supabase
          .from("round_players")
          .update({ hand: updatedHand })
          .eq("round_id", round.id)
          .eq("player_id", user?.id);

        if (handErr) throw handErr;

        await supabase
          .from("rounds")
          .update({
            discard_pile: updatedDiscard,
            current_turn_player_id: nextPlayerId,
            turn_order_index: round.turn_order_index + 1,
          })
          .eq("id", round.id);

        // 3. Log event
        await supabase.from("game_events").insert({
          round_id: round.id,
          room_id: room?.id,
          player_id: user?.id,
          sequence_number: round.turn_order_index + 1,
          event_type: "SHOW_DECLARED",
          event_data: { isValid: false, errors: localResult.errors, showCard },
        });

        toast.error(`WRONG SHOW! +80 points penalty. Turn passed.`);
      }
    } catch (err: any) {
      toast.error(err.message || "Show failed");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeclareShow = (showCard: Card) => {
    if (!round || !isMyTurn || !myRoundState?.has_drawn_this_turn || !round.wild_joker) return;
    setShowCardToConfirm(showCard);
  };

  const declareRoundWinner = async (winnerId: string) => {
    const currentRound = roundRef.current;
    if (!currentRound) return;

    await supabase
      .from("round_players")
      .update({ status: "winner" })
      .eq("round_id", currentRound.id)
      .eq("player_id", winnerId);

    await supabase
      .from("rounds")
      .update({ status: "completed" })
      .eq("id", currentRound.id);

    await supabase.from("game_events").insert({
      round_id: currentRound.id,
      room_id: room?.id,
      player_id: winnerId,
      sequence_number: currentRound.turn_order_index + 1,
      event_type: "ROUND_ENDED",
      event_data: { winnerId, reason: "Last player remaining" },
    });
  };

  // 4. Scoring Calculations
  const calculateAndSubmitRoundScores = async (
    activeRound: Round,
    allRoundPlayers: RoundPlayer[],
    winnerId: string
  ) => {
    if (!room || !activeRound.wild_joker) return;

    // Prevent duplicate score submissions for the same round
    if (submittedRoundScoresRef.current.has(activeRound.id) || isSubmittingScoresRef.current) {
      return;
    }
    isSubmittingScoresRef.current = true;
    submittedRoundScoresRef.current.add(activeRound.id);

    try {
      const updatedScores = [];
      const updatedRoomPlayers = [];

      for (const rp of allRoundPlayers) {
        let score = rp.score_this_round;

        if (score === null) {
          if (rp.player_id === winnerId) {
            score = 0;
          } else {
            // Run optimal grouping to find minimum points for losing player
            const jokerInfo = activeRound.wild_joker;
            const wildRank = jokerInfo.wildRank !== undefined ? jokerInfo.wildRank : ((jokerInfo as any).rank === Rank.PRINTED_JOKER ? Rank.ACE : (jokerInfo as any).rank);
            const result = findOptimalGrouping(rp.hand, wildRank);
            // Cap score at 80 points
            score = Math.min(result.minimumPoints, 80);
          }
        }

        updatedScores.push({
          id: rp.id,
          player_id: rp.player_id,
          score_this_round: score,
        });

        // Get room player and add score
        const roomPlayer = playersRef.current.find(p => p.player_id === rp.player_id);
        if (roomPlayer) {
          const wasAlreadyEliminated = roomPlayer.status === "eliminated";
          const scoreToAdd = wasAlreadyEliminated ? 0 : score;
          const newTotalScore = roomPlayer.total_score + scoreToAdd;
          const isEliminated = wasAlreadyEliminated || newTotalScore >= 250;

          updatedRoomPlayers.push({
            id: roomPlayer.id,
            total_score: newTotalScore,
            status: isEliminated ? "eliminated" : (roomPlayer.status === "disconnected" ? "disconnected" : "active"),
          });
        }
      }

      // Submit round scores and update status
      for (const item of updatedScores) {
        const isWinner = item.player_id === winnerId;
        await supabase
          .from("round_players")
          .update({
            score_this_round: item.score_this_round,
            ...(isWinner ? { status: "winner" } : {})
          })
          .eq("id", item.id);
      }

      // Update room players total scores
      for (const item of updatedRoomPlayers) {
        await supabase
          .from("room_players")
          .update({ total_score: item.total_score, status: item.status })
          .eq("id", item.id);
      }

      // Check if game is completed (only 1 active player left)
      const remainingActivePlayers = updatedRoomPlayers.filter(p => p.status === "active" || p.status === "disconnected");
      if (remainingActivePlayers.length <= 1) {
        // Generate payments records for bet amounts first
        await generateBetPayments(winnerId);

        // Complete game
        await supabase
          .from("rooms")
          .update({ status: "finished" })
          .eq("id", room.id);

        // Update stats
        const finalScoresMap: Record<string, number> = {};
        for (const rp of allRoundPlayers) {
          const roomPlayer = playersRef.current.find(p => p.player_id === rp.player_id);
          if (roomPlayer) {
            const item = updatedScores.find(x => x.player_id === rp.player_id);
            const score = item ? item.score_this_round : 0;
            finalScoresMap[rp.player_id] = roomPlayer.total_score + score;
          }
        }
        await updateGameFinishedStats([winnerId], finalScoresMap);
      } else {
        // Game continues. Check if host/admin was eliminated
        if (me && me.is_admin) {
          const myUpdatedRecord = updatedRoomPlayers.find(p => p.id === me.id);
          if (myUpdatedRecord && myUpdatedRecord.status === "eliminated") {
            // Admin is eliminated! Find a new admin among remaining active/disconnected players
            const nextAdminCandidate = updatedRoomPlayers.find(
              p => p.id !== me.id && (p.status === "active" || p.status === "disconnected")
            );
            if (nextAdminCandidate) {
              const nextAdminRoomPlayer = playersRef.current.find(p => p.id === nextAdminCandidate.id);
              if (nextAdminRoomPlayer) {
                // Promote the next active player to admin
                await supabase
                  .from("room_players")
                  .update({ is_admin: true })
                  .eq("id", nextAdminRoomPlayer.id);

                // Demote current admin
                await supabase
                  .from("room_players")
                  .update({ is_admin: false })
                  .eq("id", me.id);

                toast.info(`Host role transferred to ${nextAdminRoomPlayer.name} as you have been eliminated.`);
              }
            }
          }
        }
      }

      // Refresh data
      await fetchPlayers(room.id);
      await fetchRoundPlayers(activeRound.id, activeRound.status);

      toast.info("Round scores computed and scoreboard updated!");
    } catch (err) {
      console.error("Scoring submission failed:", err);
      // Remove round ID from submitted set so it can be retried if it fails
      submittedRoundScoresRef.current.delete(activeRound.id);
    } finally {
      isSubmittingScoresRef.current = false;
    }
  };

  const generateBetPayments = async (winnerId: string) => {
    if (!room) return;

    try {
      // Find all eliminated players
      const eliminatedPlayers = playersRef.current.filter(p => p.player_id !== winnerId);
      const winner = playersRef.current.find(p => p.player_id === winnerId);
      if (!winner) return;

      // Count of active/eliminated players to handle Leave Share math
      // Opt-in leave share players: do not pay the winner if they lose,
      // but they also give up their share of the eliminated pool.
      // Math:
      // Payer = player who is eliminated.
      // But if Leave Share was opted by a player:
      // "once winner is selected, eliminated players should pay winner, not the one who opted to leave their share"
      // If A, B, C remain, A and B opt-in, C doesn't.
      // D and E are eliminated. D and E pay the winner.
      // If A wins: D and E pay A. B doesn't pay A. C pays A.
      // If C wins: D and E pay C. A and B don't pay C.

      const paymentsToInsert = [];

      for (const loser of eliminatedPlayers) {
        // If the loser opted in to leave share, and they survived to the end (not eliminated before the vote):
        // Wait, if a player is eliminated, they must pay.
        // A player who opted in for Leave Share does NOT pay if they lost but survived as active till leave share was activated.
        // Let's check: was the player active when they opted in?
        // Yes, only active players can opt in.
        // If they opted in to Leave Share, and they lost the game (meaning they didn't win),
        // they are exempt from paying the winner!
        // But if they did NOT opt in, they must pay the winner the bet amount.
        // And players who were already eliminated *before* the leave share vote must pay the winner.

        if (loser.opted_leave_share) {
          // Exempt from paying!
          continue;
        }

        // Payer pays the winner
        paymentsToInsert.push({
          room_id: room.id,
          payer_id: loser.player_id,
          payee_id: winnerId,
          amount: room.bet_amount,
          status: "pending",
        });
      }

      if (paymentsToInsert.length > 0) {
        await supabase
          .from("payment_records")
          .insert(paymentsToInsert);

        await fetchPayments(room.id);
      }
    } catch (err) {
      console.error("Payment records creation failed:", err);
    }
  };

  const handleConfirmPayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from("payment_records")
        .update({ status: "completed", confirmed_at: new Date().toISOString() })
        .eq("id", paymentId);

      if (error) throw error;
      toast.success("Payment confirmed!");
      await fetchPayments(room!.id);

      // Update winner's game stats (add earnings) and payer's stats (deduct earnings)
      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        await updateStatsEarnings(payment.payee_id, payment.amount);
        await updateStatsEarnings(payment.payer_id, -payment.amount);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm payment");
    }
  };

  const updateStatsEarnings = async (playerId: string, amt: number) => {
    const { data: stats } = await supabase
      .from("game_stats")
      .select("earnings")
      .eq("player_id", playerId)
      .maybeSingle();

    if (stats) {
      await supabase
        .from("game_stats")
        .update({
          earnings: (parseFloat(stats.earnings) || 0) + amt,
          updated_at: new Date().toISOString(),
        })
        .eq("player_id", playerId);
    }
  };

  const updateGameFinishedStats = async (winnerIds: string[], finalScoresMap: Record<string, number>) => {
    try {
      for (const p of players) {
        const { data: stats } = await supabase
          .from("game_stats")
          .select("total_games_played, total_wins, total_points")
          .eq("player_id", p.player_id)
          .maybeSingle();

        if (stats) {
          const isWinner = winnerIds.includes(p.player_id);
          const gameScore = finalScoresMap[p.player_id] ?? p.total_score;
          await supabase
            .from("game_stats")
            .update({
              total_games_played: stats.total_games_played + 1,
              total_wins: stats.total_wins + (isWinner ? 1 : 0),
              total_points: stats.total_points + gameScore,
              updated_at: new Date().toISOString(),
            })
            .eq("player_id", p.player_id);
        }
      }
    } catch (err) {
      console.error("Failed to update game finished stats:", err);
    }
  };

  // Initiate Leave Share Vote
  const initiateLeaveShareVote = async () => {
    if (!room || !round || !user || !chatChannelRef.current) return;

    if (activeLeaveShareVote) {
      toast.error("A Leave Share vote is already in progress.");
      return;
    }

    // Safety check: Leave share only toggleable before starting round when at least one player is eliminated
    const hasEliminated = players.some(p => p.status === "eliminated");
    if (!hasEliminated) {
      toast.error("Leave Share can only be proposed if at least one player is eliminated.");
      return;
    }

    const activePlayerIds = players
      .filter(p => p.status === "active" || p.status === "disconnected")
      .map(p => p.player_id);

    if (activePlayerIds.length < 2) {
      toast.error("At least 2 active players are required to propose Leave Share.");
      return;
    }

    const payload = {
      requesterId: user.id,
      requesterName: me?.name || user.email || "Unknown",
      activePlayerIds
    };

    // Broadcast the initiation
    await chatChannelRef.current.send({
      type: "broadcast",
      event: "leave_share_initiated",
      payload
    });

    // Update state locally
    const initialVotes: Record<string, "agree" | "disagree" | "pending"> = {};
    activePlayerIds.forEach((pid: string) => {
      initialVotes[pid] = pid === user.id ? "agree" : "pending";
    });

    setActiveLeaveShareVote({
      requesterId: user.id,
      requesterName: me?.name || "You",
      votes: initialVotes
    });

    toast.info("Proposed Leave Share. Waiting for other active players to vote...");
  };

  const voteLeaveShare = async (vote: "agree" | "disagree") => {
    if (!user || !room || !chatChannelRef.current || !activeLeaveShareVote) return;

    if (vote === "disagree") {
      // Broadcast rejection immediately
      await chatChannelRef.current.send({
        type: "broadcast",
        event: "leave_share_rejected",
        payload: {
          voterId: user.id,
          voterName: me?.name || "Someone"
        }
      });
      setActiveLeaveShareVote(null);
      toast.info("You rejected the Leave Share proposal.");
    } else {
      // Broadcast agreement
      await chatChannelRef.current.send({
        type: "broadcast",
        event: "leave_share_vote",
        payload: {
          voterId: user.id,
          vote: "agree",
          voterName: me?.name || "Someone"
        }
      });

      // Update locally
      setActiveLeaveShareVote((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          votes: { ...prev.votes, [user.id]: "agree" }
        };
      });
    }
  };

  const cancelLeaveShare = async () => {
    if (!user || !room || !chatChannelRef.current || !activeLeaveShareVote) return;
    try {
      await chatChannelRef.current.send({
        type: "broadcast",
        event: "leave_share_rejected",
        payload: {
          voterId: user.id,
          voterName: me?.name || user.email || "Proposer",
          reason: "cancelled"
        }
      });
      setActiveLeaveShareVote(null);
      toast.info("You cancelled the Leave Share proposal.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeaveShareApproved = async () => {
    if (!room || !round) return;

    setLoadingAction(true);
    try {
      // Get IDs of all active players in this round/room
      const activePlayerRoomIds = players
        .filter(p => p.status === "active" || p.status === "disconnected")
        .map(p => p.id);

      // Set opted_leave_share = true for all remaining active players
      for (const rpId of activePlayerRoomIds) {
        await supabase
          .from("room_players")
          .update({ opted_leave_share: true })
          .eq("id", rpId);
      }

      // Broadcast activation to all clients in the room
      if (chatChannelRef.current) {
        await chatChannelRef.current.send({
          type: "broadcast",
          event: "leave_share_activated",
          payload: {}
        });
      }

      await fetchPlayers(room.id);
      toast.success("Leave Share has been activated for all active players!");
    } catch (err: any) {
      console.error("Failed to resolve Leave Share vote:", err);
      toast.error("Error activating Leave Share");
    } finally {
      setLoadingAction(false);
    }
  };

  // 5. Card Selection & Manual Arrangement helpers
  const handleCardClick = (cardId: string) => {
    // Single-select mode: if already selected, deselect. Otherwise select only this card.
    if (selectedCards.includes(cardId)) {
      setSelectedCards([]);
    } else {
      setSelectedCards([cardId]);
    }
  };




  const handleQuitGame = async () => {
    if (!window.confirm("Are you sure you want to quit? You will be eliminated from the game!")) return;
    if (!room || !me) return;

    try {
      // 1. If host/admin, promote next player first before leaving
      if (me.is_admin) {
        const nextAdmin = players.find(p => p.player_id !== user?.id && p.status !== "eliminated");
        if (nextAdmin) {
          await supabase.from("room_players").update({ is_admin: true }).eq("id", nextAdmin.id);
          await supabase.from("room_players").update({ is_admin: false }).eq("id", me.id);
        }
      }

      // 2. Set status to eliminated in room_players
      await supabase
        .from("room_players")
        .update({ status: "eliminated" })
        .eq("id", me.id);

      // If active round is in progress, mark player as dropped in round_players
      if (round && round.status === "active" && myRoundState?.status === "active") {
        const nextPlayerId = getNextPlayerId();

        await supabase
          .from("round_players")
          .update({ status: "dropped_second", score_this_round: 0 })
          .eq("round_id", round.id)
          .eq("player_id", user?.id);

        const remainingActive = roundPlayers.filter(
          p => p.player_id !== user?.id && p.status === "active"
        );

        if (remainingActive.length > 1) {
          await supabase
            .from("rounds")
            .update({
              current_turn_player_id: nextPlayerId,
              turn_order_index: round.turn_order_index + 1,
            })
            .eq("id", round.id);
        } else if (remainingActive.length === 1 && remainingActive[0]) {
          await supabase
            .from("rounds")
            .update({
              status: "completed",
              current_turn_player_id: null
            })
            .eq("id", round.id);

          const winnerId = remainingActive[0].player_id;
          await supabase.from("game_events").insert({
            round_id: round.id,
            room_id: room?.id,
            player_id: winnerId,
            sequence_number: round.turn_order_index + 1,
            event_type: "ROUND_ENDED",
            event_data: { winnerId, reason: "Last player remaining after quit" },
          });
        }
      }

      // Check if room has only 1 active player left after this player quit
      const remainingActiveRoomPlayers = players.filter(
        p => p.player_id !== user?.id && (p.status === "active" || p.status === "disconnected")
      );

      if (remainingActiveRoomPlayers.length <= 1) {
        const winner = remainingActiveRoomPlayers[0];
        if (winner) {
          const winnerId = winner.player_id;
          await generateBetPayments(winnerId);

          const finalScoresMap: Record<string, number> = {};
          for (const p of players) {
            finalScoresMap[p.player_id] = p.total_score;
          }
          await updateGameFinishedStats([winnerId], finalScoresMap);
        }

        // Complete the game
        await supabase
          .from("rooms")
          .update({ status: "finished" })
          .eq("id", room.id);
      }

      toast.success("You quit the game");
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast.error(err.message || "Failed to quit room");
    }
  };

  const getNextPlayerId = (currentTurnPlayerId?: string): string => {
    if (!round) return "";
    const activeRoundPlayers = roundPlayers.filter(p => p.status === "active");
    if (activeRoundPlayers.length <= 1) return user?.id || "";

    const referencePlayerId = currentTurnPlayerId || round.current_turn_player_id || user?.id || "";
    const currentIndex = activeRoundPlayers.findIndex(p => p.player_id === referencePlayerId);
    if (currentIndex === -1) {
      const fallbackIdx = activeRoundPlayers.findIndex(p => p.player_id === user?.id);
      if (fallbackIdx === -1) return activeRoundPlayers[0]?.player_id || "";
      const nextIdx = (fallbackIdx + 1) % activeRoundPlayers.length;
      return activeRoundPlayers[nextIdx]?.player_id || "";
    }

    const nextIdx = (currentIndex + 1) % activeRoundPlayers.length;
    return activeRoundPlayers[nextIdx]?.player_id || "";
  };

  const handleCopyCode = async () => {
    if (!roomCode) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(roomCode);
        setCopied(true);
        toast.success("Room code copied to clipboard!");
      } else {
        // Fallback for non-secure contexts (e.g. HTTP, local network IPs)
        const textArea = document.createElement("textarea");
        textArea.value = roomCode;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (successful) {
          setCopied(true);
          toast.success("Room code copied to clipboard!");
        } else {
          throw new Error("execCommand copy returned false");
        }
      }
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      toast.error("Failed to copy room code. Please copy it manually.");
    } finally {
      setTimeout(() => setCopied(false), 2000);
    }
  };



  const sendMessage = async (msgText: string) => {
    if (!msgText.trim() || !user || !room || !chatChannelRef.current) return;
    const msgId = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString();
    const payload = {
      id: msgId,
      senderId: user.id,
      senderName: me?.name || user.email || "Unknown",
      message: msgText.trim(),
      timestamp: new Date().toISOString()
    };

    // Broadcast message to others
    await chatChannelRef.current.send({
      type: "broadcast",
      event: "chat_message",
      payload
    });

    // Append to local messages
    setChatMessages((prev) => [...prev, payload]);
  };

  const sendEmojiReaction = async (emoji: string) => {
    if (!user || !room || !chatChannelRef.current) return;
    const payload = {
      senderId: user.id,
      emoji
    };

    // Broadcast reaction to others
    await chatChannelRef.current.send({
      type: "broadcast",
      event: "emoji_reaction",
      payload
    });

    // Trigger local animation
    const emojiId = `${user.id}-${Date.now()}-${Math.random()}`;
    setFloatingEmojis((prev) => [...prev, { id: emojiId, senderId: user.id, emoji }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((x) => x.id !== emojiId));
    }, 2000);
  };

  const initiateMutualQuit = async () => {
    if (!room || !round || !user || !chatChannelRef.current) return;

    if (activeQuitVote) {
      toast.error("A mutual quit vote is already in progress.");
      return;
    }

    const activePlayerIds = players
      .filter(p => p.status === "active" || p.status === "disconnected")
      .map(p => p.player_id);

    if (activePlayerIds.length < 2) {
      toast.error("At least 2 active players are required to propose a mutual quit.");
      return;
    }

    const payload = {
      requesterId: user.id,
      requesterName: me?.name || user.email || "Unknown",
      activePlayerIds
    };

    // Broadcast the initiation
    await chatChannelRef.current.send({
      type: "broadcast",
      event: "mutual_quit_initiated",
      payload
    });

    // Update state locally
    const initialVotes: Record<string, "agree" | "disagree" | "pending"> = {};
    activePlayerIds.forEach((pid: string) => {
      initialVotes[pid] = pid === user.id ? "agree" : "pending";
    });

    setActiveQuitVote({
      requesterId: user.id,
      requesterName: me?.name || "You",
      votes: initialVotes
    });

    toast.info("Proposed mutual quit. Waiting for other active players to vote...");
  };

  const voteMutualQuit = async (vote: "agree" | "disagree") => {
    if (!user || !room || !chatChannelRef.current || !activeQuitVote) return;

    if (vote === "disagree") {
      // Broadcast rejection immediately
      await chatChannelRef.current.send({
        type: "broadcast",
        event: "mutual_quit_rejected",
        payload: {
          voterId: user.id,
          voterName: me?.name || "Someone"
        }
      });
      setActiveQuitVote(null);
      toast.info("You rejected the mutual quit proposal.");
    } else {
      // Broadcast agreement
      await chatChannelRef.current.send({
        type: "broadcast",
        event: "mutual_quit_vote",
        payload: {
          voterId: user.id,
          vote: "agree",
          voterName: me?.name || "Someone"
        }
      });

      // Update locally
      setActiveQuitVote((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          votes: { ...prev.votes, [user.id]: "agree" }
        };
      });
    }
  };

  const cancelMutualQuit = async () => {
    if (!user || !room || !chatChannelRef.current || !activeQuitVote) return;
    try {
      await chatChannelRef.current.send({
        type: "broadcast",
        event: "mutual_quit_rejected",
        payload: {
          voterId: user.id,
          voterName: me?.name || user.email || "Proposer",
          reason: "cancelled"
        }
      });
      setActiveQuitVote(null);
      toast.info("You cancelled the mutual quit proposal.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleMutualQuitApproved = async () => {
    if (!room || !round) return;

    setLoadingAction(true);
    try {
      // 1. Identify remaining active players as joint winners
      const jointWinnerIds = players
        .filter(p => p.status === "active" || p.status === "disconnected")
        .map(p => p.player_id);

      // 2. Insert ROUND_ENDED game event
      await supabase.from("game_events").insert({
        round_id: round.id,
        room_id: room.id,
        player_id: user?.id,
        sequence_number: round.turn_order_index + 1,
        event_type: "ROUND_ENDED",
        event_data: { reason: "Mutual Quit", winners: jointWinnerIds },
      });

      // 3. Generate split payments from eliminated players
      await generateSplitBetPayments(jointWinnerIds);

      // 4. Update stats
      const finalScoresMap: Record<string, number> = {};
      for (const p of players) {
        finalScoresMap[p.player_id] = p.total_score;
      }
      await updateGameFinishedStats(jointWinnerIds, finalScoresMap);

      // 5. Set the room status to finished
      await supabase
        .from("rooms")
        .update({ status: "finished" })
        .eq("id", room.id);

    } catch (err: any) {
      console.error("Failed to resolve mutual quit:", err);
      toast.error("Error finalizing mutual quit");
    } finally {
      setLoadingAction(false);
    }
  };

  const generateSplitBetPayments = async (winnerIds: string[]) => {
    if (!room) return;
    if (winnerIds.length === 0) return;

    try {
      // Find all eliminated players (not in winnerIds)
      const eliminatedPlayers = playersRef.current.filter(p => !winnerIds.includes(p.player_id));

      const paymentsToInsert = [];
      const splitAmount = room.bet_amount / winnerIds.length;

      for (const loser of eliminatedPlayers) {
        if (loser.opted_leave_share) {
          // Exempt from paying!
          continue;
        }

        // Payer pays each of the joint winners their split share
        for (const wId of winnerIds) {
          paymentsToInsert.push({
            room_id: room.id,
            payer_id: loser.player_id,
            payee_id: wId,
            amount: splitAmount,
            status: "pending",
          });
        }
      }

      if (paymentsToInsert.length > 0) {
        await supabase
          .from("payment_records")
          .insert(paymentsToInsert);

        await fetchPayments(room.id);
      }
    } catch (err) {
      console.error("Split payment records creation failed:", err);
    }
  };

  // Mutual Quit Vote Resolution Effect
  useEffect(() => {
    if (!activeQuitVote || !room || !round) return;

    const allAgreed = Object.values(activeQuitVote.votes).every(v => v === "agree");
    if (allAgreed) {
      const amIHost = me?.is_admin || false;
      if (amIHost) {
        handleMutualQuitApproved();
      }

      setActiveQuitVote(null);
      toast.success("Mutual quit approved! Game completed.");
    }
  }, [activeQuitVote, room?.id, round?.id, me?.is_admin]);

  // Leave Share Vote Resolution Effect
  useEffect(() => {
    if (!activeLeaveShareVote || !room || !round) return;

    const allAgreed = Object.values(activeLeaveShareVote.votes).every(v => v === "agree");
    if (allAgreed) {
      const amIHost = me?.is_admin || false;
      if (amIHost) {
        handleLeaveShareApproved();
      }

      setActiveLeaveShareVote(null);
      toast.success("Leave Share approved! All active players opted in.");
    }
  }, [activeLeaveShareVote, room?.id, round?.id, me?.is_admin]);

  // Pause Vote Resolution Effect
  useEffect(() => {
    if (!activePauseVote || !room || !round) return;

    const allAgreed = Object.values(activePauseVote.votes).every(v => v === "agree");
    if (allAgreed) {
      setActivePauseVote(null);
      toast.success("Game paused! Redirecting to dashboard...");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    }
  }, [activePauseVote, room?.id, round?.id]);

  const initiatePauseVote = async () => {
    if (!room || !round || !user || !chatChannelRef.current) return;

    if (activePauseVote) {
      toast.error("A pause vote is already in progress.");
      return;
    }

    const activePlayerIds = players
      .filter(p => p.status === "active" || p.status === "disconnected")
      .map(p => p.player_id);

    if (activePlayerIds.length < 2) {
      toast.error("At least 2 active players are required to propose a pause.");
      return;
    }

    const payload = {
      requesterId: user.id,
      requesterName: me?.name || user.email || "Unknown",
      activePlayerIds
    };

    // Broadcast the initiation
    await chatChannelRef.current.send({
      type: "broadcast",
      event: "pause_initiated",
      payload
    });

    // Update state locally
    const initialVotes: Record<string, "agree" | "disagree" | "pending"> = {};
    activePlayerIds.forEach((pid: string) => {
      initialVotes[pid] = pid === user.id ? "agree" : "pending";
    });

    setActivePauseVote({
      requesterId: user.id,
      requesterName: me?.name || "You",
      votes: initialVotes
    });

    toast.info("Proposed to pause game. Waiting for other active players to vote...");
  };

  const votePause = async (vote: "agree" | "disagree") => {
    if (!user || !room || !chatChannelRef.current || !activePauseVote) return;

    if (vote === "disagree") {
      // Broadcast rejection immediately
      await chatChannelRef.current.send({
        type: "broadcast",
        event: "pause_rejected",
        payload: {
          voterId: user.id,
          voterName: me?.name || "Someone"
        }
      });
      setActivePauseVote(null);
      toast.info("You rejected the pause proposal.");
    } else {
      // Broadcast agreement
      await chatChannelRef.current.send({
        type: "broadcast",
        event: "pause_vote",
        payload: {
          voterId: user.id,
          vote: "agree",
          voterName: me?.name || "Someone"
        }
      });

      // Update locally
      setActivePauseVote((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          votes: { ...prev.votes, [user.id]: "agree" }
        };
      });
    }
  };

  const cancelPause = async () => {
    if (!user || !room || !chatChannelRef.current || !activePauseVote) return;
    try {
      await chatChannelRef.current.send({
        type: "broadcast",
        event: "pause_rejected",
        payload: {
          voterId: user.id,
          voterName: me?.name || user.email || "Proposer",
          reason: "cancelled"
        }
      });
      setActivePauseVote(null);
      toast.info("You cancelled the pause proposal.");
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSound = () => {
    const newVal = !soundOn;
    setSoundOn(newVal);
    gameAudio.setSoundEnabled(newVal);
    if (newVal) {
      gameAudio.playDraw();
    }
  };

  const toggleVibration = () => {
    const newVal = !vibrationOn;
    setVibrationOn(newVal);
    gameAudio.setVibrationEnabled(newVal);
    if (newVal) {
      gameAudio.triggerHapticDraw();
    }
  };

  // Real-time sound effect trigger based on Postgres sync changes
  useEffect(() => {
    if (!round) return;

    if (prevRoundStatusRef.current === "active" && round.status === "completed") {
      // Play winner sound on other clients when round completes
      const didIWin = myRoundState?.status === "winner";
      if (!didIWin) {
        gameAudio.playWinner();
        gameAudio.triggerHapticWinner();
      }
    }
    prevRoundStatusRef.current = round.status;
  }, [round?.status, myRoundState?.status]);

  useEffect(() => {
    if (roundPlayers.length === 0) return;

    roundPlayers.forEach(rp => {
      const prev = prevRoundPlayersStatusRef.current[rp.player_id];

      // Play sound when any other player does a wrong show
      if (rp.player_id !== user?.id && prev) {
        if (prev.status === "active" && rp.status === "shown_wrong") {
          gameAudio.playWrongShow();
          gameAudio.triggerHapticWrongShow();
        }

        // Play draw sound when any opponent draws a card
        if (!prev.has_drawn_this_turn && rp.has_drawn_this_turn) {
          gameAudio.playDraw();
        }

        // Play discard sound when any opponent discards
        if (prev.has_drawn_this_turn && !rp.has_drawn_this_turn) {
          gameAudio.playDiscard();
        }
      }

      // Store current state for next comparison
      prevRoundPlayersStatusRef.current[rp.player_id] = {
        status: rp.status,
        has_drawn_this_turn: rp.has_drawn_this_turn
      };
    });
  }, [roundPlayers, user?.id]);

  // Render loading screen if room details or players are not loaded yet
  if (!room || players.length === 0) {
    const isOfflineOrError = !isBrowserOnline || channelStatus === "CLOSED" || channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT";
    return (
      <div className="min-h-dvh bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col items-center justify-center p-6 text-center select-none">
        {isOfflineOrError ? (
          <div className="max-w-md p-6 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-default)] shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
              <Smartphone className="w-6 h-6 animate-bounce" />
            </div>
            <h3 className="text-lg font-bold font-[Outfit]">Connection Lost</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {!isBrowserOnline
                ? "Your internet connection appears to be offline. Please check your network status."
                : "Attempting to reconnect to the game server. Please wait..."}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              Reconnecting
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-sm text-[var(--color-text-secondary)] animate-pulse">Loading game room details...</p>
          </div>
        )}
      </div>
    );
  }

  // Render components
  return (
    <div className="h-dvh overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] safe-top safe-bottom flex flex-col">
      {/* Dynamic fullscreen connection loss overlay */}
      {(!isBrowserOnline ||
        channelStatus === "CLOSED" ||
        channelStatus === "CHANNEL_ERROR" ||
        channelStatus === "TIMED_OUT" ||
        (hasSubscribed && channelStatus !== "SUBSCRIBED")) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center p-6 text-center select-none pointer-events-auto">
            <div className="max-w-md p-6 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-default)] shadow-2xl flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
                <Smartphone className="w-6 h-6 animate-bounce" />
              </div>
              <h3 className="text-lg font-bold font-[Outfit]">Connection Lost</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {!isBrowserOnline
                  ? "Your internet connection appears to be offline. Please check your network status."
                  : "Attempting to reconnect to the game server. Please wait..."}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Reconnecting
              </div>
            </div>
          </div>
        )}
      {/* 1. LOBBY STATE */}
      {room && room.status === "waiting" && (
        <div className="flex-1 overflow-y-auto w-full flex flex-col justify-start md:justify-center items-center p-4">
          <div className="flex flex-col md:flex-row gap-6 items-stretch w-full max-w-4xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 p-6 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-default)] shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <Link to="/dashboard" className="text-sm text-[var(--color-text-muted)] hover:text-white flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Dashboard
                  </Link>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-semibold">
                    LOBBY
                  </span>
                </div>

                <h2 className="text-2xl font-bold font-[Outfit] text-center mb-2">Room Lobby</h2>
                <p className="text-center text-sm text-[var(--color-text-secondary)] mb-6">
                  Share the code below with family to join the game table
                </p>

                {/* Room Code */}
                <div className="flex justify-between items-center p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] mb-6">
                  <div>
                    <span className="text-[10px] text-[var(--color-text-muted)] block font-semibold">ROOM CODE</span>
                    <span className="text-2xl font-bold font-[Outfit] tracking-wider text-emerald-400">{room.room_code}</span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="p-3 rounded-lg hover:bg-[var(--color-bg-card)] border border-transparent hover:border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:text-white transition-all"
                  >
                    {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] block">BET AMOUNT</span>
                    <span className="text-lg font-bold font-[Outfit] text-amber-500">₹{room.bet_amount}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] block">PLAYERS ONLINE</span>
                    <span className="text-lg font-bold font-[Outfit] text-emerald-400">{players.length} / 6</span>
                  </div>
                </div>

                {/* Players List */}
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Players Waiting</h3>
                <div className="space-y-2 mb-6 max-h-[180px] overflow-y-auto pr-1">
                  {players.map((p) => {
                    const isPlayerOfflineInLobby =
                      p.player_id === user?.id
                        ? !isBrowserOnline
                        : (p.status === "disconnected" || !onlinePlayerIds.includes(p.player_id));
                    return (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] flex justify-between items-center"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isPlayerOfflineInLobby ? "bg-red-500" : "bg-emerald-500"}`} />
                          <span className="text-sm font-semibold">{p.name} {p.player_id === user?.id && "(You)"}</span>
                          {isPlayerOfflineInLobby && (
                            <span className="text-[10px] text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded animate-pulse">
                              INACTIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && p.player_id !== user?.id && (
                            <button
                              onClick={() => handleAdminKick(p.player_id, "ELIMINATE")}
                              className="text-[9px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded transition-colors"
                            >
                              Kick
                            </button>
                          )}
                          {p.is_admin ? (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">HOST</span>
                          ) : isPlayerOfflineInLobby ? (
                            <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded">OFFLINE</span>
                          ) : (
                            <span className="text-[10px] text-[var(--color-text-muted)]">READY</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                </div>
              </div>

              {/* Start Actions */}
              <div className="mt-4">
                {isAdmin ? (
                  <button
                    onClick={handleStartGame}
                    disabled={players.length < 2 || loadingAction}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-base shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    {loadingAction ? "Starting..." : "Start Game"}
                  </button>
                ) : (
                  <div className="text-center text-xs text-[var(--color-text-muted)] italic animate-pulse py-2">
                    Waiting for host to start the game...
                  </div>
                )}
              </div>
            </motion.div>

            {/* Chat Panel in Lobby */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-full md:w-80 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-default)] shadow-xl p-4 flex flex-col h-[400px] md:h-auto"
            >
              <h3 className="font-bold text-base mb-3 pb-2 border-b border-[var(--color-border-default)] font-[Outfit] text-emerald-400">Lobby Chat</h3>
              <div className="flex-1 min-h-0">
                <ChatContent
                  chatMessages={chatMessages}
                  userId={user?.id}
                  onSendMessage={sendMessage}
                  onSendReaction={sendEmojiReaction}
                />
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* 2. GAME PLAY STATE */}
      {room && room.status === "active" && round && round.status === "active" && (
        <>
          <GameScreen
            betAmount={room.bet_amount}
            roundNumber={round.round_number}
            roundStatus={round.status}
            wildJoker={round.wild_joker}
            currentTurnPlayerId={round.current_turn_player_id}
            turnOrderIndex={round.turn_order_index}
            discardPile={round.discard_pile || []}
            players={players}
            roundPlayers={roundPlayers}
            userId={user?.id}
            isAdmin={isAdmin}
            isMyTurn={isMyTurn}
            isSpectator={isSpectator}
            onlinePlayerIds={onlinePlayerIds}
            floatingEmojis={floatingEmojis}
            myHand={myHand}
            selectedCards={selectedCards}
            myTotalScore={me?.total_score ?? 0}
            hasDrawnThisTurn={myRoundState?.has_drawn_this_turn ?? false}
            onQuit={handleQuitGame}
            onDrawCard={handleDrawCard}
            onPickDiscard={handlePickDiscard}
            onDiscard={handleDiscardCard}
            onDeclareShow={handleDeclareShow}
            onDropFirst={() => handleDrop("FIRST")}
            onDropSecond={() => handleDrop("SECOND")}
            onCardClick={handleCardClick}
            onReorderHand={setMyHand}
            rowSizes={rowSizes}
            onRowSizesChange={setRowSizes}
            onAdminKick={handleAdminKick}
            getTimeoutText={getTimeoutText}
            soundOn={soundOn}
            vibrationOn={vibrationOn}
            onToggleSound={toggleSound}
            onToggleVibration={toggleVibration}
            onOpenChat={() => { setIsChatOpen(true); setUnreadCount(0); }}
            unreadCount={unreadCount}
            spectatorContent={
              <div className={`w-full bg-[#0D1B2A]/95 backdrop-blur-md border-t p-4 pb-6 flex flex-col items-center justify-between gap-4 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] shrink-0 ${isDropped ? "border-amber-500/20" : "border-emerald-500/20"
                }`}>
                <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-4xl gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 border ${isDropped
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      }`}>
                      <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[14px] uppercase font-bold tracking-wider ${isDropped ? "text-amber-400" : "text-emerald-400"
                          }`}>Observer Mode</span>
                        <span className="px-2 py-0.5 rounded-full text-[12px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {me?.status === "eliminated"
                            ? `Eliminated (Score: ${me.total_score})`
                            : isDropped
                              ? `Dropped (Score: +${myRoundState?.score_this_round || (myRoundState?.status === "dropped_second" ? 40 : 20)})`
                              : "Spectating Round"}
                        </span>
                      </div>
                      <p className="text-[14px] text-white/50 mt-0.5 max-w-md">
                        {me?.status === "eliminated"
                          ? "You have been eliminated from the game table. You can still chat, send reactions, and watch."
                          : isDropped
                            ? "You were dropped from the current round. You can still watch, chat, and send reactions, and you will rejoin when the next round starts."
                            : "You joined mid-round. You'll join when the next round starts."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {["😂", "🔥", "👍", "💬"].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => sendEmojiReaction(emoji)}
                        type="button"
                        className="text-2xl hover:scale-125 active:scale-95 transition-transform p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      onClick={() => { setIsChatOpen(true); setUnreadCount(0); }}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-md transition-colors flex items-center gap-1.5 min-h-[44px]"
                    >
                      Chat
                    </button>
                  </div>
                </div>
              </div>
            }
          />

          {/* Chat Drawer Overlay */}
          <AnimatePresence>
            {isChatOpen && (
              <div className="fixed inset-0 bg-black/40 z-[300] flex justify-end">
                <div className="flex-1" onClick={() => setIsChatOpen(false)} />
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "tween", duration: 0.25 }}
                  className="w-full max-w-sm bg-[var(--color-bg-card)] border-l border-[var(--color-border-default)] shadow-2xl h-full flex flex-col p-4 relative"
                >
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--color-border-default)]">
                    <h3 className="font-bold text-lg font-[Outfit] text-[var(--color-gold)]">Room Chat</h3>
                    <button
                      onClick={() => setIsChatOpen(false)}
                      className="p-1 rounded hover:bg-white/10 text-[var(--color-text-muted)] hover:text-white transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ChatContent
                      chatMessages={chatMessages}
                      userId={user?.id}
                      onSendMessage={sendMessage}
                      onSendReaction={sendEmojiReaction}
                    />
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* 3. SCOREBOARD / BETWEEN ROUNDS STATE */}
      {room && room.status === "active" && round && round.status === "completed" && (
        <PostRoundModal
          round={{ round_number: round.round_number, wild_joker: round.wild_joker }}
          players={players}
          roundPlayers={roundPlayers}
          userId={user?.id}
          isAdmin={isAdmin}
          onlinePlayerIds={onlinePlayerIds}
          scoreHistory={scoreHistory}
          onStartNextRound={() => startNewRound(round.round_number + 1)}
          me={me}
          activeLeaveShareVote={activeLeaveShareVote}
          activeQuitVote={activeQuitVote}
          activePauseVote={activePauseVote}
          onInitiateLeaveShareVote={initiateLeaveShareVote}
          onInitiateMutualQuit={initiateMutualQuit}
          onInitiatePause={initiatePauseVote}
          ScoreTrendChart={ScoreTrendChart}
          isChartVisible={isChartVisible}
          onToggleChart={() => setIsChartVisible(!isChartVisible)}
          myHand={myHand}
          onReorderHand={setMyHand}
          rowSizes={rowSizes}
          onRowSizesChange={setRowSizes}
        />
      )}



      {/* 4. GAME ENDED / PAYMENT SETTLEMENT STATE */}
      {room && room.status === "finished" && (
        <div className="flex-1 overflow-y-auto w-full flex flex-col justify-start md:justify-center items-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg p-6 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-default)] shadow-xl max-h-[90dvh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold font-[Outfit] text-center mb-1 flex items-center justify-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" /> Game Over!
            </h2>
            <p className="text-center text-sm text-[var(--color-text-secondary)] mb-6">
              Final settlements and payments ledger.
            </p>

            {/* Final Standings */}
            <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
              Final Leaderboard
            </h3>
            <div className="space-y-2 mb-6">
              {players.map((p, idx) => (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl flex justify-between items-center bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)]`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-emerald-400 w-4 text-center">{idx + 1}</span>
                    <span className="text-sm font-semibold">{p.name} {p.player_id === user?.id && "(You)"}</span>
                    {(p.status === "disconnected" || (p.player_id !== user?.id && !onlinePlayerIds.includes(p.player_id))) && (
                      <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded animate-pulse">OFFLINE</span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                    Score: {p.total_score} pts
                  </span>
                </div>
              ))}
            </div>

            {/* Score Trend Chart */}
            {scoreHistory.length > 1 && (
              <div className="p-3 rounded-xl bg-slate-950/20 border border-[var(--color-border-default)] mb-4">
                <button
                  onClick={() => setIsChartVisible(!isChartVisible)}
                  className="w-full flex justify-between items-center text-xs font-semibold text-[var(--color-text-secondary)] hover:text-white uppercase tracking-wider"
                >
                  <span>Score Trend Progress</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-white/5">
                    {isChartVisible ? "Hide Chart" : "Show Chart"}
                  </span>
                </button>
                {isChartVisible && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <ScoreTrendChart scoreHistory={scoreHistory} players={players} />
                  </div>
                )}
              </div>
            )}

            {/* Payments Ledger */}
            <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
              Bet Settlements (₹{room.bet_amount} Bet)
            </h3>
            <div className="space-y-3 mb-6">
              {payments.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] text-center py-4">No payments required (e.g. everyone opted in to leave share).</p>
              ) : (
                payments.map(pay => {
                  const payer = players.find(p => p.player_id === pay.payer_id);
                  const payee = players.find(p => p.player_id === pay.payee_id);

                  const isPayerMe = pay.payer_id === user?.id;
                  const isPayeeMe = pay.payee_id === user?.id;

                  // Construct UPI payment deep link
                  // UPI url: upi://pay?pa=recipient@upi&pn=Name&am=50&cu=INR&tn=Rummy%20Settlement
                  const payeeUpi = payee?.upi_id || "";
                  const payeeName = payee?.name || "Player";
                  const upiUrl = payeeUpi
                    ? `upi://pay?pa=${encodeURIComponent(payeeUpi)}&pn=${encodeURIComponent(payeeName)}&am=${pay.amount}&cu=INR&tn=Family%20Rummy%20-%20Room%20${room.room_code}`
                    : "";

                  return (
                    <div
                      key={pay.id}
                      className={`p-3.5 rounded-xl border flex justify-between items-center bg-[var(--color-bg-secondary)] ${pay.status === "completed"
                        ? "border-emerald-500/20 opacity-60"
                        : "border-[var(--color-border-default)]"
                        }`}
                    >
                      <div className="text-xs">
                        <div className="font-semibold text-sm">
                          {payer?.name} → {payee?.name}
                        </div>
                        <div className="text-[var(--color-text-muted)] mt-1 font-mono">
                          Amount: ₹{pay.amount} | Status: <span className={pay.status === "completed" ? "text-emerald-400" : "text-amber-400 font-bold"}>{pay.status.toUpperCase()}</span>
                        </div>
                      </div>

                      {/* Pay Button for Payer / Confirm Button for Payee */}
                      <div>
                        {pay.status !== "completed" && (
                          <>
                            {isPayerMe && upiUrl && (
                              <a
                                href={upiUrl}
                                onClick={() => {
                                  // Instantly update status locally for UX, and write payer confirm
                                  toast.info("Opening UPI application...");
                                }}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md inline-flex items-center gap-1.5"
                              >
                                <Smartphone className="w-3.5 h-3.5" /> Pay Bet
                              </a>
                            )}

                            {isPayeeMe && (
                              <button
                                onClick={() => handleConfirmPayment(pay.id)}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-md"
                              >
                                Confirm Recv
                              </button>
                            )}

                            {!isPayerMe && !isPayeeMe && (
                              <span className="text-[10px] text-[var(--color-text-muted)] italic">Awaiting payment</span>
                            )}
                          </>
                        )}
                        {pay.status === "completed" && (
                          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="w-4 h-4" /> Settled
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <Link
              to="/dashboard"
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm block text-center"
            >
              Back to Dashboard
            </Link>
          </motion.div>
        </div>
      )}

      {/* SHOW DECLARE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showCardToConfirm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[250] p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm p-6 rounded-2xl bg-[#0D1B2A]/95 border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.15)] flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-pulse">
                <Trophy className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold font-[Outfit] text-white mb-2">
                Declare Show
              </h3>

              <p className="text-sm text-[var(--color-text-secondary)] mb-6 max-w-[280px]">
                Are you sure you want to use this card to declare a show? Your remaining 13 cards will be validated.
              </p>

              {/* Card Preview */}
              <div className="mb-6 flex justify-center scale-110">
                <PlayingCard card={showCardToConfirm} size="lg" faceDown={false} />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowCardToConfirm(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const card = showCardToConfirm;
                    setShowCardToConfirm(null);
                    executeDeclareShow(card);
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-900/30 active:scale-95 transition-all"
                >
                  Yes, Declare
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MUTUAL QUIT VOTING MODAL */}
      <AnimatePresence>
        {activeQuitVote && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[250] p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-default)] shadow-2xl"
            >
              <h3 className="text-xl font-bold font-[Outfit] text-amber-400 mb-2 flex items-center gap-2">
                ⚠️ Mutual Quit Proposed
              </h3>

              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                <span className="font-semibold text-white">{activeQuitVote.requesterName}</span> has proposed to end this round and declare all remaining active players as joint winners.
              </p>

              <div className="space-y-3 mb-6 bg-black/30 p-3.5 rounded-xl border border-white/5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                  Active Players Votes:
                </h4>
                {Object.keys(activeQuitVote.votes).map((pid) => {
                  const rpName = players.find(p => p.player_id === pid)?.name || "Unknown";
                  const vote = activeQuitVote.votes[pid];

                  return (
                    <div key={pid} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white">{rpName} {pid === user?.id && "(You)"}</span>
                      <span className="text-xs font-semibold">
                        {vote === "agree" && <span className="text-emerald-400">✅ Agreed</span>}
                        {vote === "disagree" && <span className="text-red-400">❌ Rejected</span>}
                        {vote === "pending" && <span className="text-amber-400 animate-pulse">⏳ Voting...</span>}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Voting buttons */}
              {isSpectator ? (
                <div className="text-center text-xs text-[var(--color-text-muted)] italic py-2">
                  Only active players can vote. Watching...
                </div>
              ) : activeQuitVote.requesterId === user?.id ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <div className="text-center text-xs text-[var(--color-text-muted)] italic animate-pulse py-2">
                    Waiting for other players to vote...
                  </div>
                  <button
                    onClick={cancelMutualQuit}
                    className="w-full py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-sm shadow-md transition-colors"
                  >
                    Cancel Proposal
                  </button>
                </div>
              ) : (
                <div className="flex gap-4">
                  <button
                    onClick={() => voteMutualQuit("disagree")}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-md transition-colors"
                  >
                    Disagree (Play)
                  </button>
                  <button
                    onClick={() => voteMutualQuit("agree")}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-colors"
                  >
                    Agree (Split)
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LEAVE SHARE VOTING MODAL */}
      <AnimatePresence>
        {activeLeaveShareVote && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[250] p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-default)] shadow-2xl"
            >
              <h3 className="text-xl font-bold font-[Outfit] text-sky-400 mb-2 flex items-center gap-2">
                <Info className="w-5 h-5 text-sky-400" /> Leave Share Proposed
              </h3>

              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                <span className="font-semibold text-white">{activeLeaveShareVote.requesterName}</span> has proposed to activate **Leave Share** for all remaining active players. If approved, you won't pay the winner if you lose, but you won't get paid by other opted-in players.
              </p>

              <div className="space-y-3 mb-6 bg-black/30 p-3.5 rounded-xl border border-white/5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                  Active Players Votes:
                </h4>
                {Object.keys(activeLeaveShareVote.votes).map((pid) => {
                  const rpName = players.find(p => p.player_id === pid)?.name || "Unknown";
                  const vote = activeLeaveShareVote.votes[pid];

                  return (
                    <div key={pid} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white">{rpName} {pid === user?.id && "(You)"}</span>
                      <span className="text-xs font-semibold">
                        {vote === "agree" && <span className="text-emerald-400">✅ Agreed</span>}
                        {vote === "disagree" && <span className="text-red-400">❌ Rejected</span>}
                        {vote === "pending" && <span className="text-amber-400 animate-pulse">⏳ Voting...</span>}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Voting buttons */}
              {isSpectator ? (
                <div className="text-center text-xs text-[var(--color-text-muted)] italic py-2">
                  Only active players can vote. Watching...
                </div>
              ) : activeLeaveShareVote.requesterId === user?.id ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <div className="text-center text-xs text-[var(--color-text-muted)] italic animate-pulse py-2">
                    Waiting for other players to vote...
                  </div>
                  <button
                    onClick={cancelLeaveShare}
                    className="w-full py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-sm shadow-md transition-colors"
                  >
                    Cancel Proposal
                  </button>
                </div>
              ) : (
                <div className="flex gap-4">
                  <button
                    onClick={() => voteLeaveShare("disagree")}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-md transition-colors"
                  >
                    Disagree (Play Normal)
                  </button>
                  <button
                    onClick={() => voteLeaveShare("agree")}
                    className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md transition-colors"
                  >
                    Agree (Leave Share)
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PAUSE VOTING MODAL */}
      <AnimatePresence>
        {activePauseVote && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[250] p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-default)] shadow-2xl"
            >
              <h3 className="text-xl font-bold font-[Outfit] text-amber-400 mb-2 flex items-center gap-2">
                ⏸️ Pause Game Proposed
              </h3>

              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                <span className="font-semibold text-white">{activePauseVote.requesterName}</span> has proposed to pause the game and resume it later.
              </p>

              <div className="space-y-3 mb-6 bg-black/30 p-3.5 rounded-xl border border-white/5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                  Active Players Votes:
                </h4>
                {Object.keys(activePauseVote.votes).map((pid) => {
                  const rpName = players.find(p => p.player_id === pid)?.name || "Unknown";
                  const vote = activePauseVote.votes[pid];

                  return (
                    <div key={pid} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white">{rpName} {pid === user?.id && "(You)"}</span>
                      <span className="text-xs font-semibold">
                        {vote === "agree" && <span className="text-emerald-400">✅ Agreed</span>}
                        {vote === "disagree" && <span className="text-red-400">❌ Rejected</span>}
                        {vote === "pending" && <span className="text-amber-400 animate-pulse">⏳ Voting...</span>}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Voting buttons */}
              {isSpectator ? (
                <div className="text-center text-xs text-[var(--color-text-muted)] italic py-2">
                  Only active players can vote. Watching...
                </div>
              ) : activePauseVote.requesterId === user?.id ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <div className="text-center text-xs text-[var(--color-text-muted)] italic animate-pulse py-2">
                    Waiting for other players to vote...
                  </div>
                  <button
                    onClick={cancelPause}
                    className="w-full py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-sm shadow-md transition-colors"
                  >
                    Cancel Proposal
                  </button>
                </div>
              ) : (
                <div className="flex gap-4">
                  <button
                    onClick={() => votePause("disagree")}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-md transition-colors"
                  >
                    Disagree (Play)
                  </button>
                  <button
                    onClick={() => votePause("agree")}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-colors"
                  >
                    Agree (Pause)
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Score Trend Chart component
interface ScoreTrendChartProps {
  scoreHistory: any[];
  players: RoomPlayer[];
}

function ScoreTrendChart({ scoreHistory, players }: ScoreTrendChartProps) {
  if (scoreHistory.length === 0) return null;

  const width = 500;
  const height = 220;
  const paddingLeft = 35;
  const paddingRight = 100;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxRound = Math.max(1, scoreHistory.length - 1);

  // Find max score dynamically
  let maxScore = 250;
  scoreHistory.forEach(h => {
    Object.values(h.scores).forEach((val: any) => {
      if (val > maxScore) maxScore = val;
    });
  });
  maxScore = Math.ceil(maxScore / 50) * 50;

  const getX = (roundNum: number) => {
    return paddingLeft + (roundNum / maxRound) * chartWidth;
  };

  const getY = (score: number) => {
    return paddingTop + chartHeight - (score / maxScore) * chartHeight;
  };

  const lineColors = [
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#f43f5e", // Rose
    "#0ea5e9", // Sky
    "#a855f7", // Purple
    "#f97316", // Orange
  ];

  const paths = players.map((p, pIdx) => {
    const color = lineColors[pIdx % lineColors.length];
    const points = scoreHistory.map(h => {
      const score = h.scores[p.player_id] ?? 0;
      return {
        x: getX(h.roundNumber),
        y: getY(score),
        round: h.roundNumber,
        score
      };
    });

    const d = points.length > 0
      ? `M ${points.map(pt => `${pt.x},${pt.y}`).join(" L ")}`
      : "";

    return {
      playerId: p.player_id,
      name: p.name,
      color,
      d,
      points
    };
  });

  const yTicks = [];
  for (let s = 0; s <= maxScore; s += 50) {
    yTicks.push(s);
  }

  const xTicks = [];
  for (let r = 0; r <= maxRound; r++) {
    xTicks.push(r);
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[400px] h-auto text-xs overflow-visible"
      >
        {/* Horizontal grid lines */}
        {yTicks.map(tick => (
          <g key={`y-${tick}`}>
            <line
              x1={paddingLeft}
              y1={getY(tick)}
              x2={width - paddingRight}
              y2={getY(tick)}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeDasharray="4 4"
            />
            <text
              x={paddingLeft - 8}
              y={getY(tick) + 3}
              fill="rgba(255, 255, 255, 0.4)"
              textAnchor="end"
              className="font-mono font-bold"
              fontSize="9"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* Vertical grid lines */}
        {xTicks.map(tick => (
          <g key={`x-${tick}`}>
            <line
              x1={getX(tick)}
              y1={paddingTop}
              x2={getX(tick)}
              y2={paddingTop + chartHeight}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeDasharray="4 4"
            />
            <text
              x={getX(tick)}
              y={paddingTop + chartHeight + 14}
              fill="rgba(255, 255, 255, 0.4)"
              textAnchor="middle"
              className="font-semibold"
              fontSize="9"
            >
              R{tick}
            </text>
          </g>
        ))}

        {/* Axis Lines */}
        <line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={width - paddingRight}
          y2={paddingTop + chartHeight}
          stroke="rgba(255, 255, 255, 0.15)"
        />
        <line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={paddingTop + chartHeight}
          stroke="rgba(255, 255, 255, 0.15)"
        />

        {/* Paths & Markers */}
        {paths.map(path => {
          const finalPt = path.points[path.points.length - 1];
          if (!finalPt || !path.d) return null;

          return (
            <g key={path.playerId}>
              {/* Glow filter path */}
              <path
                d={path.d}
                fill="none"
                stroke={path.color}
                strokeWidth="5"
                opacity="0.12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Main path */}
              <path
                d={path.d}
                fill="none"
                stroke={path.color}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data circles */}
              {path.points.map(pt => (
                <circle
                  key={pt.round}
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  fill="#151b26"
                  stroke={path.color}
                  strokeWidth="1.8"
                />
              ))}

              {/* End line Label */}
              <text
                x={finalPt.x + 8}
                y={finalPt.y + 3}
                fill={path.color}
                fontSize="9"
                fontWeight="bold"
                className="font-[Outfit]"
              >
                {path.name.substring(0, 10)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// auxiliary components
interface ChatContentProps {
  chatMessages: ChatMessage[];
  userId: string | undefined;
  onSendMessage: (msg: string) => void;
  onSendReaction: (emoji: string) => void;
}

function ChatContent({
  chatMessages,
  userId,
  onSendMessage,
  onSendReaction,
}: ChatContentProps) {
  const [inputValue, setInputValue] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0 flex flex-col pt-1">
        {chatMessages.length === 0 ? (
          <div className="text-center text-xs text-[var(--color-text-muted)] italic my-auto py-8">
            No messages yet. Say hello!
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isMe = msg.senderId === userId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="text-[10px] text-[var(--color-text-muted)] mb-0.5 px-1 font-semibold">
                  {msg.senderName}
                </div>
                <div
                  className={`px-3 py-1.5 rounded-2xl max-w-[85%] text-sm break-words shadow-sm ${isMe
                    ? "bg-emerald-600 text-white rounded-tr-none"
                    : "bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] rounded-tl-none"
                    }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="mt-3 border-t border-[var(--color-border-default)] pt-3 flex flex-col gap-2 bg-[var(--color-bg-card)]">
        {/* Quick emojis */}
        <div className="flex justify-between px-1">
          {["😂", "🔥", "👍", "💬", "😢", "😮", "😡", "🎉"].map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              type="button"
              className="text-xl hover:scale-125 active:scale-95 transition-transform duration-100 p-1"
            >
              {emoji}
            </button>
          ))}
        </div>

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 min-w-0 bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-[var(--color-text-primary)]"
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors shrink-0"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

// Helper functions for flat hand show validation
function generateCombinations(
  arr: Card[],
  size: number,
  startIdx: number,
  current: Card[],
  callback: (combo: Card[]) => void
) {
  if (current.length === size) {
    callback(current);
    return;
  }
  const remaining = size - current.length;
  for (let i = startIdx; i <= arr.length - remaining; i++) {
    const card = arr[i];
    if (card) {
      current.push(card);
      generateCombinations(arr, size, i + 1, current, callback);
      current.pop();
    }
  }
}

function findValidShowGroups(cards: Card[], wildRank: Rank): Card[][] | null {
  const n = cards.length;
  if (n !== 13) return null;

  const allValidGroups: { cards: Card[]; type: "LONDON" | "PURE_SEQUENCE" | "IMPURE_SEQUENCE" | "SET" }[] = [];

  // Try sizes from 3 to 13
  for (let size = 3; size <= 13; size++) {
    generateCombinations(cards, size, 0, [], (combo) => {
      if (isLondon(combo)) {
        allValidGroups.push({ cards: [...combo], type: "LONDON" });
      } else if (isPureSequence(combo, wildRank)) {
        allValidGroups.push({ cards: [...combo], type: "PURE_SEQUENCE" });
      } else if (isImpureSequence(combo, wildRank)) {
        allValidGroups.push({ cards: [...combo], type: "IMPURE_SEQUENCE" });
      } else if (isValidSet(combo, wildRank)) {
        allValidGroups.push({ cards: [...combo], type: "SET" });
      }
    });
  }

  let result: Card[][] | null = null;
  const currentGroups: { cards: Card[]; type: string }[] = [];
  const usedCardIds = new Set<string>();

  function search(idx: number): boolean {
    if (usedCardIds.size === 13) {
      // Validate show rules
      // 1. Find a First Rummy (PURE_SEQUENCE or LONDON)
      const firstRummyIdx = currentGroups.findIndex(
        g => g && (g.type === "PURE_SEQUENCE" || g.type === "LONDON")
      );
      if (firstRummyIdx === -1) return false;

      // 2. Find a Second Rummy (any PURE_SEQUENCE or IMPURE_SEQUENCE that is NOT the first rummy group)
      let hasSecondRummy = false;
      for (let i = 0; i < currentGroups.length; i++) {
        if (i === firstRummyIdx) continue;
        const grp = currentGroups[i];
        if (grp && (grp.type === "PURE_SEQUENCE" || grp.type === "IMPURE_SEQUENCE")) {
          hasSecondRummy = true;
          break;
        }
      }

      if (hasSecondRummy) {
        result = currentGroups.map(g => g.cards);
        return true;
      }
      return false;
    }

    for (let i = idx; i < allValidGroups.length; i++) {
      const g = allValidGroups[i];
      if (!g) continue;
      if (usedCardIds.size + g.cards.length > 13) continue;

      let overlap = false;
      for (const c of g.cards) {
        if (usedCardIds.has(c.id)) {
          overlap = true;
          break;
        }
      }
      if (overlap) continue;

      for (const c of g.cards) {
        usedCardIds.add(c.id);
      }
      currentGroups.push(g);

      if (search(i + 1)) return true;

      currentGroups.pop();
      for (const c of g.cards) {
        usedCardIds.delete(c.id);
      }
    }
    return false;
  }

  search(0);
  return result;
}

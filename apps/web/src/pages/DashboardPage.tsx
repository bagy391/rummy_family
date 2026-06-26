import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Trophy, Plus, LogIn, User, Sparkles, Lock, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import { decodeCleanUTF8 } from "@/lib/utils";

interface GameStats {
  total_games_played: number;
  total_wins: number;
  earnings: number;
  total_points: number;
}

interface LeaderboardEntry {
  player_id: string;
  name: string;
  avatar_url: string | null;
  total_wins: number;
  earnings: number;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<GameStats>({
    total_games_played: 0,
    total_wins: 0,
    earnings: 0,
    total_points: 0,
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [betAmount, setBetAmount] = useState<string>("50");
  const [roomCode, setRoomCode] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [activeRooms, setActiveRooms] = useState<any[]>([]);

  async function fetchDashboardData() {
    if (!user) return;
    
    try {
      // 1. Get stats
      const { data: statsData } = await supabase
        .from("game_stats")
        .select("total_games_played, total_wins, earnings, total_points")
        .eq("player_id", user.id)
        .maybeSingle();
        
      if (statsData) {
        setStats(statsData);
      }

      // 2. Get leaderboard from profiles and stats
      const { data: leaderboardData } = await supabase
        .from("game_stats")
        .select("total_wins, earnings, player_id, profiles(name, avatar_url)")
        .order("earnings", { ascending: false })
        .limit(10);

      if (leaderboardData) {
        const hostname = window.location.hostname;
        const isLocalDev =
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname.startsWith("192.168.") ||
          hostname.startsWith("10.") ||
          hostname.startsWith("172.");

        const mapped = leaderboardData
          .map((x: any) => ({
            player_id: x.player_id,
            name: decodeCleanUTF8(x.profiles?.name || "Player"),
            avatar_url: x.profiles?.avatar_url || null,
            total_wins: x.total_wins,
            earnings: parseFloat(x.earnings) || 0,
          }))
          .filter((p: any) => isLocalDev || !p.name.toLowerCase().includes("test"));
        setLeaderboard(mapped);
      }

      // 3. Get game history
      const { data: rpData } = await supabase
        .from("room_players")
        .select(`
          total_score,
          status,
          rooms:room_id (
            id,
            room_code,
            bet_amount,
            status,
            created_at
          )
        `)
        .eq("player_id", user.id)
        .order("joined_at", { ascending: false });

      if (rpData) {
        const active = rpData
          .filter((x: any) => x.rooms?.status === "active" || x.rooms?.status === "waiting")
          .map((x: any) => ({
            roomId: x.rooms.id,
            roomCode: x.rooms.room_code,
            betAmount: x.rooms.bet_amount,
            createdAt: x.rooms.created_at,
            playerStatus: x.status,
            roomStatus: x.rooms.status,
          }));
        setActiveRooms(active);

        const finished = rpData
          .filter((x: any) => x.rooms?.status === "finished")
          .map((x: any) => ({
            roomId: x.rooms.id,
            roomCode: x.rooms.room_code,
            betAmount: x.rooms.bet_amount,
            createdAt: x.rooms.created_at,
            totalScore: x.total_score,
            playerStatus: x.status,
          }));
        setHistory(finished);
      }

      // 4. Get payments involving user
      const { data: paymentsData } = await supabase
        .from("payment_records")
        .select(`
          id,
          room_id,
          payer_id,
          payee_id,
          amount,
          status,
          rooms:room_id ( room_code ),
          payer:profiles!payer_id ( name ),
          payee:profiles!payee_id ( name, upi_id )
        `)
        .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`);

      if (paymentsData) {
        const mappedPayments = paymentsData.map((p: any) => ({
          id: p.id,
          roomId: p.room_id,
          roomCode: p.rooms?.room_code || "Unknown",
          payerId: p.payer_id,
          payeeId: p.payee_id,
          payerName: decodeCleanUTF8(p.payer?.name || "Player"),
          payeeName: decodeCleanUTF8(p.payee?.name || "Player"),
          payeeUpi: p.payee?.upi_id || "",
          amount: parseFloat(p.amount) || 0,
          status: p.status,
        }));
        setPendingPayments(mappedPayments);
      }
    } catch (err) {
      console.error("Dashboard fetching failed:", err);
    }
  }

  // Fetch stats, leaderboard, history, and payments
  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
  }, [user]);

  const handleConfirmPayment = async (paymentId: string, payeeId: string, payerId: string, amount: number) => {
    try {
      const { error } = await supabase
        .from("payment_records")
        .update({ status: "completed", confirmed_at: new Date().toISOString() })
        .eq("id", paymentId);

      if (error) throw error;
      toast.success("Payment confirmed!");
      
      // Update winner's game stats (add earnings) and payer's stats (deduct earnings)
      await updateStatsEarnings(payeeId, amount);
      await updateStatsEarnings(payerId, -amount);
      
      // Refresh dashboard data
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm payment");
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from("payment_records")
        .update({ status: "paid" })
        .eq("id", paymentId);

      if (error) throw error;
      toast.success("Payment marked as paid! Awaiting payee confirmation.");
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to mark payment as paid");
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from("payment_records")
        .update({ status: "pending" })
        .eq("id", paymentId);

      if (error) throw error;
      toast.info("Payment marked as not received. Payer will be notified.");
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update payment status");
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => toast.success("UPI ID copied!"))
        .catch(() => fallbackCopyText(text));
    } else {
      fallbackCopyText(text);
    }
  };

  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (successful) {
        toast.success("UPI ID copied!");
      } else {
        toast.error("Failed to copy UPI ID");
      }
    } catch (err) {
      toast.error("Failed to copy UPI ID");
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    toast.success("Successfully logged out");
    navigate("/login");
  };

  const handleHardRefresh = async () => {
    try {
      toast.info("Clearing cache and refreshing...");
      
      // Unregister Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      
      // Clear Cache Storage
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
      
      // Force reload with cache busting query param
      const cleanUrl = window.location.origin + window.location.pathname + '?cb=' + Date.now();
      window.location.replace(cleanUrl);
    } catch (err) {
      window.location.reload();
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const isHost = user.role === "host" || user.role === "admin";
    if (!isHost) {
      toast.error("Only authorized hosts can create rooms.");
      return;
    }

    setLoadingCreate(true);

    const numBet = parseFloat(betAmount);
    if (isNaN(numBet) || numBet < 0) {
      toast.error("Bet amount must be a positive number.");
      setLoadingCreate(false);
      return;
    }

    // Generate room code: 6 chars uppercase alphanumeric
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      // Create room record
      const { data: room, error: roomErr } = await supabase
        .from("rooms")
        .insert({
          room_code: code,
          created_by: user.id,
          bet_amount: numBet,
          status: "waiting",
          current_round_number: 0,
        })
        .select()
        .single();

      if (roomErr) throw roomErr;

      // Add self as room player (seat position 0, admin = true)
      const { error: playerErr } = await supabase
        .from("room_players")
        .insert({
          room_id: room.id,
          player_id: user.id,
          seat_position: 0,
          status: "waiting",
          is_admin: true,
          total_score: 0,
        });

      if (playerErr) throw playerErr;

      toast.success(`Room ${code} created successfully!`);
      navigate(`/room/${code}`);
    } catch (err: any) {
      toast.error(err.message || "Could not create room.");
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedCode = roomCode.trim().toUpperCase();
    if (trimmedCode.length !== 6) {
      toast.error("Room code must be exactly 6 characters.");
      return;
    }

    setLoadingJoin(true);

    try {
      // Find room
      const { data: room, error: roomErr } = await supabase
        .from("rooms")
        .select("id, status")
        .eq("room_code", trimmedCode)
        .single();

      if (roomErr || !room) {
        throw new Error("Room not found or expired.");
      }

      // Check if already in the room (allows quick reconnection/rejoin even if game is active)
      const { data: existingPlayer } = await supabase
        .from("room_players")
        .select("id")
        .eq("room_id", room.id)
        .eq("player_id", user.id)
        .maybeSingle();

      if (existingPlayer) {
        // Just navigate to the room
        navigate(`/room/${trimmedCode}`);
        return;
      }

      if (room.status !== "waiting") {
        throw new Error("Game is already in progress or completed.");
      }

      // Check if kicked/banned from this room
      const { data: kickedCheck } = await supabase
        .from("kicked_players")
        .select("id")
        .eq("room_id", room.id)
        .eq("player_id", user.id)
        .maybeSingle();

      if (kickedCheck) {
        throw new Error("You have been kicked from this room lobby and cannot rejoin.");
      }

      // Get occupied seat positions to find the first available seat
      const { data: occupiedPlayers, error: seatErr } = await supabase
        .from("room_players")
        .select("seat_position")
        .eq("room_id", room.id);

      if (seatErr) throw seatErr;

      if (occupiedPlayers && occupiedPlayers.length >= 9) {
        throw new Error("This room lobby is full (max 9 players).");
      }

      const seats = occupiedPlayers?.map((s) => s.seat_position) || [];
      let seatPosition = 0;
      while (seats.includes(seatPosition)) {
        seatPosition++;
      }

      // Join room
      const { error: joinErr } = await supabase
        .from("room_players")
        .insert({
          room_id: room.id,
          player_id: user.id,
          seat_position: seatPosition,
          status: "waiting",
          is_admin: false,
          total_score: 0,
        });


      if (joinErr) throw joinErr;

      toast.success("Joined room!");
      navigate(`/room/${trimmedCode}`);
    } catch (err: any) {
      toast.error(err.message || "Could not join room.");
    } finally {
      setLoadingJoin(false);
    }
  };

  // Helper to color codes
  const getPnlColor = (earnings: number) => {
    if (earnings > 0) return "text-emerald-400";
    if (earnings < 0) return "text-red-400";
    return "text-[var(--color-text-secondary)]";
  };

  return (
    <div className="min-h-dvh bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] safe-top safe-bottom p-4">
      {/* Navbar */}
      <header className="flex justify-between items-center py-4 mb-6 border-b border-[var(--color-border-default)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-400" />
          <h1 className="text-xl font-bold font-[Outfit] tracking-wide">Family Rummy</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] px-3 py-1.5 rounded-full border border-[var(--color-border-default)]">
            <User className="w-4 h-4 text-emerald-400" />
            <span>{user?.displayName}</span>
          </div>
          <button
            onClick={handleHardRefresh}
            className="p-2 rounded-full hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-emerald-400 transition-colors"
            title="Hard Refresh App"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* Left Column: Quick Actions & Personal Stats */}
        <div className="space-y-6 md:col-span-2 min-w-0">
          {/* Welcome Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] border border-[var(--color-border-default)] relative overflow-hidden">
            <div className="absolute right-4 top-4 opacity-5">
              <Trophy className="w-40 h-40 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold font-[Outfit] mb-2">Welcome Back, {user?.displayName}!</h2>
            <p className="text-[var(--color-text-secondary)] text-sm mb-4">
              Create a new table, set your bet, or enter a room code to join an active table.
            </p>
            <div className="text-xs text-[var(--color-text-muted)] font-mono">
              UPI ID: {user?.upiId || "Not set"}
            </div>
          </div>

          {/* Active Games (Quick Rejoin) */}
          {activeRooms.length > 0 && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] border border-amber-500/30 shadow-lg relative overflow-hidden">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
                <Sparkles className="w-24 h-24 text-amber-500" />
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="font-bold font-[Outfit] text-lg text-emerald-400">Active Game or Lobby</h3>
                  </div>
                  <p className="text-[var(--color-text-secondary)] text-sm">
                    You have an ongoing game or lobby. Rejoin now to resume!
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  {activeRooms.map((room) => (
                    <button
                      key={room.roomId}
                      onClick={() => navigate(`/room/${room.roomCode}`)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4" /> {room.roomStatus === "waiting" ? `Rejoin Lobby ${room.roomCode}` : `Rejoin Room ${room.roomCode}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Boxes */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Create Room */}
            {(user?.role === "host" || user?.role === "admin") ? (
              <div className="p-6 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-default)]">
                <div className="flex items-center gap-2 mb-4">
                  <Plus className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold font-[Outfit] text-lg">Create New Room</h3>
                </div>
                <form onSubmit={handleCreateRoom} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                      Bet Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      placeholder="50"
                      className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--color-bg-default)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loadingCreate}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-sm shadow-md hover:scale-[1.01] transition-all"
                  >
                    {loadingCreate ? "Creating..." : "Create Room"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-default)] flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold font-[Outfit] text-lg text-white">Create New Room</h3>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mt-2">
                    Only authorized hosts can create rooms. Please contact the administrator to request host rights.
                  </p>
                </div>
                <div className="text-[11px] text-amber-500/80 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl mt-4 font-semibold text-center select-none">
                  Host Rights Required
                </div>
              </div>
            )}

            {/* Join Room */}
            <div className="p-6 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-default)]">
              <div className="flex items-center gap-2 mb-4">
                <LogIn className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold font-[Outfit] text-lg">Join Private Room</h3>
              </div>
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    6-Character Room Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="RUM4X7"
                    className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--color-bg-default)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] tracking-widest placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loadingJoin}
                  className="w-full py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] hover:border-emerald-500 text-[var(--color-text-primary)] font-semibold text-sm hover:scale-[1.01] transition-all"
                >
                  {loadingJoin ? "Joining..." : "Join Room"}
                </button>
              </form>
            </div>
          </div>

          {/* Personal Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)]">
              <div className="text-xs text-[var(--color-text-secondary)] font-semibold mb-1">Played</div>
              <div className="text-xl font-bold font-[Outfit]">{stats.total_games_played}</div>
            </div>
            
            <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border(--color-border-default)">
              <div className="text-xs text-[var(--color-text-secondary)] font-semibold mb-1">Wins</div>
              <div className="text-xl font-bold font-[Outfit]">{stats.total_wins}</div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border(--color-border-default)">
              <div className="text-xs text-[var(--color-text-secondary)] font-semibold mb-1">Net P&L</div>
              <div className={`text-xl font-bold font-[Outfit] ${getPnlColor(stats.earnings)}`}>
                ₹{stats.earnings}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border(--color-border-default)">
              <div className="text-xs text-[var(--color-text-secondary)] font-semibold mb-1">Points</div>
              <div className="text-xl font-bold font-[Outfit]">{stats.total_points}</div>
            </div>
          </div>

          {/* Unsettled Payments Panel */}
          <div className="p-6 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-default)] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </span>
              <h3 className="font-bold font-[Outfit] text-lg">Unsettled Bet Payments</h3>
            </div>

            {pendingPayments.filter(p => p.status !== "completed").length === 0 ? (
              <div className="text-center py-6 text-sm text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)]/30 rounded-xl border border-dashed border-[var(--color-border-default)]">
                All bets settled! 🎉 No pending payments.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPayments.filter(p => p.status !== "completed").map((pay) => {
                  const isPayerMe = pay.payerId === user?.id;

                  return (
                    <div 
                      key={pay.id} 
                      className={`p-3.5 rounded-xl border flex justify-between items-center bg-[var(--color-bg-secondary)] border-[var(--color-border-default)]`}
                    >
                      <div className="text-xs">
                        <div className="font-semibold text-sm">
                          Room {pay.roomCode}
                        </div>
                        <div className="text-[var(--color-text-secondary)] mt-1 font-medium">
                          {isPayerMe ? (
                            <span>You owe <strong className="text-red-400">₹{pay.amount}</strong> to <strong>{pay.payeeName}</strong></span>
                          ) : (
                            <span><strong>{pay.payerName}</strong> owes you <strong className="text-emerald-400">₹{pay.amount}</strong></span>
                          )}
                          <span className="ml-2 font-mono text-[10px]">
                            ({pay.status === "paid" ? "Awaiting confirmation" : "Pending"})
                          </span>
                        </div>
                        {pay.status !== "completed" && (
                          <div className="text-[var(--color-text-muted)] mt-1 font-mono text-[10.5px]">
                            {pay.payeeUpi ? (
                              <>
                                Payee UPI:{" "}
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(pay.payeeUpi)}
                                  className="font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer focus:outline-none"
                                  title="Click to copy"
                                >
                                  {pay.payeeUpi}
                                </button>
                              </>
                            ) : (
                              <span className="italic text-[var(--color-text-muted)]">Payee UPI not provided</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {isPayerMe ? (
                          <>
                            {pay.status === "pending" ? (
                              <button
                                onClick={() => handleMarkAsPaid(pay.id)}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors"
                              >
                                Mark as Paid
                              </button>
                            ) : (
                              <span className="px-2 py-1 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                                Awaiting Confirm
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {pay.status === "paid" ? (
                              <div className="flex gap-1.5">
                                <button 
                                  onClick={() => handleConfirmPayment(pay.id, pay.payeeId, pay.payerId, pay.amount)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors"
                                >
                                  Confirm Recv
                                </button>
                                <button 
                                  onClick={() => handleRejectPayment(pay.id)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md transition-colors"
                                >
                                  Not Received
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-[var(--color-text-muted)] italic">
                                Awaiting payment
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Game History Panel */}
          <div className="p-6 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-default)] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <h3 className="font-bold font-[Outfit] text-lg">Game History</h3>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-8 text-sm text-[var(--color-text-muted)]">
                No games played yet. Create or join a room to get started!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[var(--color-text-secondary)]">
                  <thead>
                    <tr className="border-b border-[var(--color-border-default)] text-xs uppercase text-[var(--color-text-muted)] font-semibold">
                      <th className="py-3 px-2">Room</th>
                      <th className="py-3 px-2">Date</th>
                      <th className="py-3 px-2">Bet</th>
                      <th className="py-3 px-2">Result</th>
                      <th className="py-3 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((game) => {
                      const gamePayments = pendingPayments.filter(p => p.roomId === game.roomId);
                      const userWonPayments = gamePayments.filter(p => p.payeeId === user?.id);
                      const userLostPayments = gamePayments.filter(p => p.payerId === user?.id);

                      const totalWon = userWonPayments.reduce((sum, p) => sum + p.amount, 0);
                      const totalLost = userLostPayments.reduce((sum, p) => sum + p.amount, 0);

                      const uniquePayees = Array.from(new Set(gamePayments.map(p => p.payeeId)));
                      const isSplit = uniquePayees.length > 1;

                      let settleStatusText = "-";
                      let settleStatusClass = "text-[var(--color-text-muted)]";

                      if (userWonPayments.length > 0 || userLostPayments.length > 0) {
                        const hasPendingIncoming = userWonPayments.some(p => p.status === "pending");
                        const hasPendingOutgoing = userLostPayments.some(p => p.status === "pending");

                        if (hasPendingOutgoing) {
                          settleStatusText = "Pending Payment";
                          settleStatusClass = "text-red-400 font-bold";
                        } else if (hasPendingIncoming) {
                          settleStatusText = "Awaiting Conf.";
                          settleStatusClass = "text-amber-400 font-bold";
                        } else {
                          settleStatusText = "Settled";
                          settleStatusClass = "text-emerald-400";
                        }
                      }

                      return (
                        <tr 
                          key={game.roomId} 
                          className="border-b border-[var(--color-border-default)] hover:bg-[var(--color-bg-secondary)]/25 transition-colors"
                        >
                          <td className="py-3.5 px-2 font-mono font-bold text-[var(--color-text-primary)]">
                            <span 
                              onClick={() => navigate(`/room/${game.roomCode}`)}
                              className="hover:underline cursor-pointer text-emerald-400"
                            >
                              {game.roomCode}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-xs">
                            {new Date(game.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-2 text-xs">
                            ₹{game.betAmount}
                          </td>
                          <td className="py-3.5 px-2 text-xs">
                            {userWonPayments.length > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                {isSplit ? "Split Winner" : "Winner"} (+₹{totalWon})
                              </span>
                            ) : userLostPayments.length > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/25">
                                Lost (-₹{totalLost})
                              </span>
                            ) : game.playerStatus === "winner" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                Winner
                              </span>
                            ) : (
                              <span>{game.totalScore} pts</span>
                            )}
                          </td>
                          <td className={`py-3.5 px-2 text-xs font-semibold ${settleStatusClass}`}>
                            <div>{settleStatusText}</div>
                            {gamePayments.length > 0 && (userWonPayments.length > 0 || userLostPayments.length > 0) && (
                              <div className="mt-1 space-y-0.5 text-[10px] text-[var(--color-text-muted)] font-normal">
                                {gamePayments.map((p) => {
                                  const isPayerMe = p.payerId === user?.id;
                                  const isPayeeMe = p.payeeId === user?.id;
                                  if (!isPayerMe && !isPayeeMe) return null;

                                  const otherPartyName = isPayerMe ? p.payeeName : p.payerName;
                                  const direction = isPayerMe ? "to" : "from";
                                  const statusColor =
                                    p.status === "completed"
                                      ? "text-emerald-500"
                                      : p.status === "paid"
                                      ? "text-amber-400 font-bold"
                                      : "text-slate-400";
                                  const statusLabel =
                                    p.status === "completed"
                                      ? "Paid"
                                      : p.status === "paid"
                                      ? "Awaiting Confirm"
                                      : "Pending";

                                  return (
                                    <div key={p.id} className="whitespace-normal leading-normal">
                                      <span>
                                        ₹{p.amount} {direction} {otherPartyName}{" "}
                                      </span>
                                      <span className={`font-semibold ${statusColor}`}>
                                        ({statusLabel})
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Leaderboard */}
        <div className="p-6 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-default)] flex flex-col h-[480px]">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold font-[Outfit] text-lg">Earnings Leaderboard</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {leaderboard.length === 0 ? (
              <p className="text-[var(--color-text-muted)] text-sm text-center py-8">No records found yet.</p>
            ) : (
              leaderboard.map((item, idx) => (
                <div 
                  key={item.player_id} 
                  className={`flex justify-between items-center p-2.5 rounded-lg border transition-colors ${
                    item.player_id === user?.id 
                      ? "bg-emerald-500/10 border-emerald-500/30" 
                      : "bg-[var(--color-bg-secondary)] border-[var(--color-border-default)]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-bold w-4 text-center ${
                      idx === 0 ? "text-amber-400" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-amber-600" : "text-[var(--color-text-muted)]"
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="text-sm font-semibold max-w-[120px] truncate">{item.name}</div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="text-[var(--color-text-secondary)]">{item.total_wins} wins</div>
                    <div className={`font-bold ${getPnlColor(item.earnings)}`}>
                      ₹{item.earnings}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

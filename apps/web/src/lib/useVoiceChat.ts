import { useState, useEffect, useRef, useCallback } from "react";
import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";

export interface VoiceParticipant {
  uid: number;
  /** Mapped from uid → player name in RoomPage */
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
}

interface UseVoiceChatOptions {
  roomCode: string;
  userName: string;
  userId: string;
  /** Map of numeric uid → display name for all players */
  uidToName: Record<number, string>;
}

interface UseVoiceChatReturn {
  isInVoice: boolean;
  isMuted: boolean;
  voiceParticipants: VoiceParticipant[];
  myUid: number | null;
  join: () => Promise<void>;
  leave: () => void;
  toggleMute: () => void;
  error: string | null;
  isJoining: boolean;
}

/** Deterministically derive a uint32 UID from a UUID string */
export function uidFromUserId(userId: string): number {
  const hex = userId.replace(/-/g, "").substring(0, 8);
  return (parseInt(hex, 16) >>> 0) || 1; // ensure non-zero
}

// Suppress Agora console noise in production
AgoraRTC.setLogLevel(2); // 0=DEBUG 1=INFO 2=WARN 3=ERROR 4=NONE

export function useVoiceChat({
  roomCode,
  userName,
  userId,
  uidToName,
}: UseVoiceChatOptions): UseVoiceChatReturn {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef = useRef<ILocalAudioTrack | null>(null);
  const hasLeftRef = useRef(false);

  const [isInVoice, setIsInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [speakingUids, setSpeakingUids] = useState<Set<number>>(new Set());
  const [mutedUids, setMutedUids] = useState<Set<number>>(new Set());

  const myUid = userId ? uidFromUserId(userId) : null;

  // Set up speaking detection interval
  useEffect(() => {
    if (!isInVoice) return;

    const interval = setInterval(() => {
      const client = clientRef.current;
      if (!client) return;

      // Use Agora's built-in volume indicator
      const volumes = client.getRemoteAudioStats();
      const speaking = new Set<number>();

      Object.entries(volumes).forEach(([uid, stats]) => {
        const level = (stats as any).receiveLevel ?? 0;
        if (level > 5) speaking.add(Number(uid));
      });

      setSpeakingUids(speaking);
    }, 500);

    return () => clearInterval(interval);
  }, [isInVoice]);

  const join = useCallback(async () => {
    if (isInVoice || isJoining) return;
    setIsJoining(true);
    setError(null);
    hasLeftRef.current = false;

    try {
      // 1. Get token from Vercel serverless function
      const uid = uidFromUserId(userId);
      const res = await fetch("/api/get-agora-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, uid }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to get voice token");
      }

      const { token, appId } = await res.json();
      if (hasLeftRef.current) return;

      // 2. Create Agora client if not yet created
      if (!clientRef.current) {
        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        // Track remote users joining
        client.on("user-joined", (user) => {
          setRemoteUsers((prev) => {
            const exists = prev.find((u) => u.uid === user.uid);
            return exists ? prev : [...prev, user];
          });
        });

        // Track remote users publishing audio/video
        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === "audio") {
            user.audioTrack?.play();
          }
          // Ensure they are in the list
          setRemoteUsers((prev) => {
            const exists = prev.find((u) => u.uid === user.uid);
            return exists ? prev : [...prev, user];
          });
        });

        // Track remote users unpublishing
        client.on("user-unpublished", (user) => {
          setSpeakingUids((prev) => {
            const next = new Set(prev);
            next.delete(Number(user.uid));
            return next;
          });
        });

        // Track remote users leaving
        client.on("user-left", (user) => {
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
          setSpeakingUids((prev) => {
            const next = new Set(prev);
            next.delete(Number(user.uid));
            return next;
          });
          setMutedUids((prev) => {
            const next = new Set(prev);
            next.delete(Number(user.uid));
            return next;
          });
        });

        // Track remote users mute/unmute state changes
        client.on("user-mute-audio", (user: IAgoraRTCRemoteUser, muted: boolean) => {
          setMutedUids((prev) => {
            const next = new Set(prev);
            if (muted) next.add(Number(user.uid));
            else next.delete(Number(user.uid));
            return next;
          });
        });
      }

      if (hasLeftRef.current) return;

      // 3. Join Agora channel
      await clientRef.current.join(appId, roomCode, token, uid);

      if (hasLeftRef.current) {
        clientRef.current.leave().catch(() => {});
        return;
      }

      // 4. Create and publish local microphone track
      const micTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: "speech_low_quality",
      });

      if (hasLeftRef.current) {
        micTrack.stop();
        micTrack.close();
        if (clientRef.current) {
          clientRef.current.leave().catch(() => {});
        }
        return;
      }

      localTrackRef.current = micTrack;
      await clientRef.current.publish(micTrack);

      if (hasLeftRef.current) {
        micTrack.stop();
        micTrack.close();
        localTrackRef.current = null;
        if (clientRef.current) {
          clientRef.current.leave().catch(() => {});
        }
        return;
      }

      setIsInVoice(true);
    } catch (err: any) {
      console.error("Voice join error:", err);
      const msg = err?.message || "";
      if (msg.includes("NOT_SUPPORTED") || msg.includes("getUserMedia")) {
        setError("Voice requires HTTPS. Use the deployed app or access via https:// locally.");
      } else if (err?.message?.includes("Permission") || err?.name === "NotAllowedError") {
        setError("Microphone permission denied. Please allow mic access and try again.");
      } else if (msg.includes("token")) {
        setError("Could not get voice token. Check your Agora credentials.");
      } else {
        setError(err?.message || "Failed to join voice. Please try again.");
      }
    } finally {
      setIsJoining(false);
    }
  }, [isInVoice, isJoining, roomCode, userId]);

  const leave = useCallback(() => {
    hasLeftRef.current = true;

    // Stop and close local audio track
    if (localTrackRef.current) {
      localTrackRef.current.stop();
      localTrackRef.current.close();
      localTrackRef.current = null;
    }

    // Leave the Agora channel
    if (clientRef.current) {
      clientRef.current.leave().catch(() => {});
      // Don't destroy the client — can re-join later
    }

    setIsInVoice(false);
    setIsMuted(false);
    setRemoteUsers([]);
    setSpeakingUids(new Set());
    setMutedUids(new Set());
    setError(null);
  }, []);

  const toggleMute = useCallback(() => {
    const track = localTrackRef.current;
    if (!track) return;
    const newMuted = !isMuted;
    track.setEnabled(!newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (localTrackRef.current) {
        localTrackRef.current.stop();
        localTrackRef.current.close();
      }
      if (clientRef.current) {
        clientRef.current.leave().catch(() => {});
      }
    };
  }, []);

  // Build voiceParticipants list: me + remotes
  const voiceParticipants: VoiceParticipant[] = [];

  if (isInVoice && myUid !== null) {
    voiceParticipants.push({
      uid: myUid,
      name: userName || "You",
      isSpeaking: false, // local speaking detection is complex; keep false
      isMuted,
    });
  }

  remoteUsers.forEach((u) => {
    const uid = Number(u.uid);
    voiceParticipants.push({
      uid,
      name: uidToName[uid] || `Player #${uid}`,
      isSpeaking: speakingUids.has(uid),
      isMuted: mutedUids.has(uid),
    });
  });

  return {
    isInVoice,
    isMuted,
    voiceParticipants,
    myUid,
    join,
    leave,
    toggleMute,
    error,
    isJoining,
  };
}

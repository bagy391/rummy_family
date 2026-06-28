import type { VercelRequest, VercelResponse } from "@vercel/node";
import { RtcTokenBuilder, RtcRole } from "agora-token";

/**
 * POST /api/get-agora-token
 * Generates an Agora RTC token for a given channel (room code) and user.
 * The App Certificate stays server-side only — never exposed to the browser.
 *
 * Body: { roomCode: string, uid: number }
 * Returns: { token: string, appId: string }
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    console.error("Missing AGORA_APP_ID or AGORA_APP_CERTIFICATE env vars");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  const { roomCode, uid } = req.body as { roomCode: string; uid: number };

  if (!roomCode || uid === undefined) {
    return res.status(400).json({ error: "roomCode and uid are required" });
  }

  try {
    // Token expires in 24 hours
    const expirationTimeInSeconds = 24 * 60 * 60;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      roomCode,        // channel name = room code (e.g. "ABC123")
      uid,             // numeric uid derived from user UUID
      RtcRole.PUBLISHER,
      privilegeExpireTime,
      privilegeExpireTime
    );

    return res.status(200).json({ token, appId });
  } catch (err) {
    console.error("Token generation failed:", err);
    return res.status(500).json({ error: "Token generation failed" });
  }
}

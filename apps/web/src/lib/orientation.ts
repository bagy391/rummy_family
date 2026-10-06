import { useState, useEffect } from "react";

/**
 * Check if the application is running as an installed PWA.
 */
export function isPWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

/**
 * Check if running on a mobile / touch handheld device.
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ("ontouchstart" in window && (window.innerWidth <= 1024 || window.innerHeight <= 1024))
  );
}

/**
 * Rotate and lock the native device setting into landscape mode.
 * On PWAs and supported Android devices, screen.orientation.lock rotates the actual OS display.
 * Cannot be rotated back to portrait until unlocked.
 */
export async function lockToLandscape(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const scr = window.screen as any;

  // Modern Screen Orientation API
  if (scr?.orientation?.lock) {
    try {
      await scr.orientation.lock("landscape");
      return true;
    } catch (err) {
      // In standard non-PWA browser tabs, orientation lock may require fullscreen
      try {
        const docEl = document.documentElement as any;
        if (!document.fullscreenElement && docEl?.requestFullscreen) {
          await docEl.requestFullscreen().catch(() => {});
          if (scr?.orientation?.lock) {
            await scr.orientation.lock("landscape");
            return true;
          }
        }
      } catch {}
    }
  }

  // Legacy vendor-prefixed lockOrientation
  const legacyLock = scr?.lockOrientation || scr?.mozLockOrientation || scr?.msLockOrientation;
  if (legacyLock) {
    try {
      const locked = legacyLock.call(scr, "landscape");
      if (locked) return true;
    } catch {}
  }

  return false;
}

/**
 * Rotate the native device setting back to portrait.
 */
export async function lockToPortrait(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const scr = window.screen as any;
  if (scr?.orientation?.lock) {
    try {
      await scr.orientation.lock("portrait");
      return true;
    } catch {}
  }

  const legacyLock = scr?.lockOrientation || scr?.mozLockOrientation || scr?.msLockOrientation;
  if (legacyLock) {
    try {
      legacyLock.call(scr, "portrait");
      return true;
    } catch {}
  }

  return false;
}

/**
 * Unlock device orientation and return the device setting to normal (portrait for mobile/PWA).
 */
export async function unlockOrientation(): Promise<void> {
  if (typeof window === "undefined") return;

  const scr = window.screen as any;

  try {
    if (scr?.orientation?.unlock) {
      scr.orientation.unlock();
    }
    const legacyUnlock = scr?.unlockOrientation || scr?.mozUnlockOrientation || scr?.msUnlockOrientation;
    if (legacyUnlock) {
      legacyUnlock.call(scr);
    }
  } catch {}

  // When returning to dashboard on mobile / PWA, explicitly restore normal portrait mode
  if (isPWA() || isMobileDevice()) {
    try {
      await lockToPortrait();
    } catch {}
  }

  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen().catch(() => {});
    }
  } catch {}
}

/**
 * React hook to observe current orientation and PWA/mobile capabilities.
 */
export function useOrientation() {
  const [isLandscape, setIsLandscape] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > window.innerHeight;
  });

  const [pwaActive, setPwaActive] = useState(() => isPWA());
  const [mobileActive, setMobileActive] = useState(() => isMobileDevice());

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
      setPwaActive(isPWA());
      setMobileActive(isMobileDevice());
    };

    checkOrientation();

    const mql = window.matchMedia("(orientation: landscape)");
    mql.addEventListener("change", checkOrientation);
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      mql.removeEventListener("change", checkOrientation);
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  return {
    isLandscape,
    isPortrait: !isLandscape,
    isPWA: pwaActive,
    isMobile: mobileActive,
  };
}

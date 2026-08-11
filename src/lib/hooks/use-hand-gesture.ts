import { useEffect, useRef, useState } from "react";
import type { HandLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

/** Fingertip-to-wrist spread, normalized by palm size: high = open hand, low = closed fist. */
const OPEN_THRESHOLD = 1.35;
const CLOSE_THRESHOLD = 0.9;
/** The close must follow the open within this window to count as one grab gesture. */
const OPEN_TIMEOUT_MS = 2000;
/** Minimum gap between two triggered gestures, so one grab doesn't fire repeatedly. */
const COOLDOWN_MS = 2000;

const FINGERTIP_INDICES = [4, 8, 12, 16, 20];

function distance(a: NormalizedLandmark, b: NormalizedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function handOpenness(landmarks: NormalizedLandmark[]) {
  const wrist = landmarks[0];
  const palmSize = distance(wrist, landmarks[9]) || 1;
  const avgSpread =
    FINGERTIP_INDICES.reduce((sum, i) => sum + distance(landmarks[i], wrist), 0) /
    FINGERTIP_INDICES.length;
  return avgSpread / palmSize;
}

interface UseHandGestureOptions {
  enabled: boolean;
  onGrab: () => void;
}

/** Watches the webcam for an open→closed hand ("grab") gesture and calls onGrab when it happens. */
export function useHandGesture({ enabled, onGrab }: UseHandGestureOptions) {
  const [isSupported] = useState(() => !!navigator.mediaDevices?.getUserMedia);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onGrabRef = useRef(onGrab);
  onGrabRef.current = onGrab;

  useEffect(() => {
    if (!enabled || !isSupported) {
      setIsReady(false);
      return;
    }

    let cancelled = false;
    let landmarker: HandLandmarker | null = null;
    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let openedAt: number | null = null;
    let cooldownUntil = 0;

    async function setup() {
      try {
        const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
        landmarker = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 1,
        });
        if (cancelled) return;

        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const video = document.createElement("video");
        video.srcObject = stream;
        video.playsInline = true;
        video.muted = true;
        await video.play();
        if (cancelled) return;

        setIsReady(true);
        setError(null);

        const loop = () => {
          if (cancelled) return;

          if (landmarker && video.readyState >= 2) {
            const result = landmarker.detectForVideo(video, performance.now());
            const landmarks = result.landmarks[0];

            if (landmarks) {
              const openness = handOpenness(landmarks);
              const now = performance.now();

              if (now > cooldownUntil) {
                if (openness > OPEN_THRESHOLD) {
                  openedAt = now;
                } else if (
                  openness < CLOSE_THRESHOLD &&
                  openedAt !== null &&
                  now - openedAt < OPEN_TIMEOUT_MS
                ) {
                  openedAt = null;
                  cooldownUntil = now + COOLDOWN_MS;
                  onGrabRef.current();
                }
              }
            }
          }

          rafId = requestAnimationFrame(loop);
        };
        loop();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao iniciar a câmera/gestos");
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
      setIsReady(false);
    };
  }, [enabled, isSupported]);

  return { isSupported, isReady, error };
}

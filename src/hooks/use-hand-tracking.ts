'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { HandLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import type { HandLandmarkerResult, Landmark, Handedness } from '@mediapipe/tasks-vision';
import { useIsMobile } from './use-mobile';

type HandTrackingHook = {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  detectedFingers: number;
  startVideo: () => Promise<void>;
  stopVideo: () => void;
  isLoading: boolean;
  error: string | null;
  handedness: Handedness[][];
  landmarks: Landmark[][];
};

import { countFingers } from '@/lib/finger-counting';

export function useHandTracking(): HandTrackingHook {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const isMobile = useIsMobile();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detectedFingers, setDetectedFingers] = useState(0);
  const [handedness, setHandedness] = useState<Handedness[][]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[][]>([]);

  const predictWebcam = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !handLandmarkerRef.current || !video.srcObject || video.readyState < 2) {
        requestRef.current = requestAnimationFrame(predictWebcam);
        return;
    }
    
    if (video.videoWidth > 0 && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }

    const startTimeMs = performance.now();
    const results = handLandmarkerRef.current.detectForVideo(video, startTimeMs);

    const canvasCtx = canvas.getContext('2d');
    if (canvasCtx && drawingUtilsRef.current) {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (results.landmarks) {
        for (let i = 0; i < results.landmarks.length; i++) {
          const landmark = results.landmarks[i];
          const isRightHand = results.handedness[i] && results.handedness[i][0].categoryName === 'Right';
          const connectorsColor = isRightHand ? 'rgba(230, 230, 250, 0.9)' : 'rgba(216, 191, 216, 0.7)';
          const landmarksColor = isRightHand ? 'rgba(216, 191, 216, 0.9)' : 'rgba(230, 230, 250, 0.9)';

          drawingUtilsRef.current.drawConnectors(landmark, HandLandmarker.HAND_CONNECTIONS, {
            color: connectorsColor,
            lineWidth: 2,
          });
          drawingUtilsRef.current.drawLandmarks(landmark, { color: landmarksColor, lineWidth: 1, radius: 2 });
        }
      }
      canvasCtx.restore();
    }
    
    // This is a simplified finger count for overall gesture detection.
    const totalFingerCount = results.landmarks ? results.landmarks.reduce((acc, hand, index) => {
        const handInfo = results.handedness[index] ? results.handedness[index][0] : undefined;
        return acc + (handInfo ? countFingers(hand, handInfo as any) : 0);
    }, 0) : 0;
    
    setDetectedFingers(totalFingerCount);

    setHandedness(results.handedness || []);
    setLandmarks(results.landmarks || []);

    requestRef.current = requestAnimationFrame(predictWebcam);
  }, []);

  const stopVideo = useCallback(() => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadeddata', predictWebcam);
      }
    }
  }, [predictWebcam]);

  const startVideo = useCallback(async (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (isLoading || (videoRef.current && videoRef.current.srcObject)) {
            resolve();
            return;
        }
    
        setError(null);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              width: { ideal: isMobile ? 640 : 1280 }, 
              height: { ideal: isMobile ? 480 : 720 },
              facingMode: "user" 
            },
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            const videoReady = () => {
                predictWebcam();
                videoRef.current?.removeEventListener('loadeddata', videoReady);
                resolve();
            }
            videoRef.current.addEventListener('loadeddata', videoReady);
          } else {
            reject(new Error("Video ref not available"));
          }
        } catch (err: any) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setError('Camera permission denied. Please allow camera access to play.');
          } else {
            setError(`Could not access camera: ${err.message}`);
          }
          reject(err);
        }
    });
  }, [isLoading, isMobile, predictWebcam]);


  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true);
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.6,
          minHandTrackingConfidence: 0.6,
        });
        handLandmarkerRef.current = handLandmarker;

        if (canvasRef.current) {
          const canvasCtx = canvasRef.current.getContext('2d');
          if (canvasCtx) {
            drawingUtilsRef.current = new DrawingUtils(canvasCtx);
          }
        }
      } catch (e: any) {
        setError(`Failed to initialize hand tracking model: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    }
    initialize();

    return () => {
      stopVideo();
      handLandmarkerRef.current?.close();
    };
  }, [stopVideo]);


  return { videoRef, canvasRef, detectedFingers, startVideo, stopVideo, isLoading, error, handedness, landmarks };
}


// A more specific finger counting for drawing logic.
function countFingers(landmarks: Landmark[], handedness: Handedness): number {
    let fingerCount = 0;

    // Landmark indices for finger tips
    const tipIds = [4, 8, 12, 16, 20];

    // Thumb
    if (handedness.categoryName === 'Right') {
        if (landmarks[tipIds[0]].x < landmarks[tipIds[0] - 1].x) {
            fingerCount++;
        }
    } else { // Left hand
        if (landmarks[tipIds[0]].x > landmarks[tipIds[0] - 1].x) {
            fingerCount++;
        }
    }

    // Other 4 fingers
    for (let i = 1; i < 5; i++) {
        if (landmarks[tipIds[i]].y < landmarks[tipIds[i] - 2].y) {
            fingerCount++;
        }
    }

    return fingerCount;
}

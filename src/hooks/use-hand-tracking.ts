'use client';

import { useState, useEffect, useRef } from 'react';
import { HandLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import type { HandLandmarkerResult, Landmark, Handedness } from '@mediapipe/tasks-vision';

type HandTrackingHook = {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  detectedFingers: number;
  startVideo: () => void;
  stopVideo: () => void;
  isLoading: boolean;
  error: string | null;
  handedness: Handedness[];
  landmarks: Landmark[][];
};

import { countFingers } from '@/lib/finger-counting';

export function useHandTracking(): HandTrackingHook {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detectedFingers, setDetectedFingers] = useState(0);
  const [handedness, setHandedness] = useState<Handedness[]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[][]>([]);

  useEffect(() => {
    async function initialize() {
      try {
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
          minHandDetectionConfidence: 0.7,
        });
        handLandmarkerRef.current = handLandmarker;

        if (canvasRef.current) {
          const canvasCtx = canvasRef.current.getContext('2d');
          if (canvasCtx) {
            drawingUtilsRef.current = new DrawingUtils(canvasCtx);
          }
        }
        setIsLoading(false);
      } catch (e: any) {
        setError(`Failed to initialize hand tracking model: ${e.message}`);
        setIsLoading(false);
      }
    }
    initialize();

    return () => {
      stopVideo();
      handLandmarkerRef.current?.close();
    };
  }, []);

  const startVideo = async () => {
    if (isLoading) return;
    if (videoRef.current && videoRef.current.srcObject) return; // Already running

    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', predictWebcam);
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access to play.');
      } else {
        setError(`Could not access camera: ${err.message}`);
      }
    }
  };

  const stopVideo = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const predictWebcam = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !handLandmarkerRef.current) return;
    
    if (video.videoWidth === 0) { // Wait for video to be ready
        requestRef.current = requestAnimationFrame(predictWebcam);
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const startTimeMs = performance.now();
    const results = handLandmarkerRef.current.detectForVideo(video, startTimeMs);

    const canvasCtx = canvas.getContext('2d');
    if (canvasCtx && drawingUtilsRef.current) {
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      if (results.landmarks) {
        for (const landmark of results.landmarks) {
          drawingUtilsRef.current.drawConnectors(landmark, HandLandmarker.HAND_CONNECTIONS, {
            color: 'rgba(216, 191, 216, 0.7)',
            lineWidth: 2,
          });
          drawingUtilsRef.current.drawLandmarks(landmark, { color: 'rgba(230, 230, 250, 0.9)', lineWidth: 1, radius: 2 });
        }
      }
    }
    
    const fingerCount = results.landmarks ? countFingers(results.landmarks, results.handedness) : 0;
    setDetectedFingers(fingerCount);
    setHandedness(results.handedness || []);
    setLandmarks(results.landmarks || []);


    if (canvasCtx && results.landmarks.length > 0) {
        const topOfHand = results.landmarks[0].reduce((min, lm) => (lm.y < min.y ? lm : min), results.landmarks[0][0]);
        const x = topOfHand.x * canvas.width;
        const y = topOfHand.y * canvas.height;

        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        canvasCtx.font = 'bold 24px "Space Grotesk", sans-serif';
        canvasCtx.textAlign = 'center';

        const text = `Fingers: ${fingerCount}`;
        const textMetrics = canvasCtx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = 24;

        // Flip the text horizontally to match the mirrored video
        canvasCtx.save();
        canvasCtx.scale(-1, 1);

        const flippedX = -x;
        
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        canvasCtx.roundRect(flippedX - textWidth / 2 - 10, y - textHeight - 20, textWidth + 20, textHeight + 15, 8);
        canvasCtx.fill();
        
        canvasCtx.fillStyle = 'white';
        canvasCtx.fillText(text, flippedX, y - 10);
        
        canvasCtx.restore();
    }


    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return { videoRef, canvasRef, detectedFingers, startVideo, stopVideo, isLoading, error, handedness, landmarks };
}

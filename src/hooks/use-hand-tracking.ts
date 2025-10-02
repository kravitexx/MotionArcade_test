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
            color: '#D8BFD8',
            lineWidth: 3,
          });
          drawingUtilsRef.current.drawLandmarks(landmark, { color: '#E6E6FA', lineWidth: 1, radius: 3 });
        }
      }
    }

    if (results.landmarks) {
        const fingerCount = countFingers(results.landmarks, results.handedness);
        setDetectedFingers(fingerCount);
        setHandedness(results.handedness);
        setLandmarks(results.landmarks);
    } else {
        setDetectedFingers(0);
        setHandedness([]);
        setLandmarks([]);
    }


    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return { videoRef, canvasRef, detectedFingers, startVideo, stopVideo, isLoading, error, handedness, landmarks };
}

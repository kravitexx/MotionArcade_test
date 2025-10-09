'use client';

import { useEffect, useRef } from 'react';
import { useHandTracking } from '@/hooks/use-hand-tracking';

// Constants for paddle dimensions
const PADDLE_WIDTH = 100;

/**
 * This component demonstrates how to control a paddle-like element
 * using hand tracking. The paddle moves horizontally based on the
 * position of the user's wrist.
 */
export default function HandTrackingPaddleLogic() {
  const { landmarks } = useHandTracking();
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const playerPaddle = useRef({ x: 0 });

  useEffect(() => {
    const gameCanvas = gameCanvasRef.current;
    if (!gameCanvas) return;

    const update = () => {
      // Move paddle with hand based on landmarks
      if (landmarks && landmarks.length > 0) {
        const hand = landmarks[0];
        const wrist = hand[0]; // Using the wrist (landmark 0) for stable control
        
        if (wrist) {
          // The landmarks are normalized (0-1). We convert the x-coordinate to the canvas's width.
          // The video is mirrored, so we flip the x-coordinate using (1 - wrist.x).
          // We subtract half the paddle width to center the paddle on the hand.
          const newPaddleX = (1 - wrist.x) * gameCanvas.width - PADDLE_WIDTH / 2;
          
          // Clamp the paddle position to stay within the canvas bounds
          playerPaddle.current.x = Math.max(0, Math.min(newPaddleX, gameCanvas.width - PADDLE_WIDTH));
        }
      }
    };

    // Start the update loop
    const animationFrameId = requestAnimationFrame(function gameLoop() {
      update();
      requestAnimationFrame(gameLoop);
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [landmarks]);

  // In a real application, you would use `playerPaddle.current.x` to position your paddle element.

  return null; // This component only contains logic and does not render anything itself.
}

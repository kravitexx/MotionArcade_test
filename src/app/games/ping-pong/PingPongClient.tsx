'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useHandTracking } from '@/hooks/use-hand-tracking';
import { Loader } from 'lucide-react';

// Constants
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 10;
const BALL_RADIUS = 10;
const BALL_SPEED = 5;

export default function PingPongClient() {
  const { videoRef, landmarks, handTrackingCanvasRef, isLoading, error } = useHandTracking();
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Game state
  const ball = useRef({
    x: 0,
    y: 0,
    vx: 5,
    vy: 5,
  });
  const playerPaddle = useRef({ x: 0 });

  const resetGame = () => {
    const gameCanvas = gameCanvasRef.current;
    if (!gameCanvas) return;

    setScore(0);
    setGameOver(false);
    ball.current.x = gameCanvas.width / 2;
    ball.current.y = gameCanvas.height / 2;
    ball.current.vx = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
    ball.current.vy = -BALL_SPEED;
    playerPaddle.current.x = gameCanvas.width / 2 - PADDLE_WIDTH / 2;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    gameLoop();
  };

  const gameLoop = () => {
    update();
    draw();
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  };

  const update = () => {
    if (gameOver) return;
    const gameCanvas = gameCanvasRef.current;
    if (!gameCanvas) return;

    // Move ball
    ball.current.x += ball.current.vx;
    ball.current.y += ball.current.vy;

    // Ball collision with walls
    if (ball.current.x - BALL_RADIUS < 0 || ball.current.x + BALL_RADIUS > gameCanvas.width) {
      ball.current.vx = -ball.current.vx;
    }
    if (ball.current.y - BALL_RADIUS < 0) {
      ball.current.vy = -ball.current.vy;
    }

    // Ball collision with paddle
    if (
      ball.current.vy > 0 &&
      ball.current.y + BALL_RADIUS >= gameCanvas.height - PADDLE_HEIGHT &&
      ball.current.x + BALL_RADIUS >= playerPaddle.current.x &&
      ball.current.x - BALL_RADIUS <= playerPaddle.current.x + PADDLE_WIDTH
    ) {
      ball.current.vy = -ball.current.vy;
      const hitPoint = (ball.current.x - (playerPaddle.current.x + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
      ball.current.vx = hitPoint * BALL_SPEED * 1.5;
      setScore((s) => s + 1);
    }

    // Game over when ball hits the bottom
    if (ball.current.y + BALL_RADIUS > gameCanvas.height) {
      setGameOver(true);
      ball.current.vx = 0;
      ball.current.vy = 0;
    }

    // Move paddle with hand
    if (landmarks && landmarks.length > 0) {
      const hand = landmarks[0];
      const wrist = hand[0]; // Assuming wrist is the first landmark
      if (wrist) {
        playerPaddle.current.x = (1 - wrist.x) * gameCanvas.width - PADDLE_WIDTH / 2;
      }
    }
  };

  const draw = () => {
    const gameCanvas = gameCanvasRef.current;
    if (!gameCanvas) return;
    const ctx = gameCanvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

    // Draw paddle
    ctx.fillStyle = 'white';
    ctx.fillRect(playerPaddle.current.x, gameCanvas.height - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.current.x, ball.current.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
  };

  useEffect(() => {
    const gameCanvas = gameCanvasRef.current;
    if (!gameCanvas) return;

    const resizeObserver = new ResizeObserver(() => {
        gameCanvas.width = gameCanvas.clientWidth;
        gameCanvas.height = gameCanvas.clientHeight;
        resetGame();
    });
    resizeObserver.observe(gameCanvas);

    return () => {
      resizeObserver.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(gameLoop, [landmarks]);

  useEffect(() => {
    if (gameOver) {
      setHighScore((prevHighScore) => Math.max(score, prevHighScore));
    }
  }, [gameOver, score]);


  return (
    <main className="container mx-auto px-4 py-8 flex-grow flex flex-col items-center justify-center">
      <div className="w-full max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/2 w-full">
            <div className="aspect-[4/3] bg-black relative flex items-center justify-center rounded-lg">
              {isLoading && (
                <div className="absolute inset-0 bg-black/60 flex flex-col gap-4 items-center justify-center rounded-lg text-white z-30">
                  <Loader className="h-16 w-16 animate-spin" />
                  <p className="font-headline text-3xl">Loading Hand Tracking...</p>
                </div>
              )}
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover rounded-lg"
                autoPlay
                playsInline
                muted
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas
                ref={handTrackingCanvasRef}
                className="absolute inset-0 w-full h-full rounded-lg"
              />
            </div>
          </div>
          <div className="lg:w-1/2 w-full">
             <div className="aspect-[4/3] bg-black relative flex items-center justify-center rounded-lg">
                <canvas ref={gameCanvasRef} className="w-full h-full" />
                {gameOver && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                    <h2 className="text-4xl font-bold">Game Over</h2>
                  </div>
                )}
                 <div className="absolute top-4 right-4 text-white text-right">
                    <p className="text-xl font-bold">Score: {score}</p>
                    <p className="text-xl font-bold">High Score: {highScore}</p>
                </div>
            </div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={resetGame}
                className="bg-white text-black px-4 py-2 rounded-lg font-bold"
              >
                Restart
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

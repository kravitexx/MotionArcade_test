'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useHandTracking } from '@/hooks/use-hand-tracking';
import { Button } from '@/components/ui/button';
import { Loader, Dribbble, AlertTriangle } from 'lucide-react';

const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 20;
const BALL_RADIUS = 10;

type GameState = 'IDLE' | 'LOADING' | 'PLAYING' | 'GAME_OVER' | 'ERROR';

export default function PingPongBallClient() {
  const {
    videoRef,
    startVideo,
    stopVideo,
    landmarks,
    isLoading: isHandTrackingLoading,
    error: handTrackingError,
  } = useHandTracking();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopId = useRef<number>();

  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>('IDLE');

  const ball = useRef({ x: 0, y: 0, dx: 0, dy: 0 });
  const paddle = useRef({ x: 0 });

  const drawInitialState = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const paddleTop = canvas.height - PADDLE_HEIGHT;
    const initialPaddleX = canvas.width / 2 - PADDLE_WIDTH / 2;
    const initialBallX = canvas.width / 2;
    const initialBallY = BALL_RADIUS + 20;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'hsl(var(--primary))';
    ctx.fillRect(initialPaddleX, paddleTop, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.beginPath();
    ctx.arc(initialBallX, initialBallY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'hsl(var(--foreground))';
    ctx.fill();
    ctx.closePath();
  }, []);

  const resetGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setScore(0);
    paddle.current.x = canvas.width / 2 - PADDLE_WIDTH / 2;
    ball.current = {
      x: canvas.width / 2,
      y: BALL_RADIUS + 20,
      dx: (Math.random() > 0.5 ? 1 : -1) * 4,
      dy: 4,
    };
  }, []);

  const handleStartGame = useCallback(async () => {
    if (gameState === 'LOADING' || gameState === 'PLAYING') return;
    setGameState('LOADING');
    try {
      await startVideo();
      setGameState('PLAYING');
    } catch (err) {
      console.error("Error starting video:", err);
      setGameState('ERROR');
    }
  }, [gameState, startVideo]);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (landmarks.length > 0) {
      const wrist = landmarks[0][0];
      const paddleX = (1 - wrist.x) * canvas.width - PADDLE_WIDTH / 2;
      paddle.current.x = Math.max(0, Math.min(canvas.width - PADDLE_WIDTH, paddleX));
    }

    ball.current.x += ball.current.dx;
    ball.current.y += ball.current.dy;

    if (ball.current.x - BALL_RADIUS < 0 || ball.current.x + BALL_RADIUS > canvas.width) ball.current.dx *= -1;
    if (ball.current.y - BALL_RADIUS < 0) ball.current.dy *= -1;

    const paddleTop = canvas.height - PADDLE_HEIGHT;
    if (
      ball.current.y + BALL_RADIUS > paddleTop &&
      ball.current.y - BALL_RADIUS < paddleTop + PADDLE_HEIGHT &&
      ball.current.x + BALL_RADIUS > paddle.current.x &&
      ball.current.x - BALL_RADIUS < paddle.current.x + PADDLE_WIDTH &&
      ball.current.dy > 0
    ) {
      ball.current.dy *= -1;
      setScore((s) => s + 1);
      let deltaX = ball.current.x - (paddle.current.x + PADDLE_WIDTH / 2);
      ball.current.dx = deltaX * 0.1;
    }

    if (ball.current.y > canvas.height) setGameState('GAME_OVER');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'hsl(var(--primary))';
    ctx.fillRect(paddle.current.x, paddleTop, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.beginPath();
    ctx.arc(ball.current.x, ball.current.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'hsl(var(--foreground))';
    ctx.fill();
    ctx.closePath();
    ctx.fillStyle = 'hsl(var(--muted-foreground))';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${score}`, canvas.width / 2, 40);

    gameLoopId.current = requestAnimationFrame(gameLoop);
  }, [landmarks, score]);
  
  useEffect(() => {
      if (handTrackingError) {
          setGameState('ERROR');
      }
  }, [handTrackingError]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      resetGame();
      gameLoopId.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopId.current) cancelAnimationFrame(gameLoopId.current);
      if (gameState !== 'ERROR') drawInitialState();
      if (gameState === 'IDLE' || gameState === 'GAME_OVER') stopVideo();
    }
    return () => {
      if (gameLoopId.current) cancelAnimationFrame(gameLoopId.current);
    };
  }, [gameState, gameLoop, resetGame, stopVideo, drawInitialState]);

  const renderOverlay = () => {
    if (gameState === 'ERROR' && handTrackingError) {
      return (
        <div className="text-center flex flex-col items-center">
          <AlertTriangle className="h-16 w-16 text-red-500" />
          <h2 className="mt-4 font-headline text-2xl font-bold">Camera Permission Denied</h2>
          <p className="mt-2 text-center text-muted-foreground max-w-sm mx-auto">
            To play, you must allow camera access in your browser settings. Look for a camera icon in the address bar or go to site settings.
          </p>
          <Button onClick={handleStartGame} size="lg" className="font-headline text-lg mt-8">
            Try Again
          </Button>
        </div>
      );
    }

    if (gameState === 'LOADING' || isHandTrackingLoading) {
      return (
        <>
          <Loader className="h-16 w-16 animate-spin text-primary" />
          <h2 className="mt-4 font-headline text-3xl font-bold">
            {isHandTrackingLoading ? 'Loading Hand Model...' : 'Starting Camera...'}
          </h2>
          <p className="mt-2 text-muted-foreground">Please wait and allow camera access.</p>
        </>
      );
    }

    if (gameState === 'IDLE') {
      return (
        <div className="text-center">
          <Dribbble className="h-16 w-16 mx-auto text-primary" />
          <h1 className="mt-4 font-headline text-3xl font-bold">Ping Pong Ball</h1>
          <p className="mt-2 text-muted-foreground max-w-sm mx-auto">Control the paddle with your hand to bounce the ball and score points!</p>
          <Button onClick={handleStartGame} size="lg" className="font-headline text-lg mt-8">
            Start Game
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-7xl mx-auto grid grid-cols-2 gap-8 items-start p-4 h-[520px]">
      <div className="relative w-full h-full rounded-lg overflow-hidden bg-muted shadow-lg flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1] absolute inset-0"></video>
        {(gameState !== 'PLAYING' && gameState !== 'GAME_OVER') && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-10 p-4">
            {renderOverlay()}
          </div>
        )}
      </div>

      <div className="relative w-full h-full rounded-lg overflow-hidden bg-muted shadow-lg">
        <canvas ref={canvasRef} width="640" height="480" className="w-full h-full"></canvas>
        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-10">
            <h2 className="font-headline text-5xl font-bold">Game Over</h2>
            <p className="text-2xl mt-2">Your Final Score: {score}</p>
            <Button onClick={handleStartGame} size="lg" className="font-headline text-lg mt-8">Play Again</Button>
          </div>
        )}
      </div>
    </div>
  );
}

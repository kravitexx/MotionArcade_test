'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useHandTracking } from '@/hooks/use-hand-tracking';
import { generateMathProblem, type GenerateMathProblemOutput } from '@/ai/flows/dynamic-math-problem-generation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Loader, Camera, Hand, Timer } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type GameState = 'IDLE' | 'LOADING' | 'PLAYING' | 'FEEDBACK';

const FEEDBACK_DURATION = 1500;
const PROBLEM_TIMER_SECONDS = 15;

export default function MathChallengeClient() {
  const { videoRef, canvasRef, detectedFingers, startVideo, stopVideo, isLoading: isHandTrackingLoading, error: handTrackingError } = useHandTracking();
  const { toast, dismiss } = useToast();
  const toastIdRef = useRef<string | null>(null);

  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [currentProblem, setCurrentProblem] = useState<GenerateMathProblemOutput | null>(null);
  const [score, setScore] = useState(0);
  const [pastScores, setPastScores] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [timeLeft, setTimeLeft] = useState(PROBLEM_TIMER_SECONDS);
  const [lastAnswer, setLastAnswer] = useState<number | null>(null);

  useEffect(() => {
    if (handTrackingError) {
      if (!toastIdRef.current) {
        const { id } = toast({
          variant: 'destructive',
          title: 'Error',
          description: handTrackingError,
        });
        toastIdRef.current = id;
      }
      setGameState('IDLE');
      stopVideo();
    } else {
      if (toastIdRef.current) {
        dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  }, [handTrackingError, toast, stopVideo, dismiss]);

  const fetchNewProblem = useCallback(async () => {
    try {
      const problem = await generateMathProblem({ currentScore: score, pastScores });
      setCurrentProblem(problem);
      setTimeLeft(PROBLEM_TIMER_SECONDS);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: 'Could not generate a new math problem.',
      });
    }
  }, [score, pastScores, toast]);

  const startGame = useCallback(() => {
    setScore(0);
    setPastScores([]);
    setGameState('LOADING');
    startVideo();
    fetchNewProblem();
  }, [startVideo, fetchNewProblem]);
  
  useEffect(() => {
    if (gameState === 'LOADING' && !isHandTrackingLoading && currentProblem) {
      setGameState('PLAYING');
    }
  }, [gameState, isHandTrackingLoading, currentProblem]);
  
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    if (detectedFingers !== lastAnswer) {
      setLastAnswer(detectedFingers);
      if (currentProblem && detectedFingers === currentProblem.solution) {
        setScore((s) => s + 1);
        setFeedback('correct');
        setGameState('FEEDBACK');
      }
    }
  }, [detectedFingers, currentProblem, gameState, lastAnswer]);

  useEffect(() => {
    if (gameState === 'PLAYING' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'PLAYING' && timeLeft === 0) {
      setFeedback('incorrect');
      setGameState('FEEDBACK');
    }
  }, [gameState, timeLeft]);


  useEffect(() => {
    if (gameState === 'FEEDBACK') {
      const timer = setTimeout(() => {
        setFeedback(null);
        setLastAnswer(null);
        if (score > 0 && (feedback === 'correct' || timeLeft === 0)) {
           setPastScores(ps => [...ps, score]);
        }
        fetchNewProblem().then(() => {
          setGameState('PLAYING');
        });
      }, FEEDBACK_DURATION);
      return () => clearTimeout(timer);
    }
  }, [gameState, feedback, score, timeLeft, fetchNewProblem]);

  const renderGameState = () => {
    if (gameState === 'IDLE') {
      return (
        <div className="flex flex-col items-center justify-center text-center">
          <h2 className="font-headline text-3xl mb-4">Ready for a Challenge?</h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            Use your hands to solve math problems. The camera will detect how many fingers you're holding up.
          </p>
          <Button onClick={startGame} size="lg" className="font-headline text-lg">Start Game</Button>
        </div>
      );
    }

    return (
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted shadow-lg">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]"></video>
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full scale-x-[-1]"></canvas>
          {gameState === 'LOADING' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
              <Loader className="h-12 w-12 animate-spin" />
            </div>
          )}
          {feedback && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              {feedback === 'correct' ? <CheckCircle2 className="h-32 w-32 text-green-400" /> : <XCircle className="h-32 w-32 text-red-400" />}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 w-full">
            <Card className="w-full p-6 text-center">
              <p className="font-headline text-4xl md:text-5xl tracking-wider">
                {currentProblem?.problem || 'Loading problem...'}
              </p>
            </Card>

            <Card className="w-full p-4">
              <div className="flex justify-between items-center text-lg gap-4">
                <div className="flex flex-col items-center">
                  <span className="font-bold text-primary text-sm">SCORE</span>
                  <span className="font-headline text-4xl">{score}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-muted-foreground text-sm flex items-center gap-1"><Hand className="h-4 w-4" /> GUESS</span>
                  <span className="font-headline text-4xl">{detectedFingers}</span>
                </div>
                <div className="flex flex-col items-center">
                   <span className="text-muted-foreground text-sm flex items-center gap-1"><Timer className="h-4 w-4" /> TIME</span>
                  <span className="font-headline text-4xl w-20 text-center">{timeLeft}</span>
                </div>
              </div>
              <Progress value={(timeLeft / PROBLEM_TIMER_SECONDS) * 100} className="w-full h-2 mt-4" />
            </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-56px)]">
      {renderGameState()}
    </div>
  );
}

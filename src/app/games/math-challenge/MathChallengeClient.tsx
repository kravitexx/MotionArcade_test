'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useHandTracking } from '@/hooks/use-hand-tracking';
import { generateMathProblem, type GenerateMathProblemOutput } from '@/ai/flows/dynamic-math-problem-generation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Loader, Hand, Timer, Smartphone } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useIsMobile } from '@/hooks/use-mobile';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type GameState = 'IDLE' | 'LOADING' | 'PLAYING' | 'HOLDING' | 'FEEDBACK' | 'LOADING_PROBLEM';

const FEEDBACK_DURATION = 1500;
const PROBLEM_TIMER_SECONDS = 15;
const ANSWER_HOLD_SECONDS = 3;

export default function MathChallengeClient() {
  const { videoRef, detectedFingers, landmarks, startVideo, stopVideo, isLoading: isHandTrackingLoading, error: handTrackingError } = useHandTracking();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast, dismiss } = useToast();
  const toastIdRef = useRef<string | null>(null);
  const isMobile = useIsMobile();
  
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [currentProblem, setCurrentProblem] = useState<GenerateMathProblemOutput | null>(null);
  const [score, setScore] = useState(0);
  const [pastScores, setPastScores] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [timeLeft, setTimeLeft] = useState(PROBLEM_TIMER_SECONDS);
  const [holdTime, setHoldTime] = useState(ANSWER_HOLD_SECONDS);
  const [potentialAnswer, setPotentialAnswer] = useState<number | null>(null);
  const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState<number | null>(null);

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
    setGameState('LOADING_PROBLEM');
    try {
      const problem = await generateMathProblem({ currentScore: score, pastScores });
      setCurrentProblem(problem);
      setTimeLeft(PROBLEM_TIMER_SECONDS);
      setGameState('PLAYING');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: 'Could not generate a new math problem.',
      });
      setGameState('IDLE');
    }
  }, [score, pastScores, toast]);

  const startGame = useCallback(async () => {
    setScore(0);
    setPastScores([]);
    setGameState('LOADING');
    await startVideo();
    await fetchNewProblem();
  }, [startVideo, fetchNewProblem]);
  
  const handleAnswer = useCallback((answer: 'correct' | 'incorrect', submitted: number | null) => {
      setGameState('FEEDBACK');
      setFeedback(answer);
      setLastSubmittedAnswer(submitted);
      if (answer === 'correct') {
          setScore(s => s + 1);
      }
      if(score > 0 && answer === 'incorrect'){
          setPastScores(ps => [...ps, score]);
      }
  }, [score]);

  const resetForNextQuestion = useCallback(() => {
    setFeedback(null);
    setPotentialAnswer(null);
    setLastSubmittedAnswer(null);
    fetchNewProblem();
  }, [fetchNewProblem]);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    if (gameState === 'PLAYING' && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    } else if (gameState === 'PLAYING' && timeLeft === 0) {
      // Time's up for thinking
      handleAnswer('incorrect', null);
    } else if (gameState === 'HOLDING' && holdTime > 0) {
        timer = setTimeout(() => setHoldTime(t => t - 1), 1000);
    } else if (gameState === 'HOLDING' && holdTime === 0) {
        // Successfully held the answer
        if (potentialAnswer !== null && currentProblem) {
            const isCorrect = potentialAnswer === currentProblem.solution;
            handleAnswer(isCorrect ? 'correct' : 'incorrect', potentialAnswer);
        }
    } else if (gameState === 'FEEDBACK') {
      timer = setTimeout(resetForNextQuestion, FEEDBACK_DURATION);
    }

    return () => clearTimeout(timer);
  }, [gameState, timeLeft, holdTime, potentialAnswer, currentProblem, handleAnswer, resetForNextQuestion]);

  useEffect(() => {
    if (gameState !== 'PLAYING' || !currentProblem) return;

    // A potential answer is any number of fingers shown
    if (detectedFingers > 0) {
        setPotentialAnswer(detectedFingers);
        setHoldTime(ANSWER_HOLD_SECONDS);
        setGameState('HOLDING');
    }
  }, [detectedFingers, gameState, currentProblem]);
  
  useEffect(() => {
    if(gameState === 'HOLDING') {
      if (detectedFingers !== potentialAnswer) {
        // User changed their mind, go back to playing
        setPotentialAnswer(null);
        setGameState('PLAYING');
      }
    }
  }, [detectedFingers, potentialAnswer, gameState]);

  // Canvas drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to video display size
    if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (landmarks.length > 0 && ['PLAYING', 'HOLDING'].includes(gameState)) {
      const primaryHand = landmarks[0];
      const wrist = primaryHand[0]; // Wrist landmark
      if (!wrist) return;

      const x = (1 - wrist.x) * canvas.width;
      const y = wrist.y * canvas.height;
      
      // Save context, translate to text position, scale to un-mirror, draw, and restore
      ctx.save();
      ctx.translate(x, y - 40);
      ctx.scale(-1, 1);
      
      // Draw circle
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(128, 90, 213, 0.8)'; // Primary color with opacity
      ctx.fill();

      ctx.fillStyle = 'white';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(detectedFingers.toString(), 0, 0);

      ctx.restore();
    }
  }, [landmarks, detectedFingers, gameState, videoRef]);


  const renderGameState = () => {
    if (gameState === 'IDLE') {
      return (
        <div className="flex flex-col items-center justify-center text-center">
          <h2 className="font-headline text-3xl mb-4">Ready for a Challenge?</h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            Use your hands to solve math problems. The camera will detect how many fingers you're holding up. Hold your answer to lock it in.
          </p>
          {isMobile && (
             <Alert className="mb-4">
              <Smartphone className="h-4 w-4" />
              <AlertTitle>Mobile Experience</AlertTitle>
              <AlertDescription>
                This game is best experienced on a desktop. Performance may be slower on mobile devices.
              </AlertDescription>
            </Alert>
          )}
          <Button onClick={startGame} size="lg" className="font-headline text-lg">Start Game</Button>
        </div>
      );
    }

    const showLoading = gameState === 'LOADING' || isHandTrackingLoading;
    const isThinking = gameState === 'PLAYING';
    const isHolding = gameState === 'HOLDING';

    return (
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted shadow-lg">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]"></video>
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>
          
          {(showLoading) && (
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
            <Card className="w-full p-6 text-center flex items-center justify-center flex-grow min-h-[140px] lg:min-h-[200px]">
               <div className="flex items-center justify-center h-full">
                {gameState === 'LOADING_PROBLEM' ? (
                  <Loader className="h-12 w-12 animate-spin text-primary" />
                ) : (
                  <p className="font-headline text-3xl md:text-4xl tracking-wide">
                    {currentProblem?.problem || 'Loading...'}
                  </p>
                )}
              </div>
            </Card>

            <Card className="w-full p-4">
              <div className="flex justify-between items-center text-lg gap-4">
                <div className="flex flex-col items-center">
                  <span className="font-bold text-primary text-sm">SCORE</span>
                  <span className="font-headline text-4xl">{score}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-muted-foreground text-sm flex items-center gap-1"><Hand className="h-4 w-4" /> GUESS</span>
                  <span className="font-headline text-4xl">{potentialAnswer ?? detectedFingers ?? '?'}</span>
                </div>
                <div className="flex flex-col items-center">
                   <span className="text-muted-foreground text-sm flex items-center gap-1"><Timer className="h-4 w-4" /> TIME</span>
                  <span className="font-headline text-4xl w-20 text-center">{isThinking ? timeLeft : isHolding ? holdTime : '...'}</span>
                </div>
              </div>
               
               {isThinking && (
                 <div className="mt-2 text-center">
                   <p className="text-sm text-muted-foreground">Show your answer!</p>
                   <Progress value={(timeLeft / PROBLEM_TIMER_SECONDS) * 100} className="w-full h-2 mt-1" />
                 </div>
              )}
               {isHolding && (
                 <div className="mt-2 text-center">
                   <p className="text-sm text-muted-foreground">Hold your answer to confirm!</p>
                   <Progress value={((ANSWER_HOLD_SECONDS - holdTime) / ANSWER_HOLD_SECONDS) * 100} className="w-1/2 mx-auto h-2 mt-1" />
                 </div>
              )}
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

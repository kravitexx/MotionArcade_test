'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useHandTracking } from '@/hooks/use-hand-tracking';
import { generateMathProblem2, type GenerateMathProblem2Output } from '@/ai/flows/math-challenge-2-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Loader, Timer, Smartphone, Target } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useIsMobile } from '@/hooks/use-mobile';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type GameState = 'IDLE' | 'LOADING' | 'PLAYING' | 'FEEDBACK' | 'LOADING_PROBLEM';
type Bubble = {
  value: number;
  x: number;
  y: number;
  radius: number;
  popped: boolean;
};

const FEEDBACK_DURATION = 2000;
const PROBLEM_TIMER_SECONDS = 20;

export default function MathChallenge2Client() {
  const { videoRef, canvasRef, landmarks, startVideo, stopVideo, isLoading: isHandTrackingLoading, error: handTrackingError } = useHandTracking();
  const { toast, dismiss } = useToast();
  const toastIdRef = useRef<string | null>(null);
  const isMobile = useIsMobile();
  const popAudioRef = useRef<HTMLAudioElement | null>(null);


  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [currentProblem, setCurrentProblem] = useState<GenerateMathProblem2Output | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [lastAnswer, setLastAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(PROBLEM_TIMER_SECONDS);

  useEffect(() => {
    // Preload audio
    if (typeof Audio !== 'undefined') {
        popAudioRef.current = new Audio('/pop.mp3');
    }
  }, []);

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

  const createBubbles = useCallback((problem: GenerateMathProblem2Output) => {
    const canvas = canvasRef.current;
    if (!canvas) return [];

    const newBubbles: Bubble[] = [];
    const numOptions = problem.options.length;
    const radius = isMobile ? 40 : 60;
    // Distribute bubbles across the top 1/3 of the screen
    const yPosition = canvas.height / 4; 

    for (let i = 0; i < numOptions; i++) {
        const xPosition = (canvas.width / (numOptions + 1)) * (i + 1);
        newBubbles.push({
            value: problem.options[i],
            x: xPosition,
            y: yPosition,
            radius,
            popped: false,
        });
    }
    return newBubbles;
  }, [isMobile]);

  const fetchNewProblem = useCallback(async () => {
    setGameState('LOADING_PROBLEM');
    try {
      const problem = await generateMathProblem2({ currentScore: score });
      setCurrentProblem(problem);
      setTimeLeft(PROBLEM_TIMER_SECONDS);
      // Bubbles will be created in an effect after canvas is ready
      setGameState('PLAYING');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: 'Could not generate a new math problem.',
      });
      setGameState('IDLE');
    }
  }, [score, toast]);

  useEffect(() => {
    if(gameState === 'PLAYING' && currentProblem && canvasRef.current) {
        setBubbles(createBubbles(currentProblem));
    }
  }, [gameState, currentProblem, createBubbles]);


  const startGame = useCallback(async () => {
    setScore(0);
    setGameState('LOADING');
    await startVideo();
    await fetchNewProblem();
  }, [startVideo, fetchNewProblem]);
  
  const handleAnswer = useCallback((answer: 'correct' | 'incorrect', submitted: number | null) => {
      setGameState('FEEDBACK');
      setFeedback(answer);
      setLastAnswer(submitted);
      if (answer === 'correct') {
          setScore(s => s + 1);
      }
  }, []);

  const resetForNextQuestion = useCallback(() => {
    setFeedback(null);
    setLastAnswer(null);
    setBubbles([]);
    fetchNewProblem();
  }, [fetchNewProblem]);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    if (gameState === 'PLAYING' && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    } else if (gameState === 'PLAYING' && timeLeft === 0) {
      handleAnswer('incorrect', null); // Time's up
    } else if (gameState === 'FEEDBACK') {
      timer = setTimeout(resetForNextQuestion, FEEDBACK_DURATION);
    }

    return () => clearTimeout(timer);
  }, [gameState, timeLeft, handleAnswer, resetForNextQuestion]);

  // Bubble popping logic
  useEffect(() => {
    if (gameState !== 'PLAYING' || !landmarks.length || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    // Index finger tip is landmark 8
    const indexTip = landmarks[0][8]; 
    if (!indexTip) return;

    // The landmarks are normalized (0-1). We need to convert them to canvas coordinates.
    // The video is mirrored, so we flip the x-coordinate.
    const tipX = (1 - indexTip.x) * canvas.width;
    const tipY = indexTip.y * canvas.height;

    bubbles.forEach((bubble, index) => {
        if (bubble.popped) return;

        const distance = Math.sqrt(Math.pow(tipX - bubble.x, 2) + Math.pow(tipY - bubble.y, 2));

        if (distance < bubble.radius) {
            // Pop!
            popAudioRef.current?.play().catch(e => console.error("Audio play failed:", e));
            const newBubbles = [...bubbles];
            newBubbles[index].popped = true;
            setBubbles(newBubbles);

            const isCorrect = bubble.value === currentProblem?.correctAnswer;
            handleAnswer(isCorrect ? 'correct' : 'incorrect', bubble.value);
        }
    });

  }, [landmarks, gameState, bubbles, currentProblem, handleAnswer]);


  const renderGameState = () => {
    if (gameState === 'IDLE') {
      return (
        <div className="flex flex-col items-center justify-center text-center">
          <h2 className="font-headline text-3xl mb-4">Math Challenge 2</h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            Get ready to move! Pop the bubbles containing the correct answer with your hand to score points.
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

    return (
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted shadow-lg">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]"></video>
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full"></canvas>
          {/* Bubbles are drawn on the hand-tracking canvas */}
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
           {bubbles.map((bubble, index) => (
            <div
              key={index}
              className={`absolute flex items-center justify-center rounded-full border-4 border-primary bg-primary/30 text-white font-bold text-2xl transition-all duration-300 ${bubble.popped ? 'scale-150 opacity-0' : 'scale-100 opacity-100'}`}
              style={{
                left: bubble.x - bubble.radius,
                top: bubble.y - bubble.radius,
                width: bubble.radius * 2,
                height: bubble.radius * 2,
              }}
            >
              {bubble.value}
            </div>
          ))}
          {/* Draw a target for the index finger */}
          {landmarks.length > 0 && canvasRef.current && (
             <Target className="absolute text-cyan-400" style={{
                left: `${(1-landmarks[0][8].x) * 100}%`,
                top: `${landmarks[0][8].y * 100}%`,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none'
             }}/>
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
                   <span className="text-muted-foreground text-sm flex items-center gap-1"><Timer className="h-4 w-4" /> TIME</span>
                  <span className="font-headline text-4xl w-20 text-center">{gameState === 'PLAYING' ? timeLeft : '...'}</span>
                </div>
              </div>
               {gameState === 'PLAYING' && (
                 <div className="mt-2 text-center">
                   <p className="text-sm text-muted-foreground">Pop the correct bubble!</p>
                   <Progress value={(timeLeft / PROBLEM_TIMER_SECONDS) * 100} className="w-full h-2 mt-1" />
                 </div>
              )}
               {gameState === 'FEEDBACK' && currentProblem && (
                 <div className="mt-2 text-center">
                   <p className="text-sm text-muted-foreground">
                    {feedback === 'correct' ? `You got it!` : `The correct answer was ${currentProblem.correctAnswer}.`}
                    </p>
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

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useHandTracking } from '@/hooks/use-hand-tracking';
import { generateQuizQuestion, type GenerateQuizQuestionOutput } from '@/ai/flows/quiz-quest-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Loader, Hand, Timer, Smartphone, HelpCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useIsMobile } from '@/hooks/use-mobile';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type GameState = 'IDLE' | 'LOADING' | 'PLAYING' | 'FEEDBACK' | 'LOADING_PROBLEM';

const FEEDBACK_DURATION = 2000;
const PROBLEM_TIMER_SECONDS = 15;
const ANSWER_HOLD_SECONDS = 3;

export default function QuizQuestClient() {
  const { videoRef, canvasRef, detectedFingers, startVideo, stopVideo, isLoading: isHandTrackingLoading, error: handTrackingError } = useHandTracking();
  const { toast, dismiss } = useToast();
  const toastIdRef = useRef<string | null>(null);
  const isMobile = useIsMobile();

  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [currentProblem, setCurrentProblem] = useState<GenerateQuizQuestionOutput | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [timeLeft, setTimeLeft] = useState(PROBLEM_TIMER_SECONDS);
  const [answerHoldTime, setAnswerHoldTime] = useState(0);
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
      const problem = await generateQuizQuestion({ currentScore: score });
      setCurrentProblem(problem);
      setTimeLeft(PROBLEM_TIMER_SECONDS);
      setGameState('PLAYING');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: 'Could not generate a new quiz question.',
      });
      setGameState('IDLE');
    }
  }, [score, toast]);

  const startGame = useCallback(async () => {
    setScore(0);
    setGameState('LOADING');
    await startVideo();
    await fetchNewProblem();
  }, [startVideo, fetchNewProblem]);
  
  const handleAnswer = useCallback((answer: 'correct' | 'incorrect', submitted: number) => {
      setFeedback(answer);
      setGameState('FEEDBACK');
      setLastSubmittedAnswer(submitted);
      if (answer === 'correct') {
          setScore(s => s + 1);
      }
  }, []);

  const resetForNextQuestion = useCallback(() => {
    setFeedback(null);
    setPotentialAnswer(null);
    setAnswerHoldTime(0);
    setLastSubmittedAnswer(null);
    fetchNewProblem();
  }, [fetchNewProblem]);

  useEffect(() => {
    let gameLoopTimer: NodeJS.Timeout | undefined;

    if (gameState === 'FEEDBACK') {
      gameLoopTimer = setTimeout(resetForNextQuestion, FEEDBACK_DURATION);
    } else if (gameState === 'PLAYING' && timeLeft > 0) {
      gameLoopTimer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    } else if (gameState === 'PLAYING' && timeLeft === 0) {
      handleAnswer('incorrect', 0);
    }

    return () => clearTimeout(gameLoopTimer);
  }, [gameState, timeLeft, resetForNextQuestion, handleAnswer]);


  useEffect(() => {
    if (gameState !== 'PLAYING' || feedback) return;

    if (detectedFingers > 0 && detectedFingers <= 4) {
      if (potentialAnswer === detectedFingers) {
        setAnswerHoldTime(prev => prev + 1);
      } else {
        setPotentialAnswer(detectedFingers);
        setAnswerHoldTime(1);
      }
    } else {
      setPotentialAnswer(null);
      setAnswerHoldTime(0);
    }
  }, [detectedFingers, gameState, feedback, potentialAnswer]);

  useEffect(() => {
    if (answerHoldTime >= ANSWER_HOLD_SECONDS && potentialAnswer && currentProblem) {
      const isCorrect = (potentialAnswer - 1) === currentProblem.correctAnswerIndex;
      handleAnswer(isCorrect ? 'correct' : 'incorrect', potentialAnswer);
      // Reset hold time to prevent re-triggering
      setAnswerHoldTime(0);
    }
  }, [answerHoldTime, potentialAnswer, currentProblem, handleAnswer]);


  const renderGameState = () => {
    if (gameState === 'IDLE') {
      return (
        <div className="flex flex-col items-center justify-center text-center">
          <h2 className="font-headline text-3xl mb-4">Ready for a Quiz?</h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            Answer trivia by holding up 1, 2, 3, or 4 fingers to select an option. Hold your choice for a few seconds to lock it in.
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
            <Card className="w-full p-6 text-center">
               <div className="flex flex-col items-center justify-center min-h-[120px]">
                {gameState === 'LOADING_PROBLEM' ? (
                  <Loader className="h-12 w-12 animate-spin text-primary" />
                ) : (
                  <>
                    <p className="font-headline text-xl md:text-2xl tracking-wide mb-6">
                      {currentProblem?.question || 'Loading...'}
                    </p>
                    <div className="grid grid-cols-2 gap-3 w-full">
                      {currentProblem?.options.map((option, index) => (
                        <Card 
                          key={index} 
                          className={`p-3 text-sm md:text-base border-2 ${feedback && currentProblem.correctAnswerIndex === index ? 'border-green-400 bg-green-400/10' : ''} ${feedback === 'incorrect' && lastSubmittedAnswer === index + 1 ? 'border-red-400 bg-red-400/10' : ''}`}
                        >
                          <span className="font-bold mr-2">{index + 1}.</span>{option}
                        </Card>
                      ))}
                    </div>
                  </>
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
                   <span className="text-muted-foreground text-sm flex items-center gap-1"><Hand className="h-4 w-4" /> CHOICE</span>
                   <span className="font-headline text-4xl">{potentialAnswer || '?'}</span>
                </div>
                <div className="flex flex-col items-center">
                   <span className="text-muted-foreground text-sm flex items-center gap-1"><Timer className="h-4 w-4" /> TIME</span>
                  <span className="font-headline text-4xl w-20 text-center">{timeLeft}</span>
                </div>
              </div>
              <Progress value={(timeLeft / PROBLEM_TIMER_SECONDS) * 100} className="w-full h-2 mt-4" />
              {potentialAnswer && (
                 <div className="mt-2 text-center">
                   <p className="text-sm text-muted-foreground">Hold your choice!</p>
                   <Progress value={(answerHoldTime / ANSWER_HOLD_SECONDS) * 100} className="w-1/2 mx-auto h-1 mt-1" />
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

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useHandTracking } from '@/hooks/use-hand-tracking';
import { generateShapeToDraw, evaluatePlayerDrawing } from '@/ai/flows/shape-challenge-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader, Pencil, Eraser, Sparkles, Circle, Square, Triangle, Star, Heart, ArrowRight, Home, CheckCircle2, XCircle, Hand } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type GameState = 'IDLE' | 'LOADING_CAMERA' | 'GET_READY' | 'COUNTDOWN' | 'DRAWING' | 'SUBMITTING' | 'FEEDBACK';
type DrawingTool = 'PENCIL' | 'ERASER';

const COUNTDOWN_SECONDS = 3;

// A mapping of shape names to Lucide icons
const shapeIcons: Record<string, React.ReactNode> = {
  circle: <Circle className="h-24 w-24" />,
  square: <Square className="h-24 w-24" />,
  triangle: <Triangle className="h-24 w-24" />,
  star: <Star className="h-24 w-24" />,
  heart: <Heart className="h-24 w-24" />,
  arrow: <ArrowRight className="h-24 w-24" />,
  house: <Home className="h-24 w-24" />,
};


export default function SketchAndScoreClient() {
  const { videoRef, canvasRef: handCanvasRef, landmarks, detectedFingers, handedness, startVideo, stopVideo, isLoading: isHandTrackingLoading, error: handTrackingError } = useHandTracking();
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastPosition = useRef<{ x: number, y: number } | null>(null);
  
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [shapeToDraw, setShapeToDraw] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('PENCIL');
  const [feedback, setFeedback] = useState<{isMatch: boolean, message: string} | null>(null);

  const getDrawingContext = useCallback(() => drawingCanvasRef.current?.getContext('2d'), []);

  const fetchNewShape = useCallback(async () => {
    // This state is very brief, just to show a loading indicator for the AI call
    try {
      const { shape } = await generateShapeToDraw();
      setShapeToDraw(shape);
      setGameState('GET_READY');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: 'Could not generate a new shape to draw.',
      });
      setGameState('IDLE');
    }
  }, [toast]);
  
  const startGame = useCallback(async () => {
    setScore(0);
    setGameState('LOADING_CAMERA');
    try {
      await startVideo();
      await fetchNewShape();
    } catch (e) {
      // Errors from startVideo (like permission denied) are handled by the hook's error state
      // so we just need to reset the game state.
      setGameState('IDLE');
    }
  }, [startVideo, fetchNewShape]);

  // Countdown logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'COUNTDOWN' && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (gameState === 'COUNTDOWN' && countdown === 0) {
      setGameState('DRAWING');
    }
    return () => clearTimeout(timer);
  }, [gameState, countdown]);
  
  const clearCanvas = useCallback(() => {
    const ctx = getDrawingContext();
    if(ctx && drawingCanvasRef.current) {
        ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
    }
  }, [getDrawingContext]);

  const handleSubmit = async () => {
    if(!drawingCanvasRef.current || !shapeToDraw) return;
    setGameState('SUBMITTING');

    const drawingDataUri = drawingCanvasRef.current.toDataURL('image/png');

    try {
        const result = await evaluatePlayerDrawing({ shapeToDraw: shapeToDraw, drawingDataUri });
        setFeedback({ isMatch: result.isMatch, message: result.feedback });
        if(result.isMatch) {
            setScore(s => s + 1);
        }
        setGameState('FEEDBACK');
    } catch (e) {
        toast({
            variant: 'destructive',
            title: 'AI Error',
            description: "Could not evaluate your drawing.",
        });
        setGameState('DRAWING');
    }
  };

  const handleNextQuestion = () => {
    setFeedback(null);
    clearCanvas();
    lastPosition.current = null;
    fetchNewShape();
  }

  // Main gesture detection logic
  useEffect(() => {
    if (!landmarks.length || !handedness.length || isHandTrackingLoading) return;

    // Use a more robust way to count fingers for multiple hands
    let leftHandFingers = 0;
    let rightHandFingers = 0;
    let primaryHandLandmarks: typeof landmarks[0] | null = null;

    for (let i = 0; i < handedness.length; i++) {
        const hand = handedness[i][0];
        const handLandmarks = landmarks[i];
        // Note: The generic countFingers might not be ideal for specific gestures.
        // We'll use a custom, more direct finger counting method for gestures.
        const fingerCount = countFingersForHand(handLandmarks, hand.categoryName as "Left" | "Right");
        if (hand.categoryName === 'Left') {
            leftHandFingers = fingerCount;
        } else if (hand.categoryName === 'Right') {
            rightHandFingers = fingerCount;
            primaryHandLandmarks = handLandmarks;
        }
    }
    // Default to first hand if right hand isn't detected
    if (!primaryHandLandmarks && landmarks.length > 0) {
        primaryHandLandmarks = landmarks[0];
    }

    const secondaryHandFingers = leftHandFingers;
    const totalFingers = leftHandFingers + rightHandFingers;
    
    // Handle game state transitions based on gestures
    if (gameState === 'GET_READY' && totalFingers === 10) {
        setCountdown(COUNTDOWN_SECONDS);
        setGameState('COUNTDOWN');
    } else if (gameState === 'DRAWING') {
      if (totalFingers === 10) { // Reset
          clearCanvas();
          lastPosition.current = null;
          toast({ title: "Canvas Cleared!" });
          return;
      }
      
      const isPaused = secondaryHandFingers === 5;
      
      if(secondaryHandFingers === 3) {
        if(drawingTool !== 'ERASER') setDrawingTool('ERASER');
      } else {
        if(drawingTool !== 'PENCIL') setDrawingTool('PENCIL');
      }

      if (isPaused) {
        lastPosition.current = null; // Lift the pencil
        return;
      }

      if (primaryHandLandmarks) {
        const indexTip = primaryHandLandmarks[8];
        const ctx = getDrawingContext();
        if (drawingCanvasRef.current && indexTip && ctx) {
          const canvas = drawingCanvasRef.current;
          const x = (1 - indexTip.x) * canvas.width;
          const y = indexTip.y * canvas.height;

           if (drawingTool === 'PENCIL') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 5;
          } else { // ERASER
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = 20;
          }

          ctx.beginPath();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          if (lastPosition.current) {
            ctx.moveTo(lastPosition.current.x, lastPosition.current.y);
          }
          ctx.lineTo(x, y);
          ctx.stroke();
          lastPosition.current = { x, y };
        } else {
            lastPosition.current = null;
        }
      } else {
        lastPosition.current = null;
      }
    }
  }, [landmarks, handedness, gameState, drawingTool, clearCanvas, toast, getDrawingContext, isHandTrackingLoading]);

  // Helper to count fingers for a single hand
  const countFingersForHand = (handLandmarks: any[], handednessName: 'Left' | 'Right'): number => {
    if (!handLandmarks || handLandmarks.length < 21) return 0;
    
    // Landmark indices for finger tips and PIP joints
    const tipIds = [4, 8, 12, 16, 20];
    const pipIds = [2, 6, 10, 14, 18];
    
    let raisedFingers = 0;

    // Thumb: Check if it's extended away from the hand
    const thumbTip = handLandmarks[tipIds[0]];
    const indexMcp = handLandmarks[5];
    if (handednessName === 'Right') {
      if (thumbTip.x < indexMcp.x) raisedFingers++;
    } else { // Left hand
      if (thumbTip.x > indexMcp.x) raisedFingers++;
    }

    // Fingers: Check if tip is above the PIP joint
    for (let i = 1; i < 5; i++) {
      if (handLandmarks[tipIds[i]].y < handLandmarks[pipIds[i]].y) {
        raisedFingers++;
      }
    }

    return raisedFingers;
  };
  
  // Keep drawing canvas size in sync with video
  useEffect(() => {
    const video = videoRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if(video && drawingCanvas) {
      const updateSize = () => {
        const { videoWidth, videoHeight } = video;
        if (videoWidth > 0 && videoHeight > 0) {
            if(drawingCanvas.width !== videoWidth || drawingCanvas.height !== videoHeight) {
                drawingCanvas.width = videoWidth;
                drawingCanvas.height = videoHeight;
            }
        }
      };
      
      if(video.readyState >= 2) { // HAVE_CURRENT_DATA
        updateSize();
      }

      video.addEventListener('loadeddata', updateSize);
      return () => video.removeEventListener('loadeddata', updateSize);
    }
  }, [videoRef, drawingCanvasRef, gameState]);


  const renderContent = () => {
    if (gameState === 'IDLE') {
      return (
        <div className="flex items-center justify-center h-full">
            <Card className="max-w-xl text-center p-8">
                <CardHeader>
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Pencil className="h-10 w-10" />
                    </div>
                    <CardTitle className="font-headline text-4xl">Sketch & Score</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground pt-2">
                        Draw the shape you see on screen using your index finger. Use gestures to control your tools and submit your masterpiece to the AI judge!
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={startGame} size="lg" className="font-headline text-xl">Start Drawing</Button>
                </CardContent>
            </Card>
        </div>
      );
    }
    
    // All other states show the camera view
    return (
        <div className="w-full h-full relative flex justify-center items-center">
            {/* Video and Canvases are always present after IDLE state */}
            <video ref={videoRef} autoPlay playsInline muted className="absolute top-0 left-0 w-full h-full object-cover scale-x-[-1]"></video>
            <canvas ref={handCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>
            <canvas ref={drawingCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>

            {/* Loading Overlay */}
            {(isHandTrackingLoading || gameState === 'LOADING_CAMERA') && (
              <div className="absolute inset-0 bg-black/60 flex flex-col gap-4 items-center justify-center rounded-lg text-white z-30">
                <Loader className="h-16 w-16 animate-spin" />
                <p className="font-headline text-3xl">{isHandTrackingLoading ? "Loading Hand Tracking..." : "Starting Camera..."}</p>
              </div>
            )}

            {/* Shape to Draw Box */}
            {shapeToDraw && gameState !== 'IDLE' && gameState !== 'FEEDBACK' && gameState !== 'LOADING_CAMERA' && (
              <Card className="absolute top-4 right-4 w-48 h-48 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                <CardHeader className="p-2 text-center">
                  <CardTitle className="text-md font-headline">Draw This:</CardTitle>
                </CardHeader>
                <CardContent className="p-2 flex-1 flex items-center justify-center text-primary">
                  {shapeIcons[shapeToDraw.toLowerCase()] || <Pencil className="h-24 w-24" />}
                </CardContent>
              </Card>
            )}

            {/* Game State Overlays */}
            {gameState === 'GET_READY' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-lg text-white z-20">
                    <h2 className="font-headline text-5xl mb-4">Show 10 Fingers to Start!</h2>
                    <Hand className="h-24 w-24 animate-pulse" />
                </div>
            )}
             {gameState === 'COUNTDOWN' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg z-20">
                    <h2 className="font-headline text-9xl text-white">{countdown}</h2>
                </div>
            )}
            {gameState === 'DRAWING' && (
                <div className="absolute bottom-4 flex gap-4 z-20">
                  <Button onClick={handleSubmit} size="lg" className="font-headline text-lg" >
                    <Sparkles className="mr-2"/> Submit Drawing
                  </Button>
                  <Card className="p-2 px-4 flex items-center gap-2 bg-background/80">
                    <span className="text-muted-foreground text-sm font-bold">TOOL:</span>
                    {drawingTool === 'PENCIL' ? <Pencil className="h-6 w-6 text-primary"/> : <Eraser className="h-6 w-6 text-blue-400" />}
                  </Card>
                </div>
            )}
             {gameState === 'SUBMITTING' && (
                <div className="absolute inset-0 bg-black/60 flex flex-col gap-4 items-center justify-center rounded-lg text-white z-30">
                    <Loader className="h-16 w-16 animate-spin" />
                    <p className="font-headline text-3xl">AI is judging your art...</p>
                </div>
            )}
             {gameState === 'FEEDBACK' && feedback && (
                 <div className="absolute inset-0 bg-black/70 flex flex-col gap-4 items-center justify-center rounded-lg text-white z-30">
                    {feedback.isMatch ? <CheckCircle2 className="h-24 w-24 text-green-400" /> : <XCircle className="h-24 w-24 text-red-400" />}
                    <h2 className="font-headline text-4xl max-w-lg text-center">{feedback.message}</h2>
                    <h3 className="text-2xl font-bold">Your Score: {score}</h3>
                    <Button onClick={handleNextQuestion} size="lg" className="font-headline text-lg mt-4">Next Shape</Button>
                </div>
            )}
        </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8 flex-grow flex flex-col items-center justify-center">
      <div className="w-full max-w-7xl aspect-video relative bg-muted rounded-lg shadow-lg overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}

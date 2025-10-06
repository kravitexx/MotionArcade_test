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

  const getDrawingContext = () => drawingCanvasRef.current?.getContext('2d');

  const fetchNewShape = useCallback(async () => {
    setGameState('LOADING_CAMERA');
    try {
      const { shape } = await generateShapeToDraw();
      setShapeToDraw(shape);
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
    await startVideo();
    await fetchNewShape();
    setGameState('GET_READY');
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
  }, []);

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
    setGameState('GET_READY');
  }

  // Main gesture detection logic
  useEffect(() => {
    if (!landmarks.length || !handedness.length) return;

    // Separate hands based on handedness
    const leftHand = handedness[0]?.categoryName === 'Left' ? { landmarks: landmarks[0], fingers: countFingersForHand(landmarks[0]) } : handedness[1]?.categoryName === 'Left' ? { landmarks: landmarks[1], fingers: countFingersForHand(landmarks[1]) } : null;
    const rightHand = handedness[0]?.categoryName === 'Right' ? { landmarks: landmarks[0], fingers: countFingersForHand(landmarks[0]) } : handedness[1]?.categoryName === 'Right' ? { landmarks: landmarks[1], fingers: countFingersForHand(landmarks[1]) } : null;

    const primaryHand = rightHand; // Assume right-handed for now
    const secondaryHand = leftHand;

    // Handle game state transitions based on gestures
    if (gameState === 'GET_READY' && detectedFingers === 10) {
        setCountdown(COUNTDOWN_SECONDS);
        setGameState('COUNTDOWN');
    } else if (gameState === 'DRAWING') {
      if (detectedFingers === 10) { // Reset
          clearCanvas();
          lastPosition.current = null;
          toast({ title: "Canvas Cleared!" });
          return;
      }
      
      const isPaused = secondaryHand && secondaryHand.fingers === 5;
      
      if(secondaryHand && secondaryHand.fingers === 3) {
        if(drawingTool !== 'ERASER') setDrawingTool('ERASER');
      } else {
        if(drawingTool !== 'PENCIL') setDrawingTool('PENCIL');
      }

      if (isPaused) {
        lastPosition.current = null; // Lift the pencil
        return;
      }

      if (primaryHand && primaryHand.landmarks) {
        const indexTip = primaryHand.landmarks[8];
        if (drawingCanvasRef.current && indexTip) {
          const canvas = drawingCanvasRef.current;
          const rect = canvas.getBoundingClientRect();
          const x = (1 - indexTip.x) * canvas.width;
          const y = indexTip.y * canvas.height;

          const ctx = getDrawingContext();
          if (ctx) {
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
          }
        }
      } else {
        lastPosition.current = null;
      }
    }
  }, [landmarks, detectedFingers, handedness, gameState, drawingTool, clearCanvas, toast]);

  // Helper to count fingers for a single hand
  const countFingersForHand = (handLandmarks: any[]): number => {
    if (!handLandmarks) return 0;
    // This is a simplified finger counting logic. A more robust one might be needed.
    const thumbTip = handLandmarks[4];
    const indexTip = handLandmarks[8];
    const middleTip = handLandmarks[12];
    const ringTip = handLandmarks[16];
    const pinkyTip = handLandmarks[20];
    
    const indexMcp = handLandmarks[5];
    const middleMcp = handLandmarks[9];
    const ringMcp = handLandmarks[13];
    const pinkyMcp = handLandmarks[17];
    
    let raisedFingers = 0;
    if (indexTip.y < indexMcp.y) raisedFingers++;
    if (middleTip.y < middleMcp.y) raisedFingers++;
    if (ringTip.y < ringMcp.y) raisedFingers++;
    if (pinkyTip.y < pinkyMcp.y) raisedFingers++;
    
    // A simple thumb check, might need refinement
    const handednessName = handedness.find(h => h.displayName)?.categoryName || 'Right';
    if (handednessName === 'Right') {
      if (thumbTip.x < handLandmarks[2].x) raisedFingers++;
    } else {
      if (thumbTip.x > handLandmarks[2].x) raisedFingers++;
    }

    return raisedFingers;
  };
  
  // Keep drawing canvas size in sync with video
  useEffect(() => {
    const video = videoRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if(video && drawingCanvas) {
      const updateSize = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
            drawingCanvas.width = video.videoWidth;
            drawingCanvas.height = video.videoHeight;
        }
      };
      video.addEventListener('loadeddata', updateSize);
      updateSize();
      return () => video.removeEventListener('loadeddata', updateSize);
    }
  }, [videoRef, drawingCanvasRef, gameState]);


  const renderGameState = () => {
    if (gameState === 'IDLE') {
      return (
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
      );
    }
    
    if (isHandTrackingLoading || gameState === 'LOADING_CAMERA') {
      return (
        <div className="flex flex-col gap-4 items-center justify-center text-foreground">
          <Loader className="h-16 w-16 animate-spin" />
          <p className="font-headline text-2xl">{isHandTrackingLoading ? "Loading Hand Tracking..." : "Starting Camera..."}</p>
        </div>
      );
    }

    // All other states show the camera view
    return (
        <div className="w-full max-w-7xl aspect-video relative flex justify-center items-center bg-muted rounded-lg shadow-lg">
            <video ref={videoRef} autoPlay playsInline muted className="absolute top-0 left-0 w-full h-full object-cover scale-x-[-1] rounded-lg"></video>
            <canvas ref={handCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>
            <canvas ref={drawingCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>

            {/* Shape to Draw Box */}
            {shapeToDraw && gameState !== 'IDLE' && gameState !== 'FEEDBACK' && (
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
    <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-56px)]">
      {renderGameState()}
    </div>
  );
}

// Minimal finger counting logic needed for this game's gestures
function countFingers(landmarks: any[][], handedness: any[]): number {
  if (!landmarks || landmarks.length === 0) {
    return 0;
  }
  let totalFingers = 0;
  for (let i = 0; i < landmarks.length; i++) {
    const handLandmarks = landmarks[i];
    let raisedFingers = 0;
    const isThumbUp = handLandmarks[4].y < handLandmarks[3].y && handLandmarks[3].y < handLandmarks[2].y;
    const isIndexUp = handLandmarks[8].y < handLandmarks[6].y;
    const isMiddleUp = handLandmarks[12].y < handLandmarks[10].y;
    const isRingUp = handLandmarks[16].y < handLandmarks[14].y;
    const isPinkyUp = handLandmarks[20].y < handLandmarks[18].y;
    if (isThumbUp) raisedFingers++;
    if (isIndexUp) raisedFingers++;
    if (isMiddleUp) raisedFingers++;
    if (isRingUp) raisedFingers++;
    if (isPinkyUp) raisedFingers++;
    totalFingers += raisedFingers;
  }
  return totalFingers;
}

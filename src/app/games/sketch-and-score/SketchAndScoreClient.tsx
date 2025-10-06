'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useHandTracking } from '@/hooks/use-hand-tracking';
import { generateShapeToDraw, evaluatePlayerDrawing } from '@/ai/flows/shape-challenge-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader, Pencil, Eraser, Sparkles, Circle, Square, Triangle, Star, Heart, ArrowRight, Home, CheckCircle2, XCircle, Hand } from 'lucide-react';

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
  const { videoRef, canvasRef: handCanvasRef, landmarks, handedness, startVideo, stopVideo, isLoading: isHandTrackingLoading, error: handTrackingError } = useHandTracking();
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

  useEffect(() => {
    if (handTrackingError) {
      toast({
        variant: 'destructive',
        title: 'Camera Error',
        description: handTrackingError,
      });
      setGameState('IDLE');
      stopVideo();
    }
  }, [handTrackingError, toast, stopVideo]);

  const fetchNewShape = useCallback(async () => {
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
      // Errors are handled by the hook, just reset state
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

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    const sourceCanvas = drawingCanvasRef.current;
    
    if (!tempCtx) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not process drawing.",
      });
      setGameState('DRAWING');
      return;
    }

    tempCanvas.width = sourceCanvas.width;
    tempCanvas.height = sourceCanvas.height;

    // Fill with a white background
    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw the user's drawing on top
    tempCtx.drawImage(sourceCanvas, 0, 0);

    // Get the data URI from the temporary canvas
    const drawingDataUri = tempCanvas.toDataURL('image/png');

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

  // Helper to count fingers for a single hand
  const countFingersForHand = (handLandmarks: any[]): number => {
    if (!handLandmarks || handLandmarks.length < 21) return 0;
    
    const tipIds = [4, 8, 12, 16, 20];
    const pipIds = [2, 6, 10, 14, 18];
    
    let raisedFingers = 0;

    // A simple vertical check is often enough for gestures
    // Thumb: Check if tip is above MCP joint (more robust for side-on view)
    if (handLandmarks[tipIds[0]].y < handLandmarks[tipIds[0] - 1].y) {
       raisedFingers++;
    }

    // Fingers: Check if tip is above the PIP joint
    for (let i = 1; i < 5; i++) {
      if (handLandmarks[tipIds[i]].y < handLandmarks[pipIds[i]].y) {
        raisedFingers++;
      }
    }

    return raisedFingers;
  };
  
  const isPointing = (handLandmarks: any[]): boolean => {
      if (!handLandmarks || handLandmarks.length < 21) return false;

      const tipIds = { index: 8, middle: 12, ring: 16, pinky: 20 };
      const pipIds = { index: 6, middle: 10, ring: 14, pinky: 18 };

      // Check if index finger is extended (tip is above pip)
      const indexFingerExtended = handLandmarks[tipIds.index].y < handLandmarks[pipIds.index].y;

      // Check if other fingers (middle, ring, pinky) are curled (tip is below pip)
      const middleFingerCurled = handLandmarks[tipIds.middle].y > handLandmarks[pipIds.middle].y;
      const ringFingerCurled = handLandmarks[tipIds.ring].y > handLandmarks[pipIds.ring].y;
      const pinkyFingerCurled = handLandmarks[tipIds.pinky].y > handLandmarks[pipIds.pinky].y;

      return indexFingerExtended && middleFingerCurled && ringFingerCurled && pinkyFingerCurled;
  };

  // Main gesture detection logic
  useEffect(() => {
    if (!landmarks.length || !handedness.length || isHandTrackingLoading || gameState === 'SUBMITTING' || gameState === 'FEEDBACK') return;
    
    let leftHandFingers = 0;
    let rightHandFingers = 0;
    let rightHandLandmarks: typeof landmarks[0] | null = null;

    // Assign landmarks and finger counts to the correct hands
    for (let i = 0; i < handedness.length; i++) {
      const hand = handedness[i][0];
      if (!hand) continue;
      
      const handLandmarks = landmarks[i];
      const fingerCount = countFingersForHand(handLandmarks);

      if (hand.categoryName === 'Left') {
          leftHandFingers = fingerCount;
      } else if (hand.categoryName === 'Right') {
          rightHandFingers = fingerCount;
          rightHandLandmarks = handLandmarks;
      }
    }
    const totalFingers = leftHandFingers + rightHandFingers;
    
    if (gameState === 'GET_READY' && totalFingers === 10) {
        setCountdown(COUNTDOWN_SECONDS);
        setGameState('COUNTDOWN');
        return;
    } 
    
    if (gameState === 'DRAWING') {
      if (totalFingers >= 10) {
          clearCanvas();
          lastPosition.current = null;
          toast({ title: "Canvas Cleared!" });
          return;
      }

      // Gesture for tool switching
      if (leftHandFingers === 3) {
        if(drawingTool !== 'ERASER') setDrawingTool('ERASER');
      } else {
        if(drawingTool !== 'PENCIL') setDrawingTool('PENCIL');
      }
      
      // Gesture for pausing
      const isPaused = leftHandFingers === 5;
      if (isPaused) {
        lastPosition.current = null;
        return; // Don't draw if paused
      }

      // Drawing logic
      if (rightHandLandmarks && isPointing(rightHandLandmarks)) {
        const indexTip = rightHandLandmarks[8];
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
            ctx.lineWidth = 25;
          }

          ctx.beginPath();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          if (lastPosition.current) {
            ctx.moveTo(lastPosition.current.x, lastPosition.current.y);
          } else {
            // This is the first point, move to it without drawing a line
            ctx.moveTo(x, y);
          }
          ctx.lineTo(x, y);
          ctx.stroke();
          lastPosition.current = { x, y };
        } 
      } else {
          // If not pointing, lift the "pencil"
          lastPosition.current = null;
      }
    }
  }, [landmarks, handedness, gameState, drawingTool, clearCanvas, toast, getDrawingContext, isHandTrackingLoading]);
  
  
  // Keep drawing canvas size in sync with video
  useEffect(() => {
    const video = videoRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (!video || !drawingCanvas) return;

    const updateSize = () => {
        const { videoWidth, videoHeight } = video;
        if (videoWidth > 0 && videoHeight > 0) {
            if (drawingCanvas.width !== videoWidth || drawingCanvas.height !== videoHeight) {
                drawingCanvas.width = videoWidth;
                drawingCanvas.height = videoHeight;
            }
        }
    };

    // Check if video is ready, otherwise wait for the loadeddata event
    if (video.readyState >= 2) { // HAVE_CURRENT_DATA
        updateSize();
    } else {
        video.addEventListener('loadeddata', updateSize, { once: true });
    }
    
    return () => {
        video.removeEventListener('loadeddata', updateSize);
    };
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
                        Draw the shape on screen using your index finger. Use gestures to control your tools and submit your masterpiece to the AI judge!
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={startGame} size="lg" className="font-headline text-xl">Start Drawing</Button>
                </CardContent>
            </Card>
        </div>
      );
    }
    
    return (
        <>
            {/* These elements are now always rendered after IDLE state */}
            <video ref={videoRef} autoPlay playsInline muted className="absolute top-0 left-0 w-full h-full object-cover scale-x-[-1]"></video>
            <canvas ref={handCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>
            <canvas ref={drawingCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>

            {(isHandTrackingLoading || gameState === 'LOADING_CAMERA') && (
              <div className="absolute inset-0 bg-black/60 flex flex-col gap-4 items-center justify-center rounded-lg text-white z-30">
                <Loader className="h-16 w-16 animate-spin" />
                <p className="font-headline text-3xl">{gameState === 'LOADING_CAMERA' ? "Starting Camera..." : "Loading Hand Tracking..."}</p>
              </div>
            )}

            {shapeToDraw && !['IDLE', 'FEEDBACK', 'LOADING_CAMERA'].includes(gameState) && (
              <Card className="absolute top-4 right-4 w-48 h-48 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                <CardHeader className="p-2 text-center">
                  <CardTitle className="text-md font-headline">Draw This:</CardTitle>
                </CardHeader>
                <CardContent className="p-2 flex-1 flex items-center justify-center text-primary">
                  {shapeIcons[shapeToDraw.toLowerCase()] || <Pencil className="h-24 w-24" />}
                </CardContent>
              </Card>
            )}

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
                <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4 z-20">
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
        </>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8 flex-grow flex flex-col items-center justify-center">
      <div className="w-full max-w-7xl aspect-video relative rounded-lg shadow-lg overflow-hidden bg-muted">
        {renderContent()}
      </div>
    </div>
  );
}

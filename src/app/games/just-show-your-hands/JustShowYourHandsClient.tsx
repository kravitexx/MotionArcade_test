'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useHandTracking, type ModelType } from '@/hooks/use-hand-tracking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Hand, Loader } from 'lucide-react';

const HAND_CONNECTIONS = [
  {start: 0, end: 1}, {start: 1, end: 2}, {start: 2, end: 3}, {start: 3, end: 4},
  {start: 0, end: 5}, {start: 5, end: 6}, {start: 6, end: 7}, {start: 7, end: 8},
  {start: 5, end: 9}, {start: 9, end: 10}, {start: 10, end: 11}, {start: 11, end: 12},
  {start: 9, end: 13}, {start: 13, end: 14}, {start: 14, end: 15}, {start: 15, end: 16},
  {start: 13, end: 17}, {start: 0, end: 17}, {start: 17, end: 18}, {start: 18, end: 19}, {start: 19, end: 20}
];

export default function JustShowYourHandsClient() {
  const [model, setModel] = useState<ModelType | null>(null);
  const { videoRef, landmarks, startVideo, stopVideo, isLoading, error } = useHandTracking({ modelType: model });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const startGame = useCallback(async (selectedModel: ModelType) => {
    setModel(selectedModel);
  }, []);

  useEffect(() => {
    if (model && !isLoading) {
      startVideo().catch(err => {
        console.error("Failed to start video", err);
        // Error is handled in the hook, but we can reset the state here if needed
        setModel(null);
      });
    }
  }, [model, isLoading, startVideo]);
  
  const handleBack = () => {
    stopVideo();
    setModel(null);
  }

  // Canvas drawing logic for hand skeleton
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !model) return;

    const video = videoRef.current;
    if (!video) return;

    if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (landmarks.length > 0) {
      for (const hand of landmarks) {
        // Draw connectors
        ctx.strokeStyle = '#34d399'; // Emerald-400
        ctx.lineWidth = 3;
        for (const connection of HAND_CONNECTIONS) {
          const start = hand[connection.start];
          const end = hand[connection.end];
          if (start && end) {
            let startX, startY, endX, endY;

            if (model === 'onnx') {
                startX = canvas.width - start.x;
                startY = start.y;
                endX = canvas.width - end.x;
                endY = end.y;
            } else { // standard model
                startX = (1 - start.x) * canvas.width;
                startY = start.y * canvas.height;
                endX = (1 - end.x) * canvas.width;
                endY = end.y * canvas.height;
            }
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
          }
        }
        
        // Draw landmarks
        ctx.fillStyle = '#a78bfa'; // Violet-400
        for (const point of hand) {
          let x, y;
          if (model === 'onnx') {
              x = canvas.width - point.x;
              y = point.y;
          } else { // standard model
              x = (1 - point.x) * canvas.width;
              y = point.y * canvas.height;
          }
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }
  }, [landmarks, model, videoRef]);


  if (!model) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center flex-grow">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Hand className="h-10 w-10" />
            </div>
            <CardTitle className="font-headline text-3xl">Choose a Model</CardTitle>
            <CardDescription className="text-muted-foreground pt-2">
              Select which MediaPipe model you want to use for hand tracking. The ONNX model may offer different performance characteristics.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button onClick={() => startGame('standard')} size="lg">Standard MediaPipe (.task)</Button>
            <Button onClick={() => startGame('onnx')} size="lg">ONNX MediaPipe</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center flex-grow">
      <div className="w-full max-w-7xl aspect-video relative rounded-lg shadow-lg overflow-hidden bg-muted">
        <video ref={videoRef} autoPlay playsInline muted className="absolute top-0 left-0 w-full h-full object-cover scale-x-[-1]"></video>
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>
        
        {(isLoading || (error && !videoRef.current?.srcObject)) && (
          <div className="absolute inset-0 bg-black/60 flex flex-col gap-4 items-center justify-center rounded-lg text-white z-30">
            <Loader className="h-16 w-16 animate-spin" />
            <p className="font-headline text-3xl">{isLoading ? "Loading Model..." : "Waiting for Camera..."}</p>
          </div>
        )}
        
        {error && (
            <div className="absolute top-4 left-4 right-4 bg-destructive/80 text-destructive-foreground p-4 rounded-md z-20">
                <p className='font-bold'>Error:</p>
                <p>{error}</p>
            </div>
        )}

        <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center z-20">
            <Card className="bg-background/80 backdrop-blur-sm p-2 px-4">
                <p className="font-headline text-lg">Show your hands to the camera</p>
            </Card>
        </div>
        
         <div className="absolute top-4 left-4 z-20">
            <Button onClick={handleBack}>Back to Selection</Button>
        </div>
      </div>
    </div>
  );
}

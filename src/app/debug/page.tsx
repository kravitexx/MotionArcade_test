'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from 'lucide-react';
import { generateMathProblem } from '@/ai/flows/dynamic-math-problem-generation';
import { generateMathProblem2 } from '@/ai/flows/math-challenge-2-flow';
import { generateQuizQuestion } from '@/ai/flows/quiz-quest-flow';
import { generateShapeToDraw } from '@/ai/flows/shape-challenge-flow';


type TestResult = {
  flow: string;
  data: any;
  error?: string;
};

export default function DebugPage() {
  const [loadingFlow, setLoadingFlow] = useState<string | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleTest = async (flowName: string, flowFunction: () => Promise<any>) => {
    setLoadingFlow(flowName);
    setResult(null);
    try {
      const data = await flowFunction();
      setResult({ flow: flowName, data });
    } catch (e: any) {
      console.error(e);
      setResult({ flow: flowName, data: null, error: e.message || 'An unknown error occurred.' });
    } finally {
      setLoadingFlow(null);
    }
  };

  const testMathChallenge1 = () => handleTest(
    'Math Challenge',
    () => generateMathProblem({ currentScore: 5, pastScores: [1, 2, 3] })
  );

  const testMathChallenge2 = () => handleTest(
    'Math Challenge 2',
    () => generateMathProblem2({ currentScore: 5 })
  );

  const testQuizQuest = () => handleTest(
    'Quiz Quest',
    () => generateQuizQuestion({ currentScore: 5, subjects: ['Science', 'History'] })
  );
  
  const testSketchAndScore = () => handleTest(
    'Sketch & Score',
    () => generateShapeToDraw()
  );

  const testAirPiano = () => handleTest(
    'Air Piano',
    () => initializeHandTracking()
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">AI Flow Debugger</CardTitle>
          <p className="text-muted-foreground">
            Use these buttons to test each AI flow individually. This helps diagnose issues
            with the Gemini API key or the prompts themselves. If these tests fail,
            it's likely there is an issue with the environment configuration (e.g., API key).
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button onClick={testMathChallenge1} disabled={!!loadingFlow} className="flex-1">
              {loadingFlow === 'Math Challenge' && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Test Math Challenge
            </Button>
            <Button onClick={testMathChallenge2} disabled={!!loadingFlow} className="flex-1">
              {loadingFlow === 'Math Challenge 2' && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Test Math Challenge 2
            </Button>
            <Button onClick={testQuizQuest} disabled={!!loadingFlow} className="flex-1">
              {loadingFlow === 'Quiz Quest' && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Test Quiz Quest
            </Button>
            <Button onClick={testSketchAndScore} disabled={!!loadingFlow} className="flex-1">
              {loadingFlow === 'Sketch & Score' && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Test Sketch & Score
            </Button>
            <Button onClick={testAirPiano} disabled={!!loadingFlow} className="flex-1">
              {loadingFlow === 'Air Piano' && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Test Air Piano
            </Button>
          </div>

          {result && (
            <Card className="mt-4 bg-muted/50">
              <CardHeader>
                <CardTitle>Result for: {result.flow}</CardTitle>
              </CardHeader>
              <CardContent>
                {result.error ? (
                  <div className="text-destructive">
                    <h3 className="font-bold">Error:</h3>
                    <pre className="mt-2 whitespace-pre-wrap rounded-md bg-destructive/10 p-4 font-mono text-sm">
                      {result.error}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-bold">Success:</h3>
                    <pre className="mt-2 whitespace-pre-wrap rounded-md bg-background p-4 font-mono text-sm">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

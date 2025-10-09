import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calculator, BrainCircuit, Waves, Pencil, Gamepad2 } from 'lucide-react';
import Link from 'next/link';

const educationalGames = [
  {
    title: 'Math Challenge',
    description: 'Solve dynamic math problems using your hands! Show the correct number of fingers to answer questions and test your arithmetic skills.',
    href: '/games/math-challenge',
    icon: <Calculator className="h-8 w-8 text-primary" />,
  },
  {
    title: 'Quiz Quest',
    description: 'Answer trivia questions by showing the number of fingers corresponding to your chosen option. Hold your answer to lock it in!',
    href: '/games/quiz-quest',
    icon: <BrainCircuit className="h-8 w-8 text-primary" />,
  },
  {
    title: 'Math Challenge 2',
    description: 'A more physical challenge! Pop the bubbles with the correct answer using your hands. Move your body and test your math skills.',
    href: '/games/math-challenge-2',
    icon: <Waves className="h-8 w-8 text-primary" />,
  },
  {
    title: 'Sketch & Score',
    description: 'Draw the shape you see on screen using your index finger. Use gestures to switch between pencil and eraser. A creative challenge!',
    href: '/games/sketch-and-score',
    icon: <Pencil className="h-8 w-8 text-primary" />,
  },
];

const funGames = [
    {
        title: 'Ping Pong',
        description: 'A classic game of single-player ping pong. Control the paddle with your hand and try to keep the ball in play.',
        href: '/games/ping-pong',
        icon: <Gamepad2 className="h-8 w-8 text-primary" />,
    }
]

export default function GamesPage() {
  return (
    <div className="container mx-auto px-4 py-12 sm:py-16">
      <h1 className="mb-8 text-center font-headline text-4xl font-bold tracking-tight md:text-5xl">
        Choose Your Game
      </h1>
      <Tabs defaultValue="education" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="fun">Fun</TabsTrigger>
        </TabsList>
        <TabsContent value="education">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
                {educationalGames.map((game) => (
                <Card key={game.title} className="flex flex-col">
                    <CardHeader className="flex-row items-start gap-4 space-y-0">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                        {game.icon}
                    </div>
                    <div>
                        <CardTitle className="font-headline text-2xl">{game.title}</CardTitle>
                    </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                    <CardDescription className="text-base">{game.description}</CardDescription>
                    </CardContent>
                    <CardFooter>
                    <Button asChild className="w-full font-headline">
                        <Link href={game.href}>Play</Link>
                    </Button>
                    </CardFooter>
                </Card>
                ))}
            </div>
        </TabsContent>
        <TabsContent value="fun">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
                {funGames.map((game) => (
                <Card key={game.title} className="flex flex-col">
                    <CardHeader className="flex-row items-start gap-4 space-y-0">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                        {game.icon}
                    </div>
                    <div>
                        <CardTitle className="font-headline text-2xl">{game.title}</CardTitle>
                    </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                    <CardDescription className="text-base">{game.description}</CardDescription>
                    </CardContent>
                    <CardFooter>
                    <Button asChild className="w-full font-headline">
                        <Link href={game.href}>Play</Link>
                    </Button>
                    </CardFooter>
                </Card>
                ))}
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, BrainCircuit } from 'lucide-react';
import Link from 'next/link';

const games = [
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
];

export default function GamesPage() {
  return (
    <div className="container mx-auto px-4 py-12 sm:py-16">
      <h1 className="mb-8 text-center font-headline text-4xl font-bold tracking-tight md:text-5xl">
        Choose Your Game
      </h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
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
    </div>
  );
}

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2 } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12 sm:py-24">
      <div className="flex flex-col items-center text-center">
        <Card className="w-full max-w-3xl border-0 shadow-none">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Gamepad2 className="h-8 w-8" />
            </div>
            <CardTitle className="font-headline text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              Welcome to MotionArcade
            </CardTitle>
            <CardDescription className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
              An AR-based gaming platform where your hands control the action. Dive into interactive experiences powered by cutting-edge gesture recognition technology.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild size="lg" className="font-headline text-lg">
              <Link href="/games">Browse Games</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

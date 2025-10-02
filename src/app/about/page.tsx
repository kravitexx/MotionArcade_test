import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12 sm:py-16">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="font-headline text-3xl md:text-4xl">About MotionArcade</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg text-muted-foreground">
            This section is currently under development. Stay tuned for more information about the MotionArcade project, its mission, and the team behind it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

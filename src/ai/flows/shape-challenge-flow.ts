'use server';
/**
 * @fileOverview AI flows for the Sketch & Score game.
 * - generateShapeToDraw - Generates the name of a simple shape to draw.
 * - evaluatePlayerDrawing - Evaluates if a player's drawing matches a shape.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// === Flow for Generating a Shape ===

const GenerateShapeOutputSchema = z.object({
  shape: z.string().describe('The name of a simple, common shape to draw (e.g., "circle", "square", "triangle", "star", "heart").'),
});
export type GenerateShapeOutput = z.infer<typeof GenerateShapeOutputSchema>;

export async function generateShapeToDraw(): Promise<GenerateShapeOutput> {
  return generateShapeFlow();
}

const generateShapePrompt = ai.definePrompt({
  name: 'generateShapePrompt',
  output: { schema: GenerateShapeOutputSchema },
  prompt: `Generate a single, common, simple shape name that a person can easily draw with their finger in the air.

  Examples: "circle", "square", "triangle", "star", "heart", "arrow", "house".
  
  Return only the name of the shape.`,
});

const generateShapeFlow = ai.defineFlow(
  {
    name: 'generateShapeFlow',
    outputSchema: GenerateShapeOutputSchema,
  },
  async () => {
    const { output } = await generateShapePrompt();
    return output!;
  }
);


// === Flow for Evaluating a Drawing ===

const EvaluateDrawingInputSchema = z.object({
  shapeToDraw: z.string().describe('The name of the shape the user was asked to draw.'),
  drawingDataUri: z.string().describe("A data URI of the player's drawing. It's a transparent PNG with the drawing in black. Expected format: 'data:image/png;base64,<encoded_data>'."),
});
export type EvaluateDrawingInput = z.infer<typeof EvaluateDrawingInputSchema>;

const EvaluateDrawingOutputSchema = z.object({
    isMatch: z.boolean().describe("Whether the drawing is a recognizable match for the requested shape. Be lenient."),
    feedback: z.string().describe("Brief, encouraging feedback for the player, e.g., 'Great triangle!' or 'That's a good start, try making the lines straighter next time.'"),
});
export type EvaluateDrawingOutput = z.infer<typeof EvaluateDrawingOutputSchema>;

export async function evaluatePlayerDrawing(input: EvaluateDrawingInput): Promise<EvaluateDrawingOutput> {
    return evaluateDrawingFlow(input);
}

const evaluateDrawingPrompt = ai.definePrompt({
    name: 'evaluateDrawingPrompt',
    input: { schema: EvaluateDrawingInputSchema },
    output: { schema: EvaluateDrawingOutputSchema },
    prompt: `You are an AI judge for a drawing game. Your goal is to determine if a player's drawing reasonably matches the shape they were asked to draw. Be lenient, as the player is drawing in the air with their finger.

Shape to draw: {{{shapeToDraw}}}

You will be given a PNG image of the player's drawing.

Analyze the image and determine if it's a recognizable version of the shape. For example, a square with wobbly lines is still a square. A three-sided figure is a triangle. A star with 5 points, even if they're uneven, is a star.

Player's Drawing:
{{media url=drawingDataUri}}

Based on your analysis, set 'isMatch' to true or false and provide brief, encouraging feedback.`,
});


const evaluateDrawingFlow = ai.defineFlow(
    {
        name: 'evaluateDrawingFlow',
        inputSchema: EvaluateDrawingInputSchema,
        outputSchema: EvaluateDrawingOutputSchema,
    },
    async (input) => {
        const { output } = await evaluateDrawingPrompt(input);
        return output!;
    }
);

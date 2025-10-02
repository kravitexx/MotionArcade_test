'use server';
/**
 * @fileOverview An AI agent that generates dynamic math problems based on the player's score.
 *
 * - generateMathProblem - A function that generates a math problem.
 * - GenerateMathProblemInput - The input type for the generateMathProblem function.
 * - GenerateMathProblemOutput - The return type for the generateMathProblem function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMathProblemInputSchema = z.object({
  currentScore: z.number().describe('The player\'s current score.'),
  pastScores: z.array(z.number()).describe('The player\'s past scores.'),
});
export type GenerateMathProblemInput = z.infer<typeof GenerateMathProblemInputSchema>;

const GenerateMathProblemOutputSchema = z.object({
  problem: z.string().describe('A math problem with operands and result between 0 and 10.'),
  solution: z.number().describe('The solution to the generated math problem.'),
});
export type GenerateMathProblemOutput = z.infer<typeof GenerateMathProblemOutputSchema>;

export async function generateMathProblem(input: GenerateMathProblemInput): Promise<GenerateMathProblemOutput> {
  return generateMathProblemFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMathProblemPrompt',
  input: {schema: GenerateMathProblemInputSchema},
  output: {schema: GenerateMathProblemOutputSchema},
  prompt: `You are an expert math problem generator for a children\'s game.  The problems should be tailored to the player\'s skill level, based on their current and past scores.

  The generated math problem must:
  * Only use integers.
  * Have a solution between 0 and 10, inclusive.
  * Only use the following operations: addition, subtraction, multiplication, and division.

  Here is the player\'s current score: {{{currentScore}}}
  Here are the player\'s past scores: {{{pastScores}}}

  Generate a math problem and the solution to that problem.
  Make sure the problem uses kid-friendly language.
  Ensure that you do not include the solution in the problem itself, and that the solution matches the value in the \"solution\" output field.

  For example:
  {
    \"problem\": \"What is 5 + 3?\",
    \"solution\": 8
  }`,
});

const generateMathProblemFlow = ai.defineFlow(
  {
    name: 'generateMathProblemFlow',
    inputSchema: GenerateMathProblemInputSchema,
    outputSchema: GenerateMathProblemOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

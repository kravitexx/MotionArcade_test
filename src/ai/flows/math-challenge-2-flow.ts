'use server';
/**
 * @fileOverview An AI agent that generates math problems with multiple choice options for Math Challenge 2.
 *
 * - generateMathProblem2 - A function that generates a math problem.
 * - GenerateMathProblem2Input - The input type for the function.
 * - GenerateMathProblem2Output - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMathProblem2InputSchema = z.object({
  currentScore: z.number().describe("The player's current score, to adjust difficulty."),
});
export type GenerateMathProblem2Input = z.infer<typeof GenerateMathProblem2InputSchema>;

const GenerateMathProblem2OutputSchema = z.object({
  problem: z.string().describe('A math problem, can be symbolic or a word problem.'),
  options: z.array(z.number()).min(4).max(6).describe('An array of 4-6 numerical answer options.'),
  correctAnswer: z.number().describe('The correct numerical answer, which must be one of the options.'),
});
export type GenerateMathProblem2Output = z.infer<typeof GenerateMathProblem2OutputSchema>;


export async function generateMathProblem2(input: GenerateMathProblem2Input): Promise<GenerateMathProblem2Output> {
  return generateMathProblem2Flow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMathProblem2Prompt',
  input: {schema: GenerateMathProblem2InputSchema},
  output: {schema: GenerateMathProblem2OutputSchema},
  prompt: `You are an expert math problem generator for a children's game. The problems should be tailored to the player's skill level, based on their score.

  The generated math problem must:
  * Have a numerical answer.
  * Be a mix of symbolic arithmetic (e.g., "50% of 100") and short word problems.
  * Provide between 4 and 6 plausible multiple-choice options.
  * One of the options must be the correct answer.

  Here is the player's current score: {{{currentScore}}}. A higher score means a more difficult question.

  Generate a math problem, a set of options, and identify the correct answer.

  Example:
  {
    "problem": "What is 50% of 100?",
    "options": [20, 30, 80, 50, 60],
    "correctAnswer": 50
  }
  `,
});

const generateMathProblem2Flow = ai.defineFlow(
  {
    name: 'generateMathProblem2Flow',
    inputSchema: GenerateMathProblem2InputSchema,
    outputSchema: GenerateMathProblem2OutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

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
  options: z.array(z.number()).min(4).max(6).describe('An array of 4-6 plausible integer answer options.'),
  correctAnswer: z.number().int().describe('The correct integer answer, which must be one of the options.'),
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

  The generated math problem MUST:
  * Have an integer as the final answer.
  * Be a mix of symbolic arithmetic (e.g., "5 * 2") and short word problems.
  * Provide between 4 and 6 plausible multiple-choice options, which MUST all be integers.
  * One of the options MUST be the correct integer answer.
  * Do NOT generate problems involving percentages, fractions, or decimals. Stick to whole numbers.

  Here is the player's current score: {{{currentScore}}}. A higher score means a more difficult question.

  Generate a math problem, a set of options, and identify the correct answer.

  Example 1 (Symbolic):
  {
    "problem": "What is 7 + 3?",
    "options": [8, 10, 12, 14],
    "correctAnswer": 10
  }

  Example 2 (Word Problem):
  {
    "problem": "If a cat has 4 legs, how many legs do 2 cats have?",
    "options": [4, 6, 8, 10, 2],
    "correctAnswer": 8
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

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

  The generated math problem MUST adhere to the following rules:
  1.  The final answer MUST be a single, whole integer. No fractions, decimals, or text answers.
  2.  The problem can be symbolic (e.g., "5 * 2") or a short word problem.
  3.  You must provide between 4 and 6 plausible multiple-choice options.
  4.  ALL options provided in the "options" array MUST be integers.
  5.  The value in the "correctAnswer" field MUST be one of the integers from the "options" array.
  6.  Do NOT generate problems involving percentages, complex fractions, or abstract concepts. Stick to basic arithmetic (addition, subtraction, multiplication, division).

  The player's current score is {{{currentScore}}}. A higher score means a more difficult question, but it must still follow all the rules above.

  Generate a math problem, a set of options, and identify the correct answer.

  Example 1 (Symbolic - Easy):
  {
    "problem": "What is 7 + 3?",
    "options": [8, 10, 12, 14],
    "correctAnswer": 10
  }

  Example 2 (Word Problem - Easy):
  {
    "problem": "If a cat has 4 legs, how many legs do 2 cats have?",
    "options": [4, 6, 8, 10, 2],
    "correctAnswer": 8
  }
  
  Example 3 (Symbolic - Harder):
  {
    "problem": "What is (3 * 4) + 5?",
    "options": [12, 15, 17, 20],
    "correctAnswer": 17
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

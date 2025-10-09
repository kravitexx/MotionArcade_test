'use server';
/**
 * @fileOverview An AI agent that generates dynamic math problems based on the player's score and selected difficulty.
 *
 * - generateMathProblem - A function that generates a math problem.
 * - GenerateMathProblemInput - The input type for the generateMathProblem function.
 * - GenerateMathProblemOutput - The return type for the generateMathProblem function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMathProblemInputSchema = z.object({
  difficulty: z.number().min(1).max(10).describe('The selected difficulty level, from 1 (easiest) to 10 (hardest).'),
  currentScore: z.number().describe('The player\'s current score.'),
  pastScores: z.array(z.number()).describe('The player\'s past scores.'),
});
export type GenerateMathProblemInput = z.infer<typeof GenerateMathProblemInputSchema>;

const GenerateMathProblemOutputSchema = z.object({
  problem: z.string().describe('A math problem with operands and result between 0 and 10.'),
  solution: z.number().int().min(0).max(10).describe('The solution to the generated math problem, which must be an integer between 0 and 10.'),
});
export type GenerateMathProblemOutput = z.infer<typeof GenerateMathProblemOutputSchema>;

export async function generateMathProblem(input: GenerateMathProblemInput): Promise<GenerateMathProblemOutput> {
  return generateMathProblemFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMathProblemPrompt',
  input: {schema: GenerateMathProblemInputSchema},
  output: {schema: GenerateMathProblemOutputSchema},
  prompt: `You are an expert math problem generator for a children's game. The problems should be tailored to the selected difficulty level.

  The generated math problem MUST adhere to the following rules:
  1.  The final solution MUST be an integer between 0 and 10, inclusive.
  2.  Only use the following operations: addition, subtraction, multiplication, and division.
  3.  The problem can be a symbolic arithmetic problem (e.g., "4 + 2") or a short word problem.

  Here is the selected difficulty level (1=easy, 10=hard): {{{difficulty}}}
  -   Level 1-3: Use simple, single-step addition or subtraction. (e.g., "3 + 5" or "8 - 2")
  -   Level 4-5: Introduce single-step multiplication or simple division that results in a whole number. Word problems should be simple.
  -   Level 6-7: Create two-step problems. Use parentheses for symbolic problems. Word problems should require two calculations. (e.g., "A farmer has 3 pens, and each pen has 3 sheep. If he sells 2 sheep, how many are left?")
  -   Level 8-9: Create three-step problems. The intermediate calculations can go above 10, but the final answer MUST be between 0 and 10. Word problems are strongly preferred. (e.g., "You have 5 apples. You get 5 more, then eat half. How many are left?")
  -   Level 10: Create a complex, multi-step (3 or 4 steps) word problem that requires careful reading and logical steps. The problem should be challenging but result in a simple integer answer between 0 and 10.

  Generate a math problem and the solution to that problem.
  Ensure that you do not include the solution in the problem itself, and that the solution matches the value in the "solution" output field.
  
  THE FINAL ANSWER MUST BE BETWEEN 0 AND 10.

  Example for difficulty 1:
  {
    "problem": "5 + 3?",
    "solution": 8
  }

  Example for difficulty 4:
  {
    "problem": "How many legs do two cats have?",
    "solution": 8
  }

  Example for difficulty 7:
  {
    "problem": "A bake sale has 5 cookies. If they sell 3, and then bake 6 more, how many cookies do they have now?",
    "solution": 8
  }

  Example for difficulty 10:
  {
    "problem": "A bus starts with 10 people. At the first stop, 5 people get off and 2 get on. At the second stop, half of the people currently on the bus get off. How many people are left?",
    "solution": 3
  }
  `,
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

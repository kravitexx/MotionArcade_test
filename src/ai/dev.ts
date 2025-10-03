'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/dynamic-math-problem-generation.ts';
import '@/ai/flows/quiz-quest-flow.ts';
import '@/ai/flows/math-challenge-2-flow.ts';
import '@/ai/flows/shape-challenge-flow.ts';

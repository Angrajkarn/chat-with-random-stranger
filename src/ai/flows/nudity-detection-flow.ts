
'use server';
/**
 * @fileOverview An AI flow to detect Not-Safe-For-Work (NSFW) content in images.
 *
 * - detectNudity - A function that analyzes an image for nudity.
 * - NudityDetectionInput - The input type for the detectNudity function.
 * - NudityDetectionOutput - The return type for the detectNudity function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GenerateResponseData } from 'genkit/generate';

const NudityDetectionInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo frame from a video, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type NudityDetectionInput = z.infer<typeof NudityDetectionInputSchema>;

const NudityDetectionOutputSchema = z.object({
  isNsfw: z.boolean().describe('Whether or not the image contains NSFW content.'),
});
export type NudityDetectionOutput = z.infer<typeof NudityDetectionOutputSchema>;


export async function detectNudity(input: NudityDetectionInput): Promise<NudityDetectionOutput> {
    return nudityDetectionFlow(input);
}

const nudityDetectionFlow = ai.defineFlow(
  {
    name: 'nudityDetectionFlow',
    inputSchema: NudityDetectionInputSchema,
    outputSchema: NudityDetectionOutputSchema,
  },
  async (input) => {
    
    const llmResponse = await ai.generate({
      prompt: [{ media: { url: input.photoDataUri } }, { text: 'Analyze the content of this image.' }],
      config: {
        safetySettings: [
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_LOW_AND_ABOVE',
          },
        ],
      },
    });

    const responseData: GenerateResponseData = llmResponse;
    
    if (responseData.finishReason === 'SAFETY') {
        return { isNsfw: true };
    }
    
    return { isNsfw: false };
  }
);

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ChatOutputSchema = z.object({
    content: z.string(),
    type: z.enum(['text', 'image']),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

// Simple flow that takes a string and can return a string or an image data uri.
export const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: z.string(),
    outputSchema: ChatOutputSchema,
  },
  async (prompt) => {
    if (prompt.toLowerCase().startsWith('/imagine ')) {
        const imagePrompt = prompt.substring('/imagine '.length);
        
        try {
            const { media } = await ai.generate({
              model: 'googleai/imagen-4.0-fast-generate-001',
              prompt: imagePrompt,
            });

            if (!media.url) {
                return {
                    content: "I couldn't generate an image for that. Please try another prompt.",
                    type: 'text'
                };
            }

            return {
                content: media.url,
                type: 'image'
            };
        } catch (e) {
            console.error("Image generation failed", e);
            return {
                content: "Sorry, I ran into an error while trying to create your image. It might be due to a safety filter.",
                type: 'text'
            };
        }
    }


    const llmResponse = await ai.generate({
      prompt: `You are Gemni, a helpful AI assistant. A user is talking to you. To generate an image, tell the user to start their prompt with '/imagine'.\n\nUser: ${prompt}`,
      model: 'googleai/gemini-2.5-flash',
      config: {
        // A temperature of 0.2 will produce more consistent, less-creative results
        temperature: 0.2,
      },
    });

    return {
        content: llmResponse.text,
        type: 'text'
    };
  }
);

// Wrapper function to be called from server actions.
export async function generateChatResponse(prompt: string): Promise<ChatOutput> {
  return await chatFlow(prompt);
}

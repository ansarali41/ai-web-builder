import getOpenAI, { enhancePromptConfig } from "@/configs/AiModel";
import Prompt from "@/data/Prompt";

export const maxDuration = 60;

export async function POST(request) {
    try {
        const { prompt } = await request.json();

        const stream = await getOpenAI().chat.completions.create({
            ...enhancePromptConfig,
            messages: [
                { role: "system", content: Prompt.ENHANCE_PROMPT_RULES },
                { role: "user", content: `Original prompt: ${prompt}` }
            ],
            stream: true,
        });

        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    let fullText = '';
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            fullText += content;
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({chunk: content})}\n\n`));
                        }
                    }
                    // Send final complete response
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({enhancedPrompt: fullText.trim(), done: true})}\n\n`));
                    controller.close();
                } catch (e) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({error: e.message, success: false})}\n\n`));
                    controller.close();
                }
            },
        });

        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('[enhance-prompt] Outer error:', error?.status, error?.message);
        const status = error?.status || 500;
        const isRateLimit = status === 429;
        const friendlyMessage = isRateLimit
            ? "AI usage limit reached. Please wait a few minutes and try again."
            : error?.message || 'Prompt enhancement failed';
        return new Response(JSON.stringify({
            error: friendlyMessage,
            status,
            isRateLimit,
            success: false,
        }), {
            status,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

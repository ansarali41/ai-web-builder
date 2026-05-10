import getOpenAI, { enhancePromptConfig } from "@/configs/AiModel";
import Prompt from "@/data/Prompt";

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
        return new Response(JSON.stringify({
            error: error.message,
            success: false
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

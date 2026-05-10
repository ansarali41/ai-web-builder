import getOpenAI, { chatConfig } from "@/configs/AiModel";
import Prompt from "@/data/Prompt";

export const maxDuration = 60;

export async function POST(req) {
    const {prompt} = await req.json();

    try {
        const stream = await getOpenAI().chat.completions.create({
            ...chatConfig,
            messages: [
                { role: "system", content: Prompt.CHAT_PROMPT },
                { role: "user", content: prompt }
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
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({result: fullText, done: true})}\n\n`));
                    controller.close();
                } catch (e) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({error: e.message || 'AI chat failed'})}\n\n`));
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
    } catch(e) {
        console.error('[ai-chat] Outer error:', e?.status, e?.message);
        console.error('[ai-chat] Full error:', JSON.stringify({
            name: e?.name,
            message: e?.message,
            status: e?.status,
            code: e?.code,
        }));
        return new Response(JSON.stringify({
            error: e?.message || 'AI chat failed',
            status: e?.status,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

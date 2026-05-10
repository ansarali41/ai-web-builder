import getOpenAI, { codeGenConfig, codeGenSystemMessage } from '@/configs/AiModel';
import Prompt from '@/data/Prompt';

export async function POST(req) {
    const {prompt} = await req.json();
    try {
        const stream = await getOpenAI().chat.completions.create({
            ...codeGenConfig,
            messages: [
                { role: "system", content: Prompt.CODE_GEN_PROMPT },
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
                    // Strip markdown code fences if present (some models wrap JSON in ```json ... ```)
                    let cleaned = fullText.trim();
                    if (cleaned.startsWith('```')) {
                        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
                    }
                    // Try to extract the outermost JSON object if there's surrounding text
                    const firstBrace = cleaned.indexOf('{');
                    const lastBrace = cleaned.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
                    }
                    try {
                        const parsedData = JSON.parse(cleaned);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({final: parsedData, done: true})}\n\n`));
                    } catch (e) {
                        console.error('[gen-ai-code] JSON parse failed:', e.message);
                        console.error('[gen-ai-code] Raw response (first 500 chars):', fullText.slice(0, 500));
                        console.error('[gen-ai-code] Raw response (last 500 chars):', fullText.slice(-500));
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({error: `Invalid JSON response: ${e.message}`, raw: fullText.slice(0, 1000), done: true})}\n\n`));
                    }
                    controller.close();
                } catch (e) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({error: e.message || 'Code generation failed'})}\n\n`));
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
        return new Response(JSON.stringify({error: e.message || 'Code generation failed'}), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

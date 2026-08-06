import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createGoogleCalendarEvent, getGoogleCalendarConnection } from "@/lib/google-calendar";
import type {
  ChatCompletionMessageFunctionToolCall,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";

const TIME_ZONE = "America/Sao_Paulo";

interface ChatRequestMessage {
  role: "user" | "assistant";
  content: string;
}

const TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Cria um evento no Google Agenda do usuário.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Título do evento" },
          start: {
            type: "string",
            description: "Início em ISO 8601 com offset, ex: 2026-08-06T17:00:00-03:00",
          },
          end: {
            type: "string",
            description: "Término em ISO 8601 com offset, ex: 2026-08-06T18:00:00-03:00",
          },
          description: { type: "string", description: "Descrição opcional do evento" },
        },
        required: ["summary", "start", "end"],
      },
    },
  },
];

function buildSystemPrompt() {
  const now = new Date()
    .toLocaleString("sv-SE", { timeZone: TIME_ZONE, hour12: false })
    .replace(" ", "T");

  return (
    "Você é Octos, um assistente pessoal com personalidade: conversacional, direto e assertivo. " +
    "Dê opiniões e recomendações claras em vez de ficar em cima do muro, questione premissas quando " +
    "fizer sentido, e evite respostas genéricas cheias de ressalvas. Seja sucinto — não enrole. " +
    "Responda sempre em português. " +
    `Data e hora atuais no fuso ${TIME_ZONE}: ${now} (offset -03:00). ` +
    "Você tem uma ferramenta para criar eventos no Google Agenda do usuário — use-a sempre que ele " +
    "pedir para agendar, marcar ou criar algo na agenda/calendário. Calcule os horários em ISO 8601 " +
    "com esse offset a partir da data/hora atual acima. Se o usuário não informar o horário de " +
    "término, assuma 1 hora de duração."
  );
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-openai-api-key") || undefined;

  if (!apiKey && !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 501 });
  }

  const { messages }: { messages: ChatRequestMessage[] } = await request.json();
  const openai = getOpenAIClient(apiKey);

  const conversation: ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt() },
    ...messages,
  ];

  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const toolCalls = await streamCompletion(openai, conversation, controller, encoder);

        if (toolCalls.length > 0) {
          conversation.push({ role: "assistant", content: null, tool_calls: toolCalls });

          for (const toolCall of toolCalls) {
            conversation.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: await runTool(toolCall),
            });
          }

          await streamCompletion(openai, conversation, controller, encoder);
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/** Streams one completion turn to the client, returning any tool calls the model requested. */
async function streamCompletion(
  openai: ReturnType<typeof getOpenAIClient>,
  conversation: ChatCompletionMessageParam[],
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
): Promise<ChatCompletionMessageFunctionToolCall[]> {
  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    stream: true,
    messages: conversation,
    tools: TOOLS,
  });

  const toolCalls: ChatCompletionMessageFunctionToolCall[] = [];

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;

    if (delta?.content) {
      controller.enqueue(encoder.encode(delta.content));
    }

    for (const deltaCall of delta?.tool_calls ?? []) {
      const existing = toolCalls[deltaCall.index];
      if (!existing) {
        toolCalls[deltaCall.index] = {
          id: deltaCall.id ?? "",
          type: "function",
          function: {
            name: deltaCall.function?.name ?? "",
            arguments: deltaCall.function?.arguments ?? "",
          },
        };
      } else {
        if (deltaCall.id) existing.id = deltaCall.id;
        if (deltaCall.function?.name) existing.function.name += deltaCall.function.name;
        if (deltaCall.function?.arguments) existing.function.arguments += deltaCall.function.arguments;
      }
    }
  }

  return toolCalls;
}

async function runTool(toolCall: ChatCompletionMessageFunctionToolCall): Promise<string> {
  if (toolCall.function.name !== "create_calendar_event") {
    return `Erro: ferramenta desconhecida "${toolCall.function.name}"`;
  }

  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return "Erro: usuário não autenticado.";
    }

    const connection = await getGoogleCalendarConnection(user.id);
    if (!connection) {
      return "Erro: o Google Agenda não está conectado. Peça para o usuário clicar em 'Conectar Google Agenda' no topo da tela.";
    }

    const args = JSON.parse(toolCall.function.arguments) as {
      summary: string;
      start: string;
      end: string;
      description?: string;
    };

    const event = await createGoogleCalendarEvent(connection.access_token, args);
    return `Evento criado com sucesso: "${args.summary}" (${args.start} até ${args.end}). Link: ${event.htmlLink}`;
  } catch (error) {
    return `Erro ao criar evento: ${error instanceof Error ? error.message : "falha desconhecida"}`;
  }
}

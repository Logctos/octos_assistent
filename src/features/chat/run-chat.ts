import OpenAI from "openai";
import type {
  ChatCompletionMessageFunctionToolCall,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { supabase } from "@/lib/supabase";
import {
  createGoogleCalendarEvent,
  getGoogleCalendarConnection,
  listUpcomingGoogleCalendarEvents,
} from "@/lib/google-calendar";
import { createExpense, deleteExpense, listExpensesForMonth } from "@/features/despesas/api";
import { FINANCE_CATEGORIES, type TransactionType } from "@/lib/finance-categories";
import { getTechNews } from "@/lib/tech-news";
import { createProject, listProjects, updateProjectStatus } from "@/features/projetos/api";
import {
  completeStudySession,
  computeStudyStats,
  createStudySessions,
  findPendingSessionByTopic,
  findStudyMaterialByTopic,
  listStudySessions,
  saveStudyMaterial,
  type NewStudySession,
} from "@/features/estudos/api";
import type { Project, StudySource } from "@/types";

const TIME_ZONE = "America/Sao_Paulo";

/** Google Calendar event colorIds: 9 = Blueberry (trabalho), 10 = Basil (estudos). */
const EVENT_CATEGORY_COLOR: Record<"trabalho" | "estudos", string> = {
  trabalho: "9",
  estudos: "10",
};

export interface ChatRequestMessage {
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
          category: {
            type: "string",
            enum: ["trabalho", "estudos"],
            description: "Categoria do evento: trabalho ou estudos.",
          },
        },
        required: ["summary", "start", "end", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_expense",
      description: "Registra uma despesa ou receita financeira do usuário.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["expense", "income"], description: "Despesa ou receita" },
          category: { type: "string", description: "Grupo da categoria, ex: Alimentação" },
          subcategory: { type: "string", description: "Subcategoria dentro do grupo, ex: Saídas" },
          amount: { type: "number", description: "Valor em reais, ex: 45.90" },
          description: { type: "string", description: "Observação opcional do lançamento" },
        },
        required: ["type", "category", "subcategory", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_ai_news",
      description:
        "Busca as manchetes mais recentes de IA e tecnologia. Use quando o usuário pedir para " +
        "resumir, contar, atualizar ou fazer um podcast sobre as notícias de IA.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Cria um novo projeto do usuário.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do projeto" },
          description: { type: "string", description: "Descrição opcional do projeto" },
          category: {
            type: "string",
            enum: ["trabalho", "estudos", "ambas"],
            description: "Categoria do projeto: trabalho, estudos ou ambas.",
          },
        },
        required: ["name", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_projects",
      description:
        "Lista os projetos do usuário, com nome, categoria (trabalho ou estudos) e status " +
        "(ativo, pausado ou concluído). Use quando o usuário perguntar quais projetos tem, o " +
        "andamento deles, etc.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project_status",
      description: "Muda o status de um projeto existente (ativo, pausado ou concluído).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome (ou parte do nome) do projeto a atualizar" },
          status: { type: "string", enum: ["active", "paused", "done"] },
        },
        required: ["name", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_expenses",
      description:
        "Lista as despesas e receitas de um mês. Use quando o usuário perguntar quanto gastou, " +
        "quanto recebeu, ou pedir um resumo financeiro do mês.",
      parameters: {
        type: "object",
        properties: {
          month: {
            type: "string",
            description: "Mês no formato AAAA-MM. Se omitido, usa o mês atual.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_expense",
      description:
        "Apaga um lançamento financeiro (despesa ou receita) do mês atual que bata com a " +
        "descrição informada. Use para corrigir um lançamento errado.",
      parameters: {
        type: "object",
        properties: {
          description: {
            type: "string",
            description: "Trecho da descrição ou subcategoria do lançamento a apagar",
          },
        },
        required: ["description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_study_plan",
      description:
        "Monta um plano de estudos gamificado a partir de temas: agenda as sessões no Google " +
        "Agenda, cria as sessões com XP no sistema de gamificação, E pesquisa na internet o " +
        "material de estudo de cada tema (princípios, conceitos-chave e fontes). Use quando o " +
        "usuário pedir um plano/cronograma de estudos ou disser os temas que quer estudar.",
      parameters: {
        type: "object",
        properties: {
          topics: {
            type: "array",
            items: { type: "string" },
            description: "Temas a estudar, ex: [\"React\", \"Inglês\"]. As sessões alternam entre eles.",
          },
          sessions_per_week: {
            type: "number",
            description: "Quantas sessões por semana. Padrão: 3.",
          },
          session_minutes: {
            type: "number",
            description: "Duração de cada sessão em minutos. Padrão: 45.",
          },
          weeks: {
            type: "number",
            description: "Duração do plano em semanas. Padrão: 4.",
          },
          base_material: {
            type: "string",
            description:
              "Livro, artigo ou site que o usuário indicou como base para os temas (nome do " +
              "livro, autor, ou uma URL). Opcional — só preencha se o usuário mencionar algo.",
          },
        },
        required: ["topics"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_study_material",
      description:
        "Busca (ou pesquisa na internet, se ainda não existir) o material de estudo — princípios, " +
        "conceitos-chave e fontes — de um tema do plano de estudos. Use quando o usuário pedir o " +
        "material, o conteúdo, os princípios ou recursos sobre um tema específico.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Tema a pesquisar/buscar material." },
          base_material: {
            type: "string",
            description: "Livro, artigo ou site indicado como base, se o usuário mencionar um.",
          },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_study_session",
      description:
        "Marca uma sessão de estudo pendente como concluída e dá o XP dela. Use quando o usuário " +
        "disser que terminou/concluiu de estudar um tema.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: "Tema estudado, para achar a sessão pendente correspondente.",
          },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_study_progress",
      description:
        "Consulta o progresso do plano de estudos: XP total, nível, sequência de dias (streak) e " +
        "sessões pendentes/concluídas. Use quando o usuário perguntar seu nível, XP, sequência ou " +
        "progresso nos estudos.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_calendar_events",
      description:
        "Lista os próximos eventos do Google Agenda do usuário. Use quando ele perguntar o que " +
        "tem na agenda, hoje, amanhã ou nos próximos dias.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "Quantos dias à frente olhar a partir de agora. Padrão: 7.",
          },
        },
      },
    },
  },
];

function formatCategoryTree() {
  return (Object.entries(FINANCE_CATEGORIES) as [TransactionType, Record<string, string[]>][])
    .map(([type, groups]) => {
      const label = type === "income" ? "receitas" : "despesas";
      const groupList = Object.entries(groups)
        .map(([group, subs]) => `${group} (${subs.join(", ")})`)
        .join("; ");
      return `${label} — ${groupList}`;
    })
    .join(" | ");
}

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
    "término, assuma 1 hora de duração. Todo evento precisa de uma categoria, trabalho ou estudos — " +
    "se não estiver óbvio pelo que o usuário descreveu, pergunte antes de chamar a ferramenta (não " +
    "invente a categoria). " +
    "Você também tem uma ferramenta para registrar despesas e receitas financeiras — use-a sempre " +
    "que o usuário disser que gastou, pagou, recebeu ou ganhou dinheiro, ou pedir para lançar algo " +
    `financeiro. Categorias já cadastradas (grupo e subcategorias): ${formatCategoryTree()}. ` +
    "Escolha o grupo e a subcategoria existentes que melhor combinam com o que o usuário descreveu. " +
    "Se nada bater bem, use o grupo 'Outras Despesas' (despesa) ou 'Receitas' (receita) com uma " +
    "subcategoria curta que descreva o lançamento. Se o usuário não informar o valor, pergunte antes " +
    "de chamar a ferramenta — não invente um valor. " +
    "Você também tem uma ferramenta para buscar as manchetes mais recentes de IA e tecnologia. " +
    "Sempre que o usuário pedir para resumir, contar, atualizar ou fazer um podcast sobre as " +
    "notícias, use essa ferramenta e depois narre o resultado como um mini podcast falado: comece " +
    "com uma saudação curta de apresentador, conte as manchetes em texto corrido e conversacional — " +
    "sem listas, sem markdown, sem asteriscos, sem números — como se estivesse narrando em voz alta " +
    "para alguém ouvindo no carro, e feche com uma frase de encerramento curta. Fique entre 100 e " +
    "180 palavras no total. " +
    "Você também gerencia os projetos do usuário: create_project para criar, list_projects para " +
    "listar (com categoria e status), update_project_status para pausar/concluir/reativar um " +
    "projeto pelo nome. Use sempre que o usuário mencionar um projeto e o que quer fazer com ele. " +
    "Todo projeto novo precisa de uma categoria: trabalho, estudos ou ambas (quando envolve os " +
    "dois) — se não estiver óbvio pelo que o usuário descreveu, pergunte antes de chamar " +
    "create_project (não invente a categoria). " +
    "Você também pode listar os lançamentos financeiros de um mês (list_expenses) e apagar um " +
    "lançamento que o usuário disser que está errado (delete_expense, buscando por trecho da " +
    "descrição). E pode listar os próximos eventos do Google Agenda (list_calendar_events) quando " +
    "o usuário perguntar o que tem na agenda. " +
    "Você também monta planos de estudo gamificados: quando o usuário der os temas que quer " +
    "estudar (ou pedir um plano/cronograma de estudos), use create_study_plan — ela já agenda as " +
    "sessões no Google Agenda, cria o XP de cada uma, E pesquisa na internet o material real de " +
    "cada tema (princípios, conceitos-chave, fontes). Se ele não informar frequência, duração ou " +
    "quantidade de semanas, use os padrões (3x por semana, 45 min por sessão, 4 semanas) sem " +
    "perguntar, e avise os padrões usados na resposta. Se o usuário indicar um livro, artigo ou " +
    "site como base para os temas, passe isso em base_material — a pesquisa vai priorizar essa " +
    "fonte além de buscar outras. Cada sessão vale 20 XP e sobe de nível a cada 100 XP. O " +
    "resultado de create_study_plan já traz o material pesquisado de cada tema — repasse esse " +
    "conteúdo pro usuário de forma organizada (pode separar por tema), sem resumir demais: é " +
    "material de estudo de verdade que ele vai usar, não só uma confirmação de que o plano foi " +
    "criado. Se o usuário pedir o material de um tema específico depois (ex: 'manda o material " +
    "de Docker', 'quais os princípios de X'), use get_study_material. Quando o usuário disser que " +
    "terminou de estudar um tema, use complete_study_session (pelo nome do tema) para dar o XP e " +
    "contar nível/sequência atualizados de forma comemorativa, tipo jogo. Use get_study_progress " +
    "quando ele perguntar seu nível, XP, sequência (streak) ou progresso nos estudos. " +
    "Para todas as ferramentas de listagem, narre o " +
    "resultado em texto corrido e curto, não como uma lista técnica — e se a lista vier vazia, diga " +
    "isso de forma natural."
  );
}

async function runTool(
  toolCall: ChatCompletionMessageFunctionToolCall,
  openai: OpenAI
): Promise<string> {
  if (toolCall.function.name === "create_calendar_event") {
    return runCreateCalendarEvent(toolCall);
  }

  if (toolCall.function.name === "create_expense") {
    return runCreateExpenseTool(toolCall);
  }

  if (toolCall.function.name === "get_ai_news") {
    return runGetAiNews();
  }

  if (toolCall.function.name === "create_project") {
    return runCreateProject(toolCall);
  }

  if (toolCall.function.name === "list_projects") {
    return runListProjects();
  }

  if (toolCall.function.name === "update_project_status") {
    return runUpdateProjectStatus(toolCall);
  }

  if (toolCall.function.name === "list_expenses") {
    return runListExpenses(toolCall);
  }

  if (toolCall.function.name === "delete_expense") {
    return runDeleteExpense(toolCall);
  }

  if (toolCall.function.name === "list_calendar_events") {
    return runListCalendarEvents(toolCall);
  }

  if (toolCall.function.name === "create_study_plan") {
    return runCreateStudyPlan(toolCall, openai);
  }

  if (toolCall.function.name === "get_study_material") {
    return runGetStudyMaterial(toolCall, openai);
  }

  if (toolCall.function.name === "complete_study_session") {
    return runCompleteStudySession(toolCall);
  }

  if (toolCall.function.name === "get_study_progress") {
    return runGetStudyProgress();
  }

  return `Erro: ferramenta desconhecida "${toolCall.function.name}"`;
}

async function runCreateCalendarEvent(
  toolCall: ChatCompletionMessageFunctionToolCall
): Promise<string> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "Erro: usuário não autenticado.";

    const connection = await getGoogleCalendarConnection(user.id);
    if (!connection) {
      return "Erro: o Google Agenda não está conectado. Peça para o usuário clicar em 'Conectar Google Agenda' no topo da tela.";
    }

    const args = JSON.parse(toolCall.function.arguments) as {
      summary: string;
      start: string;
      end: string;
      description?: string;
      category: "trabalho" | "estudos";
    };

    const event = await createGoogleCalendarEvent(connection.access_token, {
      ...args,
      colorId: EVENT_CATEGORY_COLOR[args.category],
    });
    return (
      `Evento criado com sucesso: "${args.summary}" (${args.start} até ${args.end}), ` +
      `categoria ${args.category}. Link: ${event.htmlLink}`
    );
  } catch (error) {
    return `Erro ao criar evento: ${error instanceof Error ? error.message : "falha desconhecida"}`;
  }
}

async function runCreateExpenseTool(
  toolCall: ChatCompletionMessageFunctionToolCall
): Promise<string> {
  try {
    const args = JSON.parse(toolCall.function.arguments) as {
      type: string;
      category: string;
      subcategory: string;
      amount: number | string;
      description?: string;
    };

    const amount = Number(args.amount);
    const { error } = await createExpense({
      type: args.type,
      category: args.category,
      subcategory: args.subcategory,
      description: args.description ?? "",
      amount,
    });

    if (error) return `Erro ao registrar lançamento: ${error}`;

    const label = args.type === "income" ? "Receita" : "Despesa";
    return `${label} registrada: ${args.subcategory} — R$ ${amount.toFixed(2)}.`;
  } catch (error) {
    return `Erro ao registrar lançamento: ${error instanceof Error ? error.message : "falha desconhecida"}`;
  }
}

async function runGetAiNews(): Promise<string> {
  const news = await getTechNews(6);
  if (news.length === 0) return "Não foi possível buscar as notícias agora.";

  return news.map((item) => `- ${item.title}`).join("\n");
}

const PROJECT_STATUS_LABEL: Record<Project["status"], string> = {
  active: "ativo",
  paused: "pausado",
  done: "concluído",
};

async function runCreateProject(
  toolCall: ChatCompletionMessageFunctionToolCall
): Promise<string> {
  try {
    const args = JSON.parse(toolCall.function.arguments) as {
      name: string;
      description?: string;
      category: Project["category"];
    };

    const { error } = await createProject({
      name: args.name,
      description: args.description ?? "",
      category: args.category,
    });

    if (error) return `Erro ao criar projeto: ${error}`;
    return `Projeto "${args.name}" criado, categoria ${args.category}.`;
  } catch (error) {
    return `Erro ao criar projeto: ${error instanceof Error ? error.message : "falha desconhecida"}`;
  }
}

async function runListProjects(): Promise<string> {
  const projects = await listProjects();
  if (projects.length === 0) return "Nenhum projeto cadastrado.";

  return projects
    .map((p) => `${p.name} (${p.category}, ${PROJECT_STATUS_LABEL[p.status]})`)
    .join(", ");
}

function findProjectByName(projects: Project[], query: string): Project | undefined {
  const needle = query.trim().toLowerCase();
  return projects.find((p) => p.name.toLowerCase().includes(needle));
}

async function runUpdateProjectStatus(
  toolCall: ChatCompletionMessageFunctionToolCall
): Promise<string> {
  try {
    const args = JSON.parse(toolCall.function.arguments) as {
      name: string;
      status: Project["status"];
    };

    const projects = await listProjects();
    const project = findProjectByName(projects, args.name);
    if (!project) return `Erro: não encontrei nenhum projeto chamado "${args.name}".`;

    await updateProjectStatus(project.id, args.status);
    return `Projeto "${project.name}" agora está ${PROJECT_STATUS_LABEL[args.status]}.`;
  } catch (error) {
    return `Erro ao atualizar projeto: ${error instanceof Error ? error.message : "falha desconhecida"}`;
  }
}

async function runListExpenses(toolCall: ChatCompletionMessageFunctionToolCall): Promise<string> {
  try {
    const args = JSON.parse(toolCall.function.arguments || "{}") as { month?: string };
    const month = args.month ?? new Date().toISOString().slice(0, 7);

    const expenses = await listExpensesForMonth(month);
    if (expenses.length === 0) return `Nenhum lançamento encontrado em ${month}.`;

    const totalExpense = expenses
      .filter((e) => e.type === "expense")
      .reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = expenses
      .filter((e) => e.type === "income")
      .reduce((sum, e) => sum + e.amount, 0);

    const lines = expenses
      .map((e) => `${e.type === "income" ? "+" : "-"} R$ ${e.amount.toFixed(2)} ${e.description}`)
      .join("; ");

    return (
      `Mês ${month}: total de despesas R$ ${totalExpense.toFixed(2)}, total de receitas ` +
      `R$ ${totalIncome.toFixed(2)}. Lançamentos: ${lines}.`
    );
  } catch (error) {
    return `Erro ao listar lançamentos: ${error instanceof Error ? error.message : "falha desconhecida"}`;
  }
}

async function runDeleteExpense(
  toolCall: ChatCompletionMessageFunctionToolCall
): Promise<string> {
  try {
    const args = JSON.parse(toolCall.function.arguments) as { description: string };
    const month = new Date().toISOString().slice(0, 7);
    const expenses = await listExpensesForMonth(month);

    const needle = args.description.trim().toLowerCase();
    const matches = expenses.filter(
      (e) =>
        e.description.toLowerCase().includes(needle) ||
        (e.subcategory ?? "").toLowerCase().includes(needle)
    );

    if (matches.length === 0) {
      return `Erro: não encontrei nenhum lançamento deste mês parecido com "${args.description}".`;
    }
    if (matches.length > 1) {
      const options = matches
        .map((e) => `${e.description} (R$ ${e.amount.toFixed(2)})`)
        .join(", ");
      return `Encontrei mais de um lançamento parecido: ${options}. Peça pra apagar de forma mais específica.`;
    }

    await deleteExpense(matches[0].id);
    return `Lançamento "${matches[0].description}" (R$ ${matches[0].amount.toFixed(2)}) apagado.`;
  } catch (error) {
    return `Erro ao apagar lançamento: ${error instanceof Error ? error.message : "falha desconhecida"}`;
  }
}

async function runListCalendarEvents(
  toolCall: ChatCompletionMessageFunctionToolCall
): Promise<string> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "Erro: usuário não autenticado.";

    const connection = await getGoogleCalendarConnection(user.id);
    if (!connection) {
      return "Erro: o Google Agenda não está conectado. Peça para o usuário clicar em 'Conectar Google Agenda' no topo da tela.";
    }

    const args = JSON.parse(toolCall.function.arguments || "{}") as { days?: number };
    const events = await listUpcomingGoogleCalendarEvents(connection.access_token, {
      days: args.days ?? 7,
    });

    if (events.length === 0) return "Nenhum evento encontrado no período.";

    return events
      .map((e) => `${e.summary ?? "(sem título)"} em ${e.start.dateTime ?? e.start.date}`)
      .join("; ");
  } catch (error) {
    return `Erro ao buscar agenda: ${error instanceof Error ? error.message : "falha desconhecida"}`;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Builds the real UTC instant for a given wall-clock date/time in São Paulo (fixed UTC-3, no DST since 2019). */
function localSaoPauloDate(year: number, month: number, day: number, hour: number, minute: number) {
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute));
}

/** Shifts a São Paulo instant back to its local wall-clock numbers, readable via the UTC getters. */
function toSaoPauloWallClock(instant: Date) {
  return new Date(instant.getTime() - 3 * 60 * 60 * 1000);
}

function toSaoPauloIso(instant: Date) {
  const local = toSaoPauloWallClock(instant);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
    `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:00-03:00`
  );
}

function toSaoPauloDateOnly(instant: Date) {
  const local = toSaoPauloWallClock(instant);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
}

const MAX_RESEARCHED_TOPICS = 5;

/** Web-search-grounded research for one topic, via OpenAI's search-preview model. */
async function researchTopic(
  openai: OpenAI,
  topic: string,
  baseMaterial?: string
): Promise<{ content: string; sources: StudySource[] }> {
  const baseNote = baseMaterial
    ? `O usuário indicou como material base: "${baseMaterial}". Priorize e cite essa fonte, além de outras que encontrar. `
    : "";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini-search-preview",
      web_search_options: {},
      messages: [
        {
          role: "user",
          content:
            `Pesquise na internet e monte um material de estudo sobre "${topic}". ${baseNote}` +
            "Traga os principais princípios e conceitos-chave, explicados de forma direta e " +
            "prática, e cite as fontes usadas. Responda em português, em texto corrido, sem ser " +
            "excessivamente longo (uns 150-250 palavras).",
        },
      ],
    });

    const message = response.choices[0]?.message;
    const content = message?.content?.trim();
    const sources: StudySource[] = (message?.annotations ?? [])
      .filter((a) => a.type === "url_citation")
      .map((a) => ({ title: a.url_citation.title, url: a.url_citation.url }));

    return {
      content: content || "Não consegui pesquisar material sobre esse tema agora.",
      sources,
    };
  } catch {
    return { content: "Não consegui pesquisar material sobre esse tema agora.", sources: [] };
  }
}

function formatMaterialSection(topic: string, material: { content: string; sources: StudySource[] }) {
  const sourcesLine =
    material.sources.length > 0
      ? ` Fontes: ${material.sources.map((s) => `${s.title} (${s.url})`).join(", ")}.`
      : "";
  return `\n\n### Material: ${topic}\n${material.content}${sourcesLine}`;
}

/** Calendar event description: base info plus the researched material/links, when available. */
function buildSessionDescription(
  planLabel: string,
  material: { content: string; sources: StudySource[] } | undefined
) {
  const base = `Sessão do plano de estudos gamificado (${planLabel}). Vale 20 XP.`;
  if (!material) return base;

  const sourcesBlock =
    material.sources.length > 0
      ? `\n\nFontes:\n${material.sources.map((s) => `- ${s.title}: ${s.url}`).join("\n")}`
      : "";
  return `${base}\n\n${material.content}${sourcesBlock}`;
}

/** Curriculum progression each topic's sessions cycle through, e.g. Docker → Introdução ao Docker, Fundamentos de Docker, Projetos com Docker, then repeats as "revisão". */
const STUDY_PLAN_STAGES = ["Introdução ao", "Fundamentos de", "Projetos com"];

function buildStageLabel(topic: string, occurrenceIndex: number): string {
  const stage = STUDY_PLAN_STAGES[occurrenceIndex % STUDY_PLAN_STAGES.length];
  const cycle = Math.floor(occurrenceIndex / STUDY_PLAN_STAGES.length);
  const suffix = cycle > 0 ? ` (revisão ${cycle + 1})` : "";
  return `${stage} ${topic}${suffix}`;
}

async function runCreateStudyPlan(
  toolCall: ChatCompletionMessageFunctionToolCall,
  openai: OpenAI
): Promise<string> {
  try {
    const args = JSON.parse(toolCall.function.arguments) as {
      topics: string[];
      sessions_per_week?: number;
      session_minutes?: number;
      weeks?: number;
      base_material?: string;
    };

    const topics = (args.topics ?? []).map((t) => t.trim()).filter(Boolean);
    if (topics.length === 0) return "Erro: informe ao menos um tema para o plano de estudos.";

    const sessionsPerWeek = clamp(Math.round(args.sessions_per_week ?? 3), 1, 7);
    const sessionMinutes = clamp(Math.round(args.session_minutes ?? 45), 15, 240);
    const weeks = clamp(Math.round(args.weeks ?? 4), 1, 12);
    const totalSessions = Math.min(sessionsPerWeek * weeks, 60);
    const intervalDays = Math.max(1, Math.round(7 / sessionsPerWeek));

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "Erro: usuário não autenticado.";

    const connection = await getGoogleCalendarConnection(user.id);

    const todaySP = toSaoPauloWallClock(new Date());
    const baseYear = todaySP.getUTCFullYear();
    const baseMonth = todaySP.getUTCMonth() + 1;
    const baseDay = todaySP.getUTCDate() + 1; // start tomorrow

    const planLabel = `Estudos: ${topics.join(", ")}`;

    // Research each topic BEFORE creating events, so every calendar event already carries the
    // principles/links for its topic instead of a generic placeholder description.
    const uniqueTopics = [...new Set(topics)].slice(0, MAX_RESEARCHED_TOPICS);
    const materials = await Promise.all(
      uniqueTopics.map((topic) => researchTopic(openai, topic, args.base_material))
    );
    const materialByTopic = new Map(uniqueTopics.map((topic, i) => [topic, materials[i]]));
    await Promise.all(
      uniqueTopics.map((topic, i) =>
        saveStudyMaterial({
          planLabel,
          topic,
          content: materials[i].content,
          sources: materials[i].sources,
          baseMaterial: args.base_material ?? null,
        })
      )
    );

    const sessionsToInsert: NewStudySession[] = [];
    let createdEvents = 0;

    for (let i = 0; i < totalSessions; i++) {
      const rawTopic = topics[i % topics.length];
      const occurrenceIndex = Math.floor(i / topics.length);
      const stageTopic = buildStageLabel(rawTopic, occurrenceIndex);
      const start = localSaoPauloDate(baseYear, baseMonth, baseDay + i * intervalDays, 19, 0);
      const end = new Date(start.getTime() + sessionMinutes * 60_000);

      let calendarLink: string | null = null;
      if (connection) {
        try {
          const event = await createGoogleCalendarEvent(connection.access_token, {
            summary: `Estudo: ${stageTopic}`,
            start: toSaoPauloIso(start),
            end: toSaoPauloIso(end),
            description: buildSessionDescription(planLabel, materialByTopic.get(rawTopic)),
            colorId: EVENT_CATEGORY_COLOR.estudos,
          });
          calendarLink = event.htmlLink;
          createdEvents++;
        } catch {
          // Segue criando as demais sessões mesmo se um evento específico falhar.
        }
      }

      sessionsToInsert.push({
        planLabel,
        topic: stageTopic,
        sessionDate: toSaoPauloDateOnly(start),
        durationMinutes: sessionMinutes,
        xpValue: 20,
        calendarEventLink: calendarLink,
      });
    }

    const { error } = await createStudySessions(sessionsToInsert);
    if (error) return `Erro ao salvar o plano de estudos: ${error}`;

    const calendarNote = connection
      ? `${createdEvents} evento(s) criados no Google Agenda, já com o material de estudo na descrição.`
      : "O Google Agenda não está conectado, então as sessões foram salvas sem eventos na agenda.";

    const materialSections = uniqueTopics.map((topic, i) => formatMaterialSection(topic, materials[i])).join("");

    return (
      `Plano de estudos criado: ${totalSessions} sessões de ${sessionMinutes} min, ` +
      `${sessionsPerWeek}x por semana por ${weeks} semana(s), alternando entre ${topics.join(", ")}, ` +
      `começando amanhã. Cada sessão vale 20 XP. ${calendarNote}` +
      materialSections
    );
  } catch (error) {
    return `Erro ao criar plano de estudos: ${error instanceof Error ? error.message : "falha desconhecida"}`;
  }
}

async function runGetStudyMaterial(
  toolCall: ChatCompletionMessageFunctionToolCall,
  openai: OpenAI
): Promise<string> {
  try {
    const args = JSON.parse(toolCall.function.arguments) as {
      topic: string;
      base_material?: string;
    };
    const topic = args.topic.trim();
    if (!topic) return "Erro: informe o tema para buscar o material.";

    const existing = await findStudyMaterialByTopic(topic);
    if (existing) return formatMaterialSection(existing.topic, existing).trim();

    const material = await researchTopic(openai, topic, args.base_material);
    await saveStudyMaterial({
      topic,
      content: material.content,
      sources: material.sources,
      baseMaterial: args.base_material ?? null,
    });

    return formatMaterialSection(topic, material).trim();
  } catch (error) {
    return `Erro ao buscar material: ${error instanceof Error ? error.message : "falha desconhecida"}`;
  }
}

async function runCompleteStudySession(
  toolCall: ChatCompletionMessageFunctionToolCall
): Promise<string> {
  try {
    const args = JSON.parse(toolCall.function.arguments || "{}") as { topic?: string };
    const session = await findPendingSessionByTopic(args.topic ?? "");
    if (!session) {
      return (
        "Erro: não encontrei nenhuma sessão de estudo pendente" +
        (args.topic ? ` para "${args.topic}"` : "") +
        "."
      );
    }

    const { error } = await completeStudySession(session.id);
    if (error) return `Erro ao concluir a sessão: ${error}`;

    const sessions = await listStudySessions();
    const stats = computeStudyStats(sessions);

    return (
      `Sessão "${session.topic}" concluída! +${session.xp_value} XP. ` +
      `Total: ${stats.totalXp} XP, nível ${stats.level} (${stats.xpIntoLevel}/${stats.xpForNextLevel} ` +
      `para o próximo), sequência de ${stats.streak} dia(s). Faltam ${stats.pendingCount} sessão(ões) ` +
      "no plano."
    );
  } catch (error) {
    return `Erro ao concluir sessão: ${error instanceof Error ? error.message : "falha desconhecida"}`;
  }
}

async function runGetStudyProgress(): Promise<string> {
  const sessions = await listStudySessions();
  if (sessions.length === 0) {
    return "Ainda não existe nenhum plano de estudos. Diga os temas que quer estudar que eu monto um.";
  }

  const stats = computeStudyStats(sessions);
  const nextPending = sessions
    .filter((s) => !s.completed)
    .sort((a, b) => a.session_date.localeCompare(b.session_date))[0];

  const nextNote = nextPending
    ? `Próxima sessão: ${nextPending.topic} em ${nextPending.session_date}.`
    : "Todas as sessões do plano atual foram concluídas!";

  return (
    `Nível ${stats.level}, ${stats.totalXp} XP no total (${stats.xpIntoLevel}/${stats.xpForNextLevel} ` +
    `para o próximo nível). Sequência atual: ${stats.streak} dia(s). ${stats.completedCount} ` +
    `sessões concluídas, ${stats.pendingCount} pendentes. ${nextNote}`
  );
}

/** Streams one completion turn, invoking onToken for each text chunk and returning any tool calls. */
async function streamCompletion(
  openai: OpenAI,
  conversation: ChatCompletionMessageParam[],
  onToken: (chunk: string) => void
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

    if (delta?.content) onToken(delta.content);

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

/**
 * Runs a full chat turn against OpenAI directly from the browser (no backend — there's no
 * server left to hide a shared key, so this always uses the user's own key from settings).
 * Streams assistant text via onToken and executes any tool calls (expenses, calendar, news)
 * against Supabase / Google directly, respecting the same RLS policies the rest of the app uses.
 */
export async function runChat(
  history: ChatRequestMessage[],
  apiKey: string,
  onToken: (chunk: string) => void
): Promise<void> {
  if (!apiKey) {
    throw new Error(
      "Configure sua chave da OpenAI nas configurações (⚙︎) para conversar com o Octos."
    );
  }

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const conversation: ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt() },
    ...history,
  ];

  const toolCalls = await streamCompletion(openai, conversation, onToken);

  if (toolCalls.length > 0) {
    conversation.push({ role: "assistant", content: null, tool_calls: toolCalls });

    for (const toolCall of toolCalls) {
      conversation.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: await runTool(toolCall, openai),
      });
    }

    await streamCompletion(openai, conversation, onToken);
  }
}

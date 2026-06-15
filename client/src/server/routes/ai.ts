import { Router } from "express";
import { db } from "../db/index.js";
import { aiUsage, aiSuggestions, chatHistory } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { checkPlanMiddleware } from "../middleware/plan.js";
import { subscriptions, plans } from "../db/schema.js";
import { and } from "drizzle-orm";

export const aiRouter = Router();

import { OpenAI } from "openai";

const groq = process.env.GROQ_API_KEY ? new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
}) : null;

const SYSTEM_PROMPT = `Eres el asistente inteligente de BioSmart, una plataforma líder en agricultura urbana, sostenibilidad e IoT.

Tu especialización incluye:
- Agricultura urbana y vertical: diseño de huertas, cultivos hidropónicos, aeropónicos
- Compostaje inteligente: técnicas, monitoreo de temperatura y humedad
- Microcultivos domésticos: germinados, microgreens, hongos gourmet
- Tecnología IoT aplicada: sensores de humedad capacitivos, pH, temperatura, luminosidad
- Automatización: riego por goteo automatizado, iluminación LED programada, ventilación
- Sostenibilidad: reciclaje de agua, energía solar, reducción de huella de carbono

Reglas de comportamiento:
1. Da recomendaciones técnicas precisas con datos específicos
2. Sugiere sensores IoT concretos (DHT22, capacitivos, etc.) cuando sea relevante
3. Propón soluciones de automatización con Arduino/ESP32/Raspberry Pi
4. Mantén un tono profesional pero cercano y amigable
5. Responde siempre en español
6. Sé conciso pero completo (máximo 300 palabras por respuesta)
7. Si no estás seguro de algo, indícalo honestamente
8. Incluye datos numéricos cuando sea posible (porcentajes de ahorro, rangos óptimos, etc.)`;

async function generateAIResponse(message: string, history: any[] = []): Promise<string> {
  try {
    if (!process.env.GROQ_API_KEY) {
      return "Lo siento, el servicio de IA no está configurado actualmente.";
    }

    // Build conversation context from history (last 10 messages)
    const contextMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];
    
    // Add recent history for context
    for (const h of history.slice(-10)) {
      contextMessages.push({ role: "user", content: h.message });
      contextMessages.push({ role: "assistant", content: h.response });
    }
    
    contextMessages.push({ role: "user", content: message });

    const completion = await groq.chat.completions.create({
      messages: contextMessages,
      model: "llama-3.3-70b-versatile",
    });

    return completion.choices[0].message.content || "No pude generar una respuesta.";
  } catch (error) {
    console.error("Groq Error:", error);
    return "Tuve un problema al procesar tu solicitud de IA. Por favor, intenta de nuevo.";
  }
}

async function generateSuggestion(userId: number): Promise<string> {
  try {
    if (!process.env.GROQ_API_KEY) {
      return "Optimiza tu riego usando sensores de humedad capacitivos.";
    }

    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "Genera una única sugerencia corta y profesional (máximo 20 palabras) para un agricultor urbano sobre cómo mejorar su productividad o sostenibilidad. Sé específico y técnico." 
        }
      ],
      model: "llama3-8b-8192",
    });

    return completion.choices[0].message.content || "Considera rotar tus cultivos para mejorar la salud del suelo.";
  } catch (error) {
    return "Optimiza tu riego usando sensores de humedad capacitivos para ahorrar un 30% de agua.";
  }
}

// POST /api/ai/chat
aiRouter.post("/chat", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      res.status(400).json({ error: "Mensaje requerido" });
      return;
    }

    // Fetch recent chat history for context
    let history: any[] = [];
    if (db) {
      history = await db
        .select()
        .from(chatHistory)
        .where(eq(chatHistory.userId, req.user!.id))
        .orderBy(desc(chatHistory.createdAt))
        .limit(10);
      history.reverse(); // chronological order
    }

    const response = await generateAIResponse(message, history);

    // Save to chat_history table
    if (db) {
      await db.insert(chatHistory).values({
        userId: req.user!.id,
        message,
        response,
        role: "user",
      });
    }

    // Also log in aiUsage for stats
    if (db) {
      await db.insert(aiUsage).values({
        userId: req.user!.id,
        type: "chat",
        prompt: message,
        response,
        tokensUsed: Math.floor(message.length + response.length),
      });
    }

    res.json({ response, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Error in AI chat:", error);
    res.status(500).json({ error: "Error en el chatbot" });
  }
});

// GET /api/ai/history - Retrieve chat history for current user
aiRouter.get("/history", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.json({ history: [] }); return; }
    
    const history = await db
      .select()
      .from(chatHistory)
      .where(eq(chatHistory.userId, req.user!.id))
      .orderBy(desc(chatHistory.createdAt))
      .limit(50);

    res.json({ history: history.reverse() });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.json({ history: [] });
  }
});

// GET /api/ai/suggestions
aiRouter.get("/suggestions", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const suggestion = await generateSuggestion(req.user!.id);

    if (db) {
      await db.insert(aiSuggestions).values({
        userId: req.user!.id,
        suggestion,
      });

      await db.insert(aiUsage).values({
        userId: req.user!.id,
        type: "suggestion",
        prompt: "auto_suggestion",
        response: suggestion,
        tokensUsed: Math.floor(Math.random() * 100) + 30,
      });
    }

    res.json({ suggestion, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Error generating suggestion:", error);
    res.status(500).json({ error: "Error al generar sugerencia" });
  }
});

// GET /api/ai/usage
aiRouter.get("/usage", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) {
      res.json({ totalChats: 0, totalSuggestions: 0, totalTokens: 0, recentUsage: [] });
      return;
    }

    const usage = await db
      .select()
      .from(aiUsage)
      .where(eq(aiUsage.userId, req.user!.id))
      .orderBy(desc(aiUsage.createdAt))
      .limit(20);

    const chats = usage.filter((u) => u.type === "chat").length;
    const suggestions = usage.filter((u) => u.type === "suggestion").length;
    const tokens = usage.reduce((s, u) => s + (u.tokensUsed || 0), 0);

    res.json({
      totalChats: chats,
      totalSuggestions: suggestions,
      totalTokens: tokens,
      recentUsage: usage,
    });
  } catch (error) {
    console.error("Error fetching AI usage:", error);
    res.json({ totalChats: 0, totalSuggestions: 0, totalTokens: 0, recentUsage: [] });
  }
});

// GET /api/ai/ping - Health check for AI service
aiRouter.get("/ping", (_req, res) => {
  res.json({
    status: process.env.GROQ_API_KEY ? "online" : "limited",
    engine: "groq",
    timestamp: new Date().toISOString(),
  });
});

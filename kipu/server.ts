import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client lazily/gracefully
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not defined.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// In-memory store for transactions (seeded with the image's records plus some extras for rich visualization)
let transactions = [
  {
    id: "tx-1",
    description: "Restaurante A",
    amount: 55.50,
    date: "2026-07-03",
    category: "Comida",
    type: "expense"
  },
  {
    id: "tx-2",
    description: "Luz",
    amount: 125.00,
    date: "2026-07-02",
    category: "Servicios",
    type: "expense"
  },
  {
    id: "tx-3",
    description: "Mercado",
    amount: 35.00,
    date: "2026-07-01",
    category: "Comida",
    type: "expense"
  },
  {
    id: "tx-4",
    description: "Sueldo Mensual",
    amount: 3500.00,
    date: "2026-06-30",
    category: "Salario",
    type: "income"
  },
  {
    id: "tx-5",
    description: "Suscripción Netflix",
    amount: 44.90,
    date: "2026-06-28",
    category: "Entretenimiento",
    type: "expense"
  },
  {
    id: "tx-6",
    description: "Freelance Diseño",
    amount: 850.00,
    date: "2026-06-25",
    category: "Otros Ingresos",
    type: "income"
  }
];

// Savings Goals in memory
let savingsGoals = [
  {
    id: "goal-1",
    name: "Fondo de Emergencia",
    target: 5000,
    current: 1200,
    deadline: "2026-12-31"
  },
  {
    id: "goal-2",
    name: "Laptop Nueva",
    target: 3500,
    current: 850,
    deadline: "2026-10-15"
  }
];

// 1. Transactions API Endpoints
app.get("/api/transactions", (req, res) => {
  res.json({ transactions, savingsGoals });
});

app.post("/api/transactions", (req, res) => {
  const { description, amount, date, category, type } = req.body;
  if (!description || typeof amount !== "number" || !date || !category || !type) {
    return res.status(400).json({ error: "Faltan campos requeridos o el formato es incorrecto." });
  }

  const newTx = {
    id: `tx-${Date.now()}`,
    description,
    amount: Math.abs(amount),
    date,
    category,
    type
  };

  transactions.unshift(newTx);
  res.status(201).json(newTx);
});

app.delete("/api/transactions/:id", (req, res) => {
  const { id } = req.params;
  const initialLength = transactions.length;
  transactions = transactions.filter(t => t.id !== id);
  if (transactions.length === initialLength) {
    return res.status(404).json({ error: "Transacción no encontrada." });
  }
  res.json({ success: true });
});

// Goals Endpoints
app.post("/api/goals", (req, res) => {
  const { name, target, current, deadline } = req.body;
  if (!name || typeof target !== "number" || typeof current !== "number" || !deadline) {
    return res.status(400).json({ error: "Campos incorrectos." });
  }
  const newGoal = {
    id: `goal-${Date.now()}`,
    name,
    target,
    current,
    deadline
  };
  savingsGoals.push(newGoal);
  res.status(201).json(newGoal);
});

app.post("/api/goals/:id/add-savings", (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ error: "Cantidad inválida." });
  }
  const goal = savingsGoals.find(g => g.id === id);
  if (!goal) {
    return res.status(404).json({ error: "Meta no encontrada." });
  }
  goal.current = Math.min(goal.target, goal.current + amount);
  res.json(goal);
});

app.delete("/api/goals/:id", (req, res) => {
  const { id } = req.params;
  savingsGoals = savingsGoals.filter(g => g.id !== id);
  res.json({ success: true });
});

// 2. Chat with Kipu AI
app.post("/api/chat", async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Se requiere un mensaje." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      text: "Hola! Soy Kipu AI, tu asistente financiero. (La API key de Gemini no está configurada, pero puedes seguir explorando las funciones con este modo offline). Me gustaría recomendarte organizar tu presupuesto usando la regla 50/30/20: un 50% para tus necesidades básicas, un 30% para tus deseos o lujos, y el 20% restante destinarlo íntegramente al ahorro o pago de deudas. ¿Quieres que hablemos sobre algún gasto en específico?"
    });
  }

  try {
    // We construct a custom system instruction
    const systemInstruction = `Eres Kipu AI, un sofisticado, moderno, elegante y súper amigable asistente de finanzas personales para la aplicación "Kipu".
Tu tono debe ser profesional pero muy cercano, inspirando confianza, como un consejero financiero de primer nivel que domina el estilo de vida peruano (mencionas la moneda S/ Soles cuando corresponda).
Tienes acceso a la lista actual de transacciones del usuario: ${JSON.stringify(transactions)}.
Ayuda al usuario a responder dudas, organizar sus presupuestos, planificar metas de ahorro, analizar gastos por categoría y motivarlo a mantener salud financiera.
Tus respuestas deben ser concisas, elegantes y estar en formato Markdown enriquecido con espaciados hermosos.`;

    // Map history to the format expected by ai.chats.create
    const chatHistory = (history || []).map((h: any) => ({
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.content }]
    }));

    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction,
        temperature: 0.7,
      },
      history: chatHistory
    });

    const response = await chat.sendMessage({ message });
    res.json({ text: response.text });
  } catch (err: any) {
    console.error("Gemini Chat Error:", err);
    res.status(500).json({ error: "Error de comunicación con Kipu AI: " + err.message });
  }
});

// 3. AI Finance Analysis Score & Report
app.get("/api/analyze-finances", async (req, res) => {
  const ai = getGeminiClient();
  
  // Calculate raw metrics to feed Gemini or fall back to
  const totalIncome = transactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
  const currentBalance = totalIncome - totalExpenses;
  
  const categorySummary: { [key: string]: number } = {};
  transactions.filter(t => t.type === "expense").forEach(t => {
    categorySummary[t.category] = (categorySummary[t.category] || 0) + t.amount;
  });

  if (!ai) {
    // Sophisticated offline fallback report
    return res.json({
      score: 74,
      analysis: `### 📊 Reporte Financiero de Kipu AI (Modo Offline)

Tu puntuación de salud financiera es **74/100** (Firme y en crecimiento).

#### 🎯 Puntos Clave:
1. **Balance Positivo:** Mantienes un balance positivo de **S/ ${currentBalance.toFixed(2)}**. Es una base fantástica.
2. **Gasto Principal:** Tu gasto principal se concentra en **${Object.keys(categorySummary)[0] || "Servicios"}** con un total de **S/ ${(Object.values(categorySummary)[0] || 0).toFixed(2)}**. Reducir un 10% aquí impulsaría tus ahorros de manera exponencial.
3. **Recomendación Directa:** Considera asignar el excedente a tu meta **"Fondo de Emergencia"** para alcanzarla más rápido.`,
      recommendations: [
        "Establece una alerta si tus gastos semanales en Comida superan los S/ 150.",
        "Automatiza una transferencia de S/ 200 hacia tu cuenta de ahorros al recibir tu sueldo.",
        "Revisa tus suscripciones activas como Netflix; podrías optimizar planes compartidos."
      ]
    });
  }

  try {
    const prompt = `Analiza detalladamente las finanzas de este usuario:
- Transacciones: ${JSON.stringify(transactions)}
- Metas de ahorro: ${JSON.stringify(savingsGoals)}
- Ingresos Totales: S/ ${totalIncome}
- Gastos Totales: S/ ${totalExpenses}
- Balance Actual: S/ ${currentBalance}
- Gastos por Categoría: ${JSON.stringify(categorySummary)}

Devuelve una respuesta estructurada en JSON EXACTAMENTE con el siguiente esquema:
{
  "score": <un entero del 1 al 100 de salud financiera>,
  "analysis": "<un reporte en formato markdown de unas 3 o 4 secciones detallando fortalezas, debilidades y oportunidades de mejora de sus finanzas actuales, usando un español peruano elegante y fluido>",
  "recommendations": ["lista de 3 o 4 consejos accionables concretos en formato texto"]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (err: any) {
    console.error("Gemini Analysis Error:", err);
    res.status(500).json({ error: "Error en el análisis financiero de Kipu AI: " + err.message });
  }
});

// 4. Savings Goal Planner AI Assistant
app.post("/api/goals/plan", async (req, res) => {
  const { goalName, target, deadline } = req.body;
  if (!goalName) {
    return res.status(400).json({ error: "Falta el nombre de la meta." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      plan: `### 📋 Plan de Ahorro para: **${goalName}** (Modo Offline)

*   **Meta de Ahorro:** S/ ${target || "3500.00"}
*   **Fecha límite sugerida:** ${deadline || "Fin de año"}

#### Pasos recomendados para alcanzar tu meta:
1.  **Ahorro Mensual Fijo:** Divide el monto total entre los meses restantes y separa esa cantidad inmediatamente apenas recibas tus ingresos.
2.  **Optimiza tus Gastos Diarios:** Identifica los "gastos hormiga" (cafés, snacks, delivery) y redirige ese dinero a esta meta de ahorro.
3.  **Monitoreo Semanal:** Revisa tu app Kipu los domingos por la noche para registrar tus avances y celebrar el progreso.`
    });
  }

  try {
    const prompt = `El usuario quiere ahorrar para la meta "${goalName}" con un objetivo de S/ ${target} para el ${deadline}.
Por favor, genera un plan de acción financiero súper personalizado, elegante, detallado y motivador en formato Markdown.
Estructúralo con secciones bonitas, viñetas, consejos de ahorro peruanos y pasos semanales/mensuales concretos para lograr el objetivo.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ plan: response.text });
  } catch (err: any) {
    console.error("Gemini Goal Planner Error:", err);
    res.status(500).json({ error: "Error al generar el plan de ahorros: " + err.message });
  }
});

// Start server and handle Vite serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

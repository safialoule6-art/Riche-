// api/support.js — Chatbot support Sunami 24/7 propulsé par Groq (gratuit)

export const config = { runtime: "edge" };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are the support assistant for "Sunami", a language learning app.

ABOUT SUNAMI:
- Website: sunami-rho.vercel.app
- 3 plans: Free (0€, 2 episodes/day, 3 languages), Premium (5€/month, unlimited, 6 languages, grammar correction, voice), Pro (9€/month, all Premium + offline, advanced stats, custom sagas)
- Payment: Dodo Payment (coming September 2026)
- Contact email: ahmedyas09020@gmail.com
- Refund policy: 100% satisfied or refunded within 7 days, no questions asked

YOUR ROLE:
- Answer in French (the user writes in French)
- Be friendly, helpful, concise (max 3-4 sentences)
- If the user asks for a refund: confirm it will be processed within 3-5 days, reassure them
- If it's a technical bug: apologize, say the team will fix it
- If it's about pricing: explain the 3 plans clearly
- If you don't know: say "Je transmets ta question à l'équipe, tu auras une réponse par email"
- Never make up features or prices that don't exist`;

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export default async function handler(req) {
  if (req.method !== "POST") return jsonResponse({ error: "POST only" }, 405);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return jsonResponse({ reply: "Support indisponible. Contacte ahmedyas09020@gmail.com" }, 200);

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const message = (body.message || "").trim();
  if (!message) return jsonResponse({ reply: "Dis-moi ce que je peux faire pour toi !" }, 200);

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: message },
  ];

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, messages, stream: false, temperature: 0.7, max_tokens: 250 }),
    });

    if (!groqRes.ok) {
      return jsonResponse({ reply: "Support momentanément indisponible. Contacte ahmedyas09020@gmail.com" }, 200);
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || "Je n'ai pas compris. Peux-tu reformuler ?";
    return jsonResponse({ reply }, 200);
  } catch {
    return jsonResponse({ reply: "Support momentanément indisponible. Contacte ahmedyas09020@gmail.com" }, 200);
  }
}
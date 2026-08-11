// api/support.js — Chatbot support Sunami 24/7
// FAQ locale (0 token) + fallback Groq (question complexe uniquement)

export const config = { runtime: "edge" };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

// FAQ : répond sans aucun appel API
const FAQ = [
  { 
    keys: ["gratuit","prix","tarif","payer","coût","cout","free","abonnement","combien"],
    reply: "🌊 Sunami a 3 offres : Wave (0€, 2 épisodes/jour, 3 langues), Sigma (5€/mois, illimité, 6 langues, correction grammaire, audio), et Ultra (9€/mois, tout + hors-ligne, stats avancées). Pas de carte bancaire pour commencer !"
  },
  {
    keys: ["remboursement","rembourser","annuler","résilier","resilier","argent"],
    reply: "🛡️ Satisfait ou remboursé sous 7 jours, sans condition. Envoie un email à ahmedyas09020@gmail.com et on traite sous 3-5 jours. Pas de questions posées."
  },
  {
    keys: ["bug","marche pas","erreur","bloqué","bloque","cassé","casse","beug","problem","problème","probleme"],
    reply: "😓 Désolé pour ce bug ! L'équipe technique est prévenue. En attendant, essaie de rafraîchir la page ou de te reconnecter. Si ça persiste, écris à ahmedyas09020@gmail.com avec une capture d'écran."
  },
  {
    keys: ["langue","langues","langage","disponible","quelle","quelles"],
    reply: "🌍 6 langues dispos : Anglais 🇬🇧, Espagnol 🇪🇸, Allemand 🇩🇪, Italien 🇮🇹, Arabe 🇸🇦, Portugais 🇵🇹. En Wave tu as 3 langues, en Sigma/Ultra les 6."
  },
  {
    keys: ["niveau","débutant","debutant","avancé","intermédiaire","intermediaire","difficile","facile"],
    reply: "📊 Tous les niveaux CECR : A1-A2 (débutant), B1-B2 (intermédiaire), C1-C2 (avancé). L'IA adapte automatiquement chaque phrase à ton niveau."
  },
  {
    keys: ["compte","inscription","inscrire","connecter","connexion","login","signup","google","email"],
    reply: "🔑 Tu peux créer un compte avec Google ou avec ton email. C'est gratuit et sans carte bancaire. Si tu as oublié ton mot de passe, clique sur 'Mot de passe oublié' sur la page de connexion."
  },
  {
    keys: ["donnée","donnee","données","donnees","privacy","confidentialité","confidentialite","sécurité","securite","rgpd","gdpr"],
    reply: "🔒 Tes données sont stockées sur Supabase (certifié SOC 2) et chiffrées. Aucune donnée n'est revendue. Tu peux supprimer ton compte à tout moment depuis les Paramètres. Voir notre politique de confidentialité : /privacy"
  },
  {
    keys: ["xp","streak","point","points","niveau","progression","progresser","série","serie"],
    reply: "⭐ Tu gagnes 8-15 XP par réponse. Garde ton streak quotidien 🔥 pour débloquer des succès. En Wave : 2 épisodes/jour, en Sigma : illimité !"
  },
  {
    keys: ["épisode","episode","histoire","chapitre","histoire","saga","conte","narration","personnage"],
    reply: "📖 Chaque jour, un nouvel épisode de ton histoire continue ! L'IA génère une aventure immersive avec des personnages récurrents. Tu es le héros. En gratuit : 2 épisodes/jour."
  },
  {
    keys: ["micro","audio","voix","parler","prononcer","prononciation","écouter","ecouter"],
    reply: "🎤 La saisie vocale et la synthèse audio sont disponibles en Sigma et Ultra. Tu peux parler tes réponses et écouter la prononciation du conteur. En Wave, tu écris tes réponses."
  },
  {
    keys: ["contact","email","mail","équipe","equipe","joindre","parler","humain","aide"],
    reply: "📧 Pour contacter l'équipe : ahmedyas09020@gmail.com. On répond sous 24h. Pour les bugs urgents, précise 'URGENT' dans l'objet."
  },
  {
    keys: ["parrainage","parrainer","parrain","filleul","affiliation","inviter","invitation","ami"],
    reply: "🤝 Tu as un lien de parrainage unique dans tes Paramètres. Chaque personne qui s'inscrit avec ton lien te rapporte +50 XP. Si elle passe à Sigma, tu gagnes 1 mois offert."
  }
];

function matchFAQ(message){
  const msg = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for(const faq of FAQ){
    for(const key of faq.keys){
      if(msg.includes(key)) return faq.reply;
    }
  }
  return null;
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export default async function handler(req) {
  if (req.method !== "POST") return jsonResponse({ error: "POST only" }, 405);

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const message = (body.message || "").trim();
  if (!message) return jsonResponse({ reply: "Dis-moi ce que je peux faire pour toi !" }, 200);

  // 1. Vérifier la FAQ locale (0 token)
  const faqReply = matchFAQ(message);
  if(faqReply) return jsonResponse({ reply: faqReply }, 200);

  // 2. Fallback Groq (question complexe uniquement)
  const apiKey = process.env.GROQ_API_KEY;
  const apiKey2 = process.env.GROQ_API_KEY_2;
  if (!apiKey && !apiKey2) return jsonResponse({ reply: "Support indisponible. Contacte ahmedyas09020@gmail.com" }, 200);

  const SYSTEM_PROMPT = `You are the support assistant for "Sunami", a language learning app.
ABOUT SUNAMI:
- 3 plans: Wave (0€, 2 episodes/day, 3 languages), Sigma (5€/month, unlimited, 6 languages, grammar correction, voice), Ultra (9€/month, all Sigma + offline, advanced stats, custom sagas)
- Languages (6): English, Spanish, German, Italian, Arabic, Portuguese
- Payment: Dodo Payment (coming September 2026)
- Contact email: ahmedyas09020@gmail.com
- Refund: 100% satisfied or refunded within 7 days
YOUR ROLE: Answer in French, be friendly, concise (max 3-4 sentences). If you don't know: say "Je transmets ta question à l'équipe, tu auras une réponse par email."`;

  try {
    let groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, messages: [{ role:"system", content: SYSTEM_PROMPT }, { role:"user", content: message }], stream: false, temperature: 0.7, max_tokens: 200 }),
    });
    // Fallback sur la 2e clé si rate limit
    if(groqRes.status === 429 && apiKey2){
      groqRes = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey2}` },
        body: JSON.stringify({ model: MODEL, messages: [{ role:"system", content: SYSTEM_PROMPT }, { role:"user", content: message }], stream: false, temperature: 0.7, max_tokens: 200 }),
      });
    }

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
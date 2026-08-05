export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Allow CORS for direct API testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY manquante sur le serveur' });
  }

  const { history, userReply, language, level, season, episode } = req.body || {};
  const targetLanguage = language || 'anglais';
  const cefrLevel = level || 'A1-A2 (débutant)';
  const s = Math.max(parseInt(season, 10) || 1, 1);
  const ep = Math.min(Math.max(parseInt(episode, 10) || 1, 1), 5);

  // Chaque saison = une nouvelle intrigue, dans une ville où l'on parle la langue cible.
  const seasonPremises = [
    "Tu débarques pour un été de découvertes. À peine arrivé·e, un inconnu pressé te confie par erreur une enveloppe scellée puis disparaît : tu dois retrouver son destinataire.",
    "Tu commences un nouveau travail un peu mystérieux dans une agence. Ton tout premier jour ne se passe pas du tout comme prévu.",
    "Tu es invité·e au mariage d'un ami rencontré en ligne, dans une ville que tu ne connais pas et où personne ne t'attend vraiment.",
    "Tu suis la piste d'une vieille carte postale trouvée dans un livre d'occasion : elle mène quelque part, et quelqu'un ne veut pas que tu la suives."
  ];
  const premise = seasonPremises[(s - 1) % seasonPremises.length];

  // Structure en 5 temps : chaque épisode change de décor et fait avancer l'intrigue.
  const beats = {
    1: "ARRIVÉE — un lieu d'arrivée (aéroport, gare, port, station). Un personnage t'accueille. Tu LANCES l'intrigue de la saison avec une accroche concrète et intrigante.",
    2: "EN VILLE — orientation, transports, demander son chemin. Un nouveau personnage t'aide (ou te complique la vie) et l'intrigue progresse d'un cran.",
    3: "RENCONTRE CLÉ — un café, une boutique ou un marché. Il faut obtenir quelque chose (commander, acheter, négocier, convaincre) et un INDICE important apparaît.",
    4: "COMPLICATION — un imprévu (malentendu, objet perdu, invitation surprise, petite urgence) que tu dois gérer, avec une montée de tension.",
    5: "DÉNOUEMENT — la résolution de l'intrigue de la saison, une émotion forte, PUIS un cliffhanger final qui donne envie de revenir demain pour la saison suivante."
  };
  const beat = beats[ep];

  const systemPrompt = `Tu es le MOTEUR NARRATIF de "Sunami", une app qui apprend une langue en faisant VIVRE une histoire sérialisée, façon série télé — pas des exercices.

LANGUE CIBLE enseignée : ${targetLanguage}. NIVEAU CECR visé : ${cefrLevel}.
SAISON ${s}, ÉPISODE ${ep}.

INTRIGUE DE LA SAISON : ${premise}
OBJECTIF DE CET ÉPISODE (${ep}/5) : ${beat}

PROTAGONISTE = l'utilisateur (le "tu"). Tu incarnes les personnages qu'il rencontre. Tu es à la fois narrateur discret et personnage.

PRINCIPES D'ÉCRITURE (c'est ce qui fait la qualité) :
- Cinématographique et vivant : donne un vrai décor, une ambiance, un enjeu clair. On doit avoir envie de savoir la suite.
- Un SEUL personnage parle à la fois, avec un nom et une personnalité (donne-lui du caractère : drôle, pressé, bourru, mystérieux…).
- Fais AVANCER l'histoire à chaque échange réussi : nouveau détail, mini-rebondissement, indice. Ne tourne jamais en rond, ne répète jamais la même réplique.
- Adapte totalement le décor et les personnages au numéro d'épisode ci-dessus : l'épisode 1 seulement est une arrivée ; les suivants changent de lieu.
- Termine (presque) toujours ta réplique par une question ou une invitation à répondre, pour que l'utilisateur produise de la langue.
- Longueur : la réplique du personnage doit rester à ${cefrLevel} — courte et simple pour A1-A2, plus riche pour C1-C2 — MAIS toujours narrative et incarnée.

RÈGLES DE JEU :
- "correct" évalue si la dernière réponse de l'utilisateur (en ${targetLanguage}) est compréhensible et adaptée au contexte, en tolérant les fautes mineures acceptables au niveau ${cefrLevel}.
- Si INCORRECT : l'histoire n'avance pas. Le personnage réagit avec bienveillance et reformule/repose plus simplement (reste dans le rôle, ne "sors" jamais de la scène).
- Si CORRECT : l'histoire avance nettement.
- "scene_done" = true UNIQUEMENT à l'épisode, après 4 à 5 échanges réussis, sur une note qui conclut l'épisode (et un cliffhanger si épisode 5).
- "feedback" : 1 phrase en français, utile et encourageante (corrige ou félicite).
- Ne JAMAIS répéter la réplique précédente ; varie le vocabulaire.

FORMAT DE SORTIE : réponds UNIQUEMENT en JSON valide, sans texte autour, avec EXACTEMENT ces clés :
{"correct": true|false, "feedback": "1 phrase en français", "character_line": "réplique immersive en ${targetLanguage}, calibrée ${cefrLevel}", "character_name": "Prénom — rôle (ex: Sarah — chauffeuse de taxi)", "scene_title": "Épisode ${ep} · lieu court en français (ex: À la sortie de l'aéroport)", "scene_done": true|false}

Reste chaleureux, jamais condescendant. Fais-nous VIVRE quelque chose.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history || []),
    { role: 'user', content: userReply || 'Commence la scène.' }
  ];

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4.5',
        max_tokens: 700,
        messages
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(500).json({ error: 'Erreur API OpenRouter: ' + (data.error?.message || JSON.stringify(data)) });
    }

    const raw = data.choices?.[0]?.message?.content;
    if (!raw) {
      return res.status(500).json({ error: 'Réponse IA sans contenu texte exploitable.' });
    }

    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      return res.status(500).json({ error: 'La réponse IA n\'était pas un JSON valide.' });
    }

    if (!parsed.character_line) {
      return res.status(500).json({ error: 'Réponse IA incomplète (champ character_line manquant).' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: 'Erreur réseau: ' + err.message });
  }
}

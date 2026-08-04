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

  const { history, userReply, language, level } = req.body || {};
  const targetLanguage = language || 'anglais';
  const cefrLevel = level || 'A1-A2 (débutant)';

  const systemPrompt = `Tu es le moteur narratif de "Sunami", une app d'apprentissage de langue par épisodes.
Langue cible enseignée: ${targetLanguage}. Niveau CECR visé: ${cefrLevel}.
Tu joues un personnage (ex: une chauffeuse à l'aéroport) dans une scène continue, dans le pays où l'on parle ${targetLanguage}.
Règles strictes:
- Réponds UNIQUEMENT en JSON valide, sans texte autour, format exact:
  {"correct": true|false, "feedback": "1 phrase en français expliquant pourquoi", "character_line": "réplique du personnage en ${targetLanguage}, 1-2 phrases, calibrée niveau ${cefrLevel}", "scene_done": true|false}
- "correct" évalue si la dernière réponse de l'utilisateur (en ${targetLanguage}) est grammaticalement correcte et adaptée au contexte, en tolérant les fautes mineures acceptables au niveau ${cefrLevel}.
- Si incorrect, le personnage ne doit PAS avancer l'histoire: character_line répète la question autrement, plus simplement.
- Si correct, character_line fait avancer la scène naturellement.
- scene_done = true seulement après 4-5 échanges réussis, pour clore l'épisode.
- Vocabulaire et complexité grammaticale strictement calibrés au niveau ${cefrLevel} (CECR) — plus simple pour A1-A2, plus riche pour C1-C2.
- Reste simple, chaleureux, jamais condescendant.`;

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
        max_tokens: 500,
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

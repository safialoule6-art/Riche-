/* Sunami i18n — détection langue navigateur + traduction landing page */
const I18N = {
  fr: {
    nav_features: "Fonctionnalités", nav_pricing: "Tarifs", nav_login: "Se connecter",
    hero_title_1: "Vis une histoire.", hero_title_2: "Apprends une langue.",
    hero_sub: "Les autres apps te font traduire « le chat mange ». Sunami te plonge dans une histoire dont tu veux connaître la suite, et tu apprends une langue sans t'en rendre compte.",
    hero_cta: "Commencer mon histoire — gratuit", hero_ou: "ou", hero_email: "Continuer avec un email",
    hero_login: "Déjà un compte ? Se connecter", hero_note: "via Google ou email", hero_free: "100% gratuit", hero_devices: "sur tous tes appareils",
    wb_title: "Content de te revoir", wb_continue: "Reprendre mon histoire", wb_logout: "Ce n'est pas toi ? Se déconnecter",
    hero_langs: "6 langues", hero_dot: "tuteur IA", hero_dot2: "nouvel épisode chaque jour",
    demo_title: "Vois Sunami en action", demo_badge: "Démo · sans compte",
    try_title: "Essaie maintenant — sans compte",
    try_prompt: "Choisis une langue et vis le début de ton histoire, tout de suite :",
    try_wall: "👏 Tu viens de vivre le début de ton histoire. Crée ton compte gratuit pour connaître la suite. L'épisode continue demain.",
    how_title: "Comment ça marche",
    how_s1t: "Choisis ta langue & ton niveau", how_s1s: "6 langues, du débutant (A1) à l'avancé (C2).",
    how_s2t: "Plonge dans l'épisode du jour", how_s2s: "Une intrigue qui avance : mêmes personnages, nouveaux rebondissements.",
    how_s3t: "Réponds, l'histoire avance", how_s3s: "Le tuteur IA calibre chaque réplique à ton niveau. Jamais trop dur, jamais trop mou.",
    why_title: "Pourquoi Sunami",
    why1t: "Une histoire, pas des leçons", why1s: "Chaque jour, un nouvel épisode de la même intrigue, un cliffhanger qui te fait revenir.",
    why2t: "Streak & XP quotidiens", why2s: "Garde ta série, gagne de l'XP et transforme la régularité en réflexe.",
    why3t: "Calibré à ton niveau", why3s: "Niveau CECR A1 → C2, ajusté à chaque réponse. Jamais largué, jamais frustré.",
    edge_title: "Ce qu'un simple ChatGPT ne fait pas",
    edge1t: "Preuve de progrès", edge1s: "Un bilan chaque semaine : mots appris, révisions faites, et ton niveau estimé qui monte.",
    edge2t: "Révision espacée automatique", edge2s: "Les mots que tu apprends reviennent au bon moment dans l'histoire, pour les ancrer sans y penser.",
    edge3t: "Audio & voix", edge3s: "Écoute chaque réplique et réponds à l'oral pour travailler la compréhension et la prononciation.",
    edge4t: "Ta saga te suit partout", edge4s: "Reprends exactement où tu t'es arrêté, sur téléphone comme sur ordinateur.",
    vs_title: "Exercices barbants vs histoire dont tu es le héros",
    lead_title: "Pas encore prêt à te lancer ?", lead_sub: "Laisse ton email, on te prévient quand l'épisode 2 sort.", lead_btn: "Ok",
    pricing_title: "Offres",
    p_free: "Wave", p_free_price: "à vie", p_free_1: "2 épisodes / jour", p_free_2: "3 langues", p_free_3: "Mascotte expressive", p_free_4: "Succès à débloquer", p_free_5: "Streak & XP", p_free_6: "Fiches personnages", p_free_cta: "Commencer gratuitement",
    p_prem: "Sigma", p_prem_badge: "Le plus populaire", p_prem_price: "/mois", p_prem_1: "Épisodes illimités", p_prem_2: "6 langues", p_prem_3: "Correction grammaire", p_prem_4: "Micro & Audio", p_prem_5: "Répétition espacée", p_prem_6: "Biblio vocabulaire", p_prem_7: "Tous les succès", p_prem_8: "Fiches personnages", p_prem_cta: "Voir les offres",
    p_pro: "Ultra", p_pro_price: "/mois", p_pro_1: "Tout Sigma +", p_pro_2: "Mode hors-ligne", p_pro_3: "Stats avancées", p_pro_4: "Créer tes sagas", p_pro_5: "Support prioritaire", p_pro_6: "Accès anticipé", p_pro_7: "Carte interactive", p_pro_8: "Badges exclusifs", p_pro_cta: "En savoir plus",
    t_title: "Accès anticipé",
    ea_head: "Tu fais partie des tout premiers",
    ea_text: "Sunami vient de sortir. Pas de faux avis 5 étoiles ici. Rejoins les premiers apprenants, teste gratuitement, et aide à façonner l'app. Ton retour compte vraiment.",
    sticky_txt: "Prêt à vivre ta première histoire ?", sticky_cta: "Commencer — gratuit",
    faq_title: "Questions fréquentes",
    faq5_q: "En quoi c'est mieux que Duolingo & co ?", faq5_a: "Les apps classiques t'apprennent des mots isolés avec des exercices répétitifs. Sunami te fait vivre une histoire continue où tu parles pour de vrai, corrigé par un tuteur IA calibré à ton niveau. Résultat : tu reviens pour connaître la suite, pas par culpabilité.",
    faq1_q: "C'est vraiment gratuit ?", faq1_a: "Oui, l'offre gratuite donne 2 épisodes par jour avec 3 langues. Premium et Pro débloquent les épisodes illimités, 6 langues, et plus.", faq1_link: "Voir les offres →",
    faq2_q: "Ça marche pour mon niveau ?", faq2_a: "Débutant à avancé (A1 à C2). L'IA calibre chaque réplique à ton niveau.",
    faq3_q: "Je peux changer de langue en cours de route ?", faq3_a: "Oui, à tout moment depuis l'écran de conversation.",
    faq4_q: "Mes données sont sauvegardées où ?", faq4_a: "Ta progression est liée à ton compte, accessible depuis n'importe quel appareil.",
    footer_brand: "Sunami", footer_tagline: "vis une histoire, apprends une langue.",
    footer_pricing: "Tarifs", footer_privacy: "Confidentialité", footer_terms: "Conditions", footer_legal: "Mentions légales",
    footer_copy: "Fait avec ❤️ pour les curieux · © 2026",
    lang_switch: "🇫🇷 FR",
    duolingo_before: "Duolingo", sunami_after: "Sunami",
  },
  en: {
    nav_features: "Features", nav_pricing: "Pricing", nav_login: "Sign in",
    hero_title_1: "Live a story.", hero_title_2: "Learn a language.",
    hero_sub: "Other apps make you translate “the cat eats.” Sunami drops you into a story you actually want to finish, and you learn a language without noticing.",
    hero_cta: "Start my story — free", hero_ou: "or", hero_email: "Continue with email",
    hero_login: "Already have an account? Sign in", hero_note: "via Google or email", hero_free: "100% free", hero_devices: "on all your devices",
    wb_title: "Welcome back", wb_continue: "Resume my story", wb_logout: "Not you? Sign out",
    hero_langs: "6 languages", hero_dot: "AI tutor", hero_dot2: "new episode every day",
    demo_title: "See Sunami in action", demo_badge: "Demo · no account",
    try_title: "Try it now — no account",
    try_prompt: "Pick a language and live the start of your story, right now:",
    try_wall: "👏 You just lived the start of your story. Create your free account to see what happens next. The episode continues tomorrow.",
    how_title: "How it works",
    how_s1t: "Choose your language & level", how_s1s: "6 languages, from beginner (A1) to advanced (C2).",
    how_s2t: "Dive into the daily episode", how_s2s: "A plot that moves forward: same characters, new twists.",
    how_s3t: "Reply, the story moves forward", how_s3s: "The AI tutor calibrates every line to your level. Never too hard, never too easy.",
    why_title: "Why Sunami",
    why1t: "A story, not lessons", why1s: "Every day, a new episode of the same plot, a cliffhanger that brings you back.",
    why2t: "Daily Streak & XP", why2s: "Keep your streak, earn XP, and turn consistency into a habit.",
    why3t: "Calibrated to your level", why3s: "CEFR level A1 → C2, adjusted to every response. Never lost, never bored.",
    edge_title: "What a plain ChatGPT won't do",
    edge1t: "Proof of progress", edge1s: "A weekly report: words learned, reviews done, and your estimated level going up.",
    edge2t: "Automatic spaced repetition", edge2s: "The words you learn come back at the right time inside the story, so they stick effortlessly.",
    edge3t: "Audio & voice", edge3s: "Listen to every line and reply out loud to train comprehension and pronunciation.",
    edge4t: "Your saga follows you everywhere", edge4s: "Pick up exactly where you left off, on phone or computer.",
    vs_title: "Boring drills vs a story you live",
    lead_title: "Not ready to dive in yet?", lead_sub: "Leave your email, we'll let you know when episode 2 drops.", lead_btn: "Ok",
    pricing_title: "Plans",
    p_free: "Wave", p_free_price: "lifetime", p_free_1: "2 episodes / day", p_free_2: "3 languages", p_free_3: "Expressive mascot", p_free_4: "Achievements", p_free_5: "Streak & XP", p_free_6: "Character cards", p_free_cta: "Start for free",
    p_prem: "Sigma", p_prem_badge: "Most popular", p_prem_price: "/month", p_prem_1: "Unlimited episodes", p_prem_2: "6 languages", p_prem_3: "Grammar correction", p_prem_4: "Voice & Audio", p_prem_5: "Spaced repetition", p_prem_6: "Vocabulary library", p_prem_7: "All achievements", p_prem_8: "Character cards", p_prem_cta: "See plans",
    p_pro: "Ultra", p_pro_price: "/month", p_pro_1: "All Sigma +", p_pro_2: "Offline mode", p_pro_3: "Advanced stats", p_pro_4: "Create your sagas", p_pro_5: "Priority support", p_pro_6: "Early access", p_pro_7: "Interactive map", p_pro_8: "Exclusive badges", p_pro_cta: "Learn more",
    t_title: "Early access",
    ea_head: "You're one of the very first",
    ea_text: "Sunami just launched. No fake 5-star reviews here. Join the first learners, try it free, and help shape the app. Your feedback truly matters.",
    sticky_txt: "Ready to live your first story?", sticky_cta: "Start — free",
    faq_title: "Frequently asked",
    faq5_q: "How is it better than Duolingo & co?", faq5_a: "Classic apps teach isolated words through repetitive drills. Sunami puts you inside a continuous story where you actually speak, corrected by an AI tutor tuned to your level. You come back for the plot, not out of guilt.",
    faq1_q: "Is it really free?", faq1_a: "Yes, the free plan gives 2 episodes/day with 3 languages. Premium and Pro unlock unlimited episodes, 6 languages and more.", faq1_link: "See plans →",
    faq2_q: "Does it work for my level?", faq2_a: "Beginner to advanced (A1 to C2). The AI calibrates every line to your level.",
    faq3_q: "Can I change language mid-story?", faq3_a: "Yes, anytime from the conversation screen.",
    faq4_q: "Where is my data stored?", faq4_a: "Your progress is linked to your account, accessible from any device.",
    footer_brand: "Sunami", footer_tagline: "live a story, learn a language.",
    footer_pricing: "Pricing", footer_privacy: "Privacy", footer_terms: "Terms", footer_legal: "Legal",
    footer_copy: "Made with ❤️ for the curious · © 2026",
    lang_switch: "🇬🇧 EN",
    duolingo_before: "Duolingo", sunami_after: "Sunami",
  }
};

(function(){
  let lang = localStorage.getItem('sunami-lang');
  if(!lang){
    // Vérifier toutes les langues du navigateur (pas juste la principale)
    const browserLangs = (navigator.languages || [navigator.language || 'fr']);
    const hasEnglish = browserLangs.some(l => l.slice(0,2) === 'en');
    const hasFrench = browserLangs.some(l => l.slice(0,2) === 'fr');
    // Si le navigateur a l'anglais en priorité, utiliser l'anglais
    lang = (hasEnglish && !hasFrench) ? 'en' : 'fr';
  }
  applyI18n(lang);

  window.switchLang = function(){
    const current = localStorage.getItem('sunami-lang') || 'fr';
    const next = current === 'fr' ? 'en' : 'fr';
    localStorage.setItem('sunami-lang', next);
    applyI18n(next);
  };

  function applyI18n(lang){
    const t = I18N[lang] || I18N.fr;
    document.documentElement.lang = lang === 'en' ? 'en' : 'fr';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if(t[key]) el.textContent = t[key];
    });
    // Mettre à jour les deux boutons de langue
    const label = t.lang_switch || 'EN';
    const sw = document.getElementById('langSwitch');
    if(sw) sw.textContent = label;
    const swNav = document.getElementById('langSwitchNav');
    if(swNav) swNav.textContent = label;
    const swMobile = document.getElementById('langSwitchMobile');
    if(swMobile) swMobile.textContent = label;
    const swToggle = document.getElementById('langToggleMobile');
    if(swToggle) swToggle.textContent = lang === 'fr' ? '🇫🇷' : '🇬🇧';
  }
})();
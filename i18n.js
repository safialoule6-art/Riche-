/* Sunami i18n — détection langue navigateur + traduction landing page */
const I18N = {
  fr: {
    nav_features: "Fonctionnalités", nav_pricing: "Tarifs", nav_login: "Se connecter",
    hero_title_1: "Vis une histoire.", hero_title_2: "Apprends une langue.",
    hero_sub: "Un tuteur IA te fait parler dans un épisode qui continue chaque jour — pas des exercices barbants.",
    hero_cta: "Commencer — c'est gratuit", hero_ou: "ou", hero_email: "Continuer avec un email",
    hero_login: "Déjà un compte ? Se connecter", hero_note: "via Google ou email", hero_free: "100% gratuit", hero_devices: "sur tous tes appareils",
    hero_langs: "7 langues", hero_dot: "tuteur IA", hero_dot2: "nouvel épisode chaque jour",
    demo_title: "Essaie tout de suite", demo_badge: "Démo · sans compte",
    how_title: "Comment ça marche",
    how_s1t: "Choisis ta langue & ton niveau", how_s1s: "7 langues, du débutant (A1) à l'avancé (C2).",
    how_s2t: "Plonge dans l'épisode du jour", how_s2s: "Une histoire continue avec des personnages récurrents.",
    how_s3t: "Réponds, l'histoire avance", how_s3s: "Le tuteur IA calibre chaque réplique à ton niveau.",
    why_title: "Pourquoi Sunami",
    why1t: "Histoire continue", why1s: "Chaque jour, un nouvel épisode de la même intrigue.",
    why2t: "Streak & XP quotidiens", why2s: "Reviens chaque jour, garde ta série et gagne de l'XP.",
    why3t: "Calibré à ton niveau", why3s: "Niveau CECR A1 → C2, ajusté à chaque réponse.",
    vs_title: "Avant / Après",
    lead_title: "Pas prêt à te connecter ?", lead_sub: "Laisse ton email, on te prévient quand l'épisode 2 sort.", lead_btn: "Ok",
    pricing_title: "Offres",
    p_free: "Gratuit", p_free_price: "à vie", p_free_1: "2 épisodes / jour", p_free_2: "3 langues", p_free_3: "Mascotte expressive", p_free_4: "Succès à débloquer", p_free_5: "Streak & XP", p_free_6: "Fiches personnages", p_free_cta: "Commencer gratuitement",
    p_prem: "Premium", p_prem_badge: "Le plus populaire", p_prem_price: "/mois", p_prem_1: "Épisodes illimités", p_prem_2: "7 langues", p_prem_3: "Correction grammaire", p_prem_4: "Micro & Audio", p_prem_5: "Répétition espacée", p_prem_6: "Biblio vocabulaire", p_prem_7: "Tous les succès", p_prem_8: "Fiches personnages", p_prem_cta: "Voir les offres",
    p_pro: "Pro", p_pro_price: "/mois", p_pro_1: "Tout Premium +", p_pro_2: "Mode hors-ligne", p_pro_3: "Stats avancées", p_pro_4: "Créer tes sagas", p_pro_5: "Support prioritaire", p_pro_6: "Accès anticipé", p_pro_7: "Carte interactive", p_pro_8: "Badges exclusifs", p_pro_cta: "En savoir plus",
    t_title: "Ils ont essayé",
    t1_q: "\"J'ai essayé Duolingo, Babbel… Sunami c'est le seul qui m'a fait revenir 7 jours d'affilée.\"", t1_n: "Sarah M.", t1_r: "Apprend l'anglais · Niveau A2",
    t2_q: "\"Enfin une app où j'apprends sans m'en rendre compte. Je vis une histoire à Marseille.\"", t2_n: "Thomas L.", t2_r: "Apprend l'espagnol · Niveau B1",
    t3_q: "\"Le tuteur IA corrige mes erreurs sans me juger, et l'histoire continue.\"", t3_n: "Aïcha K.", t3_r: "Apprend l'allemand · Niveau A1",
    faq_title: "Questions fréquentes",
    faq1_q: "C'est vraiment gratuit ?", faq1_a: "Oui, l'offre gratuite donne 2 épisodes par jour avec 3 langues. Premium et Pro débloquent les épisodes illimités, 7 langues, et plus.", faq1_link: "Voir les offres →",
    faq2_q: "Ça marche pour mon niveau ?", faq2_a: "Débutant à avancé (A1 à C2) — l'IA calibre chaque réplique à ton niveau.",
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
    hero_sub: "An AI tutor makes you speak in a daily episode — no boring exercises.",
    hero_cta: "Start — it's free", hero_ou: "or", hero_email: "Continue with email",
    hero_login: "Already have an account? Sign in", hero_note: "via Google or email", hero_free: "100% free", hero_devices: "on all your devices",
    hero_langs: "7 languages", hero_dot: "AI tutor", hero_dot2: "new episode every day",
    demo_title: "Try it now", demo_badge: "Demo · no account",
    how_title: "How it works",
    how_s1t: "Choose your language & level", how_s1s: "7 languages, from beginner (A1) to advanced (C2).",
    how_s2t: "Dive into the daily episode", how_s2s: "An ongoing story with recurring characters.",
    how_s3t: "Reply, the story moves forward", how_s3s: "The AI tutor calibrates every line to your level.",
    why_title: "Why Sunami",
    why1t: "Ongoing story", why1s: "Every day, a new episode of the same plot.",
    why2t: "Daily Streak & XP", why2s: "Come back every day, keep your streak and earn XP.",
    why3t: "Calibrated to your level", why3s: "CEFR level A1 → C2, adjusted to every response.",
    vs_title: "Before / After",
    lead_title: "Not ready to sign in?", lead_sub: "Leave your email, we'll let you know when episode 2 drops.", lead_btn: "Ok",
    pricing_title: "Plans",
    p_free: "Free", p_free_price: "lifetime", p_free_1: "2 episodes / day", p_free_2: "3 languages", p_free_3: "Expressive mascot", p_free_4: "Achievements", p_free_5: "Streak & XP", p_free_6: "Character cards", p_free_cta: "Start for free",
    p_prem: "Premium", p_prem_badge: "Most popular", p_prem_price: "/month", p_prem_1: "Unlimited episodes", p_prem_2: "7 languages", p_prem_3: "Grammar correction", p_prem_4: "Voice & Audio", p_prem_5: "Spaced repetition", p_prem_6: "Vocabulary library", p_prem_7: "All achievements", p_prem_8: "Character cards", p_prem_cta: "See plans",
    p_pro: "Pro", p_pro_price: "/month", p_pro_1: "All Premium +", p_pro_2: "Offline mode", p_pro_3: "Advanced stats", p_pro_4: "Create your sagas", p_pro_5: "Priority support", p_pro_6: "Early access", p_pro_7: "Interactive map", p_pro_8: "Exclusive badges", p_pro_cta: "Learn more",
    t_title: "They tried it",
    t1_q: "\"I tried Duolingo, Babbel… Sunami is the only one that made me come back 7 days in a row.\"", t1_n: "Sarah M.", t1_r: "Learning English · Level A2",
    t2_q: "\"Finally an app where I learn without realizing. I'm living a story in Marseille.\"", t2_n: "Thomas L.", t2_r: "Learning Spanish · Level B1",
    t3_q: "\"The AI tutor corrects my mistakes without judging, and the story goes on.\"", t3_n: "Aïcha K.", t3_r: "Learning German · Level A1",
    faq_title: "Frequently asked",
    faq1_q: "Is it really free?", faq1_a: "Yes, the free plan gives 2 episodes/day with 3 languages. Premium and Pro unlock unlimited episodes, 7 languages and more.", faq1_link: "See plans →",
    faq2_q: "Does it work for my level?", faq2_a: "Beginner to advanced (A1 to C2) — the AI calibrates every line to your level.",
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
    lang = (navigator.language || '').slice(0,2) === 'fr' ? 'fr' : 'en';
  }
  applyI18n(lang);

  window.switchLang = function(){
    const current = localStorage.getItem('sunami-lang') || ((navigator.language||'').slice(0,2)==='fr'?'fr':'en');
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
    const sw = document.getElementById('langSwitch');
    if(sw) sw.textContent = t.lang_switch || 'EN';
  }
})();
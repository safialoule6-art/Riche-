// Sunami Creative Engine — TikTok-first strategy layer.
// Intentionally isolated from the production Sunami app.
// Generates many candidate concepts, then hard-filters the ones that feel like ads.

const FR_HOOKS = [
  "POV : tu comprends l’anglais… mais dès qu’on te parle, ton cerveau s’éteint.",
  "Le truc humiliant quand tu apprends l’anglais depuis longtemps.",
  "Je connaissais les mots. Je savais les lire. Parler ? Rien.",
  "Tu peux regarder des séries en anglais… et quand même être incapable de répondre.",
  "Si tu comprends l’anglais mais que tu n’arrives jamais à le parler, regarde ça.",
  "Personne ne m’avait prévenu de ce problème quand j’ai commencé l’anglais.",
  "J’ai réalisé pourquoi je bloquais en anglais après des mois d’apprentissage.",
  "Tu révises ton anglais tous les jours et pourtant une conversation te met KO ?",
  "Le moment où quelqu’un te parle anglais et tu oublies soudain tous les mots que tu connais.",
  "Mon anglais dans ma tête : parfait. Mon anglais à voix haute : catastrophe."
];

const FR_BODIES = [
  ["Je comprenais chaque mot.", "Puis il a fallu répondre.", "Et là… trou noir.", "Je faisais toujours la même erreur : j’apprenais des réponses, pas des situations.", "J’ai changé ma façon de pratiquer.", "Je te montre → lien en bio."],
  ["Je faisais des exercices.", "Je mémorisais du vocabulaire.", "Mais personne ne me demandait de l’utiliser pour de vrai.", "Alors j’ai commencé à pratiquer autrement.", "Et enfin, j’avais une raison de continuer.", "Lien en bio."],
  ["Le problème n’était pas mon niveau.", "C’était le moment où je devais improviser.", "Je savais quoi dire… mais pas comment le dire naturellement.", "J’ai commencé à pratiquer dans des situations plutôt qu’avec des listes.", "Ça a tout changé.", "Je te montre → lien en bio."],
  ["Au début je pensais manquer de vocabulaire.", "En fait, je manquais surtout de pratique réelle.", "Lire n’était pas le problème.", "Réagir sans réfléchir, oui.", "J’ai trouvé une manière beaucoup plus naturelle de pratiquer.", "Lien en bio."],
  ["J’étais bloqué dès qu’une vraie personne me parlait.", "Même avec des milliers de mots en tête.", "Ça m’a fait comprendre un truc.", "Apprendre une langue et savoir l’utiliser, ce n’est pas pareil.", "Alors j’ai changé ma méthode.", "Je te montre → lien en bio."]
];

const VISUALS = [
  ['person talking to camera frustrated selfie','young adult awkward conversation close up','person nervous speaking friend'],
  ['person surprised embarrassed reaction selfie','young person forgetting something reaction','awkward conversation close up'],
  ['person studying tired phone close up','student frustrated notes','young adult staring at phone confused'],
  ['person trying to speak reaction','young person nervous conversation','friend listening confused'],
  ['young person smiling discovery phone','person excited idea reaction','happy young adult talking camera']
];

function buildFrenchConcepts(){
  const out=[];
  let id=1;
  for(let h=0;h<FR_HOOKS.length;h++){
    for(let b=0;b<FR_BODIES.length;b++){
      const body=FR_BODIES[b].slice();
      // Never mention the product before the final line.
      out.push({
        id:`FR-${String(id++).padStart(2,'0')}`,
        market:'fr', locale:'fr-FR',
        hook:FR_HOOKS[h], lines:[FR_HOOKS[h],...body],
        searches:VISUALS[b],
        rules:{noProductBeforeLast:true,noMascotBeforeReveal:true,ugcFirst:true,ctaLast:true,maxSeconds:15}
      });
    }
  }
  return out.slice(0,50);
}

export const FRENCH_CONCEPTS=buildFrenchConcepts();

export function qualityGate(concept){
  const text=concept.lines.join(' ').toLowerCase();
  const productWords=['sunami','application','app','télécharge','download'];
  const firstPart=concept.lines.slice(0,-1).join(' ').toLowerCase();
  const earlyProduct=productWords.some(w=>firstPart.includes(w));
  const ctaLast=/lien en bio|je te montre/.test(concept.lines.at(-1)?.toLowerCase()||'');
  const shortHook=(concept.hook.split(/\s+/).length<=18);
  return {
    pass:!earlyProduct&&ctaLast&&shortHook,
    score:(shortHook?30:10)+(ctaLast?25:0)+(!earlyProduct?30:0)+(concept.rules.ugcFirst?15:0),
    reasons:[
      earlyProduct?'Produit mentionné trop tôt':'Produit caché jusqu’à la fin',
      ctaLast?'CTA final':'CTA mal placé',
      shortHook?'Hook court':'Hook trop long',
      'UGC/POV prioritaire'
    ]
  };
}

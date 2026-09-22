export const lottieUrls = {
  loader: 'https://assets9.lottiefiles.com/packages/lf20_p8bfn5to.json',
  welcome: 'https://assets2.lottiefiles.com/packages/lf20_mbe3y5px.json',
  goals: 'https://assets10.lottiefiles.com/packages/lf20_qp152q7f.json',
  success: 'https://assets1.lottiefiles.com/packages/lf20_u4yrau.json',
  mascot: 'https://assets2.lottiefiles.com/packages/lf20_mbe3y5px.json',
} as const;

export const onboardingSlides = [
  { eyebrow: 'Bienvenue dans Sunami', title: 'Apprends en vivant une histoire.', body: 'Une aventure interactive où chaque phrase te rapproche du prochain chapitre.', animation: lottieUrls.welcome, accent: '#DFF8F1' },
  { eyebrow: 'Un objectif qui te ressemble', title: 'Progresse à ton rythme.', body: 'Ton tuteur IA adapte chaque dialogue à ton niveau, du premier mot jusqu’à la conversation.', animation: lottieUrls.goals, accent: '#EEE9FF' },
  { eyebrow: 'Chaque jour compte', title: 'Transforme la régularité en super-pouvoir.', body: 'Gagne de l’XP, garde ta série et découvre une nouvelle partie de ton histoire chaque jour.', animation: lottieUrls.success, accent: '#F0F8D8' },
] as const;

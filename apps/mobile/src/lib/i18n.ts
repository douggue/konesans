/** UI strings — Kreyòl first, French second. Course content (EN/ES) lives in @konesans/core. */
import { useStore } from './store';

const S = {
  // nav
  home: ['Lakay', 'Accueil'], challenge: ['Defi', 'Défis'], course: ['Kou', 'Cours'], coding: ['Enfòmatik', 'Informatique'], me: ['Mwen', 'Moi'],
  // onboarding
  welcome_title: ['Byenveni nan Konesans!', 'Bienvenue sur Konesans !'],
  pick_lang: ['Ki lang ou vle itilize?', 'Quelle langue veux-tu utiliser ?'],
  pick_age: ['Ki laj ou, oswa ki klas ou?', 'Quel âge as-tu, ou quelle classe ?'],
  age_hint: ['Sa ede nou chwazi bon kesyon pou ou.', 'Cela nous aide à choisir les bonnes questions.'],
  your_name: ['Non ou nan jwèt la', 'Ton nom dans le jeu'],
  name_hint: ['Nou bay yon non espesyal pou pwoteje w. Ou ka chanje l.', 'On te donne un nom spécial pour te protéger. Tu peux le changer.'],
  another: ['Yon lòt', 'Un autre'], next: ['Kontinye', 'Continuer'], start: ['Ann kòmanse!', "C'est parti !"], back: ['Retounen', 'Retour'],
  try_first: ['Eseye 3 kesyon san kont', 'Essayer 3 questions sans compte'],
  // home
  hello: ['Bonjou', 'Bonjour'], what_learn: ['Ki sa n ap aprann jodi a?', "Qu'est-ce qu'on apprend aujourd'hui ?"],
  daily: ['DEFI JODI A', 'DÉFI DU JOUR'], daily_title: ['10 kesyon melanje', '10 questions mélangées'],
  daily_sub: ['Tout timoun jwe menm kesyon yo. Ki plas ou pral pran?', 'Tous les enfants jouent les mêmes questions. Quelle place prendras-tu ?'],
  play_now: ['Jwe kounye a', 'Jouer maintenant'], quests: ['Misyon jodi a', 'Missions du jour'], continue_learning: ['Kontinye aprann', 'Continuer à apprendre'],
  explore: ['Eksplore', 'Explorer'], days: ['jou', 'jours'], duel_bot: ['Defi 1 kont 1', 'Duel 1 contre 1'], duel_sub: ['Jwe kont Robo', 'Jouer contre Robo'],
  // categories
  categories: ['Kategori', 'Catégories'], cat_sub: ['Chwazi yon sijè epi teste konesans ou', 'Choisis un sujet et teste tes connaissances'],
  level: ['Nivo', 'Niveau'], age: ['Laj', 'Âge'],
  // quiz
  question: ['Kesyon', 'Question'], explain: ['Esplike m', 'Explique-moi'], correct: ['Bravo! Se sa!', 'Bravo ! Exact !'], wrong: ['Se pa sa.', 'Ce n’est pas ça.'],
  answer_was: ['Repons lan se', 'La réponse est'], timeout: ['Tan an fini!', 'Temps écoulé !'], points: ['pwen', 'points'],
  result: ['Rezilta', 'Résultat'], correct_of: ['bon repons sou', 'bonnes réponses sur'], again: ['Jwe ankò', 'Rejouer'], done: ['Fini', 'Terminer'],
  quit_q: ['Ou vle kite?', 'Tu veux quitter ?'], stay: ['Mwen rete', 'Je reste'], quit: ['Kite kanmenm', 'Quitter quand même'],
  // duel
  you: ['Ou', 'Toi'], opponent: ['Jwè', 'Joueur'], finding: ['N ap chèche yon jwè…', 'On cherche un joueur…'], vs: ['kont', 'contre'],
  you_win: ['Ou genyen!', 'Tu as gagné !'], you_lose: ['Robo genyen fwa sa a.', 'Robo a gagné cette fois.'], draw: ['Egalite!', 'Égalité !'],
  reactions: ['Voye yon reyaksyon', 'Envoyer une réaction'],
  // courses
  learn_in: ['Aprann {x} an Kreyòl', 'Apprendre {x} en créole'], english: ['Angle', 'Anglais'], spanish: ['Panyòl', 'Espagnol'],
  unit: ['Inite', 'Unité'], lesson: ['leson', 'leçon'], words: ['mo', 'mots'], locked: ['Fèmen', 'Verrouillé'], start_lesson: ['Kòmanse', 'Commencer'],
  // lesson exercises
  ex_pick_meaning: ['Kisa sa vle di?', "Qu'est-ce que ça veut dire ?"], ex_pick_word: ['Kijan yo di sa?', 'Comment dit-on ?'],
  ex_listen: ['Koute epi chwazi', 'Écoute et choisis'], ex_match: ['Marye mo yo', 'Associe les mots'], ex_translate: ['Kisa fraz sa a vle di?', 'Que veut dire cette phrase ?'],
  ex_build: ['Fè fraz la', 'Construis la phrase'], ex_fill: ['Ranpli vid la', 'Complète le vide'], check: ['Verifye', 'Vérifier'], continue: ['Kontinye', 'Continuer'],
  lesson_done: ['Leson fini!', 'Leçon terminée !'], perfect: ['Pafè! Pa gen okenn erè.', 'Parfait ! Aucune erreur.'], first_try: ['bon sou premye eseye', 'bons du premier coup'],
  // coding
  coding_title: ['Enfòmatik', 'Informatique'], coding_sub: ['Fè robo a rive sou zetwal la', "Amène le robot jusqu'à l'étoile"],
  run: ['Kouri pwogram nan', 'Lancer le programme'], clear: ['Efase', 'Effacer'], blocks: ['blòk', 'blocs'], hint: ['Endis', 'Indice'],
  b_avanse: ['Avanse', 'Avancer'], b_vire_goch: ['Vire agoch', 'Tourner à gauche'], b_vire_dwat: ['Vire adwat', 'Tourner à droite'], b_repete: ['Repete', 'Répéter'], b_si_mi: ['Si gen mi', "S'il y a un mur"], b_jiska_zetwal: ['Jiska zetwal', "Jusqu'à l'étoile"],
  r_star: ['Robo a rive!', 'Le robot est arrivé !'], r_bumped: ['Robo a frape yon mi.', 'Le robot a heurté un mur.'], r_no_star: ['Robo a pa rive sou zetwal la.', "Le robot n'a pas atteint l'étoile."], r_too_many: ['Twòp etap!', "Trop d'étapes !"], r_out: ['Robo a soti deyò!', 'Le robot est sorti !'],
  // profile & settings
  profile: ['Mwen', 'Moi'], streak: ['jou seri', 'jours de série'], coins: ['kòb', 'pièces'], wins: ['viktwa', 'victoires'],
  settings: ['Paramèt', 'Paramètres'], sound: ['Son', 'Son'], sfx: ['Son efè', 'Effets sonores'], music: ['Mizik', 'Musique'], voice: ['Li kesyon yo awotvwa', 'Lire les questions à voix haute'],
  haptic: ['Vibrasyon', 'Vibration'], app_lang: ['Lang app la', "Langue de l'app"], text_size: ['Gwosè tèks', 'Taille du texte'], small: ['Piti', 'Petit'], normal: ['Nòmal', 'Normal'], big: ['Gwo', 'Grand'],
  parent: ['Espas Paran', 'Espace Parents'], parent_only: ['Pou granmoun sèlman', 'Réservé aux adultes'], reset: ['Rekòmanse a zewo', 'Tout recommencer'],
  trophies: ['Twofe m', 'Mes trophées'], my_class: ['Klas mwen', 'Ma classe'], family: ['Fanmi mwen', 'Ma famille'], soon: ['Byento', 'Bientôt'],
  xp: ['XP', 'XP'],
} as const;

export type StrKey = keyof typeof S;

export function tr(key: StrKey, lang: 'ht' | 'fr', vars?: Record<string, string | number>): string {
  let s: string = S[key][lang === 'fr' ? 1 : 0];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

/** Hook: `const t = useT(); t('home')` */
export function useT() {
  const lang = useStore((s) => s.profile.lang);
  return (key: StrKey, vars?: Record<string, string | number>) => tr(key, lang, vars);
}

/** Pick ht/fr from a LocalizedText-like object. */
export function useL() {
  const lang = useStore((s) => s.profile.lang);
  return (t: { ht: string; fr?: string }) => (lang === 'fr' && t.fr ? t.fr : t.ht);
}

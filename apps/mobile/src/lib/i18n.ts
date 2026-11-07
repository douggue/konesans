/** UI strings — Kreyòl first, French second. Course content (EN/ES) lives in @konesans/core. */
import { useStore } from './store';
import { useRemote } from './remote';
import { QUESTS_STRINGS } from './strings/quests';
import { CARDS_STRINGS } from './strings/cards';
import { VWAYAJ_STRINGS } from './strings/vwayaj';
import { RANKS_STRINGS } from './strings/ranks';
import { REQ_STRINGS } from './strings/requests';

const S = {
  ...VWAYAJ_STRINGS,
  ...CARDS_STRINGS,
  ...QUESTS_STRINGS,
  ...RANKS_STRINGS,
  ...REQ_STRINGS,
  // nav
  home: ['Lakay', 'Accueil'], challenge: ['Defi', 'Défis'], course: ['Kou', 'Cours'], coding: ['Enfòmatik', 'Coder'], me: ['Mwen', 'Moi'],
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
  explore: ['Eksplore', 'Explorer'], days: ['jou', 'jours'], day_one: ['jou', 'jour'], duel_bot: ['Defi 1 kont 1', 'Duel 1 vs 1'], duel_sub: ['Jwe kont Robo', 'Jouer contre Robo'],
  // categories
  categories: ['Kategori', 'Catégories'], cat_sub: ['Chwazi yon sijè epi teste konesans ou', 'Choisis un sujet et teste tes connaissances'],
  level: ['Nivo', 'Niveau'], age: ['Laj', 'Âge'],
  // quiz
  question: ['Kesyon', 'Question'], explain: ['Esplike m', 'Explique-moi'], correct: ['Bravo! Se sa!', 'Bravo ! Exact !'], wrong: ['Se pa sa.', 'Ce n’est pas ça.'],
  answer_was: ['Repons lan se:', 'La réponse est :'], timeout: ['Tan an fini!', 'Temps écoulé !'], points: ['pwen', 'points'],
  result: ['Rezilta', 'Résultat'], correct_of: ['bon repons sou', 'bonnes réponses sur'], again: ['Jwe ankò', 'Rejouer'], done: ['Fini', 'Terminer'],
  quit_q: ['Ou vle kite?', 'Tu veux quitter ?'], stay: ['Mwen rete', 'Je reste'], quit: ['Kite kanmenm', 'Quitter quand même'],
  // duel
  you: ['Ou', 'Toi'], opponent: ['Jwè', 'Joueur'], finding: ['N ap chèche yon jwè…', 'On cherche un joueur…'], vs: ['kont', 'contre'],
  you_win: ['Ou genyen!', 'Tu as gagné !'], you_lose: ['Robo genyen fwa sa a.', 'Robo a gagné cette fois.'], draw: ['Egalite!', 'Égalité !'],
  reactions: ['Voye yon reyaksyon', 'Envoyer une réaction'],
  // courses
  learn_in: ['Aprann {x} an Kreyòl', 'Leçons expliquées en français'], english: ['Angle', 'Anglais'], spanish: ['Panyòl', 'Espagnol'],
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
  trophies: ['Twofe m', 'Mes trophées'], my_class: ['Klas mwen', 'Ma classe'], family: ['Fanmi mwen', 'Ma famille'], soon: ['Byento', 'Bientôt'], new_badge: ['Nouvo', 'Nouveau'],
  streak_short: ['Seri', 'Série'], earned: ['Genyen', 'Gagné'], to_earn: ['Pou genyen', 'À gagner'], trophies_sub: ['Fè defi, aprann, jwe chak jou pou debloke yo', 'Relève des défis, apprends et joue chaque jour pour les débloquer'],
  maint_title: ['Ti poz!', 'Petite pause !'], maint_retry: ['Eseye ankò', 'Réessayer'],
  xp: ['XP', 'XP'],
  // avatar
  av_title: ['Fè avata ou', 'Crée ton avatar'], av_hint: ['Chwazi po, cheve ak rad ou. Ou ka chanje l nenpòt lè.', "Choisis ta peau, tes cheveux et tes habits. Tu peux le changer quand tu veux."],
  av_skin: ['Po', 'Peau'], av_hair: ['Cheve', 'Cheveux'], av_hair_color: ['Koulè cheve', 'Couleur'], av_clothes: ['Rad', 'Habits'], av_extra: ['Akseswa', 'Accessoires'], av_bg: ['Fon', 'Fond'],
  av_random: ['Owaza', 'Au hasard'], av_save: ['Sove avata m', 'Enregistrer mon avatar'], av_edit: ['Chanje avata m', 'Modifier mon avatar'],
  hair_afro: ['Afwo', 'Afro'], hair_braids: ['Très', 'Tresses'], hair_short: ['Kout', 'Courts'], hair_puffs: ['Pouf', 'Couettes'],
  ex_none: ['Anyen', 'Rien'], ex_glasses: ['Linèt', 'Lunettes'], ex_cap: ['Kaskèt', 'Casquette'], ex_mask: ['Mask Kanaval', 'Masque de carnaval'], ex_uniform: ['Inifòm lekòl', "Uniforme d'école"],
  // ages & school years
  age_6_8: ['6–8 an', '6–8 ans'], age_9_11: ['9–11 an', '9–11 ans'], age_12_14: ['12–14 an', '12–14 ans'],
  grade_6_8: ['1ye–3yèm AF', '1re–3e AF'], grade_9_11: ['4yèm–6yèm AF', '4e–6e AF'], grade_12_14: ['7yèm–9yèm AF', '7e–9e AF'],
  years: ['an', 'ans'],
  // Kalkil Mantal
  math_title: ['Kalkil Mantal', 'Calcul mental'], math_60s: ['60 segonn', '60 secondes'], math_60s_dot: ['60 segonn.', '60 secondes.'],
  math_how_many: ['Konbyen w ka fè?', 'Combien peux-tu en faire ?'], math_record: ['rekò: {n} pwen', 'record : {n} points'],
  math_intro_12: ['Ekwasyon, pousantaj, pisans, nimewo negatif… Kesyon difisil yo vo 2 pwen.', 'Équations, pourcentages, puissances, nombres négatifs… Les questions difficiles valent 2 points.'],
  math_intro_9: ['Tab miltiplikasyon, nimewo ki manke, pousantaj… Kesyon difisil yo vo 2 pwen.', 'Tables de multiplication, nombres manquants, pourcentages… Les questions difficiles valent 2 points.'],
  math_intro_6: ['Adisyon, soustraksyon, doub, sekans. Chak bon repons = 1 pwen.', 'Additions, soustractions, doubles, suites. Chaque bonne réponse = 1 point.'],
  math_combo: ['Yon seri 5 bon repons = pwen yo doub.', 'Une série de 5 bonnes réponses = points doublés.'],
  math_go: ['ALE!', 'PARTEZ !'], math_summary: ['{good} bon repons · {miss} erè · pi gwo seri {best}', '{good} bonnes réponses · {miss} erreurs · meilleure série {best}'],
  math_practice: ['Pratike: {x}', 'À travailler : {x}'], math_live: ['{good} bon · {x2}seri {combo}', '{good} justes · {x2}série {combo}'],
  two_points: ['2 pwen', '2 points'], skip: ['Sote\u00a0→', 'Passer\u00a0→'], score_points: ['{n} pwen!', '{n} points !'],
  // home & profile
  chest_open: ['Kòf la louvri! +100 XP', 'Le coffre est ouvert ! +100 XP'],
  league: ['Lig', 'Ligue'], profile_stats: ['{xp} XP · {c} bon repons · {l} leson · {w} mo', '{xp} XP · {c} bonnes réponses · {l} leçons · {w} mots'],
  // duel
  robot: ['🤖 Robo', '🤖 Robot'], already_answered: ['{name} reponn deja!', '{name} a déjà répondu !'], seconds_short: ['{n} s', '{n} s'],
  // Peyi options
  peyi_title: ['Peyi', 'Pays'], peyi_sub: ['Drapo · Kapital · Fòm', 'Drapeaux · Capitales · Formes'], mode: ['MÒD', 'MODE'], level_caps: ['NIVO', 'NIVEAU'], region_caps: ['REJYON', 'RÉGION'],
  peyi_mode_drapo: ['Drapo', 'Drapeaux'], peyi_mode_kapital: ['Kapital', 'Capitales'], peyi_mode_fom: ['Fòm', 'Formes'],
  peyi_lv1: ['Fasil', 'Facile'], peyi_lv2: ['Mwayen', 'Moyen'], peyi_lv3: ['Difisil', 'Difficile'],
  peyi_lv1_sub: ['Peyi tout moun konnen', 'Les pays que tout le monde connaît'], peyi_lv2_sub: ['Peyi nan liv lekòl', "Les pays du livre d'école"], peyi_lv3_sub: ['Tout peyi, kesyon alanvè', 'Tous les pays, questions inversées'],
  peyi_pool: ['{n} peyi nan jwèt sa a', '{n} pays dans ce jeu'],
  // settings
  sample_question: ['Ki ane Ayiti te vin yon peyi endepandan?', 'En quelle année Haïti est-elle devenue indépendante ?'],
  app_version: ['Konesans {v} · Kreyòl ayisyen · Français', 'Konesans {v} · créole haïtien · français'],
  parent_gate: ['Konbyen 7 × 6 fè? (Pou paran sèlman)', 'Combien font 7 × 6 ? (Réservé aux parents)'],
  // coding
  your_program: ['Pwogram ou', 'Ton programme'], tap_blocks: ['Tape blòk yo anba a.', 'Touche les blocs ci-dessous.'], here: ['◀ isit', '◀ ici'], else_: ['sinon', 'sinon'],
  back_to_program: ['↩ Retounen anba pwogram nan', '↩ Revenir au programme'], par: ['par {n}', 'par {n}'],
  prog_too_long: ['Pwogram nan twò long (maks 40 blòk).', 'Le programme est trop long (40 blocs max).'], prog_invalid: ['Gen yon blòk ki pa mache isit la.', 'Un bloc ne fonctionne pas ici.'],
  // courses
  listen: ['Koute', 'Écouter'], in_my_lang: ['Kreyòl', 'Français'], xp_coins: ['+{xp} XP · +{c} kòb', '+{xp} XP · +{c} pièces'],
  // trophies
  tier_bronz: ['Bwonz', 'Bronze'], tier_ajan: ['Ajan', 'Argent'], tier_lo: ['Lò', 'Or'],
  // duel reactions
  re_bravo: ['Bravo!', 'Bravo !'], re_wow: ['Wow!', 'Waouh !'], re_byen_jwe: ['Byen jwe!', 'Bien joué !'], re_anko: ['Ankò!', 'Encore !'], re_bon_chans: ['Bòn chans!', 'Bonne chance !'], re_mwen_pare: ['Mwen pare!', 'Je suis prêt !'],
  // matchmaking
  found: ['Nou jwenn yon jwè!', 'Joueur trouvé !'], tap_skip: ['Tape pou kòmanse', 'Touche pour commencer'], get_ready: ['Pare? Ale!', 'Prêt ? Partez !'],
  // online duels
  online_duels: ['Defi sou entènèt', 'Duels en ligne'], online_duels_sub: ['Jwe kont lòt timoun menm laj. Yo wè non jwè ak avatar sèlman, pa gen chat.', "Jouer contre d'autres enfants du même âge. Seuls le pseudo et l'avatar sont visibles, pas de chat."],
  online_on_gate: ['Pou limen defi sou entènèt, yon paran dwe reponn:', 'Pour activer les duels en ligne, un parent doit répondre :'],
  online_err: ['Pa ka konekte ak sèvè a. Eseye ankò pita.', 'Connexion au serveur impossible. Réessaie plus tard.'],
  robo_soon: ['Si pa gen lòt jwè, Robo ap jwe avè w.', "S'il n'y a personne, Robo jouera avec toi."],
  robo_offline: ['Pa gen entènèt: w ap jwe kont Robo.', "Pas d'internet : tu joues contre Robo."],
  robo_parent: ['W ap jwe kont Robo. Yon paran ka limen defi sou entènèt nan Paramèt.', 'Tu joues contre Robo. Un parent peut activer les duels en ligne dans Réglages.'],
  duel_sub_online: ['Jwe kont yon lòt timoun', 'Jouer contre un autre enfant'], online_player: ['Sou entènèt', 'En ligne'],
  report_player: ['Siyale jwè sa a', 'Signaler ce joueur'], reported: ['Mèsi, nou resevwa l.', "Merci, c'est noté."], player_left: ['Lòt jwè a kite pati a.', "L'autre joueur a quitté la partie."],
  sound_test: ['Teste son an', 'Tester le son'], get_set: ['Pare…', 'Prêt…'], diff_label: ['Nivo kesyon yo', 'Niveau des questions'], diff_easy: ['Fasil', 'Facile'], diff_mid: ['Mwayen', 'Moyen'], diff_hard: ['Difisil', 'Difficile'], they_win: ['{name} genyen fwa sa a.', '{name} a gagné cette fois.'],
} as const;

export type StrKey = keyof typeof S;

export function tr(key: StrKey, lang: 'ht' | 'fr', vars?: Record<string, string | number>): string {
  const o = useRemote.getState().strings[key]; // changed in the admin (Tèks app la)
  let s: string = (o && o[lang === 'fr' ? 1 : 0]) || S[key][lang === 'fr' ? 1 : 0];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

/** Hook: `const t = useT(); t('home')` */
export function useT() {
  const lang = useStore((s) => s.profile.lang);
  useRemote((s) => s.version); // re-render when new texts are published
  return (key: StrKey, vars?: Record<string, string | number>) => tr(key, lang, vars);
}

/** Pick ht/fr from a LocalizedText-like object. */
export function useL() {
  const lang = useStore((s) => s.profile.lang);
  return (t: { ht: string; fr?: string }) => (lang === 'fr' && t.fr ? t.fr : t.ht);
}

const MONTHS: Record<'ht' | 'fr', string[]> = {
  ht: ['janv', 'fev', 'mas', 'avr', 'me', 'jen', 'jiyè', 'out', 'sept', 'okt', 'nov', 'des'],
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
};
/** "6 nov. 2026" / "6 nov 2026": our own month names, so a device locale never puts French in the Kreyòl app (or the reverse). */
export function formatDate(iso: string, lang: 'ht' | 'fr'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[lang][d.getMonth()]} ${d.getFullYear()}`;
}

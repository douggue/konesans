/** UI strings added by the UX fix pass (parent gate, quit guard, 6–8 mode, Peyi difficulty, sound test…): [Kreyòl, Français]. Spread into ../i18n.ts. */
export const FIX_UX_STRINGS = {
  // parent gate (a fresh multiplication each time, typed on a keypad)
  pg_ask: ['Pou paran sèlman. Konbyen {a} × {b} fè?', 'Réservé aux parents. Combien font {a} × {b} ?'],
  pg_type: ['Tape repons lan', 'Tape la réponse'],
  pg_ok: ['Valide', 'Valider'],
  pg_wrong: ['Se pa sa. Men yon lòt kesyon.', 'Ce n’est pas ça. Voici une autre question.'],
  pg_locked: ['Twòp erè. Tann {n} s anvan w eseye ankò.', 'Trop d’erreurs. Attends {n} s avant de réessayer.'],
  pg_erase: ['Efase', 'Effacer'],
  pg_voice_off: ['Fèmen lekti awotvwa', 'Couper la lecture à voix haute'],
  // quit sheet
  quit_paused: ['Tan an kanpe pandan w ap reflechi.', 'Le temps est en pause pendant que tu réfléchis.'],
  quit_online: ['Atansyon: nan yon batay sou entènèt, tan an kontinye kouri.', 'Attention : dans un duel en ligne, le temps continue.'],
  quit_lesson_saved: ['Sa w fè deja sove. W ap ka kontinye pita.', 'Ce que tu as fait est enregistré. Tu pourras continuer plus tard.'],
  lesson_resume: ['Kontinye kote w te rive', 'Reprendre où tu étais'],
  close: ['Fèmen', 'Fermer'],
  // 6–8
  listen_answer: ['Koute repons lan', 'Écouter la réponse'],
  voice_68_note: ['Pou 6–8 an, kesyon yo li awotvwa. Se yon paran ki ka fèmen sa.', 'Pour les 6–8 ans, les questions sont lues à voix haute. Seul un parent peut le couper.'],
  // trial quiz
  trial_title: ['3 kesyon pou eseye', '3 questions pour essayer'],
  trial_note: ['Kreye pwofil ou pou kenbe pwen ou yo.', 'Crée ton profil pour garder tes points.'],
  // sound test
  sound_ok: ['Ou tande l? ✓ Son an mache.', 'Tu l’entends ? ✓ Le son marche.'],
  sound_bad: ['Son an pa mache. Tcheke volim telefòn lan epi limen “Son efè”.', 'Le son ne marche pas. Vérifie le volume du téléphone et active « Effets sonores ».'],
  sound_details: ['Peze lontan pou wè detay yo (pou sipò).', 'Appui long pour les détails (pour le support).'],
  // change request
  req_mismatch: ['Laj sa a pa mache ak klas sa a. {g} se pou {a}.', 'Cet âge ne va pas avec cette classe. {g}, c’est pour {a}.'],
  // Peyi / difficulty
  diff_change: ['Chanje', 'Changer'],
  diff_scope: ['Pou kategori yo ak Peyi', 'Pour les catégories et Pays'],
  diff_peyi_sheet: ['Difikilte Peyi ak kategori yo', 'Difficulté de Pays et des catégories'],
  // home
  hello_name: ['Bonjou, {name}!', 'Bonjour, {name} !'],
  lesson_n_of: ['Leson {n} / {total}', 'Leçon {n} / {total}'],
  // coding
  par_goal: ['Objektif: {n} blòk', 'Objectif : {n} blocs'],
  run_again: ['Chanje pwogram nan pou kouri l ankò', 'Change le programme pour le relancer'],
  // duel
  robo_ready: ['Robo pare pou jwe avè w!', 'Robo est prêt à jouer avec toi !'],
  // lesson picture labels
  lesson_quit_label: ['Kite leson an', 'Quitter la leçon'],
} as const;

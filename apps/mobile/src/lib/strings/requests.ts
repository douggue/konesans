/** Strings for age / class change requests (Paramèt → Espas Paran; an admin approves them). Kreyòl first, French second. */
export const REQ_STRINGS = {
  req_row: ['Chanje laj oswa klas', "Changer l'âge ou la classe"],
  req_row_sub: ['Yon administratè Konesans dwe aksepte chanjman an.', 'Un administrateur de Konesans doit accepter le changement.'],
  req_intro: ['Laj la chwazi ki kesyon timoun nan jwenn ak ki timoun li jwe kont sou entènèt. Se pou sa yon administratè verifye chak chanjman.', "L'âge choisit les questions de l'enfant et ses adversaires en ligne. C'est pourquoi un administrateur vérifie chaque changement."],
  req_now: ['Kounye a: {x}', 'Actuellement : {x}'],
  req_new_age: ['Nouvo laj', 'Nouvel âge'],
  req_new_grade: ['Klas', 'Classe'],
  req_reason: ['Poukisa? (si ou vle)', 'Pourquoi ? (facultatif)'],
  req_reason_ph: ['Egzanp: li fèk gen 9 an', 'Exemple : il vient d’avoir 9 ans'],
  req_send: ['Voye demann lan', 'Envoyer la demande'],
  req_close: ['Fèmen', 'Fermer'],
  req_pick: ['Chwazi yon nouvo laj oswa yon nouvo klas.', 'Choisis un nouvel âge ou une nouvelle classe.'],
  req_offline: ['Fòk ou gen entènèt pou voye yon demann. Eseye ankò lè w konekte.', 'Il faut internet pour envoyer une demande. Réessaie une fois connecté.'],
  req_err: ['Demann lan pa pase. Eseye ankò pita.', "La demande n'est pas passée. Réessaie plus tard."],
  req_limit: ['Twòp demann jodi a. Eseye ankò demen.', "Trop de demandes aujourd'hui. Réessaie demain."],
  req_already: ['Gen yon demann k ap tann deja.', 'Une demande est déjà en attente.'],
  req_sent: ['Demann lan ale! Yon administratè ap gade l byento.', 'Demande envoyée ! Un administrateur va la regarder bientôt.'],
  req_title: ['Demann chanjman', 'Demande de changement'],
  req_st_pending: ['An tann', 'En attente'],
  req_st_approved: ['Aksepte', 'Acceptée'],
  req_st_refused: ['Refize', 'Refusée'],
  req_applied: ['Chanjman an fèt nan app la.', "Le changement est fait dans l'application."],
  req_wait: ['Yon administratè ap gade l. Chanjman an ap fèt poukont li lè l aksepte.', "Un administrateur va la regarder. Le changement se fera tout seul une fois acceptée."],
  req_note: ['Mesaj: {x}', 'Message : {x}'],
  req_grade_unset: ['klas pa di', 'classe non précisée'],
  req_g_af1: ['1ye ane', '1re année'],
  req_g_af2: ['2yèm ane', '2e année'],
  req_g_af3: ['3yèm ane', '3e année'],
  req_g_af4: ['4yèm ane', '4e année'],
  req_g_af5: ['5yèm ane', '5e année'],
  req_g_af6: ['6yèm ane', '6e année'],
  req_g_af7: ['7yèm ane', '7e année'],
  req_g_af8: ['8yèm ane', '8e année'],
  req_g_af9: ['9yèm ane', '9e année'],
  req_g_none: ['Pa lekòl', "Pas à l'école"],
  req_g_other: ['Lòt', 'Autre'],
} as const;

/** Haitian school levels (école fondamentale 1–9) + not in school / other. Same ids on the server and in the admins. */
export const GRADES = ['af1', 'af2', 'af3', 'af4', 'af5', 'af6', 'af7', 'af8', 'af9', 'none', 'other'] as const;
export type GradeId = (typeof GRADES)[number];
export const gradeKey = (g: GradeId) => `req_g_${g}` as `req_g_${GradeId}`;

/** Rewards & economy: how cards are earned, the avatar shop, trophy celebration, streak freeze. [Kreyòl, Français]. Spread into ../i18n.ts. */
export const ECON_STRINGS = {
  // Kat Ewo: cards come only from milestones now
  ec_cards_sub: ['Genyen kat nan kòf jodi a, chak fwa w monte ran, ak misyon semèn nan', 'Gagne des cartes dans le coffre du jour, à chaque nouveau rang et avec la mission de la semaine'],
  ec_cards_locked_hint: ['Louvri kòf jodi a oswa monte ran pou w genyen yon lòt kat!', 'Ouvre le coffre du jour ou monte de rang pour gagner une autre carte !'],
  ec_cards_empty_sub: ['Fini 3 misyon jodi a epi louvri kòf la: gen yon kat ewo ladan l!', 'Termine les 3 missions du jour et ouvre le coffre : il contient une carte héros !'],
  ec_cards_go: ['Wè misyon jodi a', 'Voir les missions'],
  ec_chest_hint: ['Fini 3 misyon yo: kòf la gen XP, kòb ak yon kat ewo.', 'Termine les 3 missions : le coffre contient des XP, des pièces et une carte héros.'],
  ec_chest_got: ['Ou jwenn {xp} XP, {c} kòb ak yon kat!', 'Tu gagnes {xp} XP, {c} pièces et une carte !'],
  ec_rank_card: ['Kado pou nouvo ran ou!', 'Un cadeau pour ton nouveau rang !'],

  // Boutik (avatar shop)
  ec_shop: ['Boutik', 'Boutique'],
  ec_shop_sub: ['Achte nouvo bagay pou avata w ak kòb ou', 'Achète de nouveaux objets pour ton avatar avec tes pièces'],
  ec_shop_spend: ['Depanse kòb ou nan boutik la', 'Dépense tes pièces à la boutique'],
  ec_shop_how: ['Ou genyen kòb lè w jwe, lè w fini misyon, ak nan kòf la.', 'Tu gagnes des pièces en jouant, en finissant des missions et dans le coffre.'],
  ec_buy_title: ['Achte bagay sa a?', 'Acheter cet objet ?'],
  ec_buy_btn: ['Achte l pou {n} kòb', 'L’acheter pour {n} pièces'],
  ec_buy_have: ['Ou gen {n} kòb', 'Tu as {n} pièces'],
  ec_buy_missing: ['Ou bezwen {n} kòb ankò. Kontinye jwe!', 'Il te manque {n} pièces. Continue à jouer !'],
  ec_buy_done: ['Se pou ou kounye a!', 'Il est à toi maintenant !'],
  ec_buy_later: ['Pa kounye a', 'Pas maintenant'],
  ec_owned: ['Pa w', 'À toi'],
  ec_price_a11y: ['{n} kòb', '{n} pièces'],
  // shop item names (same key pattern as the rank unlocks: pf_<kind>_<value>)
  pf_ex_bowtie: ['Ne papiyon', 'Nœud papillon'],
  pf_ex_catears: ['Zòrèy chat', 'Oreilles de chat'],
  pf_ex_headwrap: ['Mouchwa tèt madras', 'Foulard madras'],
  pf_hc_8: ['Cheve vèt mant', 'Cheveux menthe'], pf_hc_9: ['Cheve zoranj', 'Cheveux orange'],
  pf_shirt_9: ['Chemiz madras', 'Chemise madras'], pf_shirt_10: ['Mayo kanaval', 'Maillot carnaval'], pf_shirt_11: ['Mayo foutbòl', 'Maillot de foot'],
  pf_bg_9: ['Bò lanmè', 'Plage'], pf_bg_10: ['Dèyè mòn', 'Montagnes'], pf_bg_11: ['Fon kanaval', 'Fond carnaval'],
  pf_frame_5: ['Wonn lakansyèl', 'Cadre arc-en-ciel'], pf_frame_6: ['Wonn flè choublak', 'Cadre hibiscus'],

  // avatar editor: leaving with changes
  ec_av_leave_title: ['Sove chanjman yo?', 'Enregistrer les changements ?'],
  ec_av_leave_sub: ['Ou chanje avata w. Si w pa sove, chanjman yo ap pèdi.', 'Tu as changé ton avatar. Sans enregistrer, les changements seront perdus.'],
  ec_av_leave_save: ['Wi, sove avata m', 'Oui, enregistrer'],
  ec_av_leave_discard: ['Non, kite san sove', 'Non, quitter sans enregistrer'],

  // trophy celebration
  ec_badge_title: ['Nouvo twofe!', 'Nouveau trophée !'],
  ec_badge_see: ['Wè twofe m yo', 'Voir mes trophées'],

  // streak freeze
  ec_freeze_have: ['Ou gen yon glas: si w rate yon jou, seri w ap rete.', 'Tu as un glaçon : si tu rates un jour, ta série reste.'],
  ec_freeze_in: ['Jwe {n} jou ankò pou w genyen yon glas.', 'Joue encore {n} jours pour gagner un glaçon.'],

  // quests / coding
  ec_q_coding: ['Fini {n} nivo nan Enfòmatik', 'Réussis {n} niveaux en Informatique'],
  ec_code_no_xp: ['Ou te fini nivo sa a deja: XP sèlman pou plis zetwal.', 'Niveau déjà réussi : des XP seulement pour plus d’étoiles.'],
} as const;

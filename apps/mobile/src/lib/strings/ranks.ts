/** Rank names (core progress/ranks.ts keeps the ids). Editable from the admin ("Tèks app la", keys rank_*). Kreyòl first, French second. */
export const RANKS_STRINGS = {
  rank_ti_grenn: ['Ti Grenn', 'Petite Graine'],
  rank_ti_pous: ['Ti Pous', 'Jeune Pousse'],
  rank_ti_zwazo: ['Ti Zwazo', 'Petit Oiseau'],
  rank_eksplorate: ['Eksploratè', 'Explorateur'],
  rank_malfini: ['Malfini', 'Malfini'],
  rank_mapou: ['Mapou', 'Mapou'],
  rank_sitadel: ['Sitadèl', 'Citadelle'],
  rank_zetwal: ['Zetwal', 'Étoile'],
  rank_met_konesans: ['Mèt Konesans', 'Maître du savoir'],
  rank_lejand: ['Lejand', 'Légende'],
} as const;

export type RankStrKey = keyof typeof RANKS_STRINGS;

/** Core rank id → UI string key. */
export const RANK_KEY: Record<string, RankStrKey> = {
  grenn: 'rank_ti_grenn', pous: 'rank_ti_pous', zwazo: 'rank_ti_zwazo', eksplo: 'rank_eksplorate', malfini: 'rank_malfini',
  mapou: 'rank_mapou', sitadel: 'rank_sitadel', zetwal: 'rank_zetwal', met: 'rank_met_konesans', lejand: 'rank_lejand',
};

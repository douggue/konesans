/** UI strings for the premium polish pass (shared loading / empty / error states, drawn-icon labels): [Kreyòl, Français]. Spread into ../i18n.ts. */
export const POLISH_STRINGS = {
  // shared loading / error states (src/ui/kit.tsx)
  pl_loading: ['N ap chaje…', 'Chargement…'],
  pl_offline_title: ['Pa gen entènèt', 'Pas d’internet'],
  pl_offline_sub: ['Tcheke koneksyon an, epi eseye ankò.', 'Vérifie ta connexion, puis réessaie.'],
  pl_server_title: ['Sèvè a pa reponn', 'Le serveur ne répond pas'],
  pl_server_sub: ['Se pa fòt ou. Eseye ankò nan yon ti moman.', 'Ce n’est pas ta faute. Réessaie dans un petit moment.'],
  // small icon buttons
  pl_hint: ['Endis', 'Indice'],
  pl_refresh: ['Mete ajou', 'Actualiser'],
  // Enfòmatik (coding) levels card
  pl_code_progress: ['PWOGRÈ OU', 'TES PROGRÈS'],
  pl_code_levels: ['{n} sou {total} nivo fini', '{n} niveaux sur {total} terminés'],
  pl_code_stars: ['{n} / {total} zetwal', '{n} / {total} étoiles'],
} as const;

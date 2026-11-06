/** Konesans visual system — mirrors the design mockup. */
export const colors = {
  bg: '#F6F7FB',
  card: '#FFFFFF',
  line: '#E3E7F1',
  lineStrong: '#D9DEEA',
  ink: '#14213D',
  muted: '#5A6480',
  blue: '#1F47B5',
  blueLight: '#4D7CFE',
  blueSoft: '#E6ECFB',
  red: '#D21034',
  redLight: '#FF5A6E',
  redSoft: '#FDE7EC',
  yellow: '#FFD43B',
  yellowDark: '#F5B700',
  yellowSoft: '#FFF4D1',
  green: '#2F9E44',
  greenLight: '#51CF66',
  greenSoft: '#E3F4EA',
  orange: '#FF9F43',
  orangeSoft: '#FFF0E0',
  purple: '#B197FC',
  purpleSoft: '#EDE7FF',
  teal: '#0E7C86',
};

export const fonts = {
  display: 'Baloo2_800ExtraBold',
  displayBold: 'Baloo2_700Bold',
  body: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
  bodyRegular: 'Nunito_600SemiBold',
};

export const radius = { sm: 12, md: 16, lg: 20, xl: 24 };

/** Chunky raised card: 2px outline + 5px bottom edge. */
export const raised = (edge = colors.line) => ({
  backgroundColor: colors.card,
  borderWidth: 2,
  borderColor: edge,
  borderBottomWidth: 5,
  borderRadius: radius.lg,
});

export const CATEGORY_META: Record<string, { ht: string; fr: string; color: string; soft: string; icon: string }> = {
  istwa:     { ht: 'Istwa',             fr: 'Histoire',            color: colors.orange,     soft: colors.orangeSoft, icon: 'istwa' },
  jewografi: { ht: 'Jewografi',         fr: 'Géographie',          color: colors.blueLight,  soft: '#E7F5FF',         icon: 'jewo' },
  peyi:      { ht: 'Peyi',              fr: 'Pays',                color: colors.yellowDark, soft: colors.yellowSoft, icon: 'drapo' },
  kilti:     { ht: 'Kilti & Tradisyon', fr: 'Culture & traditions', color: colors.redLight,  soft: colors.redSoft,    icon: 'kilti' },
  syans:     { ht: 'Syans',             fr: 'Sciences',            color: colors.purple,     soft: colors.purpleSoft, icon: 'syans' },
  matematik: { ht: 'Matematik',         fr: 'Mathématiques',       color: colors.greenLight, soft: colors.greenSoft,  icon: 'kalkil' },
  jeneral:   { ht: 'Konesans Jeneral',  fr: 'Culture générale',    color: colors.yellow,     soft: colors.yellowSoft, icon: 'kesyon' },
  espo:      { ht: 'Espò',              fr: 'Sport',               color: colors.green,      soft: colors.greenSoft,  icon: 'espo' },
  teknoloji: { ht: 'Teknoloji',         fr: 'Technologie',         color: colors.blue,       soft: colors.blueSoft,   icon: 'robo' },
};

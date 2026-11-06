/** Konesans Admin visual system — same language as the web admin preview and the kid app. */
export const colors = {
  bg: '#F6F7FB',
  card: '#FFFFFF',
  line: '#E3E7F1',
  lineStrong: '#D9DEEA',
  ink: '#14213D',
  muted: '#5A6480',
  blue: '#1F47B5',
  blueDark: '#163A96',
  blueLight: '#4D7CFE',
  blueSoft: '#E6ECFB',
  red: '#D21034',
  redInk: '#8F0A22',
  redSoft: '#FDE7EC',
  green: '#2F9E44',
  greenDark: '#1F7A33',
  greenInk: '#12632F',
  greenSoft: '#E3F4EA',
  yellow: '#F5B700',
  yellowInk: '#7A5A00',
  yellowSoft: '#FFF4D1',
  navy: '#14213D',
};

export const fonts = {
  display: 'Baloo2_800ExtraBold',
  displayBold: 'Baloo2_700Bold',
  body: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
  bodyRegular: 'Nunito_600SemiBold',
};

/** Chunky card: 2px outline + 4px bottom edge (matches the web admin). */
export const raised = (edge: string = colors.line) => ({
  backgroundColor: colors.card,
  borderWidth: 2,
  borderColor: edge,
  borderBottomWidth: 4,
  borderRadius: 18,
});

export type Status = 'review' | 'approved' | 'draft';
export const STATUS: Record<Status, { label: string; fg: string; bg: string; edge: string }> = {
  review: { label: 'Pou relekti', fg: colors.yellowInk, bg: colors.yellowSoft, edge: colors.line },
  approved: { label: 'Apwouve', fg: colors.greenInk, bg: colors.greenSoft, edge: colors.green },
  draft: { label: 'Pwoblèm', fg: colors.redInk, bg: colors.redSoft, edge: colors.red },
};

/** Swatches offered in the category color picker (kid app palette). */
export const SWATCHES = ['#FF9F43', '#4D7CFE', '#F5B700', '#FF5A6E', '#B197FC', '#51CF66', '#FFD43B', '#2F9E44', '#1F47B5', '#D21034', '#0E7C86', '#14213D'];

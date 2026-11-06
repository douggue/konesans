/** Shared domain types for Konesans. Pure data, no framework imports. */

/** App interface languages. (English and Spanish exist only as course targets, see courses/.) */
export type Lang = 'ht' | 'fr';
export type AgeBand = '6-8' | '9-11' | '12-14';
export type Difficulty = 1 | 2 | 3; // maps to AgeBand by default, but a question can be tagged explicitly

export type CategoryId =
  | 'istwa' | 'jewografi' | 'kilti' | 'syans' | 'matematik'
  | 'jeneral' | 'espo' | 'teknoloji' | 'peyi';   // peyi = countries: flags, capitals, shapes

/** Kreyòl is required; French is the second UI language. `en` is kept only for internal/admin labels. */
export interface LocalizedText { ht: string; fr?: string; en?: string }

export interface Question {
  id: string;
  category: CategoryId;
  difficulty: Difficulty;
  /** Which age bands this question may be served to. */
  ages: AgeBand[];
  prompt: LocalizedText;
  /** 2–4 options; index of correct answer is `answer`. */
  options: LocalizedText[];
  answer: number;
  /** Short explanation shown after answering ("Esplike m"). */
  explain?: LocalizedText;
  /** Optional media: an SVG path (country shape), a flag code, an image key, an audio key. */
  media?: { kind: 'shape' | 'flag' | 'image' | 'audio'; ref: string };
  /** Review workflow: `review` = written, waiting for a proofreader; `approved` = checked; `draft` = flagged, needs rework (never served). */
  status: 'draft' | 'review' | 'approved';
  /** Sub-topic tag for grouping in the admin panel (e.g. 'revolisyon'). */
  topic?: string;
  /** Reviewer's note from the admin panel. */
  note?: string;
}

export interface Profile {
  id: string;
  /** Generated, never a real name. */
  username: string;
  avatar: AvatarConfig;
  age: AgeBand;
  lang: Lang;
  /** Set once a parent has approved the account (COPPA gate). */
  parentApprovedAt?: string; // ISO
  settings: KidSettings;
}

export interface AvatarConfig {
  skin: number; hair: 'afro' | 'braids' | 'short' | 'puffs'; hairColor: number;
  shirt: number; extra: 'none' | 'glasses' | 'cap' | 'mask' | 'uniform'; bg: number;
}

/** Controls a parent sets. Defaults are the safest ones. */
export interface KidSettings {
  dailyLimitMin: number;       // 15..120
  bedtimeHour: number;         // 0..23, app locks after this local hour
  streakEnabled: boolean;      // parent may turn streaks off entirely
  maxRemindersPerDay: number;  // 0 or 1
  randomDuelsAllowed: boolean; // play strangers (parent-verified only)
  weeklyWhatsAppReport: boolean;
}

export const DEFAULT_SETTINGS: KidSettings = {
  dailyLimitMin: 45, bedtimeHour: 20, streakEnabled: true,
  maxRemindersPerDay: 1, randomDuelsAllowed: false, weeklyWhatsAppReport: true,
};

/** Progress that lives on the device and syncs to the server. */
export interface Progress {
  xp: number;
  coins: number;
  streak: { count: number; lastDay: string | null; freezeAvailable: boolean }; // lastDay = YYYY-MM-DD local
  categoryLevel: Partial<Record<CategoryId, number>>;
  heroCards: string[];
  badges: Record<string, string>; // badgeId -> ISO earned date
  /** Spaced-repetition state for questions answered wrong. */
  review: Record<string, ReviewItem>;
  questsDay: string | null;
  quests: QuestState[];
}

export interface ReviewItem { box: 0 | 1 | 2 | 3 | 4; due: string; misses: number }

export interface QuestState { id: string; kind: QuestKind; goal: number; progress: number; xp: number; done: boolean }
export type QuestKind = 'win_duel' | 'finish_lessons' | 'math_score' | 'answer_correct' | 'play_category' | 'review_mistakes';

export const emptyProgress = (): Progress => ({
  xp: 0, coins: 0, streak: { count: 0, lastDay: null, freezeAvailable: true },
  categoryLevel: {}, heroCards: [], badges: {}, review: {}, questsDay: null, quests: [],
});

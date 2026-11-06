import type { Question } from '../types.js';
import { type GenModule, type Rand, int, pick, q, ht, shuffleArr } from '../modules/base.js';

/**
 * Enfòmatik: computer basics and online safety. Part authored (small, reviewed list),
 * part generated (password strength, sorting, "what comes out of this program").
 */
export const BASICS_QUESTIONS: Question[] = [
  { id: 'enf-001', category: 'teknoloji', difficulty: 1, ages: ['6-8', '9-11'], status: 'approved',
    prompt: ht('Ki pati òdinatè a ou sèvi pou w ekri?'), options: [ht('Klavye'), ht('Ekran'), ht('Sourit')], answer: 0, explain: ht('Klavye a gen tout lèt yo.') },
  { id: 'enf-002', category: 'teknoloji', difficulty: 1, ages: ['6-8', '9-11', '12-14'], status: 'approved',
    prompt: ht('Yon moun ou pa konnen mande w modpas ou sou entènèt. Kisa w fè?'), options: [ht('Mwen ba li l'), ht('Mwen pa ba li l, mwen di yon granmoun'), ht('Mwen ba li yon lòt modpas')], answer: 1, explain: ht('Modpas ou se sekrè w. Pa janm bay pèsonn li.') },
  { id: 'enf-003', category: 'teknoloji', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: ht('Kisa yon «fichye» ye?'), options: [ht('Yon dokiman, foto oswa videyo ki sove sou yon aparèy'), ht('Yon kab'), ht('Yon moun ki travay nan òdinatè')], answer: 0 },
  { id: 'enf-004', category: 'teknoloji', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: ht('Kisa entènèt la ye?'), options: [ht('Yon rezo ki konekte òdinatè nan tout mond lan'), ht('Yon pwogram nan telefòn'), ht('Yon kalite kouran')], answer: 0 },
  { id: 'enf-005', category: 'teknoloji', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: ht('Yon mesaj di: «Ou genyen yon telefòn! Klike la a.» Kisa w fè?'), options: [ht('Mwen klike vit'), ht('Mwen pa klike, se petèt yon pyèj'), ht('Mwen voye l bay zanmi m')], answer: 1, explain: ht('Mesaj ki pwomèt kado se souvan pyèj (arnak).') },
  { id: 'enf-006', category: 'teknoloji', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: ht('Kisa yon «algoritm» ye?'), options: [ht('Yon lis etap pou rezoud yon pwoblèm'), ht('Yon kalite òdinatè'), ht('Yon jwèt videyo')], answer: 0, explain: ht('Yon resèt manje se yon algoritm tou!') },
  { id: 'enf-007', category: 'teknoloji', difficulty: 3, ages: ['12-14'], status: 'approved',
    prompt: ht('Nan yon pwogram, kisa yon «bouk» (loop) fè?'), options: [ht('Li repete yon aksyon plizyè fwa'), ht('Li efase pwogram nan'), ht('Li fèmen òdinatè a')], answer: 0 },
  { id: 'enf-008', category: 'teknoloji', difficulty: 3, ages: ['12-14'], status: 'approved',
    prompt: ht('Kisa yon «varyab» ye?'), options: [ht('Yon bwat ki kenbe yon valè ki ka chanje'), ht('Yon erè nan pwogram nan'), ht('Yon kalite ekran')], answer: 0 },
  { id: 'enf-009', category: 'teknoloji', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: ht('Ki enfòmasyon ou pa dwe janm mete sou entènèt?'), options: [ht('Adrès kay ou ak lekòl ou'), ht('Koulè w pi renmen'), ht('Non jwè w nan Konesans')], answer: 0 },
];

/** Generated: which password is strongest, what does this tiny program print, sort these. */
export const basicsGen: GenModule = {
  id: 'enf', name: { ht: 'Enfòmatik', fr: 'Informatique' }, category: 'teknoloji', ages: ['9-11', '12-14'],
  generate(age, rand) {
    const kind = pick(rand, age === '9-11' ? ['pass', 'sort'] : ['pass', 'sort', 'print']);
    if (kind === 'pass') {
      const weak = pick(rand, ['123456', 'zwazo', 'ayiti', 'abcdef', '111111', 'kreyol']);
      const strong = pick(rand, ['Mang0!Dous#27', 'Tanbou*Rara42', 'Soup&Joumou1804', 'Lanbi%Ble#9']);
      const mid = pick(rand, ['Zwazo27', 'ayiti2026', 'Kolibri5']);
      return q(this, age, rand, ht('Ki modpas ki pi solid?'), [strong, weak, mid], strong, 'Yon bon modpas long, li gen lèt, chif ak siy, e li pa yon mo senp.');
    }
    if (kind === 'sort') {
      const nums = shuffleArr(Array.from({ length: 4 }, () => int(rand, 1, 99)), rand);
      const sorted = [...nums].sort((a, b) => a - b).join(', ');
      const wrong1 = [...nums].sort((a, b) => b - a).join(', ');
      const wrong2 = nums.join(', ');
      return q(this, age, rand, ht(`Ranje nonb sa yo nan lòd, pi piti an premye: ${nums.join(', ')}`), [sorted, wrong1, wrong2], sorted, 'Òdinatè yo «triye» lis tout tan. Ou fèk fè yon tri!');
    }
    const x = int(rand, 1, 9), n = int(rand, 2, 4);
    const code = `x = ${x}\nrepete ${n} fwa:\n    x = x + 2\nmontre x`;
    const ans = String(x + 2 * n);
    return q(this, age, rand, ht(`Kisa pwogram sa a ap montre?\n${code}`), [ans, String(x + 2), String(x * n), String(x + 2 * n + 2)], ans, `Chak tou ajoute 2: ${x} + ${n} × 2 = ${ans}.`);
  },
};

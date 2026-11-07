import type { Question } from '../types.js';
import { type GenModule, type Rand, int, pick, q, tx, shuffleArr } from '../modules/base.js';

/**
 * Enfòmatik: computer basics and online safety. Part authored (small, reviewed list),
 * part generated (password strength, sorting, "what comes out of this program").
 */
export const BASICS_QUESTIONS: Question[] = [
  { id: 'enf-001', category: 'teknoloji', difficulty: 1, ages: ['6-8', '9-11'], status: 'approved',
    prompt: tx('Ki pati òdinatè a ou sèvi pou w ekri?', "Quelle partie de l'ordinateur sert à écrire ?"), options: [tx('Klavye', 'Le clavier'), tx('Ekran', "L'écran"), tx('Sourit', 'La souris')], answer: 0, explain: tx('Klavye a gen tout lèt yo.', 'Le clavier a toutes les lettres.') },
  { id: 'enf-002', category: 'teknoloji', difficulty: 1, ages: ['6-8', '9-11', '12-14'], status: 'approved',
    prompt: tx('Yon moun ou pa konnen mande w modpas ou sou entènèt. Kisa w fè?', "Un inconnu te demande ton mot de passe sur Internet. Que fais-tu ?"), options: [tx('Mwen ba li l', 'Je le lui donne'), tx('Mwen pa ba li l, mwen di yon granmoun', 'Je ne le donne pas et je le dis à un adulte'), tx('Mwen ba li yon lòt modpas', 'Je lui donne un autre mot de passe')], answer: 1, explain: tx('Modpas ou se sekrè w. Pa janm bay pèsonn li.', "Ton mot de passe est secret. Ne le donne jamais à personne.") },
  { id: 'enf-003', category: 'teknoloji', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: tx('Kisa yon «fichye» ye?', "Qu'est-ce qu'un « fichier » ?"), options: [tx('Yon dokiman, foto oswa videyo ki sove sou yon aparèy', 'Un document, une photo ou une vidéo enregistrés sur un appareil'), tx('Yon kab', 'Un câble'), tx('Yon moun ki travay nan òdinatè', 'Une personne qui travaille sur ordinateur')], answer: 0 },
  { id: 'enf-004', category: 'teknoloji', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: tx('Kisa entènèt la ye?', "Qu'est-ce qu'Internet ?"), options: [tx('Yon rezo ki konekte òdinatè nan tout mond lan', 'Un réseau qui relie les ordinateurs du monde entier'), tx('Yon pwogram nan telefòn', 'Une application du téléphone'), tx('Yon kalite kouran', "Une sorte d'électricité")], answer: 0 },
  { id: 'enf-005', category: 'teknoloji', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: tx('Yon mesaj di: «Ou genyen yon telefòn! Klike la a.» Kisa w fè?', 'Un message dit : « Tu as gagné un téléphone ! Clique ici. » Que fais-tu ?'), options: [tx('Mwen klike vit', 'Je clique vite'), tx('Mwen pa klike, se petèt yon pyèj', "Je ne clique pas, c'est peut-être un piège"), tx('Mwen voye l bay zanmi m', "Je l'envoie à mes amis")], answer: 1, explain: tx('Mesaj ki pwomèt kado se souvan pyèj (arnak).', 'Les messages qui promettent des cadeaux sont souvent des pièges (arnaques).') },
  { id: 'enf-006', category: 'teknoloji', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: tx('Kisa yon «algoritm» ye?', "Qu'est-ce qu'un « algorithme » ?"), options: [tx('Yon lis etap pou rezoud yon pwoblèm', "Une liste d'étapes pour résoudre un problème"), tx('Yon kalite òdinatè', "Une sorte d'ordinateur"), tx('Yon jwèt videyo', 'Un jeu vidéo')], answer: 0, explain: tx('Yon resèt manje se yon algoritm tou!', 'Une recette de cuisine est aussi un algorithme !') },
  { id: 'enf-007', category: 'teknoloji', difficulty: 3, ages: ['12-14'], status: 'approved',
    prompt: tx('Nan yon pwogram, kisa yon «bouk» (loop) fè?', 'Dans un programme, que fait une « boucle » ?'), options: [tx('Li repete yon aksyon plizyè fwa', 'Elle répète une action plusieurs fois'), tx('Li efase pwogram nan', 'Elle efface le programme'), tx('Li fèmen òdinatè a', "Elle éteint l'ordinateur")], answer: 0 },
  { id: 'enf-008', category: 'teknoloji', difficulty: 3, ages: ['12-14'], status: 'approved',
    prompt: tx('Kisa yon «varyab» ye?', "Qu'est-ce qu'une « variable » ?"), options: [tx('Yon bwat ki kenbe yon valè ki ka chanje', 'Une boîte qui garde une valeur qui peut changer'), tx('Yon erè nan pwogram nan', 'Une erreur dans le programme'), tx('Yon kalite ekran', "Une sorte d'écran")], answer: 0 },
  { id: 'enf-009', category: 'teknoloji', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: tx('Ki enfòmasyon ou pa dwe janm mete sou entènèt?', 'Quelle information ne dois-tu jamais mettre sur Internet ?'), options: [tx('Adrès kay ou ak lekòl ou', "L'adresse de ta maison et de ton école"), tx('Koulè w pi renmen', 'Ta couleur préférée'), tx('Non jwè w nan Konesans', 'Ton nom de joueur dans Konesans')], answer: 0 },
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
      return q(this, age, rand, tx('Ki modpas ki pi solid?', 'Quel mot de passe est le plus solide ?'), [strong, weak, mid], strong, tx('Yon bon modpas long, li gen lèt, chif ak siy, e li pa yon mo senp.', "Un bon mot de passe est long, avec des lettres, des chiffres et des signes, et ce n'est pas un mot simple."));
    }
    if (kind === 'sort') {
      // 4 different numbers, shown in an order that is neither sorted nor reverse-sorted
      const pool = new Set<number>();
      while (pool.size < 4) pool.add(int(rand, 1, 99));
      const asc = [...pool].sort((a, b) => a - b);
      let nums = shuffleArr(asc, rand);
      while (nums.join() === asc.join() || nums.join() === [...asc].reverse().join()) nums = shuffleArr(asc, rand);
      // distractors: biggest-first, and two "almost sorted" lists (two neighbours swapped) — never just the shown order,
      // so "don't pick the order you see" is not a trick that works
      const swapAt = (i: number) => { const b = asc.slice(); [b[i], b[i + 1]] = [b[i + 1], b[i]]; return b.join(', '); };
      const [s1, s2] = shuffleArr([0, 1, 2], rand);
      const sorted = asc.join(', ');
      return q(this, age, rand, tx(`Ranje nonb sa yo nan lòd, pi piti an premye: ${nums.join(', ')}`, `Range ces nombres dans l'ordre, du plus petit au plus grand : ${nums.join(', ')}`), [sorted, [...asc].reverse().join(', '), swapAt(s1), swapAt(s2)], sorted, tx('Òdinatè yo «triye» lis tout tan. Ou fèk fè yon tri!', 'Les ordinateurs « trient » des listes tout le temps. Tu viens de faire un tri !'));
    }
    const x = int(rand, 1, 9), n = int(rand, 2, 4);
    const code = `x = ${x}\nrepete ${n} fwa:\n    x = x + 2\nmontre x`;
    const codeFr = `x = ${x}\nrépète ${n} fois :\n    x = x + 2\naffiche x`;
    const ans = String(x + 2 * n);
    return q(this, age, rand, tx(`Kisa pwogram sa a ap montre?\n${code}`, `Qu'affiche ce programme ?\n${codeFr}`), [ans, String(x + 2), String(x * n), String(x + 2 * n + 2)], ans, tx(`Chak tou ajoute 2: ${x} + ${n} × 2 = ${ans}.`, `Chaque tour ajoute 2 : ${x} + ${n} × 2 = ${ans}.`));
  },
};

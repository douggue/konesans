import type { Question } from '../types.js';

/**
 * Sample question bank. In production this is loaded from content packs
 * (see packs.ts); questions must be `approved` by a reviewer to be served.
 * Keep Kreyòl as the primary language; fr/en are optional translations.
 */
export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'ist-001', category: 'istwa', difficulty: 1, ages: ['6-8', '9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Ki ane Ayiti te vin yon peyi endepandan?', fr: "En quelle année Haïti est-elle devenue indépendante ?", en: 'In what year did Haiti become independent?' },
    options: [{ ht: '1791', fr: '1791' }, { ht: '1804', fr: '1804' }, { ht: '1825', fr: '1825' }, { ht: '1915', fr: '1915' }], answer: 1,
    explain: { ht: 'Ayiti te deklare endepandans li 1ye janvye 1804, nan Gonayiv.', fr: 'Haïti a proclamé son indépendance le 1er janvier 1804, aux Gonaïves.' },
  },
  {
    id: 'ist-002', category: 'istwa', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Ki moun ki te fè bati Sitadèl Laferyè?', fr: 'Qui a fait construire la Citadelle Laferrière ?' },
    options: [{ ht: 'Alexandre Pétion', fr: 'Alexandre Pétion' }, { ht: 'Henri Christophe', fr: 'Henri Christophe' }, { ht: 'Toussaint Louverture', fr: 'Toussaint Louverture' }, { ht: 'Jean-Pierre Boyer', fr: 'Jean-Pierre Boyer' }], answer: 1,
    explain: { ht: 'Henri Christophe te fè bati Sitadèl la nan Nò, apre endepandans lan.', fr: "Henri Christophe a fait construire la Citadelle dans le Nord, après l'indépendance." },
  },
  {
    id: 'ist-003', category: 'istwa', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Ki dat Batay Vètyè a te fèt?', fr: 'À quelle date a eu lieu la bataille de Vertières ?' },
    options: [{ ht: '18 me 1803', fr: '18 mai 1803' }, { ht: '18 novanm 1803', fr: '18 novembre 1803' }, { ht: '1ye janvye 1804', fr: '1er janvier 1804' }, { ht: '22 out 1791', fr: '22 août 1791' }], answer: 1,
    explain: { ht: 'Batay Vètyè, 18 novanm 1803, se dènye gwo batay anvan endepandans lan.', fr: "La bataille de Vertières, le 18 novembre 1803, est la dernière grande bataille avant l'indépendance." },
  },
  {
    id: 'ist-004', category: 'istwa', difficulty: 1, ages: ['6-8', '9-11'], status: 'approved',
    prompt: { ht: 'Ki koulè ki nan drapo Ayiti?', fr: "Quelles sont les couleurs du drapeau d'Haïti ?" },
    options: [{ ht: 'Ble ak wouj', fr: 'Bleu et rouge' }, { ht: 'Vèt ak jòn', fr: 'Vert et jaune' }, { ht: 'Nwa ak blan', fr: 'Noir et blanc' }], answer: 0,
    explain: { ht: 'Drapo a gen ble anwo ak wouj anba, ak zam peyi a nan mitan.', fr: 'Le drapeau est bleu en haut et rouge en bas, avec les armoiries au milieu.' },
    media: { kind: 'flag', ref: 'HT' },
  },
  {
    id: 'jeo-001', category: 'jewografi', difficulty: 1, ages: ['6-8', '9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Ki kapital Ayiti?', fr: "Quelle est la capitale d'Haïti ?" },
    options: [{ ht: 'Okap', fr: 'Cap-Haïtien' }, { ht: 'Pòtoprens', fr: 'Port-au-Prince' }, { ht: 'Jakmèl', fr: 'Jacmel' }, { ht: 'Gonayiv', fr: 'Gonaïves' }], answer: 1,
    explain: { ht: 'Pòtoprens se kapital la, nan depatman Lwès.', fr: "Port-au-Prince est la capitale, dans le département de l'Ouest." },
  },
  {
    id: 'jeo-002', category: 'jewografi', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Konbyen depatman Ayiti genyen?', fr: 'Combien de départements Haïti compte-t-elle ?' },
    options: [{ ht: '8', fr: '8' }, { ht: '9', fr: '9' }, { ht: '10', fr: '10' }, { ht: '12', fr: '12' }], answer: 2,
    explain: { ht: 'Ayiti gen 10 depatman. Nip se dènye a yo te kreye, an 2003.', fr: 'Haïti compte 10 départements. Les Nippes sont le dernier créé, en 2003.' },
  },
  {
    id: 'dra-001', category: 'peyi', difficulty: 1, ages: ['6-8', '9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Ki peyi drapo sa a ye?', fr: 'À quel pays est ce drapeau ?' }, media: { kind: 'flag', ref: 'JM' },
    options: [{ ht: 'Bahamas', fr: 'Bahamas' }, { ht: 'Jamayik', fr: 'Jamaïque' }, { ht: 'Babad', fr: 'Barbade' }, { ht: 'Sent Lisi', fr: 'Sainte-Lucie' }], answer: 1,
    explain: { ht: 'Se drapo Jamayik. Kapital li se Kingston.', fr: "C'est le drapeau de la Jamaïque. Sa capitale est Kingston." },
  },
  {
    id: 'dra-002', category: 'peyi', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Ki kapital Kiba?', fr: 'Quelle est la capitale de Cuba ?' },
    options: [{ ht: 'Santiago', fr: 'Santiago' }, { ht: 'Kingston', fr: 'Kingston' }, { ht: 'Lavàn', fr: 'La Havane' }, { ht: 'Nasò', fr: 'Nassau' }], answer: 2,
    explain: { ht: 'Lavàn se kapital Kiba.', fr: 'La Havane est la capitale de Cuba.' },
  },
  {
    id: 'fom-001', category: 'peyi', difficulty: 1, ages: ['6-8', '9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Ki peyi sa a?', fr: 'Quel est ce pays ?' }, media: { kind: 'shape', ref: 'HT' },
    options: [{ ht: 'Ayiti', fr: 'Haïti' }, { ht: 'Kiba', fr: 'Cuba' }, { ht: 'Pòtoriko', fr: 'Porto Rico' }, { ht: 'Jamayik', fr: 'Jamaïque' }], answer: 0,
    explain: { ht: 'Ayiti sanble ak yon pens krab. Ti zile a se Lagonav.', fr: "Haïti ressemble à une pince de crabe. La petite île, c'est la Gonâve." },
  },
  {
    id: 'mat-001', category: 'matematik', difficulty: 1, ages: ['6-8'], status: 'approved',
    prompt: { ht: 'Konbyen 7 + 5 fè?', fr: 'Combien font 7 + 5 ?' },
    options: [{ ht: '11', fr: '11' }, { ht: '12', fr: '12' }, { ht: '13', fr: '13' }], answer: 1,
  },
  {
    id: 'mat-002', category: 'matematik', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Konbyen 7 × 8 fè?', fr: 'Combien font 7 × 8 ?' },
    options: [{ ht: '54', fr: '54' }, { ht: '56', fr: '56' }, { ht: '64', fr: '64' }, { ht: '48', fr: '48' }], answer: 1,
  },
  {
    id: 'sya-001', category: 'syans', difficulty: 1, ages: ['6-8', '9-11'], status: 'approved',
    prompt: { ht: 'Ki planèt nou rete sou li?', fr: 'Sur quelle planète vivons-nous ?' },
    options: [{ ht: 'Mas', fr: 'Mars' }, { ht: 'Latè', fr: 'La Terre' }, { ht: 'Lalin', fr: 'La Lune' }], answer: 1,
  },
  {
    id: 'kil-001', category: 'kilti', difficulty: 1, ages: ['6-8', '9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Ki manje Ayisyen manje 1ye janvye?', fr: 'Quel plat les Haïtiens mangent-ils le 1er janvier ?' },
    options: [{ ht: 'Soup joumou', fr: 'Soupe joumou' }, { ht: 'Diri kole', fr: 'Riz collé' }, { ht: 'Pate kòde', fr: 'Pâté kodé' }, { ht: 'Griyo', fr: 'Griot' }], answer: 0,
    explain: { ht: 'Soup joumou se senbòl libète: esklav yo pa t gen dwa manje l.', fr: "La soupe joumou est un symbole de liberté : les esclaves n'avaient pas le droit d'en manger." },
  },
  {
    id: 'kil-002', category: 'kilti', difficulty: 2, ages: ['9-11', '12-14'], status: 'review',
    prompt: { ht: 'Ki vil yo rele "Vil Powèt yo"?', fr: 'Quelle ville appelle-t-on « la Cité des poètes » ?' },
    options: [{ ht: 'Jeremi', fr: 'Jérémie' }, { ht: 'Jakmèl', fr: 'Jacmel' }, { ht: 'Okay', fr: 'Les Cayes' }], answer: 0,
  },
];

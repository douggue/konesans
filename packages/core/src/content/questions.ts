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
    options: [{ ht: '1791' }, { ht: '1804' }, { ht: '1825' }, { ht: '1915' }], answer: 1,
    explain: { ht: 'Ayiti te deklare endepandans li 1ye janvye 1804, nan Gonayiv.' },
  },
  {
    id: 'ist-002', category: 'istwa', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Ki moun ki te fè bati Sitadèl Laferyè?' },
    options: [{ ht: 'Alexandre Pétion' }, { ht: 'Henri Christophe' }, { ht: 'Toussaint Louverture' }, { ht: 'Jean-Pierre Boyer' }], answer: 1,
    explain: { ht: 'Henri Christophe te fè bati Sitadèl la nan Nò, apre endepandans lan.' },
  },
  {
    id: 'ist-003', category: 'istwa', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Ki dat Batay Vètyè a te fèt?' },
    options: [{ ht: '18 me 1803' }, { ht: '18 novanm 1803' }, { ht: '1ye janvye 1804' }, { ht: '22 out 1791' }], answer: 1,
    explain: { ht: 'Batay Vètyè, 18 novanm 1803, se dènye gwo batay anvan endepandans lan.' },
  },
  {
    id: 'ist-004', category: 'istwa', difficulty: 1, ages: ['6-8', '9-11'], status: 'approved',
    prompt: { ht: 'Ki koulè ki nan drapo Ayiti?' },
    options: [{ ht: 'Ble ak wouj' }, { ht: 'Vèt ak jòn' }, { ht: 'Nwa ak blan' }], answer: 0,
    explain: { ht: 'Drapo a gen ble anwo ak wouj anba, ak zam peyi a nan mitan.' },
    media: { kind: 'flag', ref: 'HT' },
  },
  {
    id: 'jeo-001', category: 'jewografi', difficulty: 1, ages: ['6-8', '9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Ki kapital Ayiti?' },
    options: [{ ht: 'Okap' }, { ht: 'Pòtoprens' }, { ht: 'Jakmèl' }, { ht: 'Gonayiv' }], answer: 1,
    explain: { ht: 'Pòtoprens se kapital la, nan depatman Lwès.' },
  },
  {
    id: 'jeo-002', category: 'jewografi', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Konbyen depatman Ayiti genyen?' },
    options: [{ ht: '8' }, { ht: '9' }, { ht: '10' }, { ht: '12' }], answer: 2,
    explain: { ht: 'Ayiti gen 10 depatman. Nip se dènye a yo te kreye, an 2003.' },
  },
  {
    id: 'dra-001', category: 'peyi', difficulty: 1, ages: ['6-8', '9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Ki peyi drapo sa a ye?' }, media: { kind: 'flag', ref: 'JM' },
    options: [{ ht: 'Bahamas' }, { ht: 'Jamayik' }, { ht: 'Babad' }, { ht: 'Sent Lisi' }], answer: 1,
    explain: { ht: 'Se drapo Jamayik. Kapital li se Kingston.' },
  },
  {
    id: 'dra-002', category: 'peyi', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Ki kapital Kiba?' },
    options: [{ ht: 'Santiago' }, { ht: 'Kingston' }, { ht: 'Lavàn' }, { ht: 'Nasò' }], answer: 2,
    explain: { ht: 'Lavàn se kapital Kiba.' },
  },
  {
    id: 'fom-001', category: 'peyi', difficulty: 1, ages: ['6-8', '9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Ki peyi sa a?' }, media: { kind: 'shape', ref: 'HT' },
    options: [{ ht: 'Ayiti' }, { ht: 'Kiba' }, { ht: 'Pòtoriko' }, { ht: 'Jamayik' }], answer: 0,
    explain: { ht: 'Ayiti sanble ak yon pens krab. Ti zile a se Lagonav.' },
  },
  {
    id: 'mat-001', category: 'matematik', difficulty: 1, ages: ['6-8'], status: 'approved',
    prompt: { ht: 'Konbyen 7 + 5 fè?' },
    options: [{ ht: '11' }, { ht: '12' }, { ht: '13' }], answer: 1,
  },
  {
    id: 'mat-002', category: 'matematik', difficulty: 2, ages: ['9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Konbyen 7 × 8 fè?' },
    options: [{ ht: '54' }, { ht: '56' }, { ht: '64' }, { ht: '48' }], answer: 1,
  },
  {
    id: 'sya-001', category: 'syans', difficulty: 1, ages: ['6-8', '9-11'], status: 'approved',
    prompt: { ht: 'Ki planèt nou rete sou li?' },
    options: [{ ht: 'Mas' }, { ht: 'Latè' }, { ht: 'Lalin' }], answer: 1,
  },
  {
    id: 'kil-001', category: 'kilti', difficulty: 1, ages: ['6-8', '9-11', '12-14'], status: 'approved',
    prompt: { ht: 'Ki manje Ayisyen manje 1ye janvye?' },
    options: [{ ht: 'Soup joumou' }, { ht: 'Diri kole' }, { ht: 'Pate kòde' }, { ht: 'Griyo' }], answer: 0,
    explain: { ht: 'Soup joumou se senbòl libète: esklav yo pa t gen dwa manje l.' },
  },
  {
    id: 'kil-002', category: 'kilti', difficulty: 2, ages: ['9-11', '12-14'], status: 'review',
    prompt: { ht: 'Ki vil yo rele "Vil Powèt yo"?' },
    options: [{ ht: 'Jeremi' }, { ht: 'Jakmèl' }, { ht: 'Okay' }], answer: 0,
  },
];

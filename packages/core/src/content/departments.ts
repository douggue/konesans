/**
 * Vwayaj Ayiti — the department pack: the 10 departments in journey order, their chef-lieu, kid-sized facts and
 * multiple-choice questions (one file per department in ./vwayaj/), plus "special" questions for the dated events.
 * Same style rules as content/bank/BRIEF.md (Kreyòl first, short sentences, only well-established facts).
 * Every question is `review` until a Haitian proofreader approves it in the admin panel.
 */
import type { LocalizedText, Question } from '../types.js';
import { build, type Raw, type DepartmentId, type DepSource } from './vwayaj/kit.js';
import { LWES } from './vwayaj/lwes.js';
import { SIDES } from './vwayaj/sides.js';
import { SID } from './vwayaj/sid.js';
import { GRANDANS } from './vwayaj/grandans.js';
import { NIP } from './vwayaj/nip.js';
import { SANT } from './vwayaj/sant.js';
import { LATIBONIT } from './vwayaj/latibonit.js';
import { NODWES } from './vwayaj/nodwes.js';
import { NO } from './vwayaj/no.js';
import { NODES } from './vwayaj/nodes.js';

export type { DepartmentId } from './vwayaj/kit.js';

export interface DepartmentPack {
  id: DepartmentId;
  name: LocalizedText;
  chefLieu: LocalizedText;
  facts: LocalizedText[];
  questions: Question[];
}

const pack = (s: DepSource): DepartmentPack => ({ id: s.id, name: s.name, chefLieu: s.chefLieu, facts: s.facts, questions: build(s.prefix, s.rows) });

/** The 10 departments, in journey order (= the map path in design/project/Map.dc.html). */
export const DEPARTMENTS: DepartmentPack[] = [LWES, SIDES, SID, GRANDANS, NIP, SANT, LATIBONIT, NODWES, NO, NODES].map(pack);

export const departmentById = (id: string): DepartmentPack | undefined => DEPARTMENTS.find((d) => d.id === id);

// ─── Event specials ("kesyon espesyal") ──────────────────────────────────────
const EV_VETYE: Raw[] = [
  [1, 'A', 'istwa', 'Ki moun ki te kòmandan an chèf lame endijèn nan nan Vètyè?', "Qui était le commandant en chef de l'armée indigène à Vertières ?",
    [['Kristòf Kolon', 'Christophe Colomb'], ['Jan-Jak Desalin', 'Jean-Jacques Dessalines'], ['Napoleyon', 'Napoléon']], 1,
    'Desalin te dirije lame endijèn nan; Kapwa Lamò ak lòt jeneral te goumen avè l.', "Dessalines dirigeait l'armée indigène ; Capois-la-Mort et d'autres généraux se battaient avec lui."],
  [1, 'A', 'istwa', 'Nan Vètyè, ki sa sòlda ayisyen yo te goumen pou li?', 'À Vertières, pour quoi les soldats haïtiens se battaient-ils ?',
    [['Pou libète ak endepandans', "Pour la liberté et l'indépendance"], ['Pou lò', "Pour de l'or"], ['Pou sik', 'Pour du sucre']], 0,
    'Apre Vètyè, lame fransè a kite peyi a e Ayiti vin lib.', "Après Vertières, l'armée française a quitté le pays et Haïti est devenue libre."],
  [2, 'B', 'moun', 'Ki ewo Vètyè ki te kontinye avanse ak sòlda l yo menm lè chwal li te tonbe?', 'Quel héros de Vertières a continué d\'avancer avec ses soldats même après la chute de son cheval ?',
    [['Kapwa Lamò', 'Capois-la-Mort'], ['Simon Bolivar', 'Simón Bolívar'], ['Jeneral Wochanbo', 'Le général Rochambeau']], 0,
    'Kouraj Kapwa Lamò te tèlman gran, menm lènmi l yo te salye l.', "Le courage de Capois-la-Mort était si grand que même ses ennemis l'ont salué."],
  [2, 'B', 'istwa', 'Ki jeneral fransè ki te rann tèt li apre batay Vètyè?', 'Quel général français a capitulé après la bataille de Vertières ?',
    [['Napoleyon', 'Napoléon'], ['Lafayèt', 'La Fayette'], ['Wochanbo', 'Rochambeau']], 2,
    'Wochanbo te dakò kite Sendomeng ak sòlda l yo apre batay la.', 'Rochambeau a accepté de quitter Saint-Domingue avec ses soldats après la bataille.'],
];
const EV_ENDEPANDANS: Raw[] = [
  [1, 'A', 'istwa', 'Ki sa non Tayino "Ayiti" vle di?', 'Que veut dire le nom taïno « Ayiti » ?',
    [['Tè ki gen anpil sab', 'Terre de sable'], ['Tè ki gen gwo mòn', 'Terre des hautes montagnes'], ['Tè ki gen anpil lanèj', 'Terre de neige']], 1,
    'Tayino yo te rele zile a Ayiti, "tè mòn wo". Desalin te reprann non sa a an 1804.', 'Les Taïnos appelaient l\'île Ayiti, « terre des hautes montagnes ». Dessalines a repris ce nom en 1804.'],
  [2, 'B', 'moun', 'Ki moun ki te ekri Ak Endepandans Ayiti a?', "Qui a rédigé l'Acte de l'Indépendance d'Haïti ?",
    [['Bwawon Tonnè', 'Boisrond-Tonnerre'], ['Tousen Louvèti', 'Toussaint Louverture'], ['Aleksann Petyon', 'Alexandre Pétion']], 0,
    'Bwawon Tonnè, sekretè Desalin, te ekri Ak la e li te li l nan Gonayiv.', "Boisrond-Tonnerre, secrétaire de Dessalines, a rédigé l'Acte et l'a lu aux Gonaïves."],
  [2, 'B', 'istwa', 'Ki peyi nan Amerik yo ki te vin endepandan anvan Ayiti?', 'Quel pays des Amériques est devenu indépendant avant Haïti ?',
    [['Brezil', 'Le Brésil'], ['Kiba', 'Cuba'], ['Etazini', 'Les États-Unis']], 2,
    'Ayiti se dezyèm peyi endepandan nan Amerik yo, apre Etazini, e premye repiblik nwa sou latè.', 'Haïti est le deuxième pays indépendant des Amériques, après les États-Unis, et la première république noire du monde.'],
  [3, 'C', 'istwa', 'Ki tit Desalin te pran an janvye 1804, anvan li vin anperè?', 'Quel titre Dessalines a-t-il pris en janvier 1804, avant de devenir empereur ?',
    [['Wa', 'Roi'], ['Gouvènè jeneral', 'Gouverneur général'], ['Prezidan', 'Président']], 1,
    'Desalin te vin gouvènè jeneral an janvye 1804; pita nan menm ane a li vin anperè.', "Dessalines devient gouverneur général en janvier 1804 ; plus tard la même année, il devient empereur."],
];
const EV_ZANSET: Raw[] = [
  [1, 'A', 'istwa', 'Jou Zansèt, 2 janvye, nou onore ki moun?', 'Le Jour des Aïeux, le 2 janvier, qui honore-t-on ?',
    [['Jwè foutbòl yo', 'Les footballeurs'], ['Ewo ki te goumen pou endepandans lan', "Les héros qui ont lutté pour l'indépendance"], ['Atis kanaval yo', 'Les artistes du carnaval']], 1,
    'Jou Zansèt, nou di mèsi a tout fanm ak gason ki te goumen pou n te lib.', 'Le Jour des Aïeux, on remercie toutes les femmes et tous les hommes qui ont lutté pour notre liberté.'],
  [2, 'B', 'moun', 'Ki ewo yo rele "Prekisè" endepandans lan?', "Quel héros appelle-t-on le « Précurseur » de l'indépendance ?",
    [['Tousen Louvèti', 'Toussaint Louverture'], ['Anri Kristòf', 'Henri Christophe'], ['Aleksann Petyon', 'Alexandre Pétion']], 0,
    'Tousen Louvèti te ouvri chemen libète a anvan 1804.', 'Toussaint Louverture a ouvert le chemin de la liberté avant 1804.'],
  [2, 'B', 'moun', 'Ki fanm vanyan ki te lyetnan nan lame endijèn nan?', "Quelle femme courageuse était lieutenant dans l'armée indigène ?",
    [['Anakawona', 'Anacaona'], ['Katrin Flon', 'Catherine Flon'], ['Sanite Belè', 'Sanité Bélair']], 2,
    'Sanite Belè se youn nan gwo ewo fanm revolisyon ayisyen an.', "Sanité Bélair est l'une des grandes héroïnes de la révolution haïtienne."],
  [3, 'C', 'istwa', 'Nan ki fò an Frans Tousen Louvèti te mouri, an 1803?', 'Dans quel fort, en France, Toussaint Louverture est-il mort en 1803 ?',
    [['Fò Jou', 'Le fort de Joux'], ['Sitadèl Laferyè', 'La Citadelle Laferrière'], ['Fò Dofen', 'Le fort Dauphin']], 0,
    'Fransè yo te fèmen Tousen nan Fò Jou, nan mòn Jura; li mouri la an 1803.', 'Les Français ont enfermé Toussaint au fort de Joux, dans le Jura ; il y est mort en 1803.'],
];
const EV_DRAPO: Raw[] = [
  [1, 'A', 'moun', 'Ki fanm ki te koud premye drapo ble ak wouj la?', 'Quelle femme a cousu le premier drapeau bleu et rouge ?',
    [['Katrin Flon', 'Catherine Flon'], ['Anakawona', 'Anacaona'], ['Mari Jàn Lamatinyè', 'Marie-Jeanne Lamartinière']], 0,
    'Katrin Flon te koud de bann ble ak wouj yo ansanm nan Akayè, 18 me 1803.', "Catherine Flon a cousu ensemble les bandes bleue et rouge à l'Arcahaie, le 18 mai 1803."],
  [2, 'B', 'istwa', 'Ki deviz ki ekri sou blazon drapo Ayiti?', "Quelle devise est écrite sur les armoiries du drapeau d'Haïti ?",
    [['Libète, Egalite, Fratènite', 'Liberté, Égalité, Fraternité'], ['Linyon fè lafòs', "L'union fait la force"], ['Ann avanse', 'En avant']], 1,
    '"Linyon fè lafòs" vle di ansanm nou pi fò.', "« L'union fait la force » : ensemble, nous sommes plus forts."],
  [2, 'B', 'istwa', 'Ki pye bwa ki nan mitan blazon drapo a?', 'Quel arbre est au centre des armoiries du drapeau ?',
    [['Pye mango', 'Le manguier'], ['Palmis', 'Le palmier'], ['Pye kokoye', 'Le cocotier']], 1,
    'Yon palmis ak yon bonèt libète sou tèt li kanpe nan mitan blazon an.', 'Un palmier coiffé du bonnet de la liberté se dresse au centre des armoiries.'],
  [2, 'B', 'istwa', 'Ki koulè Desalin te retire nan drapo fransè a pou fè drapo ayisyen an?', 'Quelle couleur Dessalines a-t-il retirée du drapeau français pour faire le drapeau haïtien ?',
    [['Ble', 'Le bleu'], ['Wouj', 'Le rouge'], ['Blan', 'Le blanc']], 2,
    'Desalin te chire blan an epi kenbe ble ak wouj la, pou montre Ayisyen yo ini.', 'Dessalines a déchiré le blanc et gardé le bleu et le rouge, pour montrer l\'union des Haïtiens.'],
];

/** Special questions mixed into runs on an event day, keyed by event id (see modules/vwayaj.ts). */
export const EVENT_QUESTIONS: Record<string, Question[]> = {
  vetye: build('ev-vetye', EV_VETYE),
  endepandans: build('ev-endep', EV_ENDEPANDANS),
  zanset: build('ev-zanset', EV_ZANSET),
  'jou-drapo': build('ev-drapo', EV_DRAPO),
};

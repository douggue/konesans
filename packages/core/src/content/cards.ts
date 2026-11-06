/**
 * "Kat Ewo" — collectible cards of Haitian heroes (design/project/Heroes.dc.html).
 * The kid wins one after every finished defi; a weekly mission always gives an unowned Lejand card.
 *
 * Content rules: only well-established facts (checked against standard references), kid-appropriate wording,
 * no portraits of real people (the card front is initials on a colour block), no living politicians.
 * Where history rests on tradition (Catherine Flon's flag, Capois at Vertières) the text says so.
 */
import type { LocalizedText } from '../types.js';

export type CardRarity = 'komen' | 'ra' | 'lejand';
/** rev = Revolution era (1791–1806, incl. its generals' later rule); apre = after independence */
export type HeroEra = 'rev' | 'apre';

export interface HeroCard {
  id: string;
  /** full name */
  name: string;
  /** short name for the small grid card */
  short: string;
  /** initials shown on the card front (no portraits) */
  mono: string;
  /** card colour (white text must stay readable on it) */
  color: string;
  era: HeroEra;
  woman: boolean;
  rarity: CardRarity;
  /** dates as shown on the card ("1758 – 1806", "anviwon 1743 – 1803", or a key year) */
  years: LocalizedText;
  /** one line: who they were */
  role: LocalizedText;
  /** why they matter */
  why: LocalizedText;
  /** exactly 3 short facts */
  facts: LocalizedText[];
}

export const HERO_CARDS: HeroCard[] = [
  // ─── Revolution era ─────────────────────────────────────────────────────────
  {
    id: 'dessalines', name: 'Jean-Jacques Dessalines', short: 'Dessalines', mono: 'JD', color: '#1F47B5', era: 'rev', woman: false, rarity: 'lejand',
    years: { ht: '1758 – 1806', fr: '1758 – 1806' },
    role: { ht: 'Papa Lendepandans Ayiti', fr: "Père de l'indépendance d'Haïti" },
    why: { ht: 'Gras a li, Ayiti te vin premye peyi lib ansyen esklav te fonde.', fr: 'Grâce à lui, Haïti est devenu le premier pays libre fondé par d’anciens esclaves.' },
    facts: [
      { ht: 'Li te deklare endepandans Ayiti 1ye janvye 1804, nan Gonayiv.', fr: 'Il a proclamé l’indépendance d’Haïti le 1er janvier 1804, aux Gonaïves.' },
      { ht: 'Se li ki te chèf Lame Endijèn ki te genyen batay Vètyè, 18 novanm 1803.', fr: 'Il commandait l’Armée indigène qui a gagné la bataille de Vertières, le 18 novembre 1803.' },
      { ht: 'Im nasyonal Ayiti a rele «La Dessalinienne» an lonè li.', fr: 'L’hymne national d’Haïti s’appelle « La Dessalinienne » en son honneur.' },
    ],
  },
  {
    id: 'toussaint', name: 'Toussaint Louverture', short: 'Toussaint', mono: 'TL', color: '#D21034', era: 'rev', woman: false, rarity: 'lejand',
    years: { ht: 'anviwon 1743 – 1803', fr: 'vers 1743 – 1803' },
    role: { ht: 'Gran lidè Revolisyon Ayisyen an', fr: 'Grand chef de la Révolution haïtienne' },
    why: { ht: 'Li te montre ansyen esklav yo te kapab dirije epi defann libète yo.', fr: 'Il a montré que d’anciens esclaves pouvaient diriger et défendre leur liberté.' },
    facts: [
      { ht: 'Li te fèt esklav nan Sen Domeng, epi li te vin jeneral, apre sa gouvènè koloni an.', fr: 'Né esclave à Saint-Domingue, il est devenu général, puis gouverneur de la colonie.' },
      { ht: 'An 1801, li te bay koloni an yon konstitisyon ki di pa gen esklavaj ankò.', fr: 'En 1801, il a donné à la colonie une constitution qui interdisait l’esclavage.' },
      { ht: 'Fransè yo te arete l an 1802; li mouri an Frans, nan fò Joux, an 1803.', fr: 'Arrêté par les Français en 1802, il est mort en France, au fort de Joux, en 1803.' },
    ],
  },
  {
    id: 'christophe', name: 'Henri Christophe', short: 'Christophe', mono: 'HC', color: '#B5651D', era: 'rev', woman: false, rarity: 'lejand',
    years: { ht: '1767 – 1820', fr: '1767 – 1820' },
    role: { ht: 'Wa ki te bati Sitadèl la', fr: 'Le roi bâtisseur de la Citadelle' },
    why: { ht: 'Sitadèl la se yon gwo senbòl fyète ak fòs pèp ayisyen an.', fr: 'La Citadelle est un grand symbole de la fierté et de la force du peuple haïtien.' },
    facts: [
      { ht: 'Li te youn nan jeneral Revolisyon an, epi li te dirije Nò peyi a apre 1806.', fr: 'Général de la Révolution, il a dirigé le Nord du pays après 1806.' },
      { ht: 'Soti 1811 rive 1820, li te wa nan Nò, ak non Henri 1ye.', fr: 'De 1811 à 1820, il a été roi du Nord sous le nom d’Henri Ier.' },
      { ht: 'Li te fè bati Sitadèl Laferyè ak Palè Sans-Souci: depi 1982, se Patrimwàn Mondyal UNESCO.', fr: 'Il a fait bâtir la Citadelle Laferrière et le palais Sans-Souci, au patrimoine mondial de l’UNESCO depuis 1982.' },
    ],
  },
  {
    id: 'petion', name: 'Alexandre Pétion', short: 'Pétion', mono: 'AP', color: '#1864AB', era: 'rev', woman: false, rarity: 'lejand',
    years: { ht: '1770 – 1818', fr: '1770 – 1818' },
    role: { ht: 'Prezidan ki te ede Bolívar', fr: 'Le président qui a aidé Bolívar' },
    why: { ht: 'Li te mande Bolívar pou l libere esklav yo nan peyi l t ap libere yo.', fr: 'Il a demandé à Bolívar de libérer les esclaves des pays qu’il allait libérer.' },
    facts: [
      { ht: 'Li te goumen nan Revolisyon an, epi li te prezidan Repiblik la soti 1807 rive 1818.', fr: 'Il a combattu pendant la Révolution, puis a été président de la République de 1807 à 1818.' },
      { ht: 'An 1815–1816, li te bay Simón Bolívar refij, zam ak bato pou libere peyi Amerik di Sid yo.', fr: 'En 1815-1816, il a donné à Simón Bolívar refuge, armes et navires pour libérer l’Amérique du Sud.' },
      { ht: 'Li te separe tè yo pou bay sòlda ak peyizan.', fr: 'Il a distribué des terres aux soldats et aux paysans.' },
    ],
  },
  {
    id: 'capois', name: 'François Capois (Capois-La-Mort)', short: 'Capois-La-Mort', mono: 'CM', color: '#14213D', era: 'rev', woman: false, rarity: 'ra',
    years: { ht: '1766 – 1806', fr: '1766 – 1806' },
    role: { ht: 'Ewo batay Vètyè', fr: 'Héros de Vertières' },
    why: { ht: 'Viktwa Vètyè a te louvri chemen pou endepandans 1ye janvye 1804.', fr: 'La victoire de Vertières a ouvert la voie à l’indépendance du 1er janvier 1804.' },
    facts: [
      { ht: 'Nan batay Vètyè, 18 novanm 1803, li te mennen sòlda l yo atake plizyè fwa.', fr: 'À Vertières, le 18 novembre 1803, il a mené ses soldats à l’assaut plusieurs fois.' },
      { ht: 'Yon boulèt touye chwal li, yon bal fè chapo l vole, men li kontinye ap rele: «Annavan! Annavan!»', fr: 'Un boulet a tué son cheval, une balle a emporté son chapeau, mais il criait encore : « En avant ! En avant ! »' },
      { ht: 'Dapre istwa a, menm sòlda fransè yo te sispann tire yon ti moman pou salye kouraj li.', fr: 'Selon le récit, même les soldats français ont cessé de tirer un moment pour saluer son courage.' },
    ],
  },
  {
    id: 'flon', name: 'Catherine Flon', short: 'Catherine Flon', mono: 'CF', color: '#0E7C86', era: 'rev', woman: true, rarity: 'ra',
    years: { ht: '1803 · Akayè', fr: '1803 · Arcahaie' },
    role: { ht: 'Fanm ki te koud premye drapo a', fr: 'La femme qui a cousu le premier drapeau' },
    why: { ht: 'Drapo ble e wouj la vin senbòl inite pèp ayisyen an.', fr: 'Le drapeau bleu et rouge est devenu le symbole de l’unité du peuple haïtien.' },
    facts: [
      { ht: 'Dapre tradisyon an, se li ki te koud premye drapo ble e wouj la, nan Akayè, 18 me 1803.', fr: 'Selon la tradition, c’est elle qui a cousu le premier drapeau bleu et rouge, à l’Arcahaie, le 18 mai 1803.' },
      { ht: 'Yo rakonte Dessalines te retire ban blan an nan drapo fransè a, epi li te koud ble a ak wouj la ansanm.', fr: 'On raconte que Dessalines a retiré la bande blanche du drapeau français, et qu’elle a cousu le bleu et le rouge ensemble.' },
      { ht: 'Chak 18 me, Ayiti fete Jou Drapo ak Inivèsite.', fr: 'Chaque 18 mai, Haïti célèbre la Fête du Drapeau et de l’Université.' },
    ],
  },
  {
    id: 'belair', name: 'Sanite Bélair', short: 'Sanite Bélair', mono: 'SB', color: '#5B3FB5', era: 'rev', woman: true, rarity: 'ra',
    years: { ht: 'anviwon 1781 – 1802', fr: 'vers 1781 – 1802' },
    role: { ht: 'Lyetnan nan lame revolisyonè a', fr: 'Lieutenante de l’armée révolutionnaire' },
    why: { ht: 'Li te rete kouraje jouk nan dènye moman l, pou libète.', fr: 'Elle est restée courageuse jusqu’au bout, pour la liberté.' },
    facts: [
      { ht: 'Li te fèt Verèt, epi li te monte soti sèjan rive lyetnan nan lame Toussaint Louverture.', fr: 'Née aux Verrettes, elle est passée de sergente à lieutenante dans l’armée de Toussaint Louverture.' },
      { ht: 'An 1802, li te goumen bò kote mari l, Charles Bélair, kont lame fransè a.', fr: 'En 1802, elle a combattu aux côtés de son mari, Charles Bélair, contre l’armée française.' },
      { ht: 'An 2004, pòtre l te parèt sou biyè 10 goud la, pou 200 an endepandans lan.', fr: 'En 2004, son portrait figurait sur le billet de 10 gourdes, pour le bicentenaire de l’indépendance.' },
    ],
  },
  {
    id: 'lamartiniere', name: 'Marie-Jeanne Lamartinière', short: 'Marie-Jeanne', mono: 'ML', color: '#17803F', era: 'rev', woman: true, rarity: 'ra',
    years: { ht: '1802 · Krèt-a-Pyewo', fr: '1802 · Crête-à-Pierrot' },
    role: { ht: 'Ewo batay Krèt-a-Pyewo', fr: 'Héroïne de la Crête-à-Pierrot' },
    why: { ht: 'Li montre fanm yo te goumen tou pou libète Ayiti.', fr: 'Elle montre que les femmes ont aussi combattu pour la liberté d’Haïti.' },
    facts: [
      { ht: 'An mas 1802, li te nan fò Krèt-a-Pyewo, kote lame endijèn nan te reziste kont yon gwo lame fransè.', fr: 'En mars 1802, elle était au fort de la Crête-à-Pierrot, où l’armée indigène a résisté à une grande armée française.' },
      { ht: 'Li te distribye katouch, chaje kanon epi goumen sou premye liy lan.', fr: 'Elle distribuait des cartouches, chargeait les canons et combattait en première ligne.' },
      { ht: 'Li te swaye blese yo tou, pandan batay la t ap fèt.', fr: 'Elle soignait aussi les blessés pendant la bataille.' },
    ],
  },
  {
    id: 'felicite', name: 'Marie-Claire Heureuse Félicité', short: 'Marie-Claire', mono: 'MC', color: '#D6336C', era: 'rev', woman: true, rarity: 'ra',
    years: { ht: '1758 – 1858', fr: '1758 – 1858' },
    role: { ht: 'Fanm ki te bay manje ak swen', fr: 'La femme qui nourrissait et soignait' },
    why: { ht: 'Li montre bonte ak pitye se yon fòm kouraj tou.', fr: 'Elle montre que la bonté est aussi une forme de courage.' },
    facts: [
      { ht: 'Pandan syèj Jakmèl, an 1800, li te mennen fanm ak timoun pote manje ak remèd bay moun ki te grangou ak blese.', fr: 'Pendant le siège de Jacmel, en 1800, elle a mené femmes et enfants pour apporter nourriture et remèdes aux affamés et aux blessés.' },
      { ht: 'Li te swaye blese ak prizonye, menm sa ki te nan lòt kan an.', fr: 'Elle soignait les blessés et les prisonniers, même ceux du camp adverse.' },
      { ht: 'Se te madanm Dessalines, epi li te viv jiska 100 an.', fr: 'Épouse de Dessalines, elle a vécu jusqu’à 100 ans.' },
    ],
  },
  {
    id: 'boukman', name: 'Dutty Boukman', short: 'Boukman', mono: 'DB', color: '#A61E4D', era: 'rev', woman: false, rarity: 'komen',
    years: { ht: '? – 1791', fr: '? – 1791' },
    role: { ht: 'Youn nan premye chèf soulèvman 1791 la', fr: 'L’un des premiers chefs du soulèvement de 1791' },
    why: { ht: 'Soulèvman sa a te kòmanse batay ki te mennen nan endepandans 1804.', fr: 'Ce soulèvement a lancé la lutte qui a mené à l’indépendance de 1804.' },
    facts: [
      { ht: 'Li te fèt an Afrik; yo te mennen l esklav nan Sen Domeng.', fr: 'Né en Afrique, il a été emmené en esclavage à Saint-Domingue.' },
      { ht: 'Nan mwa out 1791, li te youn nan moun ki te dirije gwo rasanbleman Bwa Kayiman an.', fr: 'En août 1791, il a été l’un des meneurs du grand rassemblement du Bois-Caïman.' },
      { ht: 'Lannwit 22 out 1791, li te mennen soulèvman esklav yo nan Nò: se kòmansman Revolisyon Ayisyen an.', fr: 'Dans la nuit du 22 août 1791, il a mené le soulèvement des esclaves du Nord : le début de la Révolution haïtienne.' },
    ],
  },
  // ─── After independence ─────────────────────────────────────────────────────
  {
    id: 'peralte', name: 'Charlemagne Péralte', short: 'Péralte', mono: 'CP', color: '#5C940D', era: 'apre', woman: false, rarity: 'ra',
    years: { ht: '1885 – 1919', fr: '1885 – 1919' },
    role: { ht: 'Ewo rezistans kont okipasyon an', fr: 'Héros de la résistance contre l’occupation' },
    why: { ht: 'Jodi a li se yon senbòl moun ki defann libète peyi yo.', fr: 'Il est aujourd’hui un symbole de la défense de la liberté du pays.' },
    facts: [
      { ht: 'Li te fèt Ench (Hinche) an 1885.', fr: 'Il est né à Hinche en 1885.' },
      { ht: 'Soti 1917 rive 1919, li te dirije kako yo ki t ap goumen kont okipasyon ameriken an (1915–1934).', fr: 'De 1917 à 1919, il a dirigé les Cacos qui combattaient l’occupation américaine (1915-1934).' },
      { ht: 'Pòtre l parèt sou pyès monnen ak tenm ayisyen.', fr: 'Son portrait figure sur des pièces de monnaie et des timbres haïtiens.' },
    ],
  },
  {
    id: 'firmin', name: 'Anténor Firmin', short: 'Firmin', mono: 'AF', color: '#3B5BDB', era: 'apre', woman: false, rarity: 'ra',
    years: { ht: '1850 – 1911', fr: '1850 – 1911' },
    role: { ht: 'Savan ki te montre tout ras egal', fr: 'Le savant de l’égalité des races' },
    why: { ht: 'Li te defann diyite pèp nwa yo ak lide syantifik.', fr: 'Il a défendu la dignité des peuples noirs avec des arguments scientifiques.' },
    facts: [
      { ht: 'Li te fèt Okap (Cap-Haïtien) an 1850.', fr: 'Il est né au Cap-Haïtien en 1850.' },
      { ht: 'An 1885, li te pibliye liv «De l\'égalité des races humaines»: tout ras moun egal.', fr: 'En 1885, il a publié « De l’égalité des races humaines » : toutes les races humaines sont égales.' },
      { ht: 'Li te patisipe nan premye Konferans Panafriken an, nan Lond, an 1900.', fr: 'Il a participé à la première Conférence panafricaine, à Londres, en 1900.' },
    ],
  },
  {
    id: 'cator', name: 'Silvio Cator', short: 'Silvio Cator', mono: 'SC', color: '#099268', era: 'apre', woman: false, rarity: 'ra',
    years: { ht: '1900 – 1952', fr: '1900 – 1952' },
    role: { ht: 'Chanpyon long so', fr: 'Champion du saut en longueur' },
    why: { ht: 'Li te montre talan Ayiti devan tout monn lan.', fr: 'Il a montré le talent d’Haïti au monde entier.' },
    facts: [
      { ht: 'Nan Jwèt Olenpik Amstèdam yo, an 1928, li te genyen meday ajan nan long so.', fr: 'Aux Jeux olympiques d’Amsterdam, en 1928, il a gagné la médaille d’argent au saut en longueur.' },
      { ht: 'Menm ane a, li te bat rekò mondyal la: 7,93 mèt!', fr: 'La même année, il a battu le record du monde : 7,93 mètres !' },
      { ht: 'Gwo estad Pòtoprens lan pote non l: Estad Sylvio Cator.', fr: 'Le grand stade de Port-au-Prince porte son nom : le stade Sylvio-Cator.' },
    ],
  },
  {
    id: 'durand', name: 'Oswald Durand', short: 'Oswald Durand', mono: 'OD', color: '#D9480F', era: 'apre', woman: false, rarity: 'komen',
    years: { ht: '1840 – 1906', fr: '1840 – 1906' },
    role: { ht: 'Powèt nasyonal', fr: 'Poète national' },
    why: { ht: 'Li te montre lang kreyòl la ka bay bèl powezi.', fr: 'Il a montré que le créole peut donner de la belle poésie.' },
    facts: [
      { ht: 'An 1883, li te ekri «Choucoune», youn nan powèm kreyòl ki pi popilè.', fr: 'En 1883, il a écrit « Choucoune », l’un des poèmes en créole les plus célèbres.' },
      { ht: 'Yo te mete powèm nan an mizik; melodi a te vin chante «Yellow Bird» ki fè wonn latè.', fr: 'Le poème a été mis en musique ; sa mélodie est devenue la chanson « Yellow Bird », connue dans le monde entier.' },
      { ht: 'Anpil moun konsidere l kòm powèt nasyonal Ayiti.', fr: 'Beaucoup le considèrent comme le poète national d’Haïti.' },
    ],
  },
  {
    id: 'lherisson', name: 'Justin Lhérisson', short: 'Lhérisson', mono: 'JL', color: '#C76A00', era: 'apre', woman: false, rarity: 'komen',
    years: { ht: '1873 – 1907', fr: '1873 – 1907' },
    role: { ht: 'Otè pawòl im nasyonal la', fr: 'Auteur des paroles de l’hymne national' },
    why: { ht: 'Chak fwa nou chante im nasyonal la, nou chante pawòl li yo.', fr: 'Chaque fois qu’on chante l’hymne national, on chante ses paroles.' },
    facts: [
      { ht: 'An 1903, li te ekri pawòl «La Dessalinienne» pou 100 an endepandans lan.', fr: 'En 1903, il a écrit les paroles de « La Dessalinienne » pour le centenaire de l’indépendance.' },
      { ht: 'Nicolas Geffrard te konpoze mizik la; se im nasyonal Ayiti depi 1904.', fr: 'Nicolas Geffrard en a composé la musique ; c’est l’hymne national d’Haïti depuis 1904.' },
      { ht: 'Li te avoka, pwofesè ak jounalis, epi li te ekri woman «La Famille des Pitite-Caille».', fr: 'Avocat, professeur et journaliste, il a écrit le roman « La Famille des Pitite-Caille ».' },
    ],
  },
  {
    id: 'pricemars', name: 'Jean Price-Mars', short: 'Price-Mars', mono: 'JP', color: '#5F3DC4', era: 'apre', woman: false, rarity: 'komen',
    years: { ht: '1876 – 1969', fr: '1876 – 1969' },
    role: { ht: 'Doktè ak ekriven kilti ayisyen', fr: 'Médecin et écrivain de la culture haïtienne' },
    why: { ht: 'Li te ankouraje Ayisyen yo pou yo fyè de pwòp kilti yo.', fr: 'Il a encouragé les Haïtiens à être fiers de leur propre culture.' },
    facts: [
      { ht: 'Li te doktè, pwofesè, ekriven ak diplomat.', fr: 'Il était médecin, professeur, écrivain et diplomate.' },
      { ht: 'An 1928, li te pibliye liv «Ainsi parla l\'oncle».', fr: 'En 1928, il a publié le livre « Ainsi parla l’oncle ».' },
      { ht: 'Nan liv sa a, li montre kont, chante ak tradisyon pèp ayisyen an gen anpil valè.', fr: 'Dans ce livre, il montre la grande valeur des contes, des chants et des traditions du peuple haïtien.' },
    ],
  },
  {
    id: 'comhaire', name: 'Suzanne Comhaire-Sylvain', short: 'Suzanne Sylvain', mono: 'SS', color: '#0B7285', era: 'apre', woman: true, rarity: 'komen',
    years: { ht: '1898 – 1975', fr: '1898 – 1975' },
    role: { ht: 'Premye fanm antwopològ ayisyen', fr: 'Première femme anthropologue haïtienne' },
    why: { ht: 'Li te montre kreyòl se yon vrè lang, ak pwòp gramè li.', fr: 'Elle a montré que le créole est une vraie langue, avec sa propre grammaire.' },
    facts: [
      { ht: 'Li te premye fanm ayisyen ki te vin antwopològ (moun ki etidye kilti moun).', fr: 'Elle a été la première femme haïtienne anthropologue (spécialiste des cultures humaines).' },
      { ht: 'An 1936, li te pibliye youn nan premye gwo etid sou gramè kreyòl ayisyen an.', fr: 'En 1936, elle a publié l’une des premières grandes études sur la grammaire du créole haïtien.' },
      { ht: 'Li te ranmase anpil kont ayisyen pou yo pa pèdi.', fr: 'Elle a recueilli de nombreux contes haïtiens pour qu’ils ne se perdent pas.' },
    ],
  },
  {
    id: 'bouchereau', name: 'Madeleine Sylvain-Bouchereau', short: 'Madeleine Sylvain', mono: 'MB', color: '#AE3EC9', era: 'apre', woman: true, rarity: 'komen',
    years: { ht: '1905 – 1970', fr: '1905 – 1970' },
    role: { ht: 'Pyonyè dwa fanm an Ayiti', fr: 'Pionnière des droits des femmes en Haïti' },
    why: { ht: 'Li te goumen pou fanm yo gen menm dwa ak gason, tankou dwa pou vote.', fr: 'Elle s’est battue pour que les femmes aient les mêmes droits que les hommes, comme le droit de vote.' },
    facts: [
      { ht: 'An 1934, li te youn nan fondatè Lig Feminin Aksyon Sosyal, premye òganizasyon feminis ki te anrejistre an Ayiti.', fr: 'En 1934, elle a cofondé la Ligue féminine d’action sociale, la première organisation féministe enregistrée en Haïti.' },
      { ht: 'An 1941, li te fini yon doktora nan sosyoloji, Ozetazini.', fr: 'En 1941, elle a obtenu un doctorat en sociologie, aux États-Unis.' },
      { ht: 'Se te sè Suzanne Comhaire-Sylvain.', fr: 'C’était la sœur de Suzanne Comhaire-Sylvain.' },
    ],
  },
  {
    id: 'gaetjens', name: 'Joe Gaetjens', short: 'Joe Gaetjens', mono: 'JG', color: '#364FC7', era: 'apre', woman: false, rarity: 'komen',
    years: { ht: '1924 – 1964', fr: '1924 – 1964' },
    role: { ht: 'Foutbolè ki te bat Angletè', fr: 'Le footballeur qui a battu l’Angleterre' },
    why: { ht: 'Gòl li a rete youn nan pi gwo sipriz nan istwa Koup di Monn.', fr: 'Son but reste l’une des plus grandes surprises de l’histoire de la Coupe du monde.' },
    facts: [
      { ht: 'Li te fèt Pòtoprens an 1924.', fr: 'Il est né à Port-au-Prince en 1924.' },
      { ht: 'Nan Koup di Monn 1950, nan Brezil, li te make sèl gòl match Etazini 1, Angletè 0.', fr: 'À la Coupe du monde 1950, au Brésil, il a marqué le seul but du match États-Unis 1, Angleterre 0.' },
      { ht: 'Li te jwe pou ekip nasyonal Ayiti tou.', fr: 'Il a aussi joué pour l’équipe nationale d’Haïti.' },
    ],
  },
  {
    id: 'sanon', name: 'Emmanuel «Manno» Sanon', short: 'Manno Sanon', mono: 'MS', color: '#C92A2A', era: 'apre', woman: false, rarity: 'komen',
    years: { ht: '1951 – 2008', fr: '1951 – 2008' },
    role: { ht: 'Gòlè Ayiti nan Koup di Monn 1974', fr: 'Buteur d’Haïti à la Coupe du monde 1974' },
    why: { ht: 'Li rete youn nan pi gwo foutbolè nan istwa Ayiti.', fr: 'Il reste l’un des plus grands footballeurs de l’histoire d’Haïti.' },
    facts: [
      { ht: 'An 1974, Ayiti te jwe premye Koup di Monn li, an Almay.', fr: 'En 1974, Haïti a joué sa première Coupe du monde, en Allemagne.' },
      { ht: 'Li te make yon gòl kont Itali, 15 jen 1974, epi yon lòt kont Ajantin.', fr: 'Il a marqué un but contre l’Italie le 15 juin 1974, puis un autre contre l’Argentine.' },
      { ht: 'Gòl kont Itali a te kraze rekò gadyen Dino Zoff, ki pa t pran gòl depi 1 142 minit.', fr: 'Son but contre l’Italie a mis fin au record du gardien Dino Zoff, invaincu depuis 1 142 minutes.' },
    ],
  },
];

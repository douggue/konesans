/**
 * French names for the world table (content/world.ts): country, capital, plus the language and currency words.
 * Same capital choice as the Kreyòl table (e.g. Bolivia → Sucre, Côte d'Ivoire → Yamoussoukro, South Africa → Pretoria).
 */
export const WORLD_FR: Record<string, [name: string, capital: string]> = {
  // Caraïbes
  HT: ['Haïti', 'Port-au-Prince'], DO: ['République dominicaine', 'Saint-Domingue'], CU: ['Cuba', 'La Havane'], JM: ['Jamaïque', 'Kingston'],
  BS: ['Bahamas', 'Nassau'], TT: ['Trinité-et-Tobago', "Port-d'Espagne"], BB: ['Barbade', 'Bridgetown'], DM: ['Dominique', 'Roseau'],
  LC: ['Sainte-Lucie', 'Castries'], VC: ['Saint-Vincent-et-les-Grenadines', 'Kingstown'], GD: ['Grenade', "Saint-George's"],
  AG: ['Antigua-et-Barbuda', "Saint John's"], KN: ['Saint-Christophe-et-Niévès', 'Basseterre'],
  // Amérique du Nord et centrale
  US: ['États-Unis', 'Washington'], CA: ['Canada', 'Ottawa'], MX: ['Mexique', 'Mexico'], GT: ['Guatemala', 'Guatemala'], BZ: ['Belize', 'Belmopan'],
  HN: ['Honduras', 'Tegucigalpa'], SV: ['Salvador', 'San Salvador'], NI: ['Nicaragua', 'Managua'], CR: ['Costa Rica', 'San José'], PA: ['Panama', 'Panama'],
  // Amérique du Sud
  BR: ['Brésil', 'Brasilia'], AR: ['Argentine', 'Buenos Aires'], CL: ['Chili', 'Santiago'], CO: ['Colombie', 'Bogota'], PE: ['Pérou', 'Lima'],
  VE: ['Venezuela', 'Caracas'], EC: ['Équateur', 'Quito'], BO: ['Bolivie', 'Sucre'], PY: ['Paraguay', 'Asuncion'], UY: ['Uruguay', 'Montevideo'],
  GY: ['Guyana', 'Georgetown'], SR: ['Suriname', 'Paramaribo'],
  // Europe
  FR: ['France', 'Paris'], IT: ['Italie', 'Rome'], ES: ['Espagne', 'Madrid'], DE: ['Allemagne', 'Berlin'], GB: ['Royaume-Uni', 'Londres'],
  PT: ['Portugal', 'Lisbonne'], GR: ['Grèce', 'Athènes'], CH: ['Suisse', 'Berne'], BE: ['Belgique', 'Bruxelles'], NL: ['Pays-Bas', 'Amsterdam'],
  AT: ['Autriche', 'Vienne'], PL: ['Pologne', 'Varsovie'], RU: ['Russie', 'Moscou'], UA: ['Ukraine', 'Kiev'], SE: ['Suède', 'Stockholm'],
  NO: ['Norvège', 'Oslo'], DK: ['Danemark', 'Copenhague'], FI: ['Finlande', 'Helsinki'], IE: ['Irlande', 'Dublin'], IS: ['Islande', 'Reykjavik'],
  CZ: ['Tchéquie', 'Prague'], SK: ['Slovaquie', 'Bratislava'], HU: ['Hongrie', 'Budapest'], RO: ['Roumanie', 'Bucarest'], BG: ['Bulgarie', 'Sofia'],
  RS: ['Serbie', 'Belgrade'], HR: ['Croatie', 'Zagreb'], SI: ['Slovénie', 'Ljubljana'], BA: ['Bosnie-Herzégovine', 'Sarajevo'], ME: ['Monténégro', 'Podgorica'],
  MK: ['Macédoine du Nord', 'Skopje'], AL: ['Albanie', 'Tirana'], XK: ['Kosovo', 'Pristina'], MD: ['Moldavie', 'Chisinau'], BY: ['Biélorussie', 'Minsk'],
  LT: ['Lituanie', 'Vilnius'], LV: ['Lettonie', 'Riga'], EE: ['Estonie', 'Tallinn'], LU: ['Luxembourg', 'Luxembourg'], MT: ['Malte', 'La Valette'],
  CY: ['Chypre', 'Nicosie'], AD: ['Andorre', 'Andorre-la-Vieille'], MC: ['Monaco', 'Monaco'], SM: ['Saint-Marin', 'Saint-Marin'],
  LI: ['Liechtenstein', 'Vaduz'], VA: ['Vatican', 'Vatican'],
  // Afrique
  EG: ['Égypte', 'Le Caire'], ZA: ['Afrique du Sud', 'Pretoria'], NG: ['Nigeria', 'Abuja'], SN: ['Sénégal', 'Dakar'], KE: ['Kenya', 'Nairobi'],
  MA: ['Maroc', 'Rabat'], GH: ['Ghana', 'Accra'], BJ: ['Bénin', 'Porto-Novo'], ET: ['Éthiopie', 'Addis-Abeba'], DZ: ['Algérie', 'Alger'],
  TN: ['Tunisie', 'Tunis'], LY: ['Libye', 'Tripoli'], SD: ['Soudan', 'Khartoum'], SS: ['Soudan du Sud', 'Djouba'], CI: ["Côte d'Ivoire", 'Yamoussoukro'],
  ML: ['Mali', 'Bamako'], NE: ['Niger', 'Niamey'], TD: ['Tchad', "N'Djaména"], BF: ['Burkina Faso', 'Ouagadougou'], TG: ['Togo', 'Lomé'],
  GN: ['Guinée', 'Conakry'], GW: ['Guinée-Bissau', 'Bissau'], SL: ['Sierra Leone', 'Freetown'], LR: ['Liberia', 'Monrovia'], GM: ['Gambie', 'Banjul'],
  MR: ['Mauritanie', 'Nouakchott'], CV: ['Cap-Vert', 'Praia'], CM: ['Cameroun', 'Yaoundé'], CF: ['République centrafricaine', 'Bangui'],
  CG: ['Congo', 'Brazzaville'], CD: ['Congo (RDC)', 'Kinshasa'], GA: ['Gabon', 'Libreville'], GQ: ['Guinée équatoriale', 'Malabo'],
  ST: ['Sao Tomé-et-Principe', 'São Tomé'], AO: ['Angola', 'Luanda'], ZM: ['Zambie', 'Lusaka'], ZW: ['Zimbabwe', 'Harare'], MZ: ['Mozambique', 'Maputo'],
  MW: ['Malawi', 'Lilongwe'], TZ: ['Tanzanie', 'Dodoma'], UG: ['Ouganda', 'Kampala'], RW: ['Rwanda', 'Kigali'], BI: ['Burundi', 'Gitega'],
  SO: ['Somalie', 'Mogadiscio'], DJ: ['Djibouti', 'Djibouti'], ER: ['Érythrée', 'Asmara'], BW: ['Botswana', 'Gaborone'], NA: ['Namibie', 'Windhoek'],
  LS: ['Lesotho', 'Maseru'], SZ: ['Eswatini', 'Mbabane'], MG: ['Madagascar', 'Antananarivo'], MU: ['Maurice', 'Port-Louis'], SC: ['Seychelles', 'Victoria'],
  KM: ['Comores', 'Moroni'],
  // Asie
  CN: ['Chine', 'Pékin'], JP: ['Japon', 'Tokyo'], IN: ['Inde', 'New Delhi'], KR: ['Corée du Sud', 'Séoul'], KP: ['Corée du Nord', 'Pyongyang'],
  SA: ['Arabie saoudite', 'Riyad'], TR: ['Turquie', 'Ankara'], IR: ['Iran', 'Téhéran'], IQ: ['Irak', 'Bagdad'], IL: ['Israël', 'Jérusalem'],
  PS: ['Palestine', 'Ramallah'], JO: ['Jordanie', 'Amman'], LB: ['Liban', 'Beyrouth'], SY: ['Syrie', 'Damas'], AE: ['Émirats arabes unis', 'Abou Dabi'],
  QA: ['Qatar', 'Doha'], KW: ['Koweït', 'Koweït'], BH: ['Bahreïn', 'Manama'], OM: ['Oman', 'Mascate'], YE: ['Yémen', 'Sanaa'],
  AF: ['Afghanistan', 'Kaboul'], PK: ['Pakistan', 'Islamabad'], BD: ['Bangladesh', 'Dacca'], LK: ['Sri Lanka', 'Colombo'], NP: ['Népal', 'Katmandou'],
  BT: ['Bhoutan', 'Thimphou'], MV: ['Maldives', 'Malé'], MM: ['Birmanie', 'Naypyidaw'], TH: ['Thaïlande', 'Bangkok'], VN: ['Viêt Nam', 'Hanoï'],
  LA: ['Laos', 'Vientiane'], KH: ['Cambodge', 'Phnom Penh'], MY: ['Malaisie', 'Kuala Lumpur'], SG: ['Singapour', 'Singapour'], ID: ['Indonésie', 'Jakarta'],
  PH: ['Philippines', 'Manille'], BN: ['Brunei', 'Bandar Seri Begawan'], TL: ['Timor oriental', 'Dili'], MN: ['Mongolie', 'Oulan-Bator'],
  KZ: ['Kazakhstan', 'Astana'], UZ: ['Ouzbékistan', 'Tachkent'], TM: ['Turkménistan', 'Achgabat'], KG: ['Kirghizistan', 'Bichkek'],
  TJ: ['Tadjikistan', 'Douchanbé'], GE: ['Géorgie', 'Tbilissi'], AM: ['Arménie', 'Erevan'], AZ: ['Azerbaïdjan', 'Bakou'], TW: ['Taïwan', 'Taipei'],
  // Océanie
  AU: ['Australie', 'Canberra'], NZ: ['Nouvelle-Zélande', 'Wellington'], PG: ['Papouasie-Nouvelle-Guinée', 'Port Moresby'], FJ: ['Fidji', 'Suva'],
  SB: ['Îles Salomon', 'Honiara'], VU: ['Vanuatu', 'Port-Vila'], WS: ['Samoa', 'Apia'], TO: ['Tonga', "Nuku'alofa"], KI: ['Kiribati', 'Tarawa'],
  FM: ['Micronésie', 'Palikir'], MH: ['Îles Marshall', 'Majuro'], PW: ['Palaos', 'Ngerulmud'], NR: ['Nauru', 'Yaren'], TV: ['Tuvalu', 'Funafuti'],
};

/** Language names (Kreyòl → French). */
export const LANG_FR: Record<string, string> = {
  'Kreyòl': 'Créole', 'Panyòl': 'Espagnol', 'Angle': 'Anglais', 'Pòtigè': 'Portugais', 'Olandè': 'Néerlandais', 'Franse': 'Français', 'Italyen': 'Italien',
  'Alman': 'Allemand', 'Grèk': 'Grec', 'Polonè': 'Polonais', 'Ris': 'Russe', 'Ikrenyen': 'Ukrainien', 'Syedwa': 'Suédois', 'Nòvejyen': 'Norvégien',
  'Danwa': 'Danois', 'Fenwa': 'Finnois', 'Islandè': 'Islandais', 'Tchèk': 'Tchèque', 'Slovak': 'Slovaque', 'Ongwa': 'Hongrois', 'Woumen': 'Roumain',
  'Bilga': 'Bulgare', 'Sèb': 'Serbe', 'Kwoat': 'Croate', 'Sloven': 'Slovène', 'Bosnyak': 'Bosnien', 'Montenegren': 'Monténégrin', 'Masedonyen': 'Macédonien',
  'Albanè': 'Albanais', 'Byelorisyen': 'Biélorusse', 'Lityanyen': 'Lituanien', 'Lèt': 'Letton', 'Estonyen': 'Estonien', 'Liksanbougwa': 'Luxembourgeois',
  'Maltè': 'Maltais', 'Katalan': 'Catalan', 'Arab': 'Arabe', 'Zoulou': 'Zoulou', 'Wolòf': 'Wolof', 'Swahili': 'Swahili', 'Amarik': 'Amharique',
  'Kinyarwanda': 'Kinyarwanda', 'Kirundi': 'Kirundi', 'Somali': 'Somali', 'Tigrinya': 'Tigrigna', 'Sesoto': 'Sotho', 'Swati': 'Swati', 'Malgach': 'Malgache',
  'Kreyòl morisyen': 'Créole mauricien', 'Kreyòl seselwa': 'Créole seychellois', 'Komoryen': 'Comorien', 'Chinwa': 'Chinois', 'Japonè': 'Japonais',
  'Endi': 'Hindi', 'Koreyen': 'Coréen', 'Tik': 'Turc', 'Pèsan': 'Persan', 'Ebre': 'Hébreu', 'Pachto': 'Pachto', 'Ourdou': 'Ourdou', 'Bengali': 'Bengali',
  'Sengalè': 'Cingalais', 'Nepalè': 'Népalais', 'Dzongkha': 'Dzongkha', 'Divehi': 'Divehi', 'Bimàn': 'Birman', 'Tay': 'Thaï', 'Vyetnamyen': 'Vietnamien',
  'Lao': 'Lao', 'Khmè': 'Khmer', 'Malè': 'Malais', 'Endonezyen': 'Indonésien', 'Filipino': 'Filipino', 'Tetoum': 'Tétoum', 'Mongòl': 'Mongol',
  'Kazak': 'Kazakh', 'Ouzbèk': 'Ouzbek', 'Tikmèn': 'Turkmène', 'Kirgiz': 'Kirghize', 'Tadjik': 'Tadjik', 'Jeyòjyen': 'Géorgien', 'Amenyen': 'Arménien',
  'Azeri': 'Azéri', 'Tok Pisin': 'Tok pisin', 'Bislama': 'Bichelamar', 'Samoan': 'Samoan', 'Tongan': 'Tongien', 'Machalè': 'Marshallais',
  'Palawan': 'Paluan', 'Nawouan': 'Nauruan', 'Touvalouan': 'Tuvaluan',
};

/** Currency names (Kreyòl → French). */
export const CURRENCY_FR: Record<string, string> = {
  'Goud': 'Gourde', 'Peso': 'Peso', 'Dola jamayiken': 'Dollar jamaïcain', 'Dola bahameyen': 'Dollar bahaméen', 'Dola': 'Dollar',
  'Dola Karayib lès': 'Dollar des Caraïbes orientales', 'Dola ameriken': 'Dollar américain', 'Dola kanadyen': 'Dollar canadien', 'Ketsal': 'Quetzal',
  'Lenpira': 'Lempira', 'Kòdoba': 'Córdoba', 'Kolon': 'Colón', 'Balboa': 'Balboa', 'Real': 'Real', 'Sol': 'Sol', 'Bolivar': 'Bolivar',
  'Bolivyano': 'Boliviano', 'Gwarani': 'Guarani', 'Ewo': 'Euro', 'Liv': 'Livre sterling', 'Fran swis': 'Franc suisse', 'Zloti': 'Zloty', 'Roub': 'Rouble',
  'Rivnya': 'Hryvnia', 'Kouwòn': 'Couronne', 'Forint': 'Forint', 'Lè': 'Leu', 'Lèv': 'Lev', 'Dina': 'Dinar', 'Mak': 'Mark convertible', 'Lèk': 'Lek',
  'Liv ejipsyen': 'Livre égyptienne', 'Rand': 'Rand', 'Naira': 'Naira', 'Fran CFA': 'Franc CFA', 'Chelin': 'Shilling', 'Diram': 'Dirham', 'Sedi': 'Cedi',
  'Bir': 'Birr', 'Fran gineyen': 'Franc guinéen', 'Leyòn': 'Leone', 'Dalasi': 'Dalasi', 'Ougiya': 'Ouguiya', 'Eskoudo': 'Escudo', 'Fran kongolè': 'Franc congolais',
  'Dobra': 'Dobra', 'Kwanza': 'Kwanza', 'Kwacha': 'Kwacha', 'Metikal': 'Metical', 'Fran': 'Franc', 'Nakfa': 'Nakfa', 'Poula': 'Pula', 'Loti': 'Loti',
  'Lilangeni': 'Lilangeni', 'Aryari': 'Ariary', 'Roupi': 'Roupie', 'Yuan': 'Yuan', 'Yen': 'Yen', 'Won': 'Won', 'Riyal': 'Riyal', 'Chekèl': 'Shekel',
  'Afgani': 'Afghani', 'Taka': 'Taka', 'Ngoultroum': 'Ngultrum', 'Roufiya': 'Rufiyaa', 'Kyat': 'Kyat', 'Baht': 'Baht', 'Dong': 'Dong', 'Kip': 'Kip',
  'Riel': 'Riel', 'Ringit': 'Ringgit', 'Tougrik': 'Tugrik', 'Tenge': 'Tenge', 'Som': 'Som', 'Manat': 'Manat', 'Somoni': 'Somoni', 'Lari': 'Lari',
  'Dram': 'Dram', 'Dola ostralyen': 'Dollar australien', 'Kina': 'Kina', 'Vatou': 'Vatu', 'Tala': 'Tala', 'Paanga': 'Paʻanga',
};

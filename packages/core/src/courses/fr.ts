/**
 * French glosses for the courses, so a kid who uses the app in French learns English/Spanish from French.
 * Same ids as content.ts (concepts, sentences, units, lessons). Kreyòl stays in content.ts.
 */
export const CONCEPT_FR: Record<string, string> = {
  hello: 'Bonjour', good_evening: 'Bonsoir', good_night: 'Bonne nuit', goodbye: 'Au revoir', thanks: 'Merci', please: "S'il te plaît",
  yes: 'Oui', no: 'Non', how_are_you: 'Comment ça va ?', im_fine: 'Je vais bien', sorry: 'Pardon', my_name_is: "Je m'appelle…",
  nice_to_meet: 'Enchanté', welcome: 'Bienvenue', see_you: 'À plus tard',
  mother: 'Mère', father: 'Père', brother: 'Frère', sister: 'Sœur', grandmother: 'Grand-mère', grandfather: 'Grand-père', uncle: 'Oncle',
  aunt: 'Tante', child: 'Enfant', baby: 'Bébé', friend: 'Ami', family: 'Famille', cousin: 'Cousin',
  n1: 'Un', n2: 'Deux', n3: 'Trois', n4: 'Quatre', n5: 'Cinq', n6: 'Six', n7: 'Sept', n8: 'Huit', n9: 'Neuf', n10: 'Dix', n20: 'Vingt', n100: 'Cent',
  red: 'Rouge', blue: 'Bleu', yellow: 'Jaune', green: 'Vert', black: 'Noir', white: 'Blanc', orange: 'Orange', pink: 'Rose', purple: 'Violet',
  brown: 'Marron', gray: 'Gris',
  school: 'École', book: 'Livre', pencil: 'Crayon', pen: 'Stylo', teacher: 'Professeur', student: 'Élève', table: 'Table', chair: 'Chaise',
  notebook: 'Cahier', bag: 'Sac', class: 'Classe', homework: 'Devoirs',
  water: 'Eau', bread: 'Pain', rice: 'Riz', beans: 'Haricots', meat: 'Viande', chicken: 'Poulet', fish: 'Poisson', fruit: 'Fruit', mango: 'Mangue',
  banana: 'Banane', juice: 'Jus', milk: 'Lait', egg: 'Œuf', sugar: 'Sucre', salt: 'Sel', hungry: 'Avoir faim', thirsty: 'Avoir soif',
  head: 'Tête', eye: 'Œil', nose: 'Nez', mouth: 'Bouche', ear: 'Oreille', hand: 'Main', foot: 'Pied', arm: 'Bras', leg: 'Jambe', hair: 'Cheveux',
  belly: 'Ventre', heart: 'Cœur',
  dog: 'Chien', cat: 'Chat', goat: 'Chèvre', cow: 'Vache', pig: 'Cochon', rooster: 'Coq', horse: 'Cheval', bird: 'Oiseau', butterfly: 'Papillon',
  donkey: 'Âne', mouse: 'Souris', lion: 'Lion', turtle: 'Tortue',
  monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi', thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche',
  today: "Aujourd'hui", tomorrow: 'Demain', yesterday: 'Hier', morning: 'Matin', night: 'Nuit', week: 'Semaine', hour: 'Heure',
  eat: 'Manger', drink: 'Boire', sleep: 'Dormir', go: 'Aller', come: 'Venir', read: 'Lire', write: 'Écrire', play: 'Jouer', run: 'Courir',
  jump: 'Sauter', see: 'Voir', hear: 'Entendre', speak: 'Parler', know: 'Savoir', like: 'Aimer', want: 'Vouloir', learn: 'Apprendre', help: 'Aider',
  what: 'Quoi', who: 'Qui', where: 'Où', when: 'Quand', why: 'Pourquoi', how: 'Comment', how_much: 'Combien',
  house: 'Maison', market: 'Marché', hospital: 'Hôpital', street: 'Rue', city: 'Ville', beach: 'Plage', garden: 'Jardin', bus: 'Bus',
  left: 'À gauche', right: 'À droite',
};

export const SENTENCE_FR: Record<string, string> = {
  s_hello_name: "Bonjour, je m'appelle Marie.", s_how_are_you: 'Comment ça va ?', s_fine_thanks: 'Je vais bien, merci.', s_thanks_much: 'Merci beaucoup.',
  s_good_night: 'Bonne nuit, maman.', s_nice_meet: 'Enchanté de te rencontrer.', s_see_you_tomorrow: 'À demain.', s_yes_please: "Oui, s'il te plaît.",
  s_no_thanks: 'Non, merci.', s_this_is_mother: "C'est ma mère.", s_i_have_brother: "J'ai un frère.", s_sister_name: "Ma sœur s'appelle Ana.",
  s_my_friend: "C'est mon ami.", s_big_family: "J'ai une grande famille.", s_grandma_cooks: 'Ma grand-mère fait à manger.', s_i_am_ten: "J'ai dix ans.",
  s_two_brothers: "J'ai deux frères.", s_three_books: 'Il y a trois livres sur la table.', s_five_mangoes: 'Je veux cinq mangues.', s_how_much: "C'est combien ?",
  s_dog_black: 'Le chien est noir.', s_sky_blue: 'Le ciel est bleu.', s_mango_yellow: 'La mangue est jaune.', s_flag_colors: 'Le drapeau est bleu et rouge.',
  s_like_green: "J'aime la couleur verte.", s_go_school: "Nous allons à l'école.", s_where_school: "Où est l'école ?", s_read_book: 'Je lis un livre.',
  s_teacher_writes: 'Le professeur écrit au tableau.', s_my_pencil: "C'est mon crayon.", s_do_homework: 'Je fais mes devoirs.', s_hungry: "J'ai faim.",
  s_thirsty: "J'ai soif.", s_she_eats_rice: 'Elle mange du riz.', s_drink_water: "Je bois de l'eau.", s_like_mangoes: "J'aime les mangues.",
  s_rice_beans: 'Du riz et des haricots.', s_want_juice: "Je veux du jus, s'il te plaît.", s_wash_hands: 'Lave-toi les mains.', s_head_hurts: "J'ai mal à la tête.",
  s_two_eyes: "J'ai deux yeux.", s_open_mouth: 'Ouvre la bouche.', s_cat_sleeps: 'Le chat dort.', s_goat_eats: 'La chèvre mange des feuilles.',
  s_bird_sings: "L'oiseau chante.", s_horse_runs: 'Le cheval court vite.', s_i_have_dog: "J'ai un chien.", s_today_monday: "Aujourd'hui, c'est lundi.",
  s_tomorrow_saturday: "Demain, c'est samedi.", s_school_friday: "Je vais à l'école vendredi.", s_sleep_night: 'Je dors la nuit.', s_play_sunday: 'Nous jouons dimanche.',
  s_i_speak_creole: 'Je parle créole.', s_learn_english: "J'apprends l'anglais.", s_help_me: "Aide-moi, s'il te plaît.", s_come_here: 'Viens ici.',
  s_play_football: 'Nous jouons au foot.', s_see_sea: 'Je vois la mer.', s_where_live: 'Où habites-tu ?', s_what_is_this: "Qu'est-ce que c'est ?",
  s_who_is_he: 'Qui est-ce ?', s_go_market: 'Ma mère va au marché.', s_house_big: 'La maison est grande.', s_turn_left: 'Tourne à gauche.',
  s_beach_sunday: 'Nous allons à la plage dimanche.',
};

export const TITLE_FR: Record<string, string> = {
  u1: 'Salutations', u1l1: 'Dire bonjour', u1l2: 'Comment ça va ?', u1l3: "Je m'appelle…",
  u2: 'Famille', u2l1: 'Maman et papa', u2l2: 'Toute la famille',
  u3: 'Nombres', u3l1: '1 à 5', u3l2: '6 à 10', u3l3: 'Combien ?',
  u4: 'Couleurs', u4l1: 'Bleu, rouge, jaune', u4l2: 'Plus de couleurs',
  u5: 'École', u5l1: 'Dans mon sac', u5l2: 'En classe',
  u6: 'Nourriture', u6l1: 'Riz et haricots', u6l2: 'Fruits et jus', u6l3: "J'ai faim",
  u7: 'Mon corps', u7l1: 'Tête, yeux, bouche', u7l2: 'Mains et pieds',
  u8: 'Animaux', u8l1: 'À la maison', u8l2: 'Dans la nature',
  u9: 'Jours et temps', u9l1: 'Les jours de la semaine', u9l2: "Aujourd'hui, demain",
  u10: 'Actions', u10l1: 'Manger, boire, dormir', u10l2: 'Lire, écrire, jouer', u10l3: 'Apprendre, aider',
  u11: 'Questions et lieux', u11l1: 'Quoi ? Qui ?', u11l2: 'En ville', u11l3: 'À gauche, à droite',
};

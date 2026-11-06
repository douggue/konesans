/**
 * Language-course content: Kreyòl is the home language, English and Spanish are the targets.
 *
 * Every concept is written ONCE with its ht / en / es forms, so both courses share the same
 * units and lessons and stay in sync. A course is just a target language over this content.
 *
 * Audio: targets use device TTS (`tts:en:<text>` / `tts:es:<text>`), which is free and good
 * for EN/ES. Kreyòl prompts are text only (Kreyòl TTS is not good enough for kids yet).
 *
 * Images: `img` is a key into the app's illustration set (same keys as the quiz media).
 */

export type TargetLang = 'en' | 'es';

export interface Concept {
  /** stable id used in exercise ids and SRS */
  id: string;
  ht: string;
  en: string;
  es: string;
  /** illustration key; concepts with an image get picture exercises for 6–8 */
  img?: string;
  /** alternative accepted spellings/forms in the target, per language (lowercase) */
  alt?: { en?: string[]; es?: string[] };
}

export interface Sentence {
  id: string;
  ht: string;
  en: string;
  es: string;
  /** concept ids this sentence practises (used to place it in a lesson) */
  uses: string[];
}

export interface LessonDef {
  id: string;
  title: string;         // Kreyòl
  concepts: string[];    // concept ids
  sentences: string[];   // sentence ids
}

export interface UnitDef {
  id: string;
  title: string;         // Kreyòl
  emoji: string;         // used as the unit badge in the path
  lessons: LessonDef[];
}

// ─── Concepts ────────────────────────────────────────────────────────────────

const C = (id: string, ht: string, en: string, es: string, img?: string, alt?: Concept['alt']): Concept => ({ id, ht, en, es, img, alt });

export const CONCEPTS: Concept[] = [
  // Salitasyon
  C('hello', 'Bonjou', 'Hello', 'Hola', 'wave', { en: ['hi', 'good morning'], es: ['buenos días'] }),
  C('good_evening', 'Bonswa', 'Good evening', 'Buenas tardes', 'sunset', { es: ['buenas noches'] }),
  C('good_night', 'Bòn nwit', 'Good night', 'Buenas noches', 'moon'),
  C('goodbye', 'Orevwa', 'Goodbye', 'Adiós', 'wave_bye', { en: ['bye'], es: ['chao', 'chau'] }),
  C('thanks', 'Mèsi', 'Thank you', 'Gracias', 'heart_hands', { en: ['thanks'] }),
  C('please', 'Tanpri', 'Please', 'Por favor', 'please', { en: [], es: [] }),
  C('yes', 'Wi', 'Yes', 'Sí', 'thumb_up'),
  C('no', 'Non', 'No', 'No', 'thumb_down'),
  C('how_are_you', 'Kijan ou ye?', 'How are you?', '¿Cómo estás?', undefined),
  C('im_fine', 'Mwen byen', 'I am fine', 'Estoy bien', 'smile', { en: ["i'm fine", 'i am good'] }),
  C('sorry', 'Eskize m', 'Sorry', 'Perdón', 'sorry', { en: ['excuse me'], es: ['lo siento', 'disculpe'] }),
  C('my_name_is', 'Mwen rele…', 'My name is…', 'Me llamo…', undefined),
  C('nice_to_meet', 'Kontan rankontre w', 'Nice to meet you', 'Mucho gusto', 'handshake'),
  C('welcome', 'Byenveni', 'Welcome', 'Bienvenido', 'door', { es: ['bienvenida'] }),
  C('see_you', 'N a wè', 'See you later', 'Hasta luego', undefined, { en: ['see you'] }),

  // Fanmi
  C('mother', 'Manman', 'Mother', 'Madre', 'mother', { en: ['mom', 'mum'], es: ['mamá'] }),
  C('father', 'Papa', 'Father', 'Padre', 'father', { en: ['dad'], es: ['papá'] }),
  C('brother', 'Frè', 'Brother', 'Hermano', 'boy'),
  C('sister', 'Sè', 'Sister', 'Hermana', 'girl'),
  C('grandmother', 'Grann', 'Grandmother', 'Abuela', 'grandmother', { en: ['grandma'] }),
  C('grandfather', 'Granpè', 'Grandfather', 'Abuelo', 'grandfather', { en: ['grandpa'] }),
  C('uncle', 'Tonton', 'Uncle', 'Tío', 'man'),
  C('aunt', 'Matant', 'Aunt', 'Tía', 'woman'),
  C('child', 'Timoun', 'Child', 'Niño', 'child', { en: ['kid'], es: ['niña'] }),
  C('baby', 'Tibebe', 'Baby', 'Bebé', 'baby'),
  C('friend', 'Zanmi', 'Friend', 'Amigo', 'friends', { es: ['amiga'] }),
  C('family', 'Fanmi', 'Family', 'Familia', 'family'),
  C('cousin', 'Kouzen', 'Cousin', 'Primo', 'cousin', { es: ['prima'] }),

  // Nimewo
  C('n1', 'Youn', 'One', 'Uno', 'n1'),
  C('n2', 'De', 'Two', 'Dos', 'n2'),
  C('n3', 'Twa', 'Three', 'Tres', 'n3'),
  C('n4', 'Kat', 'Four', 'Cuatro', 'n4'),
  C('n5', 'Senk', 'Five', 'Cinco', 'n5'),
  C('n6', 'Sis', 'Six', 'Seis', 'n6'),
  C('n7', 'Sèt', 'Seven', 'Siete', 'n7'),
  C('n8', 'Uit', 'Eight', 'Ocho', 'n8'),
  C('n9', 'Nèf', 'Nine', 'Nueve', 'n9'),
  C('n10', 'Dis', 'Ten', 'Diez', 'n10'),
  C('n20', 'Ven', 'Twenty', 'Veinte', 'n20'),
  C('n100', 'San', 'One hundred', 'Cien', 'n100', { en: ['a hundred', 'hundred'] }),

  // Koulè
  C('red', 'Wouj', 'Red', 'Rojo', 'c_red', { es: ['roja'] }),
  C('blue', 'Ble', 'Blue', 'Azul', 'c_blue'),
  C('yellow', 'Jòn', 'Yellow', 'Amarillo', 'c_yellow', { es: ['amarilla'] }),
  C('green', 'Vèt', 'Green', 'Verde', 'c_green'),
  C('black', 'Nwa', 'Black', 'Negro', 'c_black', { es: ['negra'] }),
  C('white', 'Blan', 'White', 'Blanco', 'c_white', { es: ['blanca'] }),
  C('orange', 'Oranj', 'Orange', 'Naranja', 'c_orange', { es: ['anaranjado'] }),
  C('pink', 'Woz', 'Pink', 'Rosa', 'c_pink', { es: ['rosado'] }),
  C('purple', 'Vyolèt', 'Purple', 'Morado', 'c_purple', { es: ['violeta', 'púrpura'] }),
  C('brown', 'Mawon', 'Brown', 'Marrón', 'c_brown', { es: ['café'] }),
  C('gray', 'Gri', 'Gray', 'Gris', 'c_gray', { en: ['grey'] }),

  // Lekòl
  C('school', 'Lekòl', 'School', 'Escuela', 'school'),
  C('book', 'Liv', 'Book', 'Libro', 'book'),
  C('pencil', 'Kreyon', 'Pencil', 'Lápiz', 'pencil'),
  C('pen', 'Plim', 'Pen', 'Bolígrafo', 'pen', { es: ['pluma', 'lapicero'] }),
  C('teacher', 'Pwofesè', 'Teacher', 'Maestro', 'teacher', { es: ['maestra', 'profesor', 'profesora'] }),
  C('student', 'Elèv', 'Student', 'Estudiante', 'student', { es: ['alumno', 'alumna'] }),
  C('table', 'Tab', 'Table', 'Mesa', 'table', { en: ['desk'] }),
  C('chair', 'Chèz', 'Chair', 'Silla', 'chair'),
  C('notebook', 'Kaye', 'Notebook', 'Cuaderno', 'notebook'),
  C('bag', 'Sak', 'Bag', 'Mochila', 'bag', { en: ['backpack'], es: ['bolsa'] }),
  C('class', 'Klas', 'Class', 'Clase', 'class'),
  C('homework', 'Devwa', 'Homework', 'Tarea', 'homework'),

  // Manje
  C('water', 'Dlo', 'Water', 'Agua', 'water'),
  C('bread', 'Pen', 'Bread', 'Pan', 'bread'),
  C('rice', 'Diri', 'Rice', 'Arroz', 'rice'),
  C('beans', 'Pwa', 'Beans', 'Frijoles', 'beans', { es: ['habichuelas'] }),
  C('meat', 'Vyann', 'Meat', 'Carne', 'meat'),
  C('chicken', 'Poul', 'Chicken', 'Pollo', 'chicken'),
  C('fish', 'Pwason', 'Fish', 'Pescado', 'fish', { es: ['pez'] }),
  C('fruit', 'Fwi', 'Fruit', 'Fruta', 'fruit'),
  C('mango', 'Mango', 'Mango', 'Mango', 'mango'),
  C('banana', 'Fig', 'Banana', 'Banana', 'banana', { es: ['plátano', 'guineo'] }),
  C('juice', 'Ji', 'Juice', 'Jugo', 'juice', { es: ['zumo'] }),
  C('milk', 'Lèt', 'Milk', 'Leche', 'milk'),
  C('egg', 'Ze', 'Egg', 'Huevo', 'egg'),
  C('sugar', 'Sik', 'Sugar', 'Azúcar', 'sugar'),
  C('salt', 'Sèl', 'Salt', 'Sal', 'salt'),
  C('hungry', 'Grangou', 'Hungry', 'Hambre', 'hungry'),
  C('thirsty', 'Swaf', 'Thirsty', 'Sed', 'thirsty'),

  // Kò
  C('head', 'Tèt', 'Head', 'Cabeza', 'head'),
  C('eye', 'Je', 'Eye', 'Ojo', 'eye'),
  C('nose', 'Nen', 'Nose', 'Nariz', 'nose'),
  C('mouth', 'Bouch', 'Mouth', 'Boca', 'mouth'),
  C('ear', 'Zòrèy', 'Ear', 'Oreja', 'ear', { es: ['oído'] }),
  C('hand', 'Men', 'Hand', 'Mano', 'hand'),
  C('foot', 'Pye', 'Foot', 'Pie', 'foot'),
  C('arm', 'Bra', 'Arm', 'Brazo', 'arm'),
  C('leg', 'Janm', 'Leg', 'Pierna', 'leg'),
  C('hair', 'Cheve', 'Hair', 'Pelo', 'hair', { es: ['cabello'] }),
  C('belly', 'Vant', 'Belly', 'Barriga', 'belly', { en: ['stomach', 'tummy'], es: ['estómago', 'panza'] }),
  C('heart', 'Kè', 'Heart', 'Corazón', 'heart'),

  // Bèt
  C('dog', 'Chen', 'Dog', 'Perro', 'dog'),
  C('cat', 'Chat', 'Cat', 'Gato', 'cat'),
  C('goat', 'Kabrit', 'Goat', 'Cabra', 'goat', { es: ['chivo'] }),
  C('cow', 'Bèf', 'Cow', 'Vaca', 'cow'),
  C('pig', 'Kochon', 'Pig', 'Cerdo', 'pig', { es: ['puerco', 'cochino'] }),
  C('rooster', 'Kòk', 'Rooster', 'Gallo', 'rooster'),
  C('horse', 'Cheval', 'Horse', 'Caballo', 'horse'),
  C('bird', 'Zwazo', 'Bird', 'Pájaro', 'bird', { es: ['ave'] }),
  C('butterfly', 'Papiyon', 'Butterfly', 'Mariposa', 'butterfly'),
  C('donkey', 'Bourik', 'Donkey', 'Burro', 'donkey'),
  C('mouse', 'Sourit', 'Mouse', 'Ratón', 'mouse'),
  C('lion', 'Lyon', 'Lion', 'León', 'lion'),
  C('turtle', 'Toti', 'Turtle', 'Tortuga', 'turtle'),

  // Jou ak tan
  C('monday', 'Lendi', 'Monday', 'Lunes', undefined),
  C('tuesday', 'Madi', 'Tuesday', 'Martes', undefined),
  C('wednesday', 'Mèkredi', 'Wednesday', 'Miércoles', undefined),
  C('thursday', 'Jedi', 'Thursday', 'Jueves', undefined),
  C('friday', 'Vandredi', 'Friday', 'Viernes', undefined),
  C('saturday', 'Samdi', 'Saturday', 'Sábado', undefined),
  C('sunday', 'Dimanch', 'Sunday', 'Domingo', undefined),
  C('today', 'Jodi a', 'Today', 'Hoy', 'calendar_today'),
  C('tomorrow', 'Demen', 'Tomorrow', 'Mañana', 'calendar_next'),
  C('yesterday', 'Yè', 'Yesterday', 'Ayer', 'calendar_prev'),
  C('morning', 'Maten', 'Morning', 'La mañana', 'sun', { es: ['mañana'] }),
  C('night', 'Lannwit', 'Night', 'La noche', 'moon', { es: ['noche'] }),
  C('week', 'Semèn', 'Week', 'Semana', 'calendar'),
  C('hour', 'Lè', 'Hour', 'Hora', 'clock'),

  // Vèb
  C('eat', 'Manje', 'To eat', 'Comer', 'eat', { en: ['eat'] }),
  C('drink', 'Bwè', 'To drink', 'Beber', 'drink', { en: ['drink'], es: ['tomar'] }),
  C('sleep', 'Dòmi', 'To sleep', 'Dormir', 'sleep', { en: ['sleep'] }),
  C('go', 'Ale', 'To go', 'Ir', 'go', { en: ['go'] }),
  C('come', 'Vini', 'To come', 'Venir', 'come', { en: ['come'] }),
  C('read', 'Li', 'To read', 'Leer', 'read', { en: ['read'] }),
  C('write', 'Ekri', 'To write', 'Escribir', 'write', { en: ['write'] }),
  C('play', 'Jwe', 'To play', 'Jugar', 'play', { en: ['play'] }),
  C('run', 'Kouri', 'To run', 'Correr', 'run', { en: ['run'] }),
  C('jump', 'Sote', 'To jump', 'Saltar', 'jump', { en: ['jump'], es: ['brincar'] }),
  C('see', 'Wè', 'To see', 'Ver', 'see', { en: ['see'] }),
  C('hear', 'Tande', 'To hear', 'Oír', 'hear', { en: ['hear', 'to listen', 'listen'], es: ['escuchar'] }),
  C('speak', 'Pale', 'To speak', 'Hablar', 'speak', { en: ['speak', 'to talk', 'talk'] }),
  C('know', 'Konnen', 'To know', 'Saber', undefined, { en: ['know'], es: ['conocer'] }),
  C('like', 'Renmen', 'To like', 'Gustar', 'heart', { en: ['like', 'to love', 'love'], es: ['querer', 'amar'] }),
  C('want', 'Vle', 'To want', 'Querer', undefined, { en: ['want'] }),
  C('learn', 'Aprann', 'To learn', 'Aprender', 'learn', { en: ['learn'] }),
  C('help', 'Ede', 'To help', 'Ayudar', 'help', { en: ['help'] }),

  // Kesyon ak kote
  C('what', 'Kisa', 'What', 'Qué', undefined, { es: ['que'] }),
  C('who', 'Ki moun', 'Who', 'Quién', undefined, { es: ['quien'] }),
  C('where', 'Ki kote', 'Where', 'Dónde', undefined, { es: ['donde'] }),
  C('when', 'Kilè', 'When', 'Cuándo', undefined, { es: ['cuando'] }),
  C('why', 'Poukisa', 'Why', 'Por qué', undefined, { es: ['por que'] }),
  C('how', 'Kijan', 'How', 'Cómo', undefined, { es: ['como'] }),
  C('how_much', 'Konbyen', 'How much', 'Cuánto', undefined, { en: ['how many'], es: ['cuanto', 'cuántos'] }),
  C('house', 'Kay', 'House', 'Casa', 'house', { en: ['home'] }),
  C('market', 'Mache', 'Market', 'Mercado', 'market'),
  C('hospital', 'Lopital', 'Hospital', 'Hospital', 'hospital'),
  C('street', 'Lari', 'Street', 'Calle', 'street'),
  C('city', 'Vil', 'City', 'Ciudad', 'city', { en: ['town'], es: ['pueblo'] }),
  C('beach', 'Plaj', 'Beach', 'Playa', 'beach'),
  C('garden', 'Jaden', 'Garden', 'Jardín', 'garden'),
  C('bus', 'Bis', 'Bus', 'Autobús', 'bus', { es: ['bus', 'guagua'] }),
  C('left', 'Agoch', 'Left', 'Izquierda', 'arrow_left'),
  C('right', 'Adwat', 'Right', 'Derecha', 'arrow_right'),
];

// ─── Sentences ───────────────────────────────────────────────────────────────

const S = (id: string, ht: string, en: string, es: string, uses: string[]): Sentence => ({ id, ht, en, es, uses });

export const SENTENCES: Sentence[] = [
  // Salitasyon
  S('s_hello_name', 'Bonjou, mwen rele Marie.', 'Hello, my name is Marie.', 'Hola, me llamo Marie.', ['hello', 'my_name_is']),
  S('s_how_are_you', 'Kijan ou ye?', 'How are you?', '¿Cómo estás?', ['how_are_you']),
  S('s_fine_thanks', 'Mwen byen, mèsi.', 'I am fine, thank you.', 'Estoy bien, gracias.', ['im_fine', 'thanks']),
  S('s_thanks_much', 'Mèsi anpil.', 'Thank you very much.', 'Muchas gracias.', ['thanks']),
  S('s_good_night', 'Bòn nwit, manman.', 'Good night, mother.', 'Buenas noches, madre.', ['good_night', 'mother']),
  S('s_nice_meet', 'Kontan rankontre w.', 'Nice to meet you.', 'Mucho gusto.', ['nice_to_meet']),
  S('s_see_you_tomorrow', 'N a wè demen.', 'See you tomorrow.', 'Hasta mañana.', ['see_you', 'tomorrow']),
  S('s_yes_please', 'Wi, tanpri.', 'Yes, please.', 'Sí, por favor.', ['yes', 'please']),
  S('s_no_thanks', 'Non, mèsi.', 'No, thank you.', 'No, gracias.', ['no', 'thanks']),

  // Fanmi
  S('s_this_is_mother', 'Sa a se manman m.', 'This is my mother.', 'Esta es mi madre.', ['mother']),
  S('s_i_have_brother', 'Mwen gen yon frè.', 'I have a brother.', 'Tengo un hermano.', ['brother']),
  S('s_sister_name', 'Sè m rele Ana.', 'My sister\'s name is Ana.', 'Mi hermana se llama Ana.', ['sister', 'my_name_is']),
  S('s_my_friend', 'Li se zanmi m.', 'He is my friend.', 'Él es mi amigo.', ['friend']),
  S('s_big_family', 'Mwen gen yon gwo fanmi.', 'I have a big family.', 'Tengo una familia grande.', ['family']),
  S('s_grandma_cooks', 'Grann mwen fè manje.', 'My grandmother cooks.', 'Mi abuela cocina.', ['grandmother', 'eat']),

  // Nimewo
  S('s_i_am_ten', 'Mwen gen dizan.', 'I am ten years old.', 'Tengo diez años.', ['n10']),
  S('s_two_brothers', 'Mwen gen de frè.', 'I have two brothers.', 'Tengo dos hermanos.', ['n2', 'brother']),
  S('s_three_books', 'Gen twa liv sou tab la.', 'There are three books on the table.', 'Hay tres libros en la mesa.', ['n3', 'book', 'table']),
  S('s_five_mangoes', 'Mwen vle senk mango.', 'I want five mangoes.', 'Quiero cinco mangos.', ['n5', 'mango', 'want']),
  S('s_how_much', 'Konbyen li ye?', 'How much is it?', '¿Cuánto cuesta?', ['how_much']),

  // Koulè
  S('s_dog_black', 'Chen an nwa.', 'The dog is black.', 'El perro es negro.', ['dog', 'black']),
  S('s_sky_blue', 'Syèl la ble.', 'The sky is blue.', 'El cielo es azul.', ['blue']),
  S('s_mango_yellow', 'Mango a jòn.', 'The mango is yellow.', 'El mango es amarillo.', ['mango', 'yellow']),
  S('s_flag_colors', 'Drapo a ble ak wouj.', 'The flag is blue and red.', 'La bandera es azul y roja.', ['blue', 'red']),
  S('s_like_green', 'Mwen renmen koulè vèt.', 'I like the color green.', 'Me gusta el color verde.', ['green', 'like']),

  // Lekòl
  S('s_go_school', 'Nou ale lekòl.', 'We go to school.', 'Vamos a la escuela.', ['school', 'go']),
  S('s_where_school', 'Ki kote lekòl la ye?', 'Where is the school?', '¿Dónde está la escuela?', ['where', 'school']),
  S('s_read_book', 'Mwen li yon liv.', 'I read a book.', 'Leo un libro.', ['read', 'book']),
  S('s_teacher_writes', 'Pwofesè a ekri sou tablo a.', 'The teacher writes on the board.', 'El maestro escribe en la pizarra.', ['teacher', 'write']),
  S('s_my_pencil', 'Sa a se kreyon mwen.', 'This is my pencil.', 'Este es mi lápiz.', ['pencil']),
  S('s_do_homework', 'Mwen fè devwa m.', 'I do my homework.', 'Hago mi tarea.', ['homework']),

  // Manje
  S('s_hungry', 'Mwen grangou.', 'I am hungry.', 'Tengo hambre.', ['hungry']),
  S('s_thirsty', 'Mwen swaf.', 'I am thirsty.', 'Tengo sed.', ['thirsty']),
  S('s_she_eats_rice', 'Li manje diri.', 'She eats rice.', 'Ella come arroz.', ['eat', 'rice']),
  S('s_drink_water', 'Mwen bwè dlo.', 'I drink water.', 'Bebo agua.', ['drink', 'water']),
  S('s_like_mangoes', 'Mwen renmen mango.', 'I like mangoes.', 'Me gustan los mangos.', ['like', 'mango']),
  S('s_rice_beans', 'Diri ak pwa.', 'Rice and beans.', 'Arroz con frijoles.', ['rice', 'beans']),
  S('s_want_juice', 'Mwen vle ji, tanpri.', 'I want juice, please.', 'Quiero jugo, por favor.', ['want', 'juice', 'please']),

  // Kò
  S('s_wash_hands', 'Lave men w.', 'Wash your hands.', 'Lávate las manos.', ['hand']),
  S('s_head_hurts', 'Tèt mwen fè m mal.', 'My head hurts.', 'Me duele la cabeza.', ['head']),
  S('s_two_eyes', 'Mwen gen de je.', 'I have two eyes.', 'Tengo dos ojos.', ['n2', 'eye']),
  S('s_open_mouth', 'Louvri bouch ou.', 'Open your mouth.', 'Abre la boca.', ['mouth']),

  // Bèt
  S('s_cat_sleeps', 'Chat la ap dòmi.', 'The cat is sleeping.', 'El gato está durmiendo.', ['cat', 'sleep']),
  S('s_goat_eats', 'Kabrit la manje fèy.', 'The goat eats leaves.', 'La cabra come hojas.', ['goat', 'eat']),
  S('s_bird_sings', 'Zwazo a ap chante.', 'The bird is singing.', 'El pájaro está cantando.', ['bird']),
  S('s_horse_runs', 'Cheval la kouri vit.', 'The horse runs fast.', 'El caballo corre rápido.', ['horse', 'run']),
  S('s_i_have_dog', 'Mwen gen yon chen.', 'I have a dog.', 'Tengo un perro.', ['dog']),

  // Jou ak tan
  S('s_today_monday', 'Jodi a se lendi.', 'Today is Monday.', 'Hoy es lunes.', ['today', 'monday']),
  S('s_tomorrow_saturday', 'Demen se samdi.', 'Tomorrow is Saturday.', 'Mañana es sábado.', ['tomorrow', 'saturday']),
  S('s_school_friday', 'Mwen ale lekòl vandredi.', 'I go to school on Friday.', 'Voy a la escuela el viernes.', ['friday', 'school', 'go']),
  S('s_sleep_night', 'Mwen dòmi lannwit.', 'I sleep at night.', 'Duermo por la noche.', ['sleep', 'night']),
  S('s_play_sunday', 'Nou jwe dimanch.', 'We play on Sunday.', 'Jugamos el domingo.', ['play', 'sunday']),

  // Vèb
  S('s_i_speak_creole', 'Mwen pale kreyòl.', 'I speak Creole.', 'Hablo criollo.', ['speak']),
  S('s_learn_english', 'Mwen ap aprann angle.', 'I am learning English.', 'Estoy aprendiendo inglés.', ['learn']),
  S('s_help_me', 'Ede m, tanpri.', 'Help me, please.', 'Ayúdame, por favor.', ['help', 'please']),
  S('s_come_here', 'Vini isit la.', 'Come here.', 'Ven aquí.', ['come']),
  S('s_play_football', 'Nou jwe foutbòl.', 'We play football.', 'Jugamos al fútbol.', ['play']),
  S('s_see_sea', 'Mwen wè lanmè a.', 'I see the sea.', 'Veo el mar.', ['see']),

  // Kesyon ak kote
  S('s_where_live', 'Ki kote ou rete?', 'Where do you live?', '¿Dónde vives?', ['where']),
  S('s_what_is_this', 'Kisa sa a ye?', 'What is this?', '¿Qué es esto?', ['what']),
  S('s_who_is_he', 'Ki moun li ye?', 'Who is he?', '¿Quién es él?', ['who']),
  S('s_go_market', 'Manman m ale nan mache.', 'My mother goes to the market.', 'Mi madre va al mercado.', ['mother', 'go', 'market']),
  S('s_house_big', 'Kay la gwo.', 'The house is big.', 'La casa es grande.', ['house']),
  S('s_turn_left', 'Vire agoch.', 'Turn left.', 'Gira a la izquierda.', ['left']),
  S('s_beach_sunday', 'Nou ale laplaj dimanch.', 'We go to the beach on Sunday.', 'Vamos a la playa el domingo.', ['beach', 'sunday', 'go']),
];

// ─── Units & lessons (shared by both courses) ────────────────────────────────

const L = (id: string, title: string, concepts: string[], sentences: string[]): LessonDef => ({ id, title, concepts, sentences });

export const UNITS: UnitDef[] = [
  { id: 'u1', title: 'Salitasyon', emoji: '👋', lessons: [
    L('u1l1', 'Di bonjou', ['hello', 'good_evening', 'goodbye', 'thanks', 'please', 'yes'], ['s_thanks_much', 's_yes_please']),
    L('u1l2', 'Kijan ou ye?', ['how_are_you', 'im_fine', 'no', 'sorry', 'good_night', 'see_you'], ['s_how_are_you', 's_fine_thanks', 's_no_thanks', 's_good_night', 's_see_you_tomorrow']),
    L('u1l3', 'Mwen rele…', ['my_name_is', 'nice_to_meet', 'welcome', 'friend', 'child'], ['s_hello_name', 's_nice_meet', 's_my_friend']),
  ] },
  { id: 'u2', title: 'Fanmi', emoji: '🏠', lessons: [
    L('u2l1', 'Manman ak papa', ['mother', 'father', 'brother', 'sister', 'family', 'baby'], ['s_this_is_mother', 's_i_have_brother', 's_big_family']),
    L('u2l2', 'Tout fanmi an', ['grandmother', 'grandfather', 'uncle', 'aunt', 'cousin', 'child'], ['s_sister_name', 's_my_friend', 's_grandma_cooks']),
  ] },
  { id: 'u3', title: 'Nimewo', emoji: '🔢', lessons: [
    L('u3l1', '1 rive 5', ['n1', 'n2', 'n3', 'n4', 'n5'], ['s_two_brothers', 's_three_books']),
    L('u3l2', '6 rive 10', ['n6', 'n7', 'n8', 'n9', 'n10'], ['s_i_am_ten', 's_five_mangoes']),
    L('u3l3', 'Konbyen?', ['n20', 'n100', 'how_much', 'want'], ['s_how_much', 's_five_mangoes']),
  ] },
  { id: 'u4', title: 'Koulè', emoji: '🎨', lessons: [
    L('u4l1', 'Ble, wouj, jòn', ['red', 'blue', 'yellow', 'green', 'black', 'white'], ['s_dog_black', 's_sky_blue', 's_flag_colors']),
    L('u4l2', 'Plis koulè', ['orange', 'pink', 'purple', 'brown', 'gray', 'like'], ['s_mango_yellow', 's_like_green']),
  ] },
  { id: 'u5', title: 'Lekòl', emoji: '🏫', lessons: [
    L('u5l1', 'Nan sak mwen', ['school', 'book', 'pencil', 'pen', 'notebook', 'bag'], ['s_my_pencil', 's_read_book']),
    L('u5l2', 'Nan klas la', ['teacher', 'student', 'table', 'chair', 'class', 'homework'], ['s_go_school', 's_where_school', 's_teacher_writes', 's_do_homework']),
  ] },
  { id: 'u6', title: 'Manje', emoji: '🍽️', lessons: [
    L('u6l1', 'Diri ak pwa', ['water', 'bread', 'rice', 'beans', 'meat', 'chicken', 'fish'], ['s_she_eats_rice', 's_drink_water', 's_rice_beans']),
    L('u6l2', 'Fwi ak ji', ['fruit', 'mango', 'banana', 'juice', 'milk', 'egg'], ['s_like_mangoes', 's_want_juice']),
    L('u6l3', 'Mwen grangou', ['hungry', 'thirsty', 'sugar', 'salt', 'eat', 'drink'], ['s_hungry', 's_thirsty', 's_drink_water']),
  ] },
  { id: 'u7', title: 'Kò mwen', emoji: '🙋', lessons: [
    L('u7l1', 'Tèt, je, bouch', ['head', 'eye', 'nose', 'mouth', 'ear', 'hair'], ['s_head_hurts', 's_two_eyes', 's_open_mouth']),
    L('u7l2', 'Men ak pye', ['hand', 'foot', 'arm', 'leg', 'belly', 'heart'], ['s_wash_hands']),
  ] },
  { id: 'u8', title: 'Bèt', emoji: '🐐', lessons: [
    L('u8l1', 'Lakay', ['dog', 'cat', 'goat', 'cow', 'pig', 'rooster'], ['s_cat_sleeps', 's_goat_eats', 's_i_have_dog']),
    L('u8l2', 'Nan lanati', ['horse', 'bird', 'butterfly', 'donkey', 'mouse', 'lion', 'turtle'], ['s_bird_sings', 's_horse_runs']),
  ] },
  { id: 'u9', title: 'Jou ak tan', emoji: '📅', lessons: [
    L('u9l1', 'Jou semèn nan', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], ['s_today_monday', 's_tomorrow_saturday', 's_school_friday']),
    L('u9l2', 'Jodi a, demen', ['today', 'tomorrow', 'yesterday', 'morning', 'night', 'week', 'hour'], ['s_sleep_night', 's_play_sunday', 's_see_you_tomorrow']),
  ] },
  { id: 'u10', title: 'Aksyon', emoji: '🏃', lessons: [
    L('u10l1', 'Manje, bwè, dòmi', ['eat', 'drink', 'sleep', 'go', 'come', 'run', 'jump'], ['s_come_here', 's_horse_runs', 's_sleep_night']),
    L('u10l2', 'Li, ekri, jwe', ['read', 'write', 'play', 'see', 'hear', 'speak'], ['s_i_speak_creole', 's_play_football', 's_see_sea']),
    L('u10l3', 'Aprann, ede', ['learn', 'help', 'know', 'want', 'like'], ['s_learn_english', 's_help_me', 's_like_mangoes']),
  ] },
  { id: 'u11', title: 'Kesyon ak kote', emoji: '🗺️', lessons: [
    L('u11l1', 'Kisa? Ki moun?', ['what', 'who', 'where', 'when', 'why', 'how'], ['s_what_is_this', 's_who_is_he', 's_where_live']),
    L('u11l2', 'Nan vil la', ['house', 'market', 'hospital', 'street', 'city', 'bus'], ['s_go_market', 's_house_big']),
    L('u11l3', 'Agoch, adwat', ['left', 'right', 'beach', 'garden', 'go'], ['s_turn_left', 's_beach_sunday']),
  ] },
];

export const conceptById: Record<string, Concept> = Object.fromEntries(CONCEPTS.map(c => [c.id, c]));
export const sentenceById: Record<string, Sentence> = Object.fromEntries(SENTENCES.map(s => [s.id, s]));

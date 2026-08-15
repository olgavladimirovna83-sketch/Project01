/**
 * Task 9.3 — первые записи `ContentKnowledge`, извлечённые из справочных
 * материалов (не в репозитории — личные файлы Olga): "Полное
 * руководство.pdf" и "Полное руководство дополнительно.pdf".
 *
 * Пополнение: добавить объект в `entries` ниже + `npm run
 * seed:content-knowledge` — не требует миграции или изменения кода AI-слоя
 * (это и есть "дешёвое пополнение базы", которое просила Olga).
 *
 * Чистые данные, без побочных эффектов — импортируется и seed-скриптом
 * (`seedContentKnowledge.ts`), и юнит-тестом на форму данных
 * (`tests/unit/content-knowledge-seed-data.test.ts`) без подключения к БД.
 *
 * Сознательно частичная загрузка "Полное руководство.pdf" (130 страниц) —
 * загружен только Раздел 1 (Недельная система хуков), самая атомарная и
 * переиспользуемая часть документа. Остальное (Раздел 2 — тренды монтажа,
 * Раздел 3 — стратегия платформ, и всё, что дальше в документе)
 * сознательно не загружено этим скриптом — честно зафиксировано в
 * DECISIONS.md D-0030 и TASKS.md, не тихо пропущено. Пополняется
 * постепенно, по прямому плану Olga.
 *
 * Из "Полное руководство дополнительно.pdf" — загружено всё, КРОМЕ
 * Раздела 2 (идеи для сезонного контента "на примере июля") — тот
 * привязан к конкретному месяцу/сезону, не является переиспользуемым
 * приёмом в том смысле, в каком остальные записи являются.
 */

const GUIDE = 'Полное руководство.pdf';
const GUIDE_SUPPLEMENT = 'Полное руководство дополнительно.pdf';

export interface SeedEntry {
  category: string;
  title: string;
  content: string;
  source: string;
  sourceSection: string;
}

export const entries: SeedEntry[] = [
  // --- из "доп. файла": Раздел 1, фундамент контент-стратегии ---
  {
    category: 'content_strategy',
    title: 'Фундамент контент-стратегии и фокус',
    content: [
      'Публикация скопированного контента не является стратегией.',
      'Классическая формула стратегии: 4 контент-опоры (content pillars) + 1 фирменная серия (signature series) + качественный контент на регулярной основе + упор на развитие комьюнити.',
      'Главный психологический совет: "наденьте контентные шоры" и сфокусируйтесь на деле, не усложняя процесс.',
      'Манифест уверенности: будьте собой и помните, что этого достаточно.',
    ].join('\n'),
    source: GUIDE_SUPPLEMENT,
    sourceSection: 'Раздел 1. Фундамент контент-стратегии и фокус',
  },

  // --- из "доп. файла": Раздел 3, 7 правил заголовков ---
  {
    category: 'headline_rule',
    title: 'Правило 1. "We"-Centric Language — язык, ориентированный на комьюнити',
    content: [
      'Фокус на «Я» ("ME"-Centric) отталкивает аудиторию, фокус на «Мы» ("WE"-Centric) создаёт чувство причастности.',
      'Не надо: "My Favorites", "Cook with Me", "My Happy Makers", "What I Eat In A Day", "My Daily Thoughts", "I Need a Reset".',
      'Надо: "Creative Girl Starter Pack", "Meals For The Unmotivated", "It Girl Dopamine Menu", "Girl Dinner Diaries", "Close Friends Files", "High Maintenance Reset".',
    ].join('\n'),
    source: GUIDE_SUPPLEMENT,
    sourceSection: 'Раздел 3, Правило 1',
  },
  {
    category: 'headline_rule',
    title: 'Правило 2. Превращайте заголовок в хук',
    content: [
      'Обычные описания заменяются на интригующие фразы.',
      'Не надо: "My Nail VLOG", "My Outfit", "My Beauty Routine".',
      'Надо: "Anti Basic Nails", "Cool Girls Don\'t Copy", "Niche-Girl Beauty".',
    ].join('\n'),
    source: GUIDE_SUPPLEMENT,
    sourceSection: 'Раздел 3, Правило 2',
  },
  {
    category: 'headline_rule',
    title: 'Правило 3. Апгрейдьте избитые концепты',
    content: [
      'Уходите от контента, который зрители пролистывают (Content They Skip), к темам, останавливающим скролл (Content They Stop For).',
      'Не надо: "Day In MY Life", "Romanticize My Life", "Get Ready With ME".',
      'Надо: "Daily Non-Negotiables", "The Pursuit Of Joy", "What Makes Style Cool?".',
    ].join('\n'),
    source: GUIDE_SUPPLEMENT,
    sourceSection: 'Раздел 3, Правило 3',
  },
  {
    category: 'headline_rule',
    title: 'Правило 4. Создавайте заголовки, которыми хочется делиться (Share-able Headlines)',
    content: [
      'Перевод фокуса с личных достижений автора на универсальные обращения к читателю.',
      'Не надо: "I Am That Girl", "I Am My Own Muse", "I Am Growing".',
      'Надо: "You Are That Girl", "Be Your Own Muse", "You Are Growing".',
    ].join('\n'),
    source: GUIDE_SUPPLEMENT,
    sourceSection: 'Раздел 3, Правило 4',
  },
  {
    category: 'headline_rule',
    title: 'Правило 5. Сигнализируйте ценность через заголовок',
    content: [
      'Показывайте пользу и экспертность прямо в названии материала.',
      'Не надо: "Hair Routine", "Mom Life", "My Glowup".',
      'Надо: "Your Master Hair Plan", "Motherhood Cheatsheet", "A Guide To Looksmaxxing".',
    ].join('\n'),
    source: GUIDE_SUPPLEMENT,
    sourceSection: 'Раздел 3, Правило 5',
  },
  {
    category: 'headline_rule',
    title: 'Правило 6. Немедленно вызывайте любопытство',
    content: [
      'Заголовки должны стимулировать мгновенный интерес и вопросы у аудитории.',
      'Не надо: "Before & After", "Outfits I Love", "My Cozy Home".',
      'Надо: "Why We Love Transformations", "Are You Afraid To Repeat Fits?", "What Makes A House Feel Like Home?".',
    ].join('\n'),
    source: GUIDE_SUPPLEMENT,
    sourceSection: 'Раздел 3, Правило 6',
  },
  {
    category: 'headline_rule',
    title: 'Правило 7. Внедряйте точку зрения (Thought-Starter вместо Selfish Statement)',
    content: [
      'Откажитесь от эгоистичных заявлений в пользу тем для размышлений, вовлекающих зрителя в диалог.',
      'Не надо (Selfish Statement): "Read With Me", "Get Dressed With Me", "Paint With Me".',
      'Надо (Thought-Starter): "The Biggest Lie About _____", "We\'ve Complicated Outfits", "We\'ve Forgotten Art".',
    ].join('\n'),
    source: GUIDE_SUPPLEMENT,
    sourceSection: 'Раздел 3, Правило 7',
  },

  // --- из "Полное руководство.pdf": Раздел 1, недельная система хуков ---
  {
    category: 'hook_template',
    title: 'Понедельник: хук с середины предложения (Mid-Sentence Hook)',
    content: [
      'Принцип: создаёт иллюзию, что зритель "включился" в уже идущий интересный разговор, заставляя досмотреть до контекста.',
      'Шаблоны: "But what they don\'t tell you is _____", "Since we\'re already on the topic, this is EXACTLY why _____", "And somewhere along the way, I realized _____", "So basically long story short is _____", "And the craziest part is _____", "But the truth is _____", "Since we\'re already here, we might as well talk about the fact that _____", "And that\'s exactly the problem _____", "No because _____", "And that\'s where you\'re wrong, because _____", "So the point I\'m trying to make is _____", "And the scariest part is that _____", "Which brings me to my next point _____", "While we\'re on the subject _____", "And the part nobody talks about is _____", "But lowkey, that\'s when everything started to change...", "Because what you\'ll eventually come to realize is _____".',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 1, Понедельник',
  },
  {
    category: 'hook_template',
    title: 'Вторник: хук со смелым заявлением (Bold Claim Hook)',
    content: [
      'Принцип: категоричное, громкое или провокационное утверждение, вызывающее желание проверить или оспорить факт.',
      'Шаблоны: "Whoever said _____ clearly wasn\'t _____", "We\'ve been doing _____ wrong", "I was today years old when I realized I have the best [ВСТАВИТЬ]", "This is a hill I\'m willing to die on", "This might ruin _____ for you but _____", "If we were best friends I\'d tell you right to your face that _____", "You SAY you have the best _____ but it\'s missing _____", "Hottest take of the year:", "The internet convinced us _____, but I\'m here to tell you _____", "No one is doing this better than I am", "Show me a better _____, I\'ll wait", "Chose chaos today and decided you need to know that you\'re doing _____ wrong", "This is the blueprint and no one else can convince me otherwise", "Nothing is going to top this".',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 1, Вторник',
  },
  {
    category: 'hook_template',
    title: 'Среда: хук с обратной психологией (Reverse Psychology Hook)',
    content: [
      'Принцип: запрет или сдерживание ("не смотри", "пропусти") мгновенно подстёгивает любопытство пользователя.',
      'Шаблоны: "Let\'s not even talk about _____, let\'s just do something about it", "If you\'re already a makeup guru, scroll away this is not for you", "Do not look at the pile of clothes on my chair- this is the outfit we\'re going with", "You might not want to watch this if _____", "This will only make sense if you\'ve been feeling stuck", "Whatever you do, don\'t save this unless you want _____", "If you don\'t want your life to get easier, skip this", "This is NOT for you if _____", "Scroll past this video unless you\'re [конкретная аудитория]", "If you want to stay [текущая проблема], keep scrolling", "DON\'T GO to _____ unless you literally want to dream of going back 24/7", "Don\'t judge my _____, but I just had to tell you _____".',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 1, Среда',
  },
  {
    category: 'hook_template',
    title: 'Четверг: исследующий / провокационный хук (Probing Hook)',
    content: [
      'Принцип: создаёт моментальное напряжение и вовлекает в дискуссию или комментарии.',
      'Шаблоны: "This is going to sound mean, but I\'m genuinely asking _____", "Can someone explain why _____", "I\'m not saying this to start drama, I actually want to know _____", "You\'re delaying your own happiness by making it contingent on _____", "You\'re keeping yourself stuck by _____", "I say this with no love whatsoever, _____", "You don\'t NEED _____, what you really need is _____", "Those of you who don\'t like what I\'m about to say are probably the ones who need to hear it the most", "You said you wanted the truth so _____", "I hate to be the one to have to tell you this but _____", "I\'m not in the mood to sugarcoat so: _____", "I\'m literally going to hurt my OWN feelings when I say this but _____".',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 1, Четверг',
  },
  {
    category: 'posting_schedule',
    title: 'Пятница: выходной / перерыв в публикациях',
    content:
      'Пятница традиционно является днём с наименьшей вовлечённостью (low engagement day) — публикации в этот день лучше пропускать, не тратить хук на низкий охват.',
    source: GUIDE,
    sourceSection: 'Раздел 1, Пятница',
  },
  {
    category: 'hook_template',
    title: 'Суббота: хук через уязвимость (Vulnerability Hook)',
    content: [
      'Принцип: искренность и эмоциональная открытость вызывают эмпатию и чувство близости у аудитории.',
      'Шаблоны: "20 somethings please rise because if you\'re feeling like you\'re not where you want to be in life this is for you", "There is a delulu part of me that thinks this might end up on your for you page for a reason", "Not to be dramatic but I think I\'ve officially outgrown a version of my life and if you\'re in the same boat let\'s workshop this together", "I\'m lowkey embarrassed to admit this but _____", "Here goes nothing...", "I tried to convince myself NOT to post this but _____", "Going to put myself out there before I overthink it but _____", "Can we enter our \\"something needs to change\\" era together?", "Normalize being sad about not _____ and let\'s try to change it together", "This could go either way but you always have to bet on yourself so _____", "This couldn\'t be more out of my comfort zone but _____".',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 1, Суббота',
  },
  {
    category: 'hook_template',
    title: 'Воскресенье: заголовок с крупной типографикой (Headline Typography Hook)',
    content: [
      'Принцип: публикация карусели или видео в стиле влога, где заголовок крупным шрифтом выступает главным визуальным хуком, а не текст описания.',
      'Правило составления (из "Make Your Headline a Hook"): не надо — "My Nail VLOG", "My Outfit", "My Beauty Routine"; надо — "Anti Basic Nails", "Cool Girls Don\'t Copy", "Niche-Girl Beauty".',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 1, Воскресенье',
  },
];

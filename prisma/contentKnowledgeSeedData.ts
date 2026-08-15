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
 * Task 9.7/DECISIONS.md D-0033 — `category` (одна строка) стала
 * `categories` (список тегов): запись может честно принадлежать нескольким
 * темам одновременно, без дублирования текста. Категоризация — часть
 * самого процесса чтения/создания записи, не отдельный шаг постфактум;
 * применяется здесь и далее при пополнении.
 *
 * Сознательно частичная загрузка "Полное руководство.pdf" (130 страниц).
 * Загружены: Раздел 1 (Недельная система хуков, Task 9.3), Раздел 2
 * (Тренды монтажа, Task 9.6, целиком) и буквально одноимённая часть
 * Раздела 3 (стр. 8–11, Task 9.6) плюс первая атомарная часть содержания
 * после неё (стр. 11–15, Task 9.7 — концепция позиционирования, формат
 * микро-сериала, принципы влога).
 *
 * ЧЕСТНО ЗАФИКСИРОВАНО (см. DECISIONS.md D-0032): заголовок "Раздел 3" в
 * документе не меняется до самого конца (стр. 130), но содержание
 * фактически перестаёт быть одной темой уже на стр. 11 — это расшифровки
 * множества разных отдельных видео. Стр. 11–15 (Task 9.7) дали 3
 * атомарные, переиспользуемые записи (стратегия/формат/принципы), но
 * НЕ включают сами банки нишевых идей и заголовков (списки "Comfort
 * Creator" по нишам MINDSET/LIFESTYLE/FASHION/etc., "content ideas for
 * comfort creators", "vlog storylines", "non-selfish vlog titles") — те
 * привязаны к конкретной нише/персоне (skincare/beauty), не являются
 * переиспользуемым приёмом в том смысле, в каком остальные записи
 * являются, тот же принцип, что исключение сезонных идей "на июль" из
 * доп. файла (D-0030 п. 6). Стр. 16–130 (114 страниц) СОЗНАТЕЛЬНО не
 * загружены этим шагом — материал для следующих узких шагов.
 *
 * Из "Полное руководство дополнительно.pdf" — загружено всё, КРОМЕ
 * Раздела 2 (идеи для сезонного контента "на примере июля") — тот
 * привязан к конкретному месяцу/сезону, не является переиспользуемым
 * приёмом в том смысле, в каком остальные записи являются.
 */

const GUIDE = 'Полное руководство.pdf';
const GUIDE_SUPPLEMENT = 'Полное руководство дополнительно.pdf';

export interface SeedEntry {
  categories: string[];
  title: string;
  content: string;
  source: string;
  sourceSection: string;
}

export const entries: SeedEntry[] = [
  // --- из "доп. файла": Раздел 1, фундамент контент-стратегии ---
  {
    categories: ['content_strategy'],
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
    categories: ['headline_rule'],
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
    categories: ['headline_rule'],
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
    categories: ['headline_rule'],
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
    categories: ['headline_rule'],
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
    categories: ['headline_rule'],
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
    categories: ['headline_rule'],
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
    categories: ['headline_rule'],
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
    categories: ['hook_template'],
    title: 'Понедельник: хук с середины предложения (Mid-Sentence Hook)',
    content: [
      'Принцип: создаёт иллюзию, что зритель "включился" в уже идущий интересный разговор, заставляя досмотреть до контекста.',
      'Шаблоны: "But what they don\'t tell you is _____", "Since we\'re already on the topic, this is EXACTLY why _____", "And somewhere along the way, I realized _____", "So basically long story short is _____", "And the craziest part is _____", "But the truth is _____", "Since we\'re already here, we might as well talk about the fact that _____", "And that\'s exactly the problem _____", "No because _____", "And that\'s where you\'re wrong, because _____", "So the point I\'m trying to make is _____", "And the scariest part is that _____", "Which brings me to my next point _____", "While we\'re on the subject _____", "And the part nobody talks about is _____", "But lowkey, that\'s when everything started to change...", "Because what you\'ll eventually come to realize is _____".',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 1, Понедельник',
  },
  {
    categories: ['hook_template'],
    title: 'Вторник: хук со смелым заявлением (Bold Claim Hook)',
    content: [
      'Принцип: категоричное, громкое или провокационное утверждение, вызывающее желание проверить или оспорить факт.',
      'Шаблоны: "Whoever said _____ clearly wasn\'t _____", "We\'ve been doing _____ wrong", "I was today years old when I realized I have the best [ВСТАВИТЬ]", "This is a hill I\'m willing to die on", "This might ruin _____ for you but _____", "If we were best friends I\'d tell you right to your face that _____", "You SAY you have the best _____ but it\'s missing _____", "Hottest take of the year:", "The internet convinced us _____, but I\'m here to tell you _____", "No one is doing this better than I am", "Show me a better _____, I\'ll wait", "Chose chaos today and decided you need to know that you\'re doing _____ wrong", "This is the blueprint and no one else can convince me otherwise", "Nothing is going to top this".',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 1, Вторник',
  },
  {
    categories: ['hook_template'],
    title: 'Среда: хук с обратной психологией (Reverse Psychology Hook)',
    content: [
      'Принцип: запрет или сдерживание ("не смотри", "пропусти") мгновенно подстёгивает любопытство пользователя.',
      'Шаблоны: "Let\'s not even talk about _____, let\'s just do something about it", "If you\'re already a makeup guru, scroll away this is not for you", "Do not look at the pile of clothes on my chair- this is the outfit we\'re going with", "You might not want to watch this if _____", "This will only make sense if you\'ve been feeling stuck", "Whatever you do, don\'t save this unless you want _____", "If you don\'t want your life to get easier, skip this", "This is NOT for you if _____", "Scroll past this video unless you\'re [конкретная аудитория]", "If you want to stay [текущая проблема], keep scrolling", "DON\'T GO to _____ unless you literally want to dream of going back 24/7", "Don\'t judge my _____, but I just had to tell you _____".',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 1, Среда',
  },
  {
    categories: ['hook_template'],
    title: 'Четверг: исследующий / провокационный хук (Probing Hook)',
    content: [
      'Принцип: создаёт моментальное напряжение и вовлекает в дискуссию или комментарии.',
      'Шаблоны: "This is going to sound mean, but I\'m genuinely asking _____", "Can someone explain why _____", "I\'m not saying this to start drama, I actually want to know _____", "You\'re delaying your own happiness by making it contingent on _____", "You\'re keeping yourself stuck by _____", "I say this with no love whatsoever, _____", "You don\'t NEED _____, what you really need is _____", "Those of you who don\'t like what I\'m about to say are probably the ones who need to hear it the most", "You said you wanted the truth so _____", "I hate to be the one to have to tell you this but _____", "I\'m not in the mood to sugarcoat so: _____", "I\'m literally going to hurt my OWN feelings when I say this but _____".',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 1, Четверг',
  },
  {
    categories: ['posting_schedule'],
    title: 'Пятница: выходной / перерыв в публикациях',
    content:
      'Пятница традиционно является днём с наименьшей вовлечённостью (low engagement day) — публикации в этот день лучше пропускать, не тратить хук на низкий охват.',
    source: GUIDE,
    sourceSection: 'Раздел 1, Пятница',
  },
  {
    categories: ['hook_template'],
    title: 'Суббота: хук через уязвимость (Vulnerability Hook)',
    content: [
      'Принцип: искренность и эмоциональная открытость вызывают эмпатию и чувство близости у аудитории.',
      'Шаблоны: "20 somethings please rise because if you\'re feeling like you\'re not where you want to be in life this is for you", "There is a delulu part of me that thinks this might end up on your for you page for a reason", "Not to be dramatic but I think I\'ve officially outgrown a version of my life and if you\'re in the same boat let\'s workshop this together", "I\'m lowkey embarrassed to admit this but _____", "Here goes nothing...", "I tried to convince myself NOT to post this but _____", "Going to put myself out there before I overthink it but _____", "Can we enter our \\"something needs to change\\" era together?", "Normalize being sad about not _____ and let\'s try to change it together", "This could go either way but you always have to bet on yourself so _____", "This couldn\'t be more out of my comfort zone but _____".',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 1, Суббота',
  },
  {
    // D-0033: этот хук по содержанию одновременно и шаблон хука (одна из
    // семи "дневных" техник), и правило заголовка — текст буквально
    // приводит ту же "не надо/надо" схему, что headline_rule. Найдено
    // при беглом обзоре 23 записей во время миграции на теги, как и
    // просила Olga.
    categories: ['hook_template', 'headline_rule'],
    title: 'Воскресенье: заголовок с крупной типографикой (Headline Typography Hook)',
    content: [
      'Принцип: публикация карусели или видео в стиле влога, где заголовок крупным шрифтом выступает главным визуальным хуком, а не текст описания.',
      'Правило составления (из "Make Your Headline a Hook"): не надо — "My Nail VLOG", "My Outfit", "My Beauty Routine"; надо — "Anti Basic Nails", "Cool Girls Don\'t Copy", "Niche-Girl Beauty".',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 1, Воскресенье',
  },

  // --- из "Полное руководство.pdf": Раздел 2, тренды монтажа (Task 9.6) ---
  {
    categories: ['editing_style'],
    title: 'PNG-стикеры (PNG Stickers)',
    content: [
      'Назначение: привлечение визуального внимания и увеличение досмотров.',
      'Быстрый способ создания (Instagram Edits за 2 секунды): в редакторе открыть вкладку Overlay (Наложение) → выбрать функцию Cutout (Вырезка) → нажать на нужный предмет на фотографии → объект моментально превращается в PNG-стикер и накладывается поверх видео.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 2, приём 1',
  },
  {
    categories: ['editing_style'],
    title: 'Крупная типографика в заголовках как монтажный тренд (Headline Typography)',
    content: [
      'Назначение: текст настолько крупного размера, что его невозможно проигнорировать.',
      'Преимущества для алгоритма: выводит контент на страницу рекомендаций (Instagram Discovery Page); быстро передаёт архетип платформы и бренда; привлекает целевую аудиторию с минимальными затратами времени.',
      'Примеры использования: "Sidequest ideas for the curious girl", "Polka dot smock", "How to edit vlogs", "Books for overthinkers".',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 2, приём 2',
  },
  {
    categories: ['editing_style'],
    title: 'Эффект коллажа (Collage Effect)',
    content: [
      'Назначение: замена устаревших, хаотичных и быстрых интро, которые вызывали у зрителей перенасыщение.',
      'Принцип: наслоение визуальных элементов (вырезок, текста, эстетичных кадров) создаёт богатый сенсорный эффект, удерживает внимание, но не перегружает восприятие.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 2, приём 3',
  },

  // --- из "Полное руководство.pdf": Раздел 3 (только стр. 8–11 — сама
  // "стратегия диверсификации по платформам и переиспользования", Task 9.6) ---
  {
    categories: ['platform_strategy'],
    title: 'Сравнение алгоритмов платформ (TikTok / Instagram / YouTube)',
    content: [
      'Каждая соцсеть — часть единой воронки роста (growth funnel) для личного бренда. Цель — не создавать 3 разных бренда, а 3 разные версии одной и той же идеи под задачи алгоритма каждой платформы.',
      'TikTok: фокус алгоритма на контенте (content-focused); метрики — лайки, процент досмотра (completion rate), повторные просмотры (replays), время просмотра.',
      'Instagram: фокус алгоритма на сообществе (community-focused); метрики — пересылки в личные сообщения (DM shares), сохранения, комментарии.',
      'YouTube: фокус алгоритма на времени просмотра (watch-time focused); метрики — общее количество просмотренных минут, длительность удержания аудитории.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, сравнение платформ',
  },
  {
    categories: ['platform_strategy'],
    title: 'Что публиковать в TikTok',
    content: [
      '1-3 min chatty videos, unedited (разговорные видео на 1–3 минуты без монтажа).',
      'Facetime style content (контент в стиле видеозвонка по FaceTime).',
      '7-15 second dance trends (трендовые танцы на 7–15 секунд).',
      'Messy, unpolished content (живой, неидеальный контент).',
      'Storytimes (истории из жизни).',
      'Longer tutorials (длинные туториалы).',
      'Multiple Signature series (несколько постоянных рубрик/серий).',
      'Hyper-specific niche content that feels like an inside joke — Yappy formats (узконишевый контент, понятный только "своим").',
      'Unpopular Opinions (непопулярные мнения).',
      'In-depth Product Reviews (детальные обзоры товаров).',
      'Commentary on pop culture or current events (комментирование поп-культуры или событий).',
      'Behind the scenes content (закулисье / бэкстейдж).',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, что публиковать в TikTok',
  },
  {
    categories: ['platform_strategy'],
    title: 'Что публиковать в Instagram',
    content: [
      'Finishing touches videos (видео с финальными штрихами и деталями).',
      '7-15 second text-on-screen trends or audio trends (тренды с текстом на экране или аудио на 7–15 секунд).',
      '1 Signature Series (одна ключевая авторская рубрика).',
      'Routine based content that people want to save (полезный контент с рутиной/советами, который сохраняют).',
      'Polished VLOGS (красиво смонтированные, эстетичные влоги).',
      'Glow up tips (советы по преображению и уходу).',
      'Strategic headline typography (заголовки с крупной типографикой).',
      'VLOG style carousels (карусели в стиле фото-влога).',
      'Mini Tutorials (короткие туториалы).',
      'Educational Content (обучающий контент).',
      'Product Recs (рекомендации продуктов).',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, что публиковать в Instagram',
  },
  {
    categories: ['platform_strategy'],
    title: 'Что публиковать на YouTube',
    content: [
      '8-20 minute storytelling videos (истории и сторителлинг на 8–20 минут).',
      'Long-form vlogs with a clear beginning, middle, and end (длинные влоги со структурой: завязка, кульминация, развязка).',
      'Deep-dive educational content (глубокий обучающий контент).',
      'Challenge and transformation series (челленджи и серии про трансформации).',
      'Timestamped videos of your entire day from start to finish (видео дня от начала до конца с таймкодами).',
      'Behind-the-scenes of building your business or life (закулисье создания бизнеса или личной жизни).',
      'Documenting long-term goals and progress (документирование долгосрочных целей и процесса).',
      'Tutorials with real depth instead of quick tips (полноценные руководства вместо быстрых советов).',
      'Seasonal series and episodic content (сезонные и эпизодические серии).',
      'Room makeovers, resets, declutters, and projects (ремонт, перестановка, расхламление и проекты).',
      'Honest conversations and life updates (честные разговоры и новости из жизни).',
      'Product reviews and comparisons (обзоры и сравнения продуктов).',
      '"Everything I learned..." recap videos (итоговые видео формата «Всё, чему я научился(лась)...»).',
      'Documentary-style personal journeys (личные путешествия и история в документальном стиле).',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, что публиковать на YouTube',
  },
  {
    categories: ['platform_strategy'],
    title: 'Схема переиспользования единого контента между платформами (Content Repurposing Example)',
    content: [
      'Базовый источник: одно длинное видео для YouTube на 10–20 минут (например, "10 Min: Secrets To Getting Glass Skin VLOG").',
      'Адаптация для TikTok: короткая нарезка на 30 секунд; аудиодорожка из YouTube-видео (7–15 секунд), наложенная на другой фоновый видеоряд; короткое 1-минутное видео по теме («1 Min Holistic skincare routine that WORKS part 1»); 1-минутный честный отзыв об опробованном средстве из видео.',
      'Адаптация для Instagram: эстетичный 30-секундный ролик («30 Second Pick out my acne-fighting products with me»); две 15-секундные тизер-сторис со ссылкой на полное YouTube-видео; короткая текстовая цитата в формате поста/Threads; 7–15-секундное трендовое эстетичное видео («7-15 Sec. Show yourself trying a new product»).',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, схема переиспользования',
  },

  // --- из "Полное руководство.pdf": Раздел 3, стр. 11–15 (Task 9.7) —
  // первая атомарная часть после платформенной стратегии, ДО того, как
  // содержание уходит в нишевые банки идей (не загружены, см. заголовок
  // файла) ---
  {
    categories: ['content_strategy'],
    title: 'Стратегия позиционирования «Comfort Creator»',
    content: [
      'Концепция: создатель контента, предлагающий аудитории уют, безопасность и вдохновение, в противовес традиционному демонстративному или агрессивному блогингу.',
      'Три шага реализации: 1) выбор постоянной рубрики (сериала); 2) создание безопасного пространства для общения с аудиторией (например, регулярные честные вопросы о её состоянии и потребностях); 3) публикация успокаивающего, не давящего контента.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, стратегия Comfort Creator',
  },
  {
    categories: ['content_strategy'],
    title: 'Формат микро-сериала на 30 дней, адаптированного под нишу',
    content: [
      'Принцип: короткий (30-дневный) тематический сериал с собственным названием и специфическим углом, привязанным к конкретной нише автора, а не общий шаблон, одинаковый для всех ниш.',
      'Даёт аудитории специфичную, узнаваемую концепцию для регулярного возвращения, вместо разового поста без продолжения.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, микро-сериалы',
  },
  {
    categories: ['vlog_strategy'],
    title: 'Принципы «идеального влога» (уход от банальных форматов)',
    content: [
      'Принцип: уходить от банальных форматов влогов ("день из жизни", "что я ем за день"), делая контент интересным для зрителя, а не просто хроникой.',
      'Три инструмента: 1) главная сюжетная линия (overarching storyline) вместо набора несвязанных сегментов; 2) уникальный визуальный стиль (кинематографичный монтаж, тройной сплит-скрин с таймкодами, карусели); 3) смещение фокуса с демонстрации собственной жизни на ценность для зрителя.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, THE ART OF THE PERFECT VLOG',
  },
];

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
 * (Тренды монтажа, Task 9.6, целиком), буквально одноимённая часть
 * Раздела 3 (стр. 8–11, Task 9.6), стр. 11–15 (Task 9.7), стр. 16–35
 * (Task 9.8) и стр. 36–62 (Task 9.9 — функция Instagram Instants,
 * структура контент-столпов (тип/якорь+вспомогательные), долгосрочный
 * фундамент vs. постановочный инфлюенсинг, позиционирование через
 * архетип платформы, шрифтовая система, текстовые оверлеи через Canva,
 * оформление Stories, кросс-платформенный цикл роста TikTok↔Instagram,
 * новый визуальный тип хука, реаранжировка рутины под серию, оптимизация
 * био, выход из «View Jail»; новая категория — `bio_strategy`).
 *
 * ЧЕСТНО ЗАФИКСИРОВАНО (см. DECISIONS.md D-0032): заголовок "Раздел 3" в
 * документе не меняется до самого конца (стр. 130), но содержание
 * фактически перестаёт быть одной темой уже на стр. 11 — это расшифровки
 * множества разных отдельных видео. НЕ включены (тот же принцип, что
 * исключение сезонных идей "на июль" из доп. файла, D-0030 п. 6):
 * банки нишевых идей и заголовков (списки "Comfort Creator" по нишам,
 * "Unique Signature Series", "content ideas for comfort creators", "anti-AI
 * content ideas", "vlog storylines", "non-selfish vlog titles", списки
 * Lifestyle/Emotional/Value/Ritual Content Pillars, 12 архетипов платформы
 * целиком, майские нишевые концепции сериалов — сезонная привязка, как
 * июльские идеи доп. файла) — привязаны к конкретной нише/персоне/сезону,
 * не переиспользуемый приём. Также НЕ включены (честно исключённое по
 * другой причине — не нишевая привязка, а дубликат/не по теме): таблица
 * "I-Centric → We-Centric" (дублирует `headline_rule` Правило 1); тренд
 * "Micro-Series" из MID YEAR TREND SPOTTING (дублирует формат 30-дневного
 * микро-сериала, Task 9.7); "Digital Diet" (дублирует метафору
 * "контентных шор"); бизнес-автоматизация через Gusto/EIN/payroll (вне
 * области ContentKnowledge); "Экран 3: business studio" (конкретные
 * банковские приложения одного автора). Из "Unique Hook Schedule"
 * (стр. 53–58, Task 9.9) — 5 из 6 дней дублируют уже загруженные хуки
 * (Truth Bomb/Vulnerability/Reverse Psychology/Friday off/собственно
 * Bold Claim под другим названием — общий шаблон "Whoever said ___
 * clearly wasn't ___" совпадает буквально) — загружен только один
 * genuinely новый тип, Unexpected Visual Hook (среда). Стр. 63–130
 * (67 страниц) СОЗНАТЕЛЬНО не загружены этим шагом — материал для
 * следующих узких шагов.
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

  // --- из "Полное руководство.pdf": Раздел 3, стр. 16–35 (Task 9.8) ---
  {
    categories: ['platform_strategy'],
    title: 'Функция Instagram «Серии» (Series) как инструмент удержания',
    content: [
      'Функция превращает профиль в формат мини-телешоу: отдельный хаб для рубрики на профиле + кнопка «Watch next»/«Keep watching» на роликах. Стратегический сдвиг: от органайзерской функции к функции удержания (retention) и узнаваемости (recognizability) — увеличивает охваты и подписки за счёт «серийного» просмотра.',
      'Настройка: обложка, чётко определяющая рубрику; понятное описание-синопсис, цепляющий до просмотра. Смена установки автора: не «что запостить на этой неделе», а «какой новый эпизод на этой неделе». Стандартные форматы (простое «get ready with me») больше не работают внутри серии — нужен уникальный концепт.',
      'Эпизодические серии: зрителям важен контекст (пошаговый процесс), в серию добавляется каждый выпуск. Неэпизодические серии: контекст не нужен, добавляются только лучшие/захватывающие ролики.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, функция Series',
  },
  {
    categories: ['headline_rule'],
    title: '3 функции заголовка (Pique curiosity / Instantly relate / Explain the value)',
    content: [
      '1. Pique curiosity (вызывать любопытство) — заголовок ставит вопрос или намекает на неожиданное: "anti basic nails", "what do you think should be trending right now", "Where Do All The Birds Go?".',
      '2. Instantly relate (вызывать моментальный эмоциональный отклик) — заголовок называет узнаваемое чувство/переживание: "essays to read when you feel like giving up", "social media has completely broken our idea of normal".',
      '3. Explain the value (разъяснять пользу без необходимости включать звук) — заголовок сам по себе понятен и полезен: "HOW TO POSE IN PICTURES", "your hairplan for the week", "ACNE PRONE AM SKINCARE ROUTINE".',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, функции заголовка',
  },
  {
    categories: ['content_strategy'],
    title: 'Тренд необычных увлечений (Unexpected Obsessions / Hyper-fixations)',
    content: [
      'Принцип: демонстрация своего неожиданного, нестандартного увлечения (не общепринятой ниши) делает личный бренд мгновенно узнаваемым. Примеры увлечений из видео: сардины, винтажное серебро, лобби отелей.',
      'Суть — выбрать и подчеркнуть СВОЁ подлинное неожиданное увлечение как фирменный знак, а не копировать чужую нишу.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, MID YEAR TREND SPOTTING, тренд 1',
  },
  {
    categories: ['content_strategy'],
    title: 'Вдохновение вне соцсетей (Inspo From NON-Social Media Sources)',
    content: [
      'Принцип: отход от Pinterest/Instagram/TikTok как источника вдохновения в пользу культуры вне соцсетей — фильмы (например, Nancy Meyers), старые журналы, отели, винтажные кулинарные книги.',
      'Формула: заимствовать у культуры, а не копировать у других авторов (borrowing from culture vs. copying from creators).',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, MID YEAR TREND SPOTTING, тренд 2',
  },
  {
    categories: ['content_strategy'],
    title: 'Стратегия «messy creator» — документирование вместо игры на камеру',
    content: [
      'Принцип: аудитория вознаграждает создателей за документирование реальности, а не за чрезмерную игру на камеру (Documenting >> Over-performing). Девиз: «Figure It Out With Me».',
      'Контент строится вокруг процесса, ошибок и несовершенства, а не отполированного перформанса — честность о том, что не всё идеально, вместо демонстрации безупречности.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, MID YEAR TREND SPOTTING, тренд 3',
  },
  {
    categories: ['content_strategy'],
    title: 'Анти-ИИ позиционирование контента',
    content: [
      'Контекст: усталость аудитории от повсеместного ИИ (AI fatigue) — контент с выраженной «человечностью» получает высокие охваты и вовлечённость. Позиционирование автора как «comfort creator», создающего безопасное пространство для оригинальных, человеческих идей.',
      'Ключевой вывод: выигрывают не те, кто использует больше всего ИИ, а те, чей контент ощущается наиболее человечным.',
      'Два уровня сложности: low-effort (короткое видео/текст в духе «AI could literally never» с реальным, неидеальным процессом — готовка, рукоделие, флористика); high-effort (развёрнутый разбор того, почему конкретные материальные, сложно воспроизводимые ИИ вещи ценятся аудиторией — например, броши, винтаж, hand-made изделия).',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, Anti-AI content trend',
  },
  {
    categories: ['workflow_system'],
    title: 'Система четырёх кварталов дня + микро-календари для контент-креатора',
    content: [
      'Микро-календари: отдельный календарь на каждый повторяющийся аспект работы/жизни (административные задачи, съёмка контента, монтаж, встречи, публикация, тренировки) — для фокуса на конкретной категории, не общем списке дел.',
      'День делится на 4 блока с конкретной измеримой целью на каждый: Q1 — утро, Q2 — середина дня, Q3 — день, Q4 — вечер. Если цель утреннего блока не выполнена, остаётся ещё три возможности за день.',
      'Цветовое кодирование календарей как визуальный ярлык — календарь должен быть «безопасным пространством, которое вдохновляет», не «кричит» на автора.',
      'Повторяющиеся события — для батчинга однотипных задач/контента (например, фиксированный день недели под съёмку, отдельный под монтаж).',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, календарная система + 4 квартала',
  },
  {
    categories: ['platform_strategy'],
    title: 'Карусель Instagram как сторителлинг (подписи к каждому слайду)',
    content: [
      'Обновление IG-каруселей: отдельная подпись к каждому слайду вместо текста поверх фото — поощряет сторителлинг и добавляет контекст без визуального наложения. Карусель начинает ощущаться как микро-влог или мини-документалка.',
      'Возможности формата: элемент истории (storytime), контекст к каждому слайду (например, что за место или деталь наряда), ценные выводы, забавные/relatable истории.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, обновление каруселей',
  },
  {
    categories: ['content_format_template'],
    title: 'Шаблоны карусели с заполнением по формуле (Hierarchy / Formula)',
    content: [
      '«___ Hierarchy» — карусель-ранжирование в своей нише (например: skincare hierarchy, haircare hierarchy, bookish hierarchy), один пункт ранжирующей системы на слайд.',
      '«___ formula» — пошаговая формула по теме (например: outfit formula, dream-life formula, lasting makeup formula), один элемент формулы на слайд с пояснением в подписи.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, идеи для карусели',
  },
  {
    categories: ['platform_strategy'],
    title: 'Trial Reels — тестирование контента как рыночные данные',
    content: [
      'Частота: 1–3 trial reels в неделю. Распределение: 1–2 — переиспользование старого контента (осторожно: повторная публикация дублированного контента может по-разному оцениваться алгоритмом как «свежий» или как дубль); 1–2 — эксперимент с новым форматом, закадровым голосом или речью на камеру.',
      'Метрики для анализа как рыночные данные (market data): view rate (процент просмотров), average watch time (среднее время просмотра).',
      'При успешных показателях — опубликовать в Stories и спросить мнение аудитории. Перенос в основную ленту: (1) авто-публикация Instagram по внутренним метрикам эффективности, ИЛИ (2) ручное правило 48 часов — подождать 48 часов, оценить реальную вовлечённость (комментарии/репосты), затем вручную включить публикацию в ленту.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, Trial Reels',
  },
  {
    categories: ['hook_template'],
    title: 'Storytime Hook (ощущение звонка другу по FaceTime)',
    content: [
      'Принцип: создаёт у зрителя ощущение, что автор доверительно рассказывает историю, как другу по FaceTime.',
      'Шаблоны: "I don\'t want to get into the backstory, but in 2024, this is a...", "This probably should\'ve stayed in the group chat", "I don\'t need to get into the lore of this but ___", "I don\'t want to expose myself like this but ___", "Not to air out dirty laundry but", "I have absolutely no business sharing this", "I regret to inform you that ___", "Long story short", "I don\'t mean to spill the beans but", "Not to open this can of worms but ___", "I fear it\'s time we discuss ___".',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, UNIQUE HOOKS, тип 1',
  },
  {
    categories: ['hook_template'],
    title: 'Shock Humor Hook (неожиданная фраза)',
    content: [
      'Принцип: совершенно неожиданная, абсурдная фраза в начале видео — удерживает внимание и обладает вирусным потенциалом для использования звука другими авторами.',
      'Пример из видео: "And sometimes the outfit is titty. Have we just thought about that????"',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, UNIQUE HOOKS, тип 2',
  },
  {
    categories: ['hook_template'],
    title: 'Truth Bomb Hook (конфронтационная правда)',
    content: [
      'Принцип: слегка конфронтационное, но правдивое заявление, бьющее точно в цель по узнаваемой проблеме аудитории.',
      'Шаблоны: "everyone wants the skincare routine until I bring up sardines", "People always swear they want a regulated nervous system until I bring up alcohol", "Funny how everyone\'s obsessed with making passive income until I bring up consistency", "You love the idea of getting abs until I tell you about the sacrifices you need to make", "You romanticize your dream life until I bring up all the work you need to do to get there", "We could talk about healing alllll day but the second I bring up boundaries you exit the chat".',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, UNIQUE HOOKS, тип 3',
  },
  {
    categories: ['hook_template'],
    title: 'Keep-the-Mistake Hook (осознанно оставленная оговорка)',
    content: [
      'Принцип: намеренно не вырезать оговорку, запинку или неудачное начало из видео, а оставить и начать заново прямо в кадре — мгновенно делает автора более живым и близким к зрителю (immediately relatable).',
      'Пример из видео: автор запинается на фразе "Woke up in my oura ring..." и начинает заново, не вырезая этот дубль.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, UNIQUE HOOKS, тип 5',
  },
  {
    categories: ['workflow_system'],
    title: 'Организация телефона как центра создания контента (2 экрана по назначению)',
    content: [
      'Философия: телефон — либо главный инструмент продуктивности, либо главный отвлекающий фактор. Цель — превратить его в полноценный центр создания контента (content creation hub) и исключить бессмысленный скроллинг (doom scrolling).',
      'Экран 1 «content creation studio» — виджеты для СОЗДАНИЯ, не потребления контента: виджет быстрого создания поста/Reels, виджет сообщений для ответа комьюнити, мудборд для вдохновения, поиск трендов и аналитики платформы.',
      'Экран 2 «planning & editing studio» — виджеты для управления временем и монтажа: заметки для фиксации идей, календарь для жёсткого тайм-менеджмента (например, отдельные слоты на съёмку и монтаж), приложения для графического дизайна, обработки фото, монтажа видео и планирования выхода контента.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'Раздел 3, организация телефона (экраны 1-2)',
  },

  // --- из "Полное руководство.pdf": Раздел 3, стр. 36–62 (Task 9.9) ---
  {
    categories: ['platform_strategy'],
    title: 'Instagram Instants — быть ранним пользователем новых функций платформы',
    content: [
      'Instants — камера без редактирования специально для друзей: цель делиться неотредактированным, повседневным контентом (более casual, чем Stories), реакции на него приватны (видят только автор и реагирующий). Найти: значок стопки фото в правом нижнем углу личных сообщений.',
      'Стратегическое значение: аудитория устала от переотредактированного, постановочного контента — менее отполированный формат сигнализирует более крупный тренд в соцсетях.',
      'Общий принцип: ранние пользователи новых функций платформы получают преимущество алгоритма — начинать использовать новую функцию сразу, не дожидаясь, пока к ней присоединятся все остальные.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'стр. 36-37, функция Instagram Instants',
  },
  {
    categories: ['content_strategy'],
    title: 'Четыре типа контент-опор по функции (Lifestyle / Emotional / Valuable / Ritual)',
    content:
      'Классификация 4-5 контентных столпов не по теме, а по ФУНКЦИИ для аудитории: Lifestyle — ощущение личного знакомства с автором; Emotional — ощущение, что аудитория узнаёт себя в авторе; Valuable — ощущение практической пользы; Ritual — то, что заставляет возвращаться и смотреть контент "запоем" (обычно становится фирменной еженедельной серией).',
    source: GUIDE,
    sourceSection: 'стр. 37, четыре темы контент-опор',
  },
  {
    categories: ['content_strategy'],
    title: 'Content Anchor + Supporting Pillars — структура и частота публикации по столпам',
    content: [
      'Content Anchor (якорный столп) — главная категория, по которой узнают автора, публикуется чаще остальных (рекомендуется около 3 раз в неделю).',
      'Supporting Pillars (вспомогательные столпы) — 3 дополнительные категории, отражающие другие интересы, публикуются 1–2 раза в неделю каждая.',
      'Правило детализации: быть конкретным в формулировке столпа (не просто "real estate", а "luxury Miami real estate").',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'стр. 41, Content Pillar Strategy',
  },
  {
    categories: ['posting_schedule'],
    title: 'Продвинутое недельное расписание публикаций по форматам',
    content: [
      'Секрет — сбалансированный график, не перегруженный (например, достаточно одного 30-секундного ролика среднего усилия в неделю).',
      'Понедельник: 30-секундный reel/TikTok + 5-8 stories + 1 опциональный trial reel. Вторник: 1 карусель + 5-8 Q&A stories. Среда: 1-минутный reel фирменной серии (higher effort) + 5-8 stories + 1 опциональный trial reel. Четверг: 7-15-секундный reel/TikTok (low effort) + 5 интерактивных stories. Пятница: перерыв (пятница не даёт хорошего engagement) или короткий 7-15-сек reel. Суббота: 1 карусель, без stories (сброс IG Story). Воскресенье: 1-минутный vlog-style reel/TikTok (higher effort) + 5-8 stories.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'стр. 38-39, ADVANCED POSTING SCHEDULE',
  },
  {
    categories: ['content_strategy'],
    title: 'Долгосрочный фундамент против постановочного инфлюенсинга — 4 категории контента',
    content: [
      'Проблема перенасыщения "постановочным контентом" (performative influencing) — размывается грань между органической демонстрацией жизни и контентом ради просмотров/лайков. Риск: авторы, построившие идентичность исключительно на трендах, не смогут перепозиционировать себя как заслуживающих доверия экспертов, когда тренд схлынет. Правило баланса: трендовый контент допустим, но не должен быть основой стратегии — выигрывают авторы с долгосрочным фундаментальным подходом.',
      '4 категории долгосрочного контента: (1) Community-driven — давать аудитории столько же, сколько получаешь, показывать, что реально слушаешь сообщество; (2) Personality-driven — показ настоящей, незаглаженной стороны жизни вместо "идеальных" рутин; (3) Serialized signature series — узнаваемая "цифровая ДНК", выделяющая автора; (4) Trustworthy content — искренность, де-инфлюенсинг, честные обзоры, снижение психологического давления на аудиторию.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'стр. 43-46, Trustworthy content vs Performative influencing',
  },
  {
    categories: ['content_strategy'],
    title: 'Позиционирование через архетип платформы (Platform Archetype)',
    content: [
      'Принцип: выбрать узнаваемый архетип личности вместо узкой ниши как основу стратегии (примеры реальных блогеров из видео: "The Hot Mess", "The Aesthetic Muse", "The Big Sister", "The Grounded Barbie").',
      '4-шаговый процесс: (1) выбрать архетип; (2) определить 4-5 контент-столпов, поддерживающих архетип; (3) визуальная идентичность, совпадающая с архетипом — цель, чтобы зритель с первой секунды попадал в особый, узнаваемый мир; (4) создать фирменную серию, с которой ассоциируется автор — работает только через постоянное повторение, не через случайность, и укрепляет архетип.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'стр. 47-49, Platform Archetype',
  },
  {
    categories: ['editing_style'],
    title: 'Один основной + один вторичный шрифт для узнаваемости бренда',
    content: [
      'Основной шрифт (Primary Font) — для заголовков на экране: должен быть предельно чётким и легко читаемым, иначе зрители просто пролистнут видео. Выбрать ОДИН шрифт и использовать его постоянно для узнаваемости личного бренда.',
      'Вторичный шрифт (Secondary Font) — для автоматических субтитров, которые должны присутствовать в каждом видео с речью; работает вместе с основным шрифтом для единого фирменного стиля.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'стр. 50-51, Fonts & Signature Style',
  },
  {
    categories: ['editing_style'],
    title: 'Кастомный текстовый оверлей через Canva (Text Pop-Ups)',
    content:
      'Шаги: выбрать нужный шрифт в Canva → написать текст → сохранить файл как PNG с обязательно включённой опцией "Transparent background" → загрузить получившийся файл как наложение (overlay) поверх видео.',
    source: GUIDE,
    sourceSection: 'стр. 51, Text Pop-Ups',
  },
  {
    categories: ['editing_style'],
    title: 'Оформление Instagram Stories: фон + фото/PNG + шрифты',
    content: [
      'Всегда использовать фон (сплошной цвет или скачанный из Google/Pinterest), чтобы скучная история стала привлекательнее.',
      'Добавление изображений — собственные фото или PNG из Pinterest: либо long-press+copy+paste напрямую в Story, либо через функцию Instagram cutout (для часто используемых картинок — сохраняются в приложении и переиспользуются без повторного копирования, обеспечивая консистентность).',
      'Шрифты: чередовать пару встроенных шрифтов Instagram; при необходимости дополнительного эффекта — тот же обходной путь через Canva (шрифт → текст → PNG с прозрачным фоном → загрузить в Story).',
      'Планировать все Stories заранее на всю неделю вперёд.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'стр. 51-52, IG Story Tutorial',
  },
  {
    categories: ['platform_strategy'],
    title: 'Кросс-платформенный цикл роста TikTok ↔ Instagram',
    content: [
      'Правило: использовать TikTok для роста в Instagram, и Instagram для роста в TikTok. TikTok Creator Search Insights показывает темы на подъёме (не достигшие пика) — TikTok обычно на несколько шагов впереди в поисковом поведении, использование его инсайтов "кормит" алгоритм тем, что он ищет. Порядок создания: сначала видео для TikTok, затем адаптация под Instagram.',
      'Разница алгоритмов: TikTok favors длинный, разговорный формат, менее отполированный (действует как подкаст); Instagram favors контент до 1:30, отполированный, лаконичный (действует как промо-ролик).',
      'Замыкание цикла роста: указать хэндл другой платформы в био; использовать комментарии/подписи, чтобы направлять аудиторию на другую платформу; использовать интерактивные Stories для полного цикла между платформами.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'стр. 52-53, Instagram & TikTok Growth Strategy',
  },
  {
    categories: ['hook_template'],
    title: 'Unexpected Visual Hook (неожиданное визуальное/физическое действие)',
    content: [
      'Принцип: сочетание неожиданного визуального действия или фонового движения с вовлекающей темой разговора — привлекает внимание за счёт визуального, не текстового, крючка.',
      'Примеры действий: натянуть капюшон на голову в начале видео; "испортить" макияж/подводку; уронить солнцезащитные очки во время речи; взять сумку, будто уходишь, но остановиться поговорить; собирать/завивать волосы во время речи; начать видео в машине; держать еду, разговаривая, но не есть её; лёгкая тряска камеры в начале, будто телефон только что поставили снимать; наносить блеск для губ или духи прямо во время речи; помешивать айс-кофе во время речи; половина макияжа с бьюти-блендером в руке; вставлять серёжки; наливать бокал вина в начале видео (формат рант-сессии); зажигать свечу перед началом речи.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'стр. 55-56, Unique Hook Schedule, среда',
  },
  {
    categories: ['content_strategy'],
    title: 'Реаранжировка обыденной рутины под фирменную серию (Un-Complicating Content)',
    content: [
      'Принцип: "ты и есть контент, твоя жизнь и есть ниша" — рутинные, на первый взгляд "скучные" действия (обычный рабочий день, уход за кожей) переупаковываются под цепляющее название фирменной серии вместо того, чтобы считаться недостаточно интересными для публикации.',
      'Пример техники: обычный рабочий день → серия "Doing It Tired Diaries"; рутина ухода за кожей → серия под атмосферным, "чатти" названием вместо прямого "skincare routine". То же применимо к контенту про наряды — не "мои наряды недостаточно уникальны/дороги", а стратегическая подача под цепляющим заголовком, показывающая, как повторить образ дешевле.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'стр. 58, Un-Complicating Content',
  },
  {
    categories: ['bio_strategy'],
    title: 'Оптимизация шапки профиля (Bio) — «почему остаться», не «кто я»',
    content: [
      'Принцип: шапка профиля — «главная цифровая недвижимость» аккаунта, у посетителя есть менее 3 секунд, чтобы решить, остаться ли. Главная ошибка — оформлять био как резюме или сухую рекламную подачу.',
      'Правильный подход: транслировать «вот почему тебе стоит остаться», а не просто «вот кто я».',
      'Пример трансформации: было — «Everyday mom life made easier» (обобщённо, подходит под тысячи аккаунтов); стало — «A digital home for busy moms», «Powered by strong coffee & a color-coded calendar» (специфично, с характером, легко узнаваемо).',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'стр. 59-61, Bio-Hacking Your IG Bios',
  },
  {
    categories: ['platform_strategy'],
    title: 'Выход из «View Jail» (падения просмотров) — 4-шаговая формула',
    content: [
      'Главная ошибка при падении просмотров — массово удалять низкоэффективные посты. Официальное предупреждение Instagram: массовое или частое удаление/повторная публикация может триггернуть автоматические системы платформы и привести к пометке аккаунта как подозрительного, вплоть до временных ограничений.',
      '4 шага: (1) Post Consistently — публикация раз в 5 дней не даёт алгоритму достаточно данных, нужен стабильный постоянный поток; (2) Post Quality Content — сбалансированный недельный контент-план по эффекту усилия (Пн — высокоусильный talking-head reel с пользой; Вт — карусель с контекстом на слайдах; Ср — низкоусильный трендовый/B-roll с текстом; Чт — высокоусильный talking-head storytime/образовательный; Пт — перерыв; Сб — низкоусильное короткое видео с клипами и закадровым голосом; Вс — высокоусильное образовательное/влог-видео); (3) Use In-App Features — монтировать прямо в приложении платформы, использовать встроенные субтитры, включить авто-шеринг в Threads, ежедневные Stories, TikTok Creator Search Insights; (4) Utilize Your Hooks — захват внимания в первые 3 секунды.',
    ].join('\n'),
    source: GUIDE,
    sourceSection: 'стр. 61-62, How to Get Out of View Jail',
  },
];

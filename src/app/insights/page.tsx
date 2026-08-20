import Link from 'next/link';
import { auth } from '@/auth/config';
import { getUserAnalytics } from '@/analysis/accountAnalytics';
import { getUserKnowledge } from '@/knowledge/userKnowledge';

/**
 * Task 10.3 — экран `/insights`, `42_IMPLEMENTATION_ROADMAP.md` §54
 * INSIGHT VIEW: what happened / evidence / why it matters / confidence, всё
 * в одном месте, сознательно без лишнего (§53 DASHBOARD — «только наиболее
 * важную информацию» — тот же принцип применён здесь, отдельного
 * буквального Dashboard-экрана эта задача не строит, см. TASKS.md).
 *
 * Тот же UI-паттерн, что `/goals`/`/recommendations`: server component
 * читает данные напрямую через уже существующие сервисные функции
 * (`getUserAnalytics`, Task 6.1/6.2; `getUserKnowledge`, Task 7.3) — те же
 * функции, которые `GET /api/analytics`/`GET /api/knowledge` сами
 * оборачивают, отдельный fetch к собственному API не нужен.
 *
 * "Evidence" на уровне метрики — намеренно ЛИБО Pattern (структурный,
 * межпериодный сигнал, реально новая информация), ЛИБО, если для метрики
 * ещё нет Pattern, последняя Memory с тем же префиксом `platform/metric:`
 * (`formatFactContent`, Task 7.1) — НЕ оба разом: Memory дублирует те же
 * числа, что уже показаны как "что произошло", совместный показ был бы
 * избыточен и противоречил принципу §53. Сопоставление Memory по префиксу
 * строки — прагматичное решение при уже задокументированном отсутствии
 * формальной evidence-связи (см. комментарии в analyticsMemory.ts/
 * patternDetection.ts, DECISIONS.md D-0022/D-0023) — не структурная связь,
 * а честный компромисс поверх существующего пробела.
 */

const METRIC_LABELS: Record<string, string> = {
  reach: 'Охваты (reach)',
  likes: 'Лайки (likes)',
  saved: 'Сохранения (saved)',
};

const TREND_LABELS: Record<string, string> = {
  up: 'растёт',
  down: 'снижается',
  stable: 'стабильно',
  insufficient_data: 'недостаточно данных за период',
};

const COMPARISON_LABELS: Record<string, string> = {
  above: 'выше личной нормы',
  below: 'ниже личной нормы',
  at_baseline: 'на уровне личной нормы',
  insufficient_data: 'недостаточно данных для сравнения с нормой',
};

const CONFIDENCE_LABELS: Record<string, string> = {
  low: 'низкая уверенность',
  medium: 'средняя уверенность',
  high: 'высокая уверенность',
};

const PERIOD_DAYS = 30;

export default async function InsightsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main>
        <h1>Инсайты</h1>
        <p>
          <Link href="/login">Войдите</Link>, чтобы посмотреть инсайты.
        </p>
      </main>
    );
  }

  const userId = session.user.id;
  const end = new Date();
  const start = new Date(end.getTime() - PERIOD_DAYS * 24 * 60 * 60 * 1000);

  const [accounts, knowledge] = await Promise.all([
    getUserAnalytics(userId, { start, end }),
    getUserKnowledge(userId),
  ]);

  if (accounts.length === 0) {
    return (
      <main>
        <h1>Инсайты</h1>
        <p>
          Нет подключённых аккаунтов — <Link href="/integrations">подключите Instagram</Link>, чтобы
          увидеть инсайты.
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>Инсайты</h1>
      <p>За последние {PERIOD_DAYS} дней, в сравнении с вашей личной нормой за всё время.</p>

      {accounts.map((account) => (
        <section key={account.externalAccountId}>
          <h2>{account.platform}</h2>
          <ul>
            {account.metrics.map((summary) => {
              const pattern = knowledge.patterns.find((p) => p.patternType === summary.metric);
              const memory = knowledge.memories.find((m) =>
                m.content.startsWith(`${account.platform}/${summary.metric}:`),
              );
              const evidence = pattern?.description ?? memory?.content ?? null;

              return (
                <li key={summary.metric}>
                  <h3>{METRIC_LABELS[summary.metric] ?? summary.metric}</h3>
                  <p>
                    Что произошло: среднее {summary.average ?? '—'} за {summary.sampleSize} публикаций,
                    тренд — {TREND_LABELS[summary.trend]}.
                  </p>
                  <p>
                    Почему это важно: {COMPARISON_LABELS[summary.comparisonToBaseline]} (личная норма:{' '}
                    {summary.baseline.average ?? '—'}).
                  </p>
                  {evidence ? <p>Свидетельство: {evidence}</p> : null}
                  <p>Confidence: {CONFIDENCE_LABELS[summary.confidence]}.</p>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}

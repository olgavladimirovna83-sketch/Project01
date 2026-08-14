import { memoryRepository } from '@/data/repositories';
import { getUserAnalytics } from '@/analysis/accountAnalytics';
import type { AnalyticsPeriod, MetricSummary } from '@/analysis/metricsAnalytics';
import type { Confidence } from '@/analysis/personalBaseline';

/**
 * Task 7.1 — Phase 7, Knowledge Layer (42_IMPLEMENTATION_ROADMAP.md §35
 * PHASE 7/§39 PHASE 7 COMPLETION — "система может ответить: что мы знаем
 * об этом пользователе и почему мы это знаем"). Первое реальное
 * использование `Memory` (модель существует с Task 1.1, но до сих пор
 * ничего в неё не писало) — превращает вычисляемый на лету вывод Task 6.2
 * (getUserAnalytics) в персистентный knowledge item.
 *
 * Один шаг, не вся фаза: `42_IMPLEMENTATION_ROADMAP.md` §36 KNOWLEDGE
 * WEIGHTING (freshness/evidence strength/relevance/user-specific
 * history), §37 HISTORICAL DATA (decay весов для старых данных) и §38
 * USER MEMORY (устойчивые preferences/decisions) сюда не входят — это
 * persistence слой поверх уже готовой аналитики, простейший возможный
 * шаг к Knowledge Layer.
 *
 * Честная оговорка по покрытию `25_DATABASE_SCHEMA.md` §36 MEMORY: модель
 * Memory (memory_id/user_id/memory_type/content/confidence/source/
 * created_at/updated_at/status) реализована полностью и без изменений —
 * покрывает schema/timestamps/source/confidence из минимального списка
 * `42_IMPLEMENTATION_ROADMAP.md` §35. НЕ покрыто: `evidence references`
 * (`25_DATABASE_SCHEMA.md` §37 MEMORY_EVIDENCE — не путать с §37 в
 * 42_IMPLEMENTATION_ROADMAP.md выше, это другой документ и другой раздел
 * с тем же номером: Memory должна уметь ссылаться на recommendation/
 * outcome/content/pattern; отдельной join-таблицы нет, не входила в 10
 * core entities Task 1.1, D-0008); `outcome`/`relevance` из
 * 42_IMPLEMENTATION_ROADMAP.md §35 (нет полей на Memory — это скорее
 * относится к будущей Recommendation/Action/Outcome цепочке, `CLAUDE.md`
 * §3, чем к сырому аналитическому факту). `content` — обычная строка
 * (`25_DATABASE_SCHEMA.md` §36 предполагает именно так, не JSON/
 * структуру), поэтому basis (период/аккаунт/метрика) записывается
 * текстом внутрь неё как неформальная замена формальных evidence
 * references — не путать с настоящей реализацией
 * `25_DATABASE_SCHEMA.md` §37 MEMORY_EVIDENCE.
 *
 * Snapshot-семантика: каждый вызов создаёт НОВЫЕ строки Memory, не upsert
 * — тот же принцип, что PerformanceMetric/AccountSnapshot (Task 4.1/4.2):
 * "что мы знали в этот момент" — точка временного ряда знания, не текущее
 * перезаписываемое состояние.
 */

// Числовое приближение категориального confidence (personalBaseline.ts,
// Task 6.2) для Memory.confidence (Float?, 25_DATABASE_SCHEMA.md §36) —
// заглушка, как и пороги объёма выборки в D-0019, не измеренная величина.
// Экспортирована — переиспользуется patternDetection.ts (Task 7.2), тот
// же принцип: одна шкала на весь Knowledge Layer, не отдельная под
// каждую задачу.
export const CONFIDENCE_SCORE: Record<Confidence, number> = {
  low: 0.2,
  medium: 0.5,
  high: 0.8,
};

/** Публикации без данных или без осмысленного сравнения (Task 6.2,
 * insufficient_data) не создают Memory — "мы ничего не знаем" не является
 * знанием, записывать нечего. */
function isRecordable(summary: MetricSummary): boolean {
  return summary.comparisonToBaseline !== 'insufficient_data';
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatFactContent(platform: string, summary: MetricSummary): string {
  const periodLabel = `${formatDate(summary.period.start)}..${formatDate(summary.period.end)}`;
  return (
    `${platform}/${summary.metric}: период ${periodLabel}, среднее ${summary.average} ` +
    `(N=${summary.sampleSize}); личная норма ${summary.baseline.average} ` +
    `(N=${summary.baseline.sampleSize}); сравнение: ${summary.comparisonToBaseline}; ` +
    `тренд: ${summary.trend}; confidence: ${summary.confidence}`
  );
}

export interface CaptureAnalyticsMemoryResult {
  created: number;
  skipped: number;
}

export async function captureAnalyticsMemory(
  userId: string,
  period: AnalyticsPeriod,
): Promise<CaptureAnalyticsMemoryResult> {
  const analytics = await getUserAnalytics(userId, period);

  let created = 0;
  let skipped = 0;

  for (const account of analytics) {
    for (const summary of account.metrics) {
      if (!isRecordable(summary)) {
        skipped += 1;
        continue;
      }

      await memoryRepository.create({
        user: { connect: { id: userId } },
        memoryType: 'fact',
        content: formatFactContent(account.platform, summary),
        confidence: CONFIDENCE_SCORE[summary.confidence],
        source: 'analytics',
      });
      created += 1;
    }
  }

  return { created, skipped };
}

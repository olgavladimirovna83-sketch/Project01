import {
  accountSnapshotRepository,
  contentRepository,
  externalAccountRepository,
  performanceMetricRepository,
} from '@/data/repositories';
import { computeCompleteness, type CompletenessResult } from './completeness';
import { detectSyncCountAnomaly, type SyncCountAnomalyResult } from './anomalyDetection';
import { checkTemporalConsistency, type TemporalConsistencyResult } from './temporalConsistency';

/**
 * Task 5.1 — Phase 5, Data Quality (42_IMPLEMENTATION_ROADMAP.md §27–30:
 * FRESHNESS, DATA_HEALTH). Не собирает новые данные — сводит уже
 * существующее: ExternalAccount.lastSyncedAt/status (Task 3.3/4.1),
 * AccountSnapshot.capturedAt (Task 4.2), PerformanceMetric.measuredAt
 * (Task 4.1) в единый статус на аккаунт.
 *
 * SyncWarning (Task 4.3) сознательно НЕ используется здесь — это
 * найденный по ходу формулировки задачи факт, не тихое сужение scope:
 * warnings существуют только внутри одного вызова syncInstagramAccount
 * (возвращаются в ответе POST /sync, показываются в SyncButton) и нигде
 * не персистятся. У этой функции, читающей состояние независимо от
 * момента последнего клика "Синхронизировать", нет доступа к истории
 * warnings прошлых синхронизаций. "Были ли недавние сбои" здесь отвечает
 * единственный персистентный сигнал сбоя — ExternalAccount.status ===
 * 'expired' (IntegrationAuthError, Task 3.1/4.1). Персистентная история
 * sync-попыток (нужна, если понадобится больше, чем текущий статус) —
 * кандидат на будущую задачу, не обязательна для Task 5.1.
 *
 * Task 5.2 — completeness (26_DATA_PIPELINE.md §56 DATA_QUALITY/§57
 * QUALITY_IMPACT) и sync count anomaly detection добавлены поверх того же
 * набора PerformanceMetric-строк, что уже читается для lastContentMetricAt
 * (см. completeness.ts/anomalyDetection.ts — чистые функции, юнит-тесты без
 * БД). Полностью на уже сохранённых данных, без обращений к Instagram API,
 * как и попросила Olga.
 *
 * Уточнение цитаты при формулировке: Olga сослалась на §35–36
 * (SKELETON_CRITERIA/SKELETON_UPDATE) как на источник для anomaly
 * detection — при проверке эти секции оказались про другое (Content
 * Skeleton, Recommendation Engine), не про аномалии объёма синхронизации.
 * Более точные секции — §56/§57 (см. выше, для completeness) и общий
 * принцип "suspicious" как категория качества данных (§56); отдельной
 * секции именно про "меньше записей, чем обычно" в документе нет —
 * реализация ниже (anomalyDetection.ts) инженерная интерпретация этого
 * принципа, не переложение конкретного пункта документа.
 *
 * Task 5.3 — consistency, последний пункт Phase 5
 * (42_IMPLEMENTATION_ROADMAP.md §27). Перед реализацией искали отдельный
 * детальный раздел про consistency в /docs — не нашли ни Olga, ни при
 * повторной независимой проверке (см. DECISIONS.md D-0017 за полным
 * списком проверенных и отклонённых кандидатов). Реализация — явное
 * предложение Olga, не цитата документа: (1) temporalConsistency.ts —
 * measuredAt раньше publishedAt у своего Content (временная
 * невозможность); (2) schemaInvariants.ts — нарушение уникальности
 * [platform, externalUserId]/[externalAccountId, externalContentId],
 * которая уже enforced на уровне Postgres-констрейнтов (defense in depth,
 * не per-user — отдельная системная проверка, не часть этого статуса).
 */

// Порог "устарело" — заглушка, а не измеренная величина: sync сейчас
// ручной/по клику (Task 4.1), scheduled/incremental sync ещё не
// реализован (26_DATA_PIPELINE.md §13–14, отложено). 24 часа — разумное
// значение по умолчанию для одного ручного пользователя, подлежит
// пересмотру, когда появится реальная периодичность синхронизации.
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export type Freshness = 'fresh' | 'stale' | 'never_synced';

export interface AccountDataQualityStatus {
  externalAccountId: string;
  platform: string;
  connectionStatus: 'connected' | 'expired' | 'disconnected';
  /** ExternalAccount.status === 'expired' — единственный персистентный
   * сигнал сбоя синхронизации, доступный на сегодняшний день (см.
   * комментарий модуля про SyncWarning). */
  hasRecentFailure: boolean;
  lastSyncedAt: Date | null;
  freshness: Freshness;
  lastContentMetricAt: Date | null;
  lastAccountSnapshotAt: Date | null;
  completeness: CompletenessResult;
  syncCountAnomaly: SyncCountAnomalyResult;
  temporalConsistency: TemporalConsistencyResult;
  /** Явные пробелы (42_IMPLEMENTATION_ROADMAP.md §29 DATA_HEALTH — "missing
   * data"): 'no_content_synced' | 'no_account_snapshots' | 'incomplete_metrics'
   * | 'sync_count_anomaly' | 'temporal_inconsistency'. */
  gaps: string[];
}

function getFreshness(lastSyncedAt: Date | null): Freshness {
  if (!lastSyncedAt) {
    return 'never_synced';
  }
  return Date.now() - lastSyncedAt.getTime() > STALE_AFTER_MS ? 'stale' : 'fresh';
}

export async function getDataQualityStatus(userId: string): Promise<AccountDataQualityStatus[]> {
  const accounts = await externalAccountRepository.findByUserId(userId);

  return Promise.all(
    accounts.map(async (account) => {
      const [contentCount, metricRows, lastAccountSnapshotAt] = await Promise.all([
        contentRepository.countByExternalAccountId(account.id),
        performanceMetricRepository.findRowsByExternalAccountId(account.id),
        accountSnapshotRepository.findLatestCapturedAt(account.id),
      ]);

      const lastContentMetricAt =
        metricRows.length > 0
          ? new Date(Math.max(...metricRows.map((row) => row.measuredAt.getTime())))
          : null;

      const completeness = computeCompleteness(metricRows);
      const syncCountAnomaly = detectSyncCountAnomaly(metricRows);
      const temporalConsistency = checkTemporalConsistency(metricRows);

      const gaps: string[] = [];
      // Пробел имеет смысл только после хотя бы одной попытки sync —
      // "никогда не синхронизировался" уже покрыт freshness/lastSyncedAt,
      // не дублируется здесь как отдельный "пробел".
      if (account.lastSyncedAt) {
        if (contentCount === 0) {
          gaps.push('no_content_synced');
        }
        if (lastAccountSnapshotAt === null) {
          gaps.push('no_account_snapshots');
        }
      }
      if (completeness.completenessRatio !== null && completeness.completenessRatio < 1) {
        gaps.push('incomplete_metrics');
      }
      if (syncCountAnomaly.status === 'anomaly') {
        gaps.push('sync_count_anomaly');
      }
      if (temporalConsistency.violationCount > 0) {
        gaps.push('temporal_inconsistency');
      }

      return {
        externalAccountId: account.id,
        platform: account.platform,
        connectionStatus: account.status,
        hasRecentFailure: account.status === 'expired',
        lastSyncedAt: account.lastSyncedAt,
        freshness: getFreshness(account.lastSyncedAt),
        lastContentMetricAt,
        lastAccountSnapshotAt,
        completeness,
        syncCountAnomaly,
        temporalConsistency,
        gaps,
      };
    }),
  );
}

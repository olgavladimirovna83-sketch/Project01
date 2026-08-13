import {
  accountSnapshotRepository,
  contentRepository,
  externalAccountRepository,
  performanceMetricRepository,
} from '@/data/repositories';

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
  /** Явные пробелы (42_IMPLEMENTATION_ROADMAP.md §29 DATA_HEALTH — "missing
   * data"): 'no_content_synced' | 'no_account_snapshots'. */
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
      const [contentCount, lastContentMetricAt, lastAccountSnapshotAt] = await Promise.all([
        contentRepository.countByExternalAccountId(account.id),
        performanceMetricRepository.findLatestMeasuredAtByExternalAccountId(account.id),
        accountSnapshotRepository.findLatestCapturedAt(account.id),
      ]);

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

      return {
        externalAccountId: account.id,
        platform: account.platform,
        connectionStatus: account.status,
        hasRecentFailure: account.status === 'expired',
        lastSyncedAt: account.lastSyncedAt,
        freshness: getFreshness(account.lastSyncedAt),
        lastContentMetricAt,
        lastAccountSnapshotAt,
        gaps,
      };
    }),
  );
}

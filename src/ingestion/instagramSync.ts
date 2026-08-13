import {
  accountSnapshotRepository,
  contentRepository,
  externalAccountRepository,
  performanceMetricRepository,
} from '@/data/repositories';
// Side-effect import — регистрирует Instagram-провайдер в IntegrationService
// (registry-паттерн Task 3.1). Здесь, а не только в вызывающих route'ах,
// чтобы syncInstagramAccount работал одинаково откуда угодно (включая
// тесты), не полагаясь на то, что вызывающий код не забудет импортировать
// bootstrap сам.
import '@/integrations/bootstrap';
import { IntegrationAuthError, IntegrationService } from '@/integrations';
import { normalizeContentType, validateMediaItem } from './normalize';

/**
 * Task 4.1 — первый шаг ingestion pipeline (26_DATA_PIPELINE.md §3–12,
 * §18–21): забрать данные через уже готовый IntegrationService, validate →
 * normalize → сохранить в Content/PerformanceMetric. Простая, синхронная,
 * разовая — без очереди (по прямому требованию Olga, решение об async
 * обработке отдельное и позже).
 *
 * Task 4.2 — account-level insights (getAccountInsights) персистятся в
 * AccountSnapshot (DECISIONS.md D-0014), той же snapshot-семантикой, что
 * PerformanceMetric: каждый sync создаёт новые строки, не upsert.
 *
 * Сырой ответ API не сохраняется отдельно — см. DECISIONS.md D-0011.
 */

export class NoConnectedInstagramAccountError extends Error {
  constructor() {
    super('no_connected_instagram_account');
  }
}

export interface SyncWarning {
  externalId?: string;
  message: string;
}

export interface SyncSummary {
  contentSynced: number;
  contentSkipped: number;
  metricsSynced: number;
  accountInsights: Array<{ name: string; value: number; period: string }>;
  warnings: SyncWarning[];
}

export async function syncInstagramAccount(userId: string): Promise<SyncSummary> {
  const accounts = await externalAccountRepository.findByUserId(userId);
  const account = accounts.find(
    (a) => a.platform === 'instagram' && a.status === 'connected',
  );
  if (!account) {
    throw new NoConnectedInstagramAccountError();
  }

  const warnings: SyncWarning[] = [];
  let contentSynced = 0;
  let contentSkipped = 0;
  let metricsSynced = 0;
  let accountInsights: SyncSummary['accountInsights'] = [];

  try {
    // Account-level insights — с Task 4.2 персистится в AccountSnapshot
    // (DECISIONS.md D-0014), не только показывается в summary. Ошибка
    // здесь не должна блокировать синхронизацию публикаций — только
    // логируется предупреждением.
    try {
      const accountInsightsResult = await IntegrationService.getAccountInsights('instagram', {
        accessToken: account.accessToken,
        metrics: ['reach'],
        period: 'day',
      });
      accountInsights = accountInsightsResult.metrics;

      const capturedAt = new Date();
      for (const metric of accountInsights) {
        await accountSnapshotRepository.create({
          externalAccount: { connect: { id: account.id } },
          metricType: metric.name,
          value: metric.value,
          capturedAt,
          source: 'instagram_api',
        });
      }
      // unavailableMetrics — value: null, не молчаливый пропуск, тот же
      // принцип, что для PerformanceMetric (08_METRICS_FRAMEWORK.md §11).
      for (const unavailableMetric of accountInsightsResult.unavailableMetrics) {
        await accountSnapshotRepository.create({
          externalAccount: { connect: { id: account.id } },
          metricType: unavailableMetric,
          value: null,
          capturedAt,
          source: 'instagram_api',
        });
      }
    } catch (error) {
      if (error instanceof IntegrationAuthError) {
        throw error;
      }
      warnings.push({ message: `account insights failed: ${(error as Error).message}` });
    }

    const media = await IntegrationService.listRecentMedia('instagram', {
      accessToken: account.accessToken,
    });

    for (const item of media) {
      try {
        const validation = validateMediaItem(item);
        if (!validation.valid) {
          contentSkipped += 1;
          warnings.push({
            externalId: item.externalId,
            message: `invalid media: ${validation.errors.join(', ')}`,
          });
          continue;
        }

        const contentType = normalizeContentType(item.mediaType, item.mediaProductType);

        const existing = await contentRepository.findByExternalId(account.id, item.externalId);
        const content = existing
          ? await contentRepository.update(existing.id, {
              contentType,
              publishedAt: item.publishedAt,
            })
          : await contentRepository.create({
              user: { connect: { id: userId } },
              externalAccountId: account.id,
              externalContentId: item.externalId,
              contentType,
              publishedAt: item.publishedAt,
            });
        contentSynced += 1;

        const mediaInsights = await IntegrationService.getMediaInsights('instagram', {
          accessToken: account.accessToken,
          mediaId: item.externalId,
          mediaType: item.mediaType,
        });

        // Каждый sync создаёт НОВЫЕ строки PerformanceMetric, не upsert —
        // это уже spanshot-таблица (26_DATA_PIPELINE.md §19
        // SNAPSHOT_PRINCIPLE), повторный вызов строит временной ряд, не
        // перезаписывает предыдущее измерение.
        const measuredAt = new Date();

        for (const metric of mediaInsights.metrics) {
          await performanceMetricRepository.create({
            content: { connect: { id: content.id } },
            metricType: metric.name,
            value: metric.value,
            measuredAt,
            source: 'instagram_api',
          });
          metricsSynced += 1;
        }

        // unavailableMetrics — value: null, не молчаливый пропуск
        // (08_METRICS_FRAMEWORK.md §11 — "данных нет" ≠ "не запрашивалось").
        for (const unavailableMetric of mediaInsights.unavailableMetrics) {
          await performanceMetricRepository.create({
            content: { connect: { id: content.id } },
            metricType: unavailableMetric,
            value: null,
            measuredAt,
            source: 'instagram_api',
          });
          metricsSynced += 1;
        }
      } catch (error) {
        if (error instanceof IntegrationAuthError) {
          // Токен недействителен — дальнейшие попытки по остальным
          // публикациям тоже провалятся тем же образом, нет смысла
          // продолжать поэлементно. Прерываем весь sync.
          throw error;
        }
        contentSkipped += 1;
        warnings.push({ externalId: item.externalId, message: (error as Error).message });
      }
    }

    await externalAccountRepository.update(account.id, { lastSyncedAt: new Date() });
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      // Terminal state, не retry-цикл (IntegrationProvider.ts, Task 3.1) —
      // токен отозван/невалиден на стороне платформы, не временная ошибка.
      await externalAccountRepository.update(account.id, { status: 'expired' });
    }
    throw error;
  }

  return { contentSynced, contentSkipped, metricsSynced, accountInsights, warnings };
}

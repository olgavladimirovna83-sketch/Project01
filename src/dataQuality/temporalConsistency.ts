/**
 * Task 5.3 — Phase 5, consistency (последний пункт `42_IMPLEMENTATION_ROADMAP.md`
 * §27 PHASE 5, DATA QUALITY — "consistency" в списке без дальнейшей
 * расшифровки нигде в /docs, проверено явно перед реализацией; см.
 * комментарий в dataQualityStatus.ts и DECISIONS.md D-0017). Реализация —
 * предложение Olga из постановки задачи, не цитата документа.
 *
 * Временна́я невозможность: метрика публикации не может быть измерена
 * раньше, чем публикация вышла. Если measuredAt < publishedAt — это
 * противоречие в уже сохранённых данных (баг нормализации, рассинхрон
 * часовых поясов на стороне платформы, метрика приписана не той
 * публикации и т.п.), не просто "недостающие данные" (completeness,
 * Task 5.2) — сами данные внутренне противоречивы.
 */

export interface ContentTimingRow {
  contentId: string;
  measuredAt: Date;
  publishedAt: Date | null;
}

export interface TemporalConsistencyViolation {
  contentId: string;
  measuredAt: Date;
  publishedAt: Date;
}

export interface TemporalConsistencyResult {
  violationCount: number;
  violations: TemporalConsistencyViolation[];
}

export function checkTemporalConsistency(rows: ContentTimingRow[]): TemporalConsistencyResult {
  const violations: TemporalConsistencyViolation[] = [];
  for (const row of rows) {
    // publishedAt nullable в схеме (Content может теоретически не иметь
    // даты публикации) — сравнивать не с чем, не нарушение.
    if (row.publishedAt !== null && row.measuredAt.getTime() < row.publishedAt.getTime()) {
      violations.push({
        contentId: row.contentId,
        measuredAt: row.measuredAt,
        publishedAt: row.publishedAt,
      });
    }
  }
  return { violationCount: violations.length, violations };
}

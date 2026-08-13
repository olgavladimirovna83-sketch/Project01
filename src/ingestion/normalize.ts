/**
 * Task 4.1 — validate/normalize шаги ingestion pipeline
 * (26_DATA_PIPELINE.md §7 VALIDATION, §9 NORMALIZATION). Чистые функции,
 * без сети и без БД — намеренно, чтобы их можно было проверить unit-тестом
 * на синтетических данных, не завися от живого Instagram API.
 */

export interface RawMediaItem {
  externalId: string;
  mediaType: string;
  mediaProductType?: string;
  publishedAt: Date;
}

export interface MediaValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateMediaItem(item: RawMediaItem): MediaValidationResult {
  const errors: string[] = [];

  if (!item.externalId) {
    errors.push('missing externalId');
  }
  if (!item.mediaType) {
    errors.push('missing mediaType');
  }
  if (Number.isNaN(item.publishedAt.getTime())) {
    errors.push('invalid publishedAt');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * `08_METRICS_FRAMEWORK.md` §4 — Reels не должны сравниваться с обычным
 * видео как одинаковый формат, поэтому определяются отдельно через
 * `mediaProductType`, если платформа его вернула (media_type сам по себе
 * этого не различает — найдено при реализации этой задачи).
 *
 * Неизвестные/будущие значения `mediaType` не отбрасываются — приводятся
 * к нижнему регистру и сохраняются как есть: `Content.contentType` —
 * открытая, расширяемая категория (String, не enum — DECISIONS.md D-0008),
 * поэтому pipeline не должен ломаться на значении, которого пока не знает.
 */
export function normalizeContentType(mediaType: string, mediaProductType?: string): string {
  if (mediaProductType === 'REELS') {
    return 'reel';
  }
  if (mediaProductType === 'STORY') {
    return 'story';
  }

  switch (mediaType) {
    case 'IMAGE':
      return 'image';
    case 'VIDEO':
      return 'video';
    case 'CAROUSEL_ALBUM':
      return 'carousel';
    default:
      return mediaType.toLowerCase();
  }
}

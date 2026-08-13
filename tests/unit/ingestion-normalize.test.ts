import { describe, expect, it } from 'vitest';
import { normalizeContentType, validateMediaItem } from '../../src/ingestion/normalize';

describe('normalizeContentType', () => {
  it('maps known Instagram media_type values to internal categories', () => {
    expect(normalizeContentType('IMAGE')).toBe('image');
    expect(normalizeContentType('VIDEO')).toBe('video');
    expect(normalizeContentType('CAROUSEL_ALBUM')).toBe('carousel');
  });

  it('uses mediaProductType to distinguish Reels from regular video (media_type alone cannot)', () => {
    expect(normalizeContentType('VIDEO', 'REELS')).toBe('reel');
    expect(normalizeContentType('VIDEO', 'FEED')).toBe('video');
  });

  it('recognizes STORY via mediaProductType', () => {
    expect(normalizeContentType('IMAGE', 'STORY')).toBe('story');
  });

  it('falls back to a lowercased raw value for unknown media_type instead of throwing', () => {
    expect(normalizeContentType('SOME_FUTURE_TYPE')).toBe('some_future_type');
  });
});

describe('validateMediaItem', () => {
  const validItem = {
    externalId: 'ig-123',
    mediaType: 'IMAGE',
    publishedAt: new Date('2026-08-01T00:00:00Z'),
  };

  it('accepts a well-formed item', () => {
    expect(validateMediaItem(validItem)).toEqual({ valid: true, errors: [] });
  });

  it('rejects a missing externalId', () => {
    const result = validateMediaItem({ ...validItem, externalId: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('missing externalId');
  });

  it('rejects a missing mediaType', () => {
    const result = validateMediaItem({ ...validItem, mediaType: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('missing mediaType');
  });

  it('rejects an invalid publishedAt', () => {
    const result = validateMediaItem({ ...validItem, publishedAt: new Date('not-a-date') });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('invalid publishedAt');
  });

  it('collects multiple errors at once', () => {
    const result = validateMediaItem({
      externalId: '',
      mediaType: '',
      publishedAt: new Date('not-a-date'),
    });
    expect(result.errors).toHaveLength(3);
  });
});

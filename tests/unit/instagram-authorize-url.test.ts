import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createInstagramProvider } from '../../src/integrations/providers/instagram';

describe('instagram provider — getAuthorizationUrl', () => {
  const originalAppId = process.env.INSTAGRAM_APP_ID;

  beforeEach(() => {
    process.env.INSTAGRAM_APP_ID = 'test-app-id';
  });

  afterEach(() => {
    process.env.INSTAGRAM_APP_ID = originalAppId;
  });

  it('builds a Business Login authorize URL with the confirmed permissions', () => {
    const provider = createInstagramProvider();

    const url = new URL(
      provider.getAuthorizationUrl({
        redirectUri: 'https://example.test/callback',
        state: 'csrf-token',
      }),
    );

    expect(url.origin + url.pathname).toBe('https://www.instagram.com/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('test-app-id');
    expect(url.searchParams.get('redirect_uri')).toBe('https://example.test/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('csrf-token');

    // Task 3.0 addendum: instagram_business_basic (обязательный) + insights.
    // Comments/messages/content-publish осознанно не запрашиваются.
    const scope = url.searchParams.get('scope');
    expect(scope).toContain('instagram_business_basic');
    expect(scope).not.toContain('content_publish');
    expect(scope).not.toContain('manage_comments');
    expect(scope).not.toContain('manage_messages');
  });

  it('throws a clear error when INSTAGRAM_APP_ID is missing', () => {
    delete process.env.INSTAGRAM_APP_ID;
    const provider = createInstagramProvider();

    expect(() =>
      provider.getAuthorizationUrl({ redirectUri: 'https://example.test/callback', state: 'x' }),
    ).toThrow('INSTAGRAM_APP_ID');
  });
});

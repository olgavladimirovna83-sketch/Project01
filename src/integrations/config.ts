/**
 * Общая конфигурация OAuth-flow для Instagram, разделяемая между authorize-
 * и callback-роутами (Task 3.4) — вынесена в один файл, чтобы redirect_uri
 * не дублировался как отдельный литерал в каждом route (OAuth требует
 * буквального совпадения).
 */
export const INSTAGRAM_REDIRECT_URI =
  process.env.INSTAGRAM_REDIRECT_URI ??
  'https://localhost:3000/api/integrations/instagram/callback';

// CSRF-защита OAuth flow (INSTAGRAM_API_REVIEW.md §2) — state, сгенерированный
// в authorize route, кладётся в short-lived httpOnly cookie и сверяется в
// callback route при возврате.
export const INSTAGRAM_OAUTH_STATE_COOKIE = 'instagram_oauth_state';

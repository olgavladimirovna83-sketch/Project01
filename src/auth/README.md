# /src/auth — App Authentication (Auth.js)

**App Authentication ≠ Instagram Integration** (CLAUDE.md §3.2/§4.1) — это тот самый разделённый слой. `src/auth/` отвечает только за идентификацию пользователя внутри приложения. OAuth/token lifecycle для Instagram — отдельный `src/integrations/` (пока пустой интерфейс, до Task 3.0).

- `config.ts` — `NextAuth()` инстанс: `handlers`/`auth`/`signIn`/`signOut`. Единственный файл, которому разрешено передавать «сырой» `PrismaClient` в `PrismaAdapter` — контракт стороннего адаптера, не наш обычный data-access паттерн.
- `credentials.ts` — `authenticateWithCredentials(email, password)`: логика проверки email+password, вынесена из Credentials provider'а, чтобы быть напрямую тестируемой без HTTP.
- `password.ts` — хеширование/проверка пароля (`bcryptjs`).
- `types.d.ts` — module augmentation для `Session`/`JWT` (добавляет `user.id`).

Механизм аутентификации на Task 2.1 — Credentials (email+password), не OAuth/magic link — обоснование в `DECISIONS.md`, D-0009.

Route handler — `src/app/api/auth/[...nextauth]/route.ts` (реэкспортирует `handlers`).

# /src/data — DATA layer

Data-access слой для PostgreSQL. Единственное место в кодовой базе, которое обращается к `@prisma/client` напрямую (`prismaClient.ts`) — остальной код импортирует репозитории отсюда (`src/data` / `repositories/`), не Prisma Client напрямую (CLAUDE.md §4.1).

- `prismaClient.ts` — Prisma Client singleton
- `repositories/` — по одному репозиторию на сущность из `prisma/schema.prisma` (Task 1.1): `userRepository`, `goalRepository`, `contentRepository`, `contentFeatureRepository`, `performanceMetricRepository`, `patternRepository`, `memoryRepository`, `recommendationRepository`, `userDecisionRepository`, `experimentRepository`

Каждый репозиторий (Task 1.2) — намеренно минимальный: `create`/`findById`/`update`. Не больше, чем реально понадобится ближайшим фазам — delete/soft-delete, поиск по связям и т.п. добавляются по мере необходимости, не заранее.

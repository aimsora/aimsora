# aimsora

Frontend-оболочка платформы AIMSORA. Это Vue 3 SPA поверх GraphQL backend: публичная landing page, login flow, dashboard control room, закупки, источники, jobs, reports и users/admin actions.

## Стек

- Vue 3 + TypeScript
- Vue Router
- Pinia
- Apollo GraphQL Client
- Vite
- Nginx + Docker для production bundle

## Env vars

- `VITE_GRAPHQL_ENDPOINT`
  По умолчанию используется `/graphql`.
  Подходит для Docker/Nginx и для локального Vite dev-server через proxy.
- `VITE_GRAPHQL_PROXY_TARGET`
  Используется только локально в `vite.config.ts`.
  По умолчанию `http://localhost:3000`.

Пример:

```bash
VITE_GRAPHQL_ENDPOINT=/graphql
VITE_GRAPHQL_PROXY_TARGET=http://localhost:3000
```

## Local run

1. Подними `backend-api` и базу данных.
2. Выполни миграции и seed в backend, чтобы появились demo-данные и пользователи.
3. Запусти frontend.

```bash
npm install
npm run dev
```

Frontend по умолчанию доступен на `http://localhost:4173`.

Если backend поднят локально на `http://localhost:3000`, дополнительная настройка endpoint не нужна: Vite проксирует `/graphql` в backend автоматически.

## Demo login

Для локального demo используется реальный backend login, а не fake auth.

- `admin@admin.ru / admin`

Эти credentials показываются на странице `/login` в local/dev mode. Для их доступности backend должен быть seeded.

## Available routes

- `/` - публичная landing page
- `/login` - публичная страница входа
- `/dashboard` - control room / summary / charts / recent data
- `/procurements` - список закупок
- `/procurements/:id` - карточка закупки
- `/sources` - источники и их последний run status
- `/jobs` - source runs / jobs
- `/reports` - список отчётов
- `/users` - администрирование пользователей, доступно `ADMIN`

## Auth flow

- `/` всегда открыт и служит entry page проекта
- успешный login ведёт на `/dashboard`
- защищённые маршруты требуют токен
- после refresh auth восстанавливается из сохранённой сессии
- logout вызывает backend mutation `logout`, очищает local state и возвращает пользователя на landing

## Build

```bash
npm run build
```

Production bundle складывается в `dist/`.

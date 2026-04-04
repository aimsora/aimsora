# npp-web

Frontend NPPWEB на `Nuxt 3 + TypeScript + Tailwind CSS + Radix Vue + Apollo GraphQL`.
Приложение стартует со страницы авторизации и после входа открывает защищённый интерфейс для мониторинга закупок, источников, запусков, отчётов и пользователей.

## Локальный запуск

Быстрый вариант через общий стек:

```bash
cd ../infra
cp .env.example .env
docker compose --env-file .env -f docker-compose.yml -f docker-compose.apps.yml up -d --build backend-api frontend
```

Отдельный запуск только фронта:

```bash
npm install
npm run dev
```

По умолчанию приложение доступно на `http://localhost:4173`.

## Переменные окружения

- `NUXT_PUBLIC_GRAPHQL_ENDPOINT` - публичный GraphQL endpoint для клиента. По умолчанию `/graphql`.
- `NUXT_GRAPHQL_PROXY_TARGET` - backend target для dev-proxy. По умолчанию `http://localhost:3000`.

Пример:

```bash
NUXT_PUBLIC_GRAPHQL_ENDPOINT=/graphql
NUXT_GRAPHQL_PROXY_TARGET=http://localhost:3000
```

## Основные маршруты

- `/` - редирект на `/login` или `/dashboard` в зависимости от сессии.
- `/login` - публичная страница входа.
- `/dashboard` - основной dashboard.
- `/procurements` - список закупок.
- `/procurements/:id` - карточка закупки.
- `/sources` - источники и последние запуски.
- `/jobs` - журнал запусков.
- `/reports` - список отчётов.
- `/profile` - профиль текущего пользователя.
- `/users` - управление пользователями, доступно только `ADMIN`.

## Локальные учётные данные

Если backend поднят с seed из `infra`, по умолчанию доступны:

- `admin@admin.ru / 12345678`
- `analyst@admin.ru / 12345678`
- `user@admin.ru / 12345678`

Подсказка с тестовым логином на странице `/login` отключена, поэтому данные нужно вводить вручную.

## Проверка качества

```bash
npm run typecheck
npm run build
```

После production-сборки приложение запускается так:

```bash
node .output/server/index.mjs
```

## Docker

`Dockerfile` собирает Nuxt `.output` и запускает production runtime на Node.js.

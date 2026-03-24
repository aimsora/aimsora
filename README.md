[![Deploy to GitHub Pages](https://github.com/aimsora/aimsora/actions/workflows/pages.yml/badge.svg)](https://github.com/aimsora/.github/actions/workflows/pages.yml)
![Project](https://img.shields.io/badge/Project-AIMSORA-blue)
![Architecture](https://img.shields.io/badge/Architecture-Multi--Repo-0b2f7a)
![Deployment](https://img.shields.io/badge/Deployment-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)
# aimsora/.github
Репозиторий публичного сайта и организационной конфигурации **AIMSORA**.

## Назначение

Репозиторий решает две задачи:

- хранит публичный профиль организации (`profile/README.md`)
- содержит исходный код и CI/CD сайта организации на GitHub Pages

## Роль в общем проекте

Этот репозиторий не хранит бизнес-логику платформы закупочного мониторинга.
Он отвечает за публичную презентацию проекта и документацию верхнего уровня.

Связанные репозитории платформы:

- `aimsora/frontend-app` - пользовательский интерфейс платформы
- `aimsora/backend-api` - GraphQL API и бизнес-логика
- `aimsora/scraper-service` - сбор открытых данных
- `aimsora/processing-worker` - обработка и нормализация
- `aimsora/shared-contracts` - единые контракты взаимодействия
- `aimsora/deployment-infra` - инфраструктура и деплойный контур

## Что внутри

- `profile/README.md` - публичный профиль организации
- `src/` - исходники сайта (Vue 3 + TypeScript)
- `public/` - статические ассеты
- `.github/workflows/pages.yml` - workflow деплоя на GitHub Pages

## Архитектура сайта

- одностраничный сайт (SPA)
- без `vue-router`
- блок активности GitHub и расширенная секция описания архитектуры проекта
- публикация статической сборки `dist/` через GitHub Actions

## Локальная разработка

```bash
npm install
npm run dev
```

## Сборка

```bash
npm run build
```

Артефакты сборки попадают в `dist/`.

## Деплой

Публикация идет через GitHub Actions workflow:

- `.github/workflows/pages.yml`

Триггеры:

- `push` в `main` или `master`
- `workflow_dispatch`

Pipeline:

1. `npm ci`
2. `npm run build`
3. публикация `dist/` в GitHub Pages

## Деплой платформы (сводно)

Полная платформа деплоится через GitHub в порядке:

1. `shared-contracts` (релиз контрактов)
2. `deployment-infra` (обновление окружения)
3. `backend-api`
4. `processing-worker`
5. `scraper-service`
6. `frontend-app`

## URL

Сайт доступен по адресу:

`https://aimsora.github.io/.github/`

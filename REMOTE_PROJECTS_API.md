# Remote Projects API Contract

Проект теперь умеет работать через внешний HTTP API, если задан `VITE_PROJECTS_API_URL`.

## Env

```bash
VITE_PROJECTS_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
VITE_PROJECTS_API_TOKEN=
```

`VITE_PROJECTS_API_TOKEN` необязателен. Если задан, фронт отправляет заголовок:

```http
Authorization: Bearer <token>
```

## Поддерживаемые операции

Gateway использует параметр `action`.

### 1) Получить список проектов

```http
GET ?action=list
```

Ожидаемый ответ:

```json
{
  "records": [
    {
      "id": "project-id",
      "name": "CRM Dashboard",
      "description": "Основной проект",
      "createdAt": "2026-04-23T12:00:00.000Z",
      "updatedAt": "2026-04-23T12:10:00.000Z",
      "version": "2.0.0",
      "project": { "meta": { "id": "project-id" } }
    }
  ]
}
```

Допускаются также поля `items`, `projects`, `data` или просто JSON-массив.

### 2) Получить один проект по id

```http
GET ?action=get&id=project-id
```

Ожидаемый ответ:

```json
{
  "record": {
    "id": "project-id",
    "name": "CRM Dashboard",
    "description": "Основной проект",
    "createdAt": "2026-04-23T12:00:00.000Z",
    "updatedAt": "2026-04-23T12:10:00.000Z",
    "version": "2.0.0",
    "project": { "meta": { "id": "project-id" } }
  }
}
```

Допускаются также поля `item`, `project`, `data` или просто сам record.

### 3) Сохранить проект

```http
POST ?action=save
Content-Type: application/json
```

Body:

```json
{
  "action": "save",
  "projectId": "project-id",
  "name": "CRM Dashboard",
  "description": "Основной проект",
  "project": {
    "meta": {
      "id": "project-id"
    }
  }
}
```

Желательно вернуть сохраненный record. Если не вернуть, фронт попробует сделать `get`.

### 4) Переименовать проект

```http
POST ?action=rename
Content-Type: application/json
```

Body:

```json
{
  "action": "rename",
  "projectId": "project-id",
  "name": "Новое имя",
  "description": "Новое описание"
}
```

### 5) Удалить проект

```http
POST ?action=delete
Content-Type: application/json
```

Body:

```json
{
  "action": "delete",
  "projectId": "project-id"
}
```

## Ошибки

Если backend хочет вернуть ошибку, достаточно такого JSON:

```json
{
  "success": false,
  "message": "Project not found"
}
```

или

```json
{
  "error": "Project not found"
}
```

## Fallback

Если `VITE_PROJECTS_API_URL` не задан, проект продолжает работать через локальный `localStorage`.

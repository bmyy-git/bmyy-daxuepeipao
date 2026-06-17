# 笨猫丫丫 OPC 部署运维手册

适用版本：`2.4.0`

本项目是 npm workspaces 单仓库，包含：

- `apps/web`：Vue 3 + Vite 前端，生产环境由 Nginx 提供静态资源和 `/api` 反向代理。
- `apps/api`：NestJS REST API，使用 Prisma 访问 PostgreSQL。
- `docker-compose.yml`：本地或单机部署用的 PostgreSQL、API、Web 编排。

## 1. 运行环境

推荐环境：

- Node.js：与 Dockerfile 保持一致，使用 Node `24.x`。
- npm：随 Node 安装。
- PostgreSQL：`16.x`。
- Docker / Docker Compose：用于容器化部署。

Windows 本地开发时，如果 PowerShell 提示 `无法加载 npm.ps1`，使用 `npm.cmd` 代替 `npm`。

## 2. 关键端口

| 服务 | 默认端口 | 说明 |
| --- | ---: | --- |
| Web 开发服务 | `5173` | Vite dev server |
| API 服务 | `3000` | NestJS，接口前缀为 `/api` |
| Web 生产服务 | `8080` | docker-compose 暴露的 Nginx |
| PostgreSQL | `5432` | docker-compose 暴露的数据库 |

## 3. 环境变量

根目录 `.env.example` 是部署模板。生产部署前复制并修改：

```bash
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

主要变量：

| 变量 | 示例 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | `production` | 运行环境 |
| `APP_PORT` | `3000` | API 监听端口 |
| `WEB_ORIGIN` | `https://example.com` | API CORS 白名单，多个域名用逗号分隔 |
| `POSTGRES_DB` | `benmaoyaya` | Docker PostgreSQL 数据库名 |
| `POSTGRES_USER` | `benmaoyaya` | Docker PostgreSQL 用户名 |
| `POSTGRES_PASSWORD` | `change-me` | Docker PostgreSQL 密码，生产必须修改 |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | Prisma 数据库连接串 |
| `JWT_ACCESS_SECRET` | 随机 32 字符以上 | JWT 签名密钥，生产必须修改 |
| `JWT_ACCESS_EXPIRES_IN` | `2h` | JWT 有效期 |
| `DIFY_API_BASE_URL` | `https://api.dify.ai/v1` | Dify 接口地址，可为空 |
| `DIFY_API_KEY` | `app-xxx` | Dify API Key，可为空 |
| `FILE_STORAGE_PATH` | `/app/uploads` | 上传文件存储目录 |
| `MAX_FILE_SIZE_MB` | `20` | 单文件上传大小限制 |

连接某些远程 PostgreSQL 时，如果服务端不需要 TLS，但 Prisma 报 `P1011 Error opening a TLS connection`，可在 `DATABASE_URL` 后追加：

```text
?sslmode=disable
```

例如：

```text
postgresql://user:password@db.example.com:5432/benmaoyaya?sslmode=disable
```

## 4. 本地开发运行

安装依赖：

```bash
npm install
```

初始化数据库：

```bash
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
```

分别启动后端和前端：

```bash
npm run dev:api
npm run dev:web
```

Windows PowerShell 可使用：

```powershell
npm.cmd run dev:api
npm.cmd run dev:web
```

访问地址：

- 前端：`http://localhost:5173`
- API 健康检查：`http://localhost:3000/api/health`

开发环境里，`apps/web/vite.config.ts` 会把 `/api` 代理到 `http://localhost:3000`。如果前端终端出现 `http proxy error ECONNREFUSED`，通常是 API 没启动或 API 启动失败。

## 5. Docker Compose 部署

首次部署：

```bash
docker compose up -d --build
docker compose exec api npm run prisma:deploy --workspace @benmaoyaya/api
docker compose exec api npm run prisma:seed --workspace @benmaoyaya/api
```

访问：

```text
http://localhost:8080
```

日常启动：

```bash
docker compose up -d
```

停止：

```bash
docker compose down
```

查看日志：

```bash
docker compose logs -f api
docker compose logs -f web
docker compose logs -f postgres
```

重新构建并发布：

```bash
docker compose build
docker compose up -d
docker compose exec api npm run prisma:deploy --workspace @benmaoyaya/api
```

`prisma:seed` 会清空并重建演示数据，生产环境不要随意执行。

## 6. 非 Docker 部署

构建：

```bash
npm install
npm run build:all
```

数据库迁移：

```bash
npm run prisma:deploy
```

启动 API：

```bash
npm run start --workspace @benmaoyaya/api
```

前端静态文件位于：

```text
apps/web/dist
```

可用 Nginx 托管该目录，并将 `/api/` 反向代理到 API 服务，例如：

```nginx
server {
  listen 80;
  server_name example.com;
  root /var/www/benmaoyaya/web;
  index index.html;

  client_max_body_size 20m;

  location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

如果前端和 API 分别部署到不同域名，需要同时配置：

- API 环境变量 `WEB_ORIGIN` 为前端域名。
- 前端构建环境变量 `VITE_API_BASE_URL` 为 API 地址，例如 `https://api.example.com/api`。

## 7. 数据库运维

### 7.1 初始化

新数据库必须执行：

```bash
npm run prisma:deploy
```

演示环境可继续执行：

```bash
npm run prisma:seed
```

### 7.2 迁移

开发环境新增 schema 变更：

```bash
npm run prisma:migrate --workspace @benmaoyaya/api
```

生产环境只执行已提交的 migration：

```bash
npm run prisma:deploy
```

### 7.3 备份

Docker Compose 数据库备份：

```bash
docker compose exec postgres pg_dump -U benmaoyaya -d benmaoyaya > backup.sql
```

非 Docker 数据库备份：

```bash
pg_dump "$DATABASE_URL" > backup.sql
```

### 7.4 恢复

恢复前应先停止 API，避免写入冲突。

Docker Compose 恢复：

```bash
docker compose exec -T postgres psql -U benmaoyaya -d benmaoyaya < backup.sql
```

恢复后执行：

```bash
npm run prisma:deploy
```

## 8. 文件上传目录

上传文件由 API 写入 `FILE_STORAGE_PATH`。

Docker Compose 中该目录映射到 named volume：

```text
uploads_data:/app/uploads
```

运维注意事项：

- 需要定期备份上传目录。
- 迁移服务器时，数据库和上传目录必须一起迁移。
- Nginx `client_max_body_size` 与 `MAX_FILE_SIZE_MB` 应保持一致或略大。

## 9. 健康检查与验证

API 健康检查：

```bash
curl http://localhost:3000/api/health
```

正常返回：

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "..."
}
```

验证演示登录：

```bash
curl -X POST http://localhost:3000/api/auth/demo-login \
  -H "Content-Type: application/json" \
  -d "{\"role\":\"student\"}"
```

演示账号统一密码：

```text
demo123456
```

| 角色 | 邮箱 |
| --- | --- |
| 管理员 | `admin@yayasmart.com` |
| 导师 | `mentor@yayasmart.com` |
| 学生 | `student@example.com` |
| 家长 | `parent@example.com` |

## 10. 常见故障

### 10.1 Vite 提示 `http proxy error ECONNREFUSED`

原因：前端请求 `/api` 时，Vite 代理无法连接 `localhost:3000`。

处理：

```bash
npm run dev:api
```

并检查 API 是否正常：

```bash
curl http://localhost:3000/api/health
```

### 10.2 Prisma 报 `P1011 Error opening a TLS connection`

原因：数据库连接的 SSL/TLS 模式和服务端不匹配。

处理：按数据库要求设置 `DATABASE_URL`，不需要 TLS 的远程库可追加：

```text
?sslmode=disable
```

### 10.3 Prisma 报 `P2021 table public.User does not exist`

原因：数据库未初始化或迁移未执行。

处理：

```bash
npm run prisma:deploy
```

如果是演示环境，还需要：

```bash
npm run prisma:seed
```

### 10.4 端口占用 `EADDRINUSE: address already in use :::3000`

原因：已有 API 进程占用 3000。

Windows 查看：

```powershell
Get-NetTCPConnection -LocalPort 3000
```

Linux/macOS 查看：

```bash
lsof -i :3000
```

结束旧进程或修改 `APP_PORT`。

### 10.5 PowerShell 提示 `无法加载 npm.ps1`

原因：PowerShell 执行策略禁止运行脚本。

处理：使用 `npm.cmd`：

```powershell
npm.cmd run dev:api
```

## 11. 发布检查清单

发布前：

- `.env` 已配置生产数据库、`WEB_ORIGIN`、强随机 `JWT_ACCESS_SECRET`。
- 已执行 `npm run lint:all`。
- 已执行 `npm run build:all`。
- 已备份数据库和上传目录。
- 已执行 `npm run prisma:deploy`。
- 已验证 `/api/health`。
- 已验证前端页面可访问，登录接口可用。

发布后：

- 查看 API、Web、PostgreSQL 日志。
- 验证上传文件功能。
- 验证学生、导师、家长、管理端核心页面。
- 记录发布时间、版本号、迁移编号和操作者。

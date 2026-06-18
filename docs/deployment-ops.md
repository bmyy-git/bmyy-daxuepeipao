# 笨猫丫丫 OPC 部署运维手册

适用版本：`2.4.0`

本项目是 npm workspaces 单仓库：

- `apps/web`：Vue 3 + Vite 前端，生产环境由 Nginx 容器托管静态文件，并反向代理 `/api`。
- `apps/api`：NestJS REST API，使用 Prisma 访问 PostgreSQL。
- `docker-compose.yml`：单机部署编排，包含 `postgres`、`api`、`web` 三个服务。

## 1. 服务器需要安装什么

推荐使用 Docker Compose 部署。Ubuntu 24 云服务器提前安装：

```text
必须：Docker Engine、Docker Compose plugin、Git、curl、ca-certificates
建议：ufw、防火墙规则、Nginx 或 Caddy、HTTPS 证书工具
```

不需要单独安装：

```text
Node.js、npm、PostgreSQL、Prisma、前端 Nginx
```

这些都在 Docker 镜像或容器里处理。

Ubuntu 24 安装基础包：

```bash
sudo apt update
sudo apt install -y ca-certificates curl git ufw
```

Docker 建议使用官方 apt 源安装。若服务器拉取 Docker Hub 超时，可以在 `/etc/docker/daemon.json` 配置镜像加速，例如腾讯云：

```json
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com"
  ]
}
```

修改后重启 Docker：

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
docker info
```

## 2. 服务和端口

当前 `docker-compose.yml` 默认端口：

| 服务 | 容器端口 | 宿主机端口 | 说明 |
| --- | ---: | ---: | --- |
| `web` | `80` | `8080` | 网站入口 |
| `api` | `3000` | `3000` | 后端接口 |
| `postgres` | `5432` | `5432` | PostgreSQL |

默认访问网站：

```text
http://服务器IP:8080
```

如果要直接访问：

```text
http://服务器IP
```

可以把 `docker-compose.yml` 的 web 端口改成：

```yaml
web:
  ports:
    - "80:80"
```

但如果服务器已有 Apache、Nginx、Caddy 等占用 80 端口，Docker 会启动失败。生产更推荐：

```text
外部 80/443 -> 宿主机 Nginx/Caddy -> 127.0.0.1:8080 -> web 容器
```

生产环境不建议把 `3000` 和 `5432` 暴露到公网。可以改成只绑定本机：

```yaml
api:
  ports:
    - "127.0.0.1:3000:3000"

postgres:
  ports:
    - "127.0.0.1:5432:5432"
```

如果宿主机不需要直接访问 API 和数据库，也可以删除 `api`、`postgres` 的 `ports`，容器之间仍可通过 Docker 内部网络访问。

## 3. 环境变量

根目录 `.env` 主要给 Docker Compose 使用。首次部署前复制模板：

```bash
cp .env.example .env
```

Windows 本地：

```powershell
Copy-Item .env.example .env
```

主要变量：

| 变量 | 说明 |
| --- | --- |
| `POSTGRES_DB` | PostgreSQL 数据库名 |
| `POSTGRES_USER` | PostgreSQL 用户名 |
| `POSTGRES_PASSWORD` | PostgreSQL 密码，生产必须修改 |
| `JWT_ACCESS_SECRET` | JWT 签名密钥，生产必须使用强随机值 |
| `DIFY_API_BASE_URL` | Dify API 地址，可为空 |
| `DIFY_API_KEY` | Dify API Key，可为空 |

`docker-compose.yml` 会用这些变量拼出 API 容器内的：

```text
DATABASE_URL=postgresql://用户:密码@postgres:5432/数据库
```

本地直接运行后端时，使用的是：

```text
apps/api/.env
```

只要里面的 `DATABASE_URL` 正确，`apps/api/.env` 不需要再写 `POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD`。

如果连接某些远程 PostgreSQL 报：

```text
P1011 Error opening a TLS connection
```

且数据库不需要 TLS，可在 `DATABASE_URL` 后追加：

```text
?sslmode=disable
```

## 4. 本地开发

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

启动后端：

```bash
npm run dev:api
```

启动前端：

```bash
npm run dev:web
```

根目录的：

```bash
npm run dev
```

只启动前端，不会启动后端。

Windows PowerShell 如果提示 `无法加载 npm.ps1`，使用：

```powershell
npm.cmd run dev:api
npm.cmd run dev:web
```

本地访问：

```text
前端：http://localhost:5173
API：http://localhost:3000/api
健康检查：http://localhost:3000/api/health
```

Vite 开发代理会把 `/api` 转发到 `http://localhost:3000`。如果前端终端出现：

```text
http proxy error ECONNREFUSED
```

通常是后端没有启动，或后端启动失败。

## 5. Docker Compose 部署

首次部署：

```bash
git pull
docker compose up -d --build
docker compose exec api npm run prisma:deploy --workspace @benmaoyaya/api
```

演示或测试环境需要初始化演示数据：

```bash
docker compose exec api npm run prisma:seed --workspace @benmaoyaya/api
```

注意：`prisma:seed` 会清空并重建演示数据，生产已有真实数据时不要执行。

查看服务：

```bash
docker ps
docker compose ps
```

查看日志：

```bash
docker compose logs -f api
docker compose logs -f web
docker compose logs -f postgres
```

停止服务：

```bash
docker compose down
```

不要随便执行：

```bash
docker compose down -v
```

`-v` 会删除数据库和上传文件 volume，可能导致数据丢失。

更新发布：

```bash
git pull
docker compose up -d --build
docker compose exec api npm run prisma:deploy --workspace @benmaoyaya/api
```

如果只想重构建 API：

```bash
docker compose build --no-cache api
docker compose up -d api
```

## 6. 登录系统

当前登录规则：

| 用户类型 | 登录方式 |
| --- | --- |
| 学生 | NFC 卡号 + 密码 |
| 家长 | 亲情卡号 + 密码 |
| 导师 | 邮箱或手机号 + 密码 |
| 管理员 | 邮箱或手机号 + 密码 |

登录页：

```text
/login
```

扫 NFC 卡入口：

```text
/entry?idd=卡号&idh=卡片校验号
```

流程：

```text
扫卡 -> /api/nfc/resolve 识别卡片状态 -> 跳转 /login 并预填卡号 -> 输入密码 -> /api/auth/card-login -> 签发 JWT
```

导师和管理员使用：

```text
POST /api/auth/login
```

学生和家长使用：

```text
POST /api/auth/card-login
```

演示数据初始化后可用：

```text
学生卡：04A1B2C3D4    密码：demo123456
家长卡：04A1B2C3F6    密码：demo123456
导师：mentor@yayasmart.com    密码：demo123456
管理员：admin@yayasmart.com    密码：demo123456
```

后端仍保留 `/api/auth/demo-login`，用于内部演示兼容；正式前端入口不再暴露角色一键切换。

## 7. 数据库运维

新数据库必须先执行迁移：

```bash
docker compose exec api npm run prisma:deploy --workspace @benmaoyaya/api
```

如果报：

```text
P2021 table public.User does not exist
```

说明数据库表还没创建，执行上面的 migration 命令。

演示环境写入数据：

```bash
docker compose exec api npm run prisma:seed --workspace @benmaoyaya/api
```

检查用户表：

```bash
docker compose exec postgres psql -U benmaoyaya -d benmaoyaya -c 'select id,email,role from "User";'
```

如果 `.env` 修改了 `POSTGRES_USER` 或 `POSTGRES_DB`，命令里的 `benmaoyaya` 要替换成实际值。

备份数据库：

```bash
docker compose exec postgres pg_dump -U benmaoyaya -d benmaoyaya > backup.sql
```

恢复数据库前建议先停 API：

```bash
docker compose stop api
docker compose exec -T postgres psql -U benmaoyaya -d benmaoyaya < backup.sql
docker compose start api
```

## 8. 上传文件

上传文件由 API 写入：

```text
FILE_STORAGE_PATH=/app/uploads
```

Docker Compose 中映射为：

```text
uploads_data:/app/uploads
```

运维注意：

- 迁移服务器时，数据库 volume 和 `uploads_data` 都要迁移。
- 定期备份数据库和上传目录。
- `MAX_FILE_SIZE_MB` 与 Nginx `client_max_body_size` 应保持一致或略大。

## 9. 健康检查和验证

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

验证员工登录：

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"mentor@yayasmart.com","password":"demo123456"}'
```

验证卡登录：

```bash
curl -X POST http://localhost:3000/api/auth/card-login \
  -H "Content-Type: application/json" \
  -d '{"cardId":"04A1B2C3D4","password":"demo123456"}'
```

验证网站入口：

```bash
curl http://localhost:8080
```

## 10. 常见故障

### 10.1 Docker 拉镜像超时

表现：

```text
failed to resolve reference docker.io/... i/o timeout
```

处理：配置 Docker 镜像加速，重启 Docker。

### 10.2 80 端口被占用

查看：

```bash
sudo netstat -napt | grep ':80'
```

如果看到 Apache：

```text
/usr/local/lighthouse/softwares/apache/bin/httpd -k start
```

说明 80 被 Apache 占用。处理方式：

- 保持 Docker web 使用 `8080:80`，访问 `http://服务器IP:8080`。
- 或停掉 Apache，再把 web 改成 `80:80`。
- 或用 Apache/Nginx/Caddy 把 80/443 代理到 `127.0.0.1:8080`。

### 10.3 API 构建报 `apps/api/node_modules not found`

旧 Dockerfile 可能复制了不存在的 workspace 子目录依赖：

```text
/app/apps/api/node_modules
```

当前 Dockerfile 已修复，只复制：

```text
/app/node_modules
```

服务器更新代码后重新构建：

```bash
git pull
docker compose build --no-cache api
docker compose up -d api
```

### 10.4 数据库表不存在

表现：

```text
The table public.User does not exist
```

处理：

```bash
docker compose exec api npm run prisma:deploy --workspace @benmaoyaya/api
```

演示环境再执行：

```bash
docker compose exec api npm run prisma:seed --workspace @benmaoyaya/api
```

### 10.5 数据为空

如果表存在但页面没有演示数据，执行 seed：

```bash
docker compose exec api npm run prisma:seed --workspace @benmaoyaya/api
```

生产已有真实数据时不要执行。

### 10.6 后端端口占用

表现：

```text
EADDRINUSE: address already in use :::3000
```

查看：

```bash
sudo netstat -napt | grep ':3000'
```

停止旧进程或修改端口映射。

## 11. 发布检查清单

发布前：

- `.env` 已设置强随机 `JWT_ACCESS_SECRET`。
- `.env` 已设置安全的 `POSTGRES_PASSWORD`。
- `WEB_ORIGIN` 与实际访问域名一致。
- 已备份数据库和上传文件 volume。
- 已执行 `npm run build:all` 或 Docker 构建通过。
- 已执行 `prisma:deploy`。
- 生产环境未执行会清数据的 `prisma:seed`。

发布后：

- `docker ps` 中 `web`、`api`、`postgres` 正常运行。
- `postgres` 状态为 healthy。
- `/api/health` 返回 `database: connected`。
- `/login` 可访问。
- 学生卡、家长卡、导师、管理员登录均验证通过。
- 上传功能验证通过。
- 记录发布时间、版本号、迁移编号和操作者。

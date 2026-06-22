# 笨猫丫丫 OPC 生产部署运维手册

适用版本：`2.4.0`

本手册按正式生产站点编写。当前项目采用 npm workspaces：

- `apps/web`：Vue 3 + Vite，生产镜像使用 Nginx 托管静态文件，并代理 `/api`。
- `apps/api`：NestJS REST API，使用 Prisma 访问 PostgreSQL。
- `docker-compose.yml`：单机生产部署编排，包含 `postgres`、`api`、`web`。

## 1. 云服务器软件

Ubuntu 24 推荐安装：

```text
必须：Docker Engine、Docker Compose plugin、Git、curl、ca-certificates
建议：ufw、Nginx 或 Caddy、HTTPS 证书工具
```

不需要在宿主机安装：

```text
Node.js、npm、PostgreSQL、Prisma、前端 Nginx
```

这些都在容器里运行。

基础包：

```bash
sudo apt update
sudo apt install -y ca-certificates curl git ufw
```

如果服务器拉取 Docker Hub 超时，可配置 Docker 镜像加速：

```bash
sudo mkdir -p /etc/docker
sudo nano /etc/docker/daemon.json
```

示例：

```json
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com"
  ]
}
```

重启 Docker：

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
docker info
```

## 2. 生产端口

当前 `docker-compose.yml` 默认：

| 服务 | 容器端口 | 宿主机端口 | 说明 |
| --- | ---: | ---: | --- |
| `web` | `80` | `${WEB_PORT:-8080}` | 网站入口 |
| `api` | `3000` | `127.0.0.1:3000` | 仅宿主机可访问 |
| `postgres` | `5432` | `${POSTGRES_BIND:-127.0.0.1}:${POSTGRES_PORT:-5432}` | 默认仅宿主机可访问 |

默认访问：

```text
http://服务器IP:8080
```

正式域名建议：

```text
公网 80/443 -> 宿主机 Nginx/Caddy -> 127.0.0.1:8080 -> web 容器
```

如果要让 Docker web 直接占用 80，可在 `.env` 设置：

```env
WEB_PORT=80
WEB_ORIGIN=https://你的域名
```

若宿主机已有 Apache/Nginx/Caddy 占用 80，保持 `WEB_PORT=8080`，再由宿主机反向代理到 `127.0.0.1:8080`。

生产环境默认不要把 PostgreSQL 和 API 直接暴露公网。如果确实需要远程连接数据库，可在 `.env` 中显式配置：

```env
POSTGRES_BIND=0.0.0.0
POSTGRES_PORT=65432
```

这样外部连接为：

```text
Host: 服务器IP
Port: 65432
Database: POSTGRES_DB
User: POSTGRES_USER
Password: POSTGRES_PASSWORD
```

暴露数据库前必须在云服务器安全组和 `ufw` 中限制来源 IP，并使用强密码。

## 3. 环境变量

根目录 `.env` 给 Docker Compose 使用：

```bash
cp .env.example .env
```

生产必须修改：

```env
POSTGRES_DB=benmaoyaya
POSTGRES_USER=benmaoyaya
POSTGRES_PASSWORD=请改成强密码
JWT_ACCESS_SECRET=请改成32位以上强随机字符串
WEB_ORIGIN=https://你的域名
WEB_PORT=8080
```

可选：

```env
DIFY_API_BASE_URL=
DIFY_API_KEY=
DIFY_CHAT_APP_ID=
DIFY_WORKFLOW_APP_ID=
MAX_FILE_SIZE_MB=20
```

`docker-compose.yml` 会自动拼出容器内的 `DATABASE_URL`：

```text
postgresql://POSTGRES_USER:POSTGRES_PASSWORD@postgres:5432/POSTGRES_DB
```

本地直接运行后端时才使用 `apps/api/.env`。

## 4. 生产登录规则

正式前端入口：

```text
/login
```

登录方式：

| 用户类型 | 登录方式 |
| --- | --- |
| 学生 | NFC 卡号 + 密码 |
| 家长 | 亲情卡号 + 密码 |
| 导师 | 邮箱或手机号 + 密码 |
| 管理员 | 邮箱或手机号 + 密码 |

学生首次使用未绑定 NFC 卡时，会进入激活建档流程，并在激活页设置登录密码。后续学生使用：

```text
NFC 卡号 + 激活时设置的密码
```

登录系统。

扫卡入口：

```text
/entry?idd=卡号&idh=卡片校验号
```

NFC 卡合法性规则：

- `idd` 是 NFC 卡片在系统中的完整唯一标识。链接中 `idd` 参数是多少，数据库 `NfcCard.idd` 就应写入多少。
- 系统不得拆分 `idd`，也不得从 `idd` 中派生批次号；卡片检测必须按 `NfcCard.idd` 的完整内容精确匹配。
- **只有 `NfcCard` 表中已存在的卡才是合法卡。**
- 如果 `NfcCard` 表中不存在对应 `idd`，后端必须返回 `card_not_found`，前端提示“这张卡片暂时无法使用/还没有准备好”，不得自动创建卡片记录。
- 只有已入库且状态为 `UNBOUND` 的卡，才允许进入首次激活建档；已绑定且状态为 `ACTIVE` 的卡进入卡登录和业务路由。

流程：

```text
扫卡 -> 识别卡片状态 -> 跳转 /login 并预填卡号 -> 输入密码 -> 签发 JWT
```

修改密码：

- 学生：`我的资料与权限 -> 修改密码`
- 家长、导师、管理员：`账号安全 -> 修改密码`

生产环境默认禁用演示登录接口 `/api/auth/demo-login`。只有显式设置：

```env
ENABLE_DEMO_LOGIN=true
```

并重启 API 后才会启用。正式生产不建议开启。

## 5. 首次部署

在服务器项目目录执行：

```bash
git pull
docker compose up -d --build
docker compose exec api npm run prisma:deploy --workspace @benmaoyaya/api
```

生产空库不会自动创建账号。首次部署后，需要创建第一个管理员：

```bash
docker compose exec \
  -e ADMIN_EMAIL=admin@example.com \
  -e ADMIN_PASSWORD='请改成强密码' \
  api npm run prisma:bootstrap-admin --workspace @benmaoyaya/api
```

如果只想用手机号作为管理员登录账号：

```bash
docker compose exec \
  -e ADMIN_PHONE=13800000000 \
  -e ADMIN_PASSWORD='请改成强密码' \
  api npm run prisma:bootstrap-admin --workspace @benmaoyaya/api
```

该命令不会清空数据；如果已存在激活管理员，会直接跳过。

检查：

```bash
docker ps
docker compose logs -f api
curl http://localhost:3000/api/health
curl http://localhost:8080
```

`/api/health` 正常返回：

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "..."
}
```

## 6. 生产数据初始化

生产只执行：

```bash
docker compose exec api npm run prisma:deploy --workspace @benmaoyaya/api
```

创建首个管理员：

```bash
docker compose exec \
  -e ADMIN_EMAIL=admin@example.com \
  -e ADMIN_PASSWORD='请改成强密码' \
  api npm run prisma:bootstrap-admin --workspace @benmaoyaya/api
```

不要在真实生产库随意执行：

```bash
docker compose exec api npm run prisma:seed --workspace @benmaoyaya/api
```

`prisma:seed` 会清空并重建演示数据，只适合演示或测试环境。

如果首次部署需要演示数据，可临时执行 seed，验证后再换成真实数据流程：

```bash
docker compose exec api npm run prisma:seed --workspace @benmaoyaya/api
```

演示数据账号：

```text
学生卡：04A1B2C3D4    密码：demo123456
家长卡：04A1B2C3F6    密码：demo123456
导师：mentor@yayasmart.com    密码：demo123456
管理员：admin@yayasmart.com    密码：demo123456
```

## 7. 日常发布

发布新版本：

```bash
git pull
docker compose up -d --build
docker compose exec api npm run prisma:deploy --workspace @benmaoyaya/api
```

只重建 API：

```bash
docker compose build --no-cache api
docker compose up -d api
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

不要执行：

```bash
docker compose down -v
```

除非确认要删除数据库和上传文件 volume。

## 8. 数据库运维

查看用户：

```bash
docker compose exec postgres psql -U benmaoyaya -d benmaoyaya -c 'select id,email,phone,role,active from "User";'
```

如果 `.env` 修改了 `POSTGRES_USER` 或 `POSTGRES_DB`，命令中对应值要同步替换。

备份：

```bash
docker compose exec postgres pg_dump -U benmaoyaya -d benmaoyaya > backup.sql
```

恢复前建议暂停 API：

```bash
docker compose stop api
docker compose exec -T postgres psql -U benmaoyaya -d benmaoyaya < backup.sql
docker compose start api
```

定期备份：

```text
PostgreSQL 数据库
uploads_data 上传文件 volume
.env 配置文件
```

## 9. 上传文件

API 容器内上传目录：

```text
/app/uploads
```

Docker volume：

```text
uploads_data:/app/uploads
```

迁移服务器时，必须同时迁移数据库和 `uploads_data`，否则文件记录和实际文件会不一致。

## 10. 常见故障

### Docker 拉镜像超时

表现：

```text
failed to resolve reference docker.io/... i/o timeout
```

处理：配置 Docker 镜像加速，然后重启 Docker。

### 80 端口被占用

查看：

```bash
sudo netstat -napt | grep ':80'
```

如果已有 Apache/Nginx/Caddy，保持 Docker `WEB_PORT=8080`，用宿主机服务反向代理到 `127.0.0.1:8080`。

### 数据库表不存在

表现：

```text
The table public.User does not exist
```

处理：

```bash
docker compose exec api npm run prisma:deploy --workspace @benmaoyaya/api
```

### 页面数据为空

如果是演示环境，执行 seed：

```bash
docker compose exec api npm run prisma:seed --workspace @benmaoyaya/api
```

生产环境不要用 seed 修复真实数据。

### API 构建报 `apps/api/node_modules not found`

当前 Dockerfile 已修复。更新代码后重新构建：

```bash
git pull
docker compose build --no-cache api
docker compose up -d api
```

### 登录失败

检查：

```bash
docker compose logs -f api
docker compose exec postgres psql -U benmaoyaya -d benmaoyaya -c 'select email,phone,role,active from "User";'
```

学生/家长必须使用已绑定且状态为 `ACTIVE` 的卡。

## 11. 发布检查清单

发布前：

- `.env` 中 `POSTGRES_PASSWORD` 已改为强密码。
- `.env` 中 `JWT_ACCESS_SECRET` 已改为强随机字符串。
- `WEB_ORIGIN` 与正式域名一致。
- `ENABLE_DEMO_LOGIN` 未开启。
- 已备份数据库和上传文件。
- 已执行构建或 Docker 构建通过。
- 已执行 `prisma:deploy`。

发布后：

- `docker ps` 中 `web`、`api`、`postgres` 均正常运行。
- `postgres` 为 `healthy`。
- `/api/health` 返回 `database: connected`。
- `/login` 可访问。
- 学生卡、家长卡、导师、管理员登录均验证通过。
- 修改密码功能验证通过。
- 上传功能验证通过。

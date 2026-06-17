# 笨猫丫丫 OPC 学习陪跑系统

依据《产品执行手册 V2.4》和详细设计实现的前后端分离 monorepo。

## 工程结构

```text
apps/
  web/                  Vue 3 + Vite 前端
    public/img/          品牌图像资源
    public/mp4/          品牌视频资源
    src/                 学生、导师、家长、管理端页面与逻辑
  api/                  NestJS REST API
    prisma/              PostgreSQL 数据模型、迁移和种子
    src/                 认证、NFC、学生、任务、SOP、复盘等模块
docker-compose.yml      PostgreSQL、API、Web 一体化编排
package.json            npm workspaces 统一命令入口
package-lock.json       全仓唯一依赖锁文件
```

业务数据仅保存在 PostgreSQL。前端 `sessionStorage` 只保存 JWT 和当前演示角色，不保存学生档案或业务状态。

## 一键启动

```bash
docker compose up -d --build
docker compose exec api npm run prisma:deploy --workspace @benmaoyaya/api
docker compose exec api npm run prisma:seed --workspace @benmaoyaya/api
```

访问 `http://localhost:8080`。

## 本地开发

安装全仓依赖：

```bash
npm install
```

准备 PostgreSQL，并在根目录创建 `.env`。数据库初始化：

```bash
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
```

分别启动前后端：

```bash
npm run dev:api
npm run dev:web
```

前端默认地址：`http://localhost:5173`  
API 默认地址：`http://localhost:3000/api`

开发服务器会把 `/api` 代理到本地 API。需要独立地址时，在 `apps/web/.env` 配置 `VITE_API_BASE_URL`。

## 常用命令

```bash
npm run dev:web
npm run dev:api
npm run lint:all
npm run build:all
npm run test
```

也可进入单个应用目录执行其自身命令。

## 演示账号

统一密码：`demo123456`

| 角色 | 邮箱 |
| --- | --- |
| 管理员 | `admin@yayasmart.com` |
| 导师 | `mentor@yayasmart.com` |
| 学生 | `student@example.com` |
| 家长 | `parent@example.com` |

界面顶部角色切换通过 `/api/auth/demo-login` 登录对应演示账号。

## 学生业务闭环

1. NFC 解析卡片类型和学生阶段。
2. 新生建立激活会话、上传资料并创建学生档案。
3. 管理员分配导师，导师确认 SOP V1.0。
4. 学生执行任务并提交带版本的成果证据。
5. 导师验收通过或退回补充；只有通过才计入完成率和成长档案。
6. 学生提交周、月、学期复盘，导师反馈后关闭。
7. 目标修订生成新 SOP，旧版本归档保留。
8. 家长仅能读取授权摘要并发送鼓励。
9. 卡片挂失、恢复、亲情授权撤回和导师验收均写入审计日志。

生产环境还需配置真实短信/邮件、对象存储和 Dify 密钥。未配置 Dify 时，后端返回带来源标识的本地兜底建议。

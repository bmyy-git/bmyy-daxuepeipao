# 笨猫丫丫 OPC 学习陪跑网站实现文档

> 修订说明：已按《产品执行手册 V2.4》及 `yayasmart-demo` 于 2026-06-15 补充修订。第 15-16 节覆盖前文中冲突的 MVP 边界、状态和接口定义。

## 1. 实现目标

本实现文档基于《笨猫丫丫OPC学习陪跑-网站设计文档》和《笨猫丫丫OPC学习陪跑-思路》整理，目标是在不偏离原始产品定位的前提下，将网站建设拆解为可开发、可验收、可迭代的工程方案。

核心定位保持不变：

> 一张 NFC 卡片，开启四年学业陪跑。

系统必须围绕“入学三部曲”展开：

1. 第一次碰一碰：初见，开启旅程。
2. 第二次碰一碰：连接，导师就位。
3. 第三次及以后碰一碰：启程，日常陪跑。

网站不是普通官网或营销页，首要任务是承接 NFC 卡片入口，让学生完成激活、资料提交、目标锚定、导师连接、SOP 查看、日常任务执行和目标动态修订。

## 2. 实现边界

### 2.1 必须实现的基本要求

- NFC 卡片作为学生进入系统的物理入口。
- NFC 链接采用动态路由形式：

```text
https://e.yayasmart.com?id1=xxx&id2=xxx
```

- 系统根据卡片状态自动分发页面：
  - ID 缺失或无效：异常提示页。
  - 卡片未绑定：首次激活页。
  - 已绑定但未匹配导师：等待匹配页。
  - 已匹配导师：导师就位页。
  - SOP 已确认：个人专属仪表盘。
- 第一次碰卡必须包含基础信息录入、资料上传、目标选择。
- 第二次碰卡必须突出导师就位的仪式感、导师名片和 SOP 概览。
- 第三次及以后碰卡必须进入个人仪表盘，而不是营销首页。
- SOP 必须支持版本化，从 AI 草案 V0.1 到导师确认 V1.0，再到后续 V2.0 等迭代版本。
- Dify 只作为后端知识库和 AI 能力，不直接暴露给前端。
- AI 输出必须保留导师确认空间，不能替代导师最终判断。

### 2.2 MVP 暂不深做的内容

以下内容可在第一阶段保留数据结构和入口，但不要求完整自动化：

- 导师智能匹配算法。
- 奖金自动结算。
- 完整排行榜运营体系。
- 多学校复杂权限运营后台。
- 自动风险预警引擎。
- 复杂 SOP 在线协同编辑器。

MVP 可以采用“后台人工配置 + 前端状态展示 + Dify 辅助分析”的方式先跑通闭环。

## 3. 技术架构

### 3.0 推荐技术栈

考虑到项目第一阶段以业务闭环为主，且服务器可能只有 2 核 4G，推荐采用前后端分离的轻量 TypeScript 技术栈：

| 层级 | 技术选型 | 实现方式 |
| --- | --- | --- |
| 前端 | Vue 3 + Vite + TypeScript | 构建学生移动端 H5、导师工作台和管理后台，打包后生成静态文件 |
| 后端 | NestJS + TypeScript | 提供独立 API 服务，承载业务流程、权限、Dify 代理、文件、通知和 SOP 状态机 |
| 数据库 | PostgreSQL + Prisma | PostgreSQL 保存业务数据，Prisma 提供类型安全的数据访问和数据库迁移 |
| 部署 | Nginx 托管前端静态文件，NestJS 提供后端 API | Nginx 负责静态资源、HTTPS 和 API 反向代理，NestJS 作为常驻 Node 服务运行 |

第一阶段不建议使用 Next.js 或 Nuxt 的 SSR 模式作为主架构。学生端、导师工作台和管理后台都是业务应用，对 SEO 依赖低，静态前端 + 独立后端 API 更省资源，也更适合 2 核 4G 服务器。

### 3.1 总体架构

```text
学生移动端 H5
导师工作台
管理后台
   ↓
Vue 3 + Vite 前端应用
   ↓
NestJS 后端 API 服务
   ↓
PostgreSQL + Prisma / 文件存储
   ↓
Dify API / Dify 知识库
```

### 3.2 前端职责

- 解析 NFC 链接参数 `id1`、`id2`。
- 调用后端路由接口获取卡片状态和页面去向。
- 实现学生端移动 H5 页面。
- 实现导师工作台基础页面。
- 实现管理后台基础配置页面。
- 展示 Dify 返回的摘要、问答、SOP 草案和引用来源。
- 对上传、分析、匹配、确认等异步状态给出明确反馈。

前端采用 Vue 3 + Vite + TypeScript。路由使用 Vue Router，跨页面状态可使用 Pinia，表单校验可结合 Zod 或 VeeValidate。前端构建产物由 Nginx 托管，不直接连接数据库，也不直接调用 Dify。

### 3.3 后端职责

- NFC 卡片校验与状态路由。
- 学生档案创建和更新。
- 文件上传、解析状态管理和 Dify 文档入库。
- Dify API 代理调用。
- SOP 草案生成、导师确认和版本管理。
- 导师分配关系维护。
- 任务、打卡、红线预警、荣誉和奖金数据管理。
- 通知发送，包括短信、邮件和站内通知。
- 权限控制、日志记录和敏感信息保护。

后端采用 NestJS + TypeScript。按业务域拆分模块，例如 NfcModule、StudentsModule、MentorsModule、SopsModule、TasksModule、FilesModule、AiModule、NotificationsModule 和 AdminModule。数据库访问通过 PrismaService 统一封装。

### 3.4 Dify 职责

- 学校资料摘要。
- 学生上传资料问答。
- 规则提取。
- SOP 草案生成。
- 目标修订影响分析。
- 日常 AI 问答辅助。

Dify 的所有调用都必须经过后端服务，前端不保存 Dify API Key。

## 4. 页面实现方案

### 4.1 NFC 路由入口页

访问示例：

```text
https://e.yayasmart.com?id1=card_001&id2=batch_2026
```

前端启动后调用：

```text
GET /api/nfc/resolve?id1=card_001&id2=batch_2026
```

返回示例：

```json
{
  "status": "unbound",
  "redirect_to": "activation",
  "card_id": "card_001"
}
```

路由规则：

| 状态 | 页面 |
| --- | --- |
| invalid | 异常提示页 |
| unbound | 首次激活页 |
| pending_match | 等待匹配页 |
| mentor_matched | 导师就位页 |
| sop_finalized | 学生仪表盘 |
| disabled | 卡片停用提示页 |

异常提示页文案要陪伴式表达，例如“这张卡片还没有准备好，请联系工作人员确认”。

### 4.2 首次激活页

对应“第一幕：初见·开启旅程”。

页面流程：

1. 全屏欢迎动效。
2. Loading 文案：“正在为你生成专属攻略...”。
3. 基础信息填写。
4. 目标选择。
5. 资料上传。
6. 隐私授权确认。
7. 提交后进入等待匹配页。

基础信息字段：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| name | 是 | 学生姓名 |
| phone | 是 | 手机号 |
| email | 否 | 邮箱 |
| school | 是 | 录取院校 |
| major | 是 | 专业 |
| grade | 否 | 默认大一新生 |

目标选择必须支持多选：

- 保研/推免
- 考研深造
- 大满贯毕业
- 高质量就业
- 出国留学
- 考公考编
- 其他自定义

资料上传类型：

- 学生手册。
- 评优评奖政策。
- 培养方案。
- 专业介绍。
- 其他与目标有关的资料。

提交接口：

```text
POST /api/students/activate
```

提交成功后的后端动作：

- 绑定 NFC 卡片与学生。
- 创建学生档案。
- 保存目标标签。
- 保存上传文件元数据。
- 异步触发 Dify 文档解析。
- 创建 SOP V0.1 草案任务。
- 将卡片状态改为 `pending_match`。

### 4.3 等待匹配页

对应第一次提交后到导师就位前的过渡期。

核心展示：

- “你的资料已收到”。
- “你的专属攻略正在生成中”。
- AI 解析进度。
- 导师匹配状态。
- 预计通知方式。
- 补充资料入口。

状态字段：

| 状态 | 展示 |
| --- | --- |
| documents_uploaded | 资料已收到 |
| ai_analyzing | 正在生成专属攻略 |
| sop_draft_ready | 初版攻略已生成 |
| mentor_matching | 导师正在赶来的路上 |
| mentor_matched | 导师已就位 |

此页不能显示冷冰冰的失败报错。资料解析失败时展示“部分资料暂时没读懂，你可以稍后补充或联系工作人员”，并允许重新上传。

### 4.4 导师就位页

对应“第二幕：连接·导师就位”。

进入条件：

- 学生已激活。
- 系统已完成导师匹配。
- 卡片状态为 `mentor_matched` 或 `sop_reviewing`。

核心模块：

- 信件拆开或解锁动效。
- 导师名片。
- 一键联系按钮。
- 预约首次沟通入口。
- SOP 概览。
- 下一步提示。

导师名片字段：

| 字段 | 说明 |
| --- | --- |
| avatar | 导师头像 |
| name | 导师姓名 |
| tags | 资历标签，如 985 硕士、前大厂高工、竞赛金牌教练 |
| expertise | 擅长方向 |
| service_count | 辅导次数 |
| rating | 好评率 |
| achievements | 学员成果 |
| contact_method | 联系方式或 IM 跳转 |

若 SOP V1.0 尚未确认，展示“导师正在完善你的专属路线图”。不要让学生误以为系统故障。

### 4.5 学生仪表盘

对应“第三幕：启程·日常陪跑”。

进入条件：

- 学生已绑定。
- 导师已确认 SOP，或系统允许进入陪跑状态。

第一屏必须直接展示学生当前最该做的事：

- 今日状态。
- 本周任务。
- 当前学期目标。
- 红线预警。
- 连续打卡天数。

其他模块：

- SOP 通关地图。
- AI 问答入口。
- 奖金收益。
- 荣誉排行榜。
- 目标修订入口。
- 导师联系入口。

首页不是宣传页，不能使用“产品介绍”替代个人任务和进度。

### 4.6 SOP 规划详情页

页面定位：我的通关地图。

核心展示：

- 四年时间轴。
- 按学期拆解任务。
- 当前行动指南。
- 红线预警。
- SOP 版本记录。
- 导师备注。

任务字段：

| 字段 | 说明 |
| --- | --- |
| title | 任务名称 |
| semester | 所属学期 |
| priority | 优先级 |
| deadline | 截止时间 |
| completion_criteria | 完成标准 |
| related_goal | 关联目标 |
| source | 关联资料来源 |
| mentor_note | 导师备注 |
| status | 完成状态 |

红线预警必须醒目展示，例如：

- 高数绝对不能挂科。
- 不得有违纪记录。
- 每学期至少参加 1 次竞赛或科研活动。

### 4.7 AI 知识库问答页

核心能力：

- 学生日常提问。
- 基于学生学校、专业、目标和 SOP 返回行动建议。
- 展示引用来源。
- 支持转人工导师。

接口：

```text
POST /api/ai/chat
```

返回必须包含：

```json
{
  "answer": "回答内容",
  "basis": "资料依据或系统推断",
  "sources": [],
  "actions": [],
  "need_mentor": false
}
```

回答规则：

- 明确区分“资料中有依据”和“系统推断建议”。
- 涉及学校政策、保研资格、奖学金金额等内容时必须展示来源或提示人工确认。
- 不允许直接渲染 Dify 返回的未经校验 HTML。

### 4.8 目标修订页

对应“目标的生长性”。

流程：

1. 学生点击“修订目标”。
2. 填写修订原因。
3. 选择新目标。
4. 系统调用 Dify 生成影响分析。
5. 提交导师确认。
6. 导师沟通后确认新 SOP。
7. 系统生成新版本，如 V2.0。
8. 旧版本归档保留。

旧 SOP 不允许覆盖删除，必须作为成长轨迹保存。

### 4.9 导师工作台

MVP 需要实现基础工作台。

核心页面：

- 待处理学生列表。
- 学生档案详情。
- 上传资料摘要。
- Dify 辅助分析结果。
- SOP 草案查看和确认。
- 本周任务维护。
- 沟通记录。
- 目标修订审核。

导师关键操作：

- 查看学生资料。
- 查看 AI 摘要。
- 修改或确认 V0.1 SOP。
- 发布 V1.0 SOP。
- 更新任务。
- 标记风险。
- 处理目标修订。

### 4.10 管理后台

MVP 可实现基础管理能力：

- NFC 卡片导入和状态查看。
- 学生列表。
- 导师列表。
- 学生与导师关系维护。
- 学校资料上传。
- Dify 知识库配置。
- 通知模板配置。

奖金、荣誉、数据看板可先保留配置入口，第二阶段完善。

## 5. 后端模块实现

### 5.1 NFC 卡片模块

职责：

- 维护卡片 ID、批次 ID、状态。
- 判断卡片是否可用。
- 绑定学生。
- 返回路由结果。

核心接口：

```text
GET /api/nfc/resolve
POST /api/nfc/bind
GET /api/admin/nfc-cards
POST /api/admin/nfc-cards/import
```

### 5.2 学生档案模块

职责：

- 创建学生。
- 更新联系方式、学校、专业、目标。
- 查询学生当前陪跑状态。
- 关联导师、SOP、任务和文件。

核心接口：

```text
POST /api/students/activate
GET /api/students/me
PATCH /api/students/me
POST /api/students/me/goals/revision
```

### 5.3 文件与知识库模块

职责：

- 接收学生上传资料。
- 保存文件元数据。
- 异步提交 Dify。
- 保存 Dify 文档 ID、摘要和解析状态。
- 处理失败重试。

核心接口：

```text
POST /api/files/upload
GET /api/files
POST /api/ai/analyze-documents
```

文件原件建议保存到对象存储或独立文件服务，数据库只保存文件地址和处理状态。

### 5.4 SOP 模块

职责：

- 创建 V0.1 草案。
- 支持导师确认 V1.0。
- 支持目标修订后的 V2.0。
- 保存历史版本。
- 管理任务、红线和导师备注。

核心接口：

```text
GET /api/sops/current
GET /api/sops/history
POST /api/sops/generate
POST /api/mentor/sops/{id}/confirm
PATCH /api/mentor/sops/{id}
```

### 5.5 任务与打卡模块

职责：

- 展示本周任务。
- 记录任务完成。
- 记录连续打卡天数。
- 支持导师维护任务。

核心接口：

```text
GET /api/tasks/current
PATCH /api/tasks/{id}
POST /api/checkins
GET /api/checkins/streak
```

### 5.6 导师模块

职责：

- 维护导师资料。
- 管理导师和学生关系。
- 处理待确认 SOP。
- 处理目标修订。

核心接口：

```text
GET /api/mentors
GET /api/mentor/students
GET /api/mentor/students/{id}
POST /api/admin/students/{id}/assign-mentor
```

### 5.7 通知模块

关键通知节点：

- 激活成功。
- 资料解析完成。
- 导师匹配完成。
- SOP V1.0 确认。
- 本周任务更新。
- 红线风险提醒。
- 目标修订结果。

导师匹配完成通知文案必须保留：

```text
【OPC陪跑】同学你好，你的专属指导老师已就位！请再次触碰你的NFC卡片查看。
```

## 6. 数据模型实现

### 6.1 nfc_cards

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 卡片 ID，对应 id1 |
| batch_id | string | 批次 ID，对应 id2 |
| status | string | unbound / pending_match / mentor_matched / sop_finalized / disabled |
| student_id | string | 绑定学生 |
| created_at | datetime | 创建时间 |
| activated_at | datetime | 激活时间 |

### 6.2 students

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 学生 ID |
| name | string | 姓名 |
| phone | string | 手机号 |
| email | string | 邮箱 |
| school | string | 学校 |
| major | string | 专业 |
| grade | string | 年级 |
| goals | json | 目标标签 |
| mentor_id | string | 导师 ID |
| status | string | 当前陪跑状态 |
| created_at | datetime | 创建时间 |

### 6.3 mentors

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 导师 ID |
| name | string | 姓名 |
| avatar | string | 头像 |
| tags | json | 资历标签 |
| expertise | json | 擅长方向 |
| service_count | number | 辅导次数 |
| rating | number | 好评率 |
| achievements | json | 学员成果 |
| contact_info | json | 联系方式 |

### 6.4 documents

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 文档 ID |
| owner_type | string | school / student / platform / mentor |
| owner_id | string | 所属对象 ID |
| file_name | string | 文件名 |
| file_url | string | 文件地址 |
| dify_document_id | string | Dify 文档 ID |
| status | string | uploaded / parsing / available / failed |
| summary | text | 摘要 |
| created_at | datetime | 创建时间 |

### 6.5 sops

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | SOP ID |
| student_id | string | 学生 ID |
| version | string | V0.1 / V1.0 / V2.0 |
| status | string | draft / reviewing / confirmed / archived |
| summary | text | 总览 |
| created_by | string | ai / mentor / system |
| confirmed_by | string | 确认导师 |
| created_at | datetime | 创建时间 |
| confirmed_at | datetime | 确认时间 |

### 6.6 tasks

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 任务 ID |
| sop_id | string | SOP ID |
| student_id | string | 学生 ID |
| semester | string | 学期 |
| title | string | 任务名称 |
| description | text | 任务说明 |
| priority | string | high / medium / low |
| deadline | date | 截止时间 |
| status | string | todo / doing / done / delayed |

### 6.7 checkins

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 打卡 ID |
| student_id | string | 学生 ID |
| task_id | string | 可选关联任务 |
| content | text | 打卡内容 |
| created_at | datetime | 打卡时间 |

### 6.8 ai_logs

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 日志 ID |
| student_id | string | 学生 ID |
| user_id | string | 提问人 |
| question | text | 问题 |
| answer | text | 回答 |
| sources | json | 引用来源 |
| need_mentor | boolean | 是否建议导师介入 |
| created_at | datetime | 创建时间 |

## 7. 核心状态机

### 7.1 卡片状态

```text
unbound
  ↓ 学生提交首次激活
pending_match
  ↓ 管理员或系统分配导师
mentor_matched
  ↓ 导师确认 SOP V1.0
sop_finalized
```

异常状态：

- disabled：卡片停用。
- invalid：参数错误或卡片不存在。

### 7.2 SOP 状态

```text
draft
  ↓ AI 生成 V0.1
reviewing
  ↓ 导师修改和确认
confirmed
  ↓ 学生发起目标修订
archived + new draft
```

## 8. Dify 接入实现

### 8.1 环境变量

```text
DIFY_API_BASE_URL=
DIFY_API_KEY=
DIFY_CHAT_APP_ID=
DIFY_WORKFLOW_APP_ID=
```

### 8.2 调用原则

- API Key 只允许服务端读取。
- 每次调用必须带学生 ID、会话 ID、知识库范围。
- 不向 Dify 传递不必要的手机号、邮箱等敏感信息。
- Dify 返回内容必须经过后端格式校验。
- 问答结果必须记录日志。

### 8.3 文档摘要工作流

```text
文件上传
  ↓
写入 documents，状态 uploaded
  ↓
异步提交 Dify，状态 parsing
  ↓
Dify 返回摘要、关键规则、风险项
  ↓
写入 summary，状态 available
  ↓
触发 SOP V0.1 生成
```

### 8.4 SOP 生成工作流

输入：

- 学校。
- 专业。
- 学生目标。
- 已解析资料摘要。
- 平台方法论。

输出：

- 四年路线图。
- 当前学期任务。
- 红线预警。
- 需要导师确认的问题。

AI 生成结果只作为 V0.1 草案，必须经导师确认后才能成为 V1.0。

## 9. 权限与隐私实现

- 学生只能访问自己的档案、SOP、任务、问答和上传资料。
- 导师只能访问分配给自己的学生。
- 管理员可访问全局数据，但关键操作必须记录日志。
- 学生上传资料前必须勾选隐私授权。
- 手机号、邮箱、成绩等敏感信息在后台列表中默认脱敏。
- 学生私有知识库不能被其他学生检索。
- Dify 知识库需要按学校、学生、导师和平台进行权限隔离。

## 10. 奖金与荣誉实现

### 10.1 MVP 展示范围

第一阶段只做展示和人工录入，不做自动财务结算。

奖金模块展示：

- 累计获得总额。
- 学生实得金额。
- 导师分润金额。
- 规则说明。
- 交易明细。

荣誉模块展示：

- 排行榜。
- 连续打卡榜。
- 大满贯毕业生案例。
- 学期成就徽章。

### 10.2 合规要求

- 奖金和分润金额必须来源于审核后的数据。
- 涉及“对赌”“分润”等表达时，前端文案需要按正式合同和法律意见调整。
- 金额类信息不建议由 AI 自动生成或自动入账。

## 11. 前端体验要求

- 移动端优先，特别是学生端。
- NFC 打开后 3 秒内必须给出明确反馈。
- 首次表单采用步骤化设计。
- 资料上传支持拍照、相册选择和文件上传。
- 重大节点使用全屏动效，但不能影响核心操作。
- 等待状态要有陪伴式文案。
- 仪表盘第一屏聚焦“今天该做什么”。
- AI 问答入口固定可见，但不喧宾夺主。
- 红线预警必须醒目。
- 目标修订入口在大二分流、大三抉择等阶段保持可见。

## 12. MVP 开发排期

### 12.1 第一阶段：跑通 NFC 陪跑闭环

目标：完成从第一次碰卡到学生看到导师方案和仪表盘的主流程。

范围：

- NFC 路由入口。
- 首次激活页。
- 资料上传。
- 等待匹配页。
- Dify 文档摘要。
- SOP V0.1 生成。
- 管理员手动分配导师。
- 导师就位页。
- SOP V1.0 展示。
- 学生仪表盘基础版。
- 导师工作台基础版。

验收标准：

- 使用 `id1`、`id2` 打开链接后能按卡片状态进入正确页面。
- 未绑定卡片可完成学生激活。
- 上传资料后能进入异步解析状态。
- 后台可为学生分配导师。
- 学生再次碰卡可看到导师名片。
- SOP 确认后再次碰卡进入仪表盘。

### 12.2 第二阶段：完善陪跑日常

范围：

- 本周任务维护。
- 打卡系统。
- AI 日常问答。
- 目标修订流程。
- 通知系统。
- 荣誉榜基础版。
- 奖金明细人工录入。

验收标准：

- 学生能打卡并看到连续天数。
- 学生能向 AI 提问并看到引用来源。
- 学生能提交目标修订申请。
- 导师能确认新 SOP 版本。
- 系统保留 SOP 历史版本。

### 12.3 第三阶段：运营和智能化增强

范围：

- 多学校知识库隔离增强。
- 导师智能匹配。
- 自动风险预警。
- 数据看板。
- 成功案例库。
- 奖金审核流。

验收标准：

- 不同学校和学生资料权限隔离清晰。
- 风险项能基于任务、成绩或规则触发提醒。
- 管理员能查看整体运营数据。

## 13. 关键验收清单

- NFC 链接使用 `id1`、`id2`，符合原始动态路由要求。
- 三次碰卡体验完整，且页面顺序与“入学三部曲”一致。
- 第一次碰卡有仪式感、信息录入、资料上传和目标锚定。
- 第二次碰卡有导师就位通知、解锁动效、导师名片和 SOP 概览。
- 第三次及以后碰卡进入个人仪表盘。
- SOP 支持 V0.1、V1.0、V2.0 等版本。
- 目标修订不会覆盖历史 SOP。
- Dify 不暴露给前端。
- AI 建议有来源、有边界、有导师确认入口。
- 等待、失败、延迟状态均有友好文案。
- 仪表盘第一屏展示任务、目标、红线和进度，而不是产品介绍。

## 14. 待确认事项

- `id1` 和 `id2` 的真实业务含义是否固定为卡片 ID 与批次 ID。
- 学生资料是否进入 Dify 独立知识库，还是先由平台统一解析后再分层入库。
- 导师匹配第一阶段采用人工分配还是规则分配。
- 短信和邮件服务供应商。
- 奖金分成比例、结算周期和展示文案是否已有正式合同依据。
- 学生端是否只做 H5，是否需要后续封装小程序或 App。

## 15. V2.4 实现修订

本节覆盖前文中与《产品执行手册 V2.4》不一致的 MVP 取舍。学生执行闭环、亲情卡、多卡生命周期和基础 RBAC 属于主流程，不再作为仅预留入口的后续功能。

### 15.1 前端路由

```text
/entry?idd={idd}&idh={idh}       NFC 统一入口
/activate/:sessionId             首次激活
/waiting                         资料解析与导师匹配
/mentor-ready                    导师揭晓与首次沟通
/dashboard                       学生仪表盘
/sop                             SOP 路线图
/tasks                           任务列表
/tasks/:taskId                   任务详情与成果提交
/reviews                         周/月/学期复盘
/growth                          成长档案、荣誉和奖金
/ai                              AI 问答
/messages                        消息中心
/parent                          家长观察室
/mentor                          导师工作台
/admin                           管理后台
```

旧链接 `?id1=&id2=` 在网关层兼容，解析后 301/前端替换为 `idd/idh` 语义；日志同时保存原始参数，便于已有卡片迁移。

### 15.2 状态拆分

```text
CardStatus = unbound | active | lost | replaced | revoked
CardType = student_primary | student_secondary | parent_family | staff
StudentStage = activating | pending_match | mentor_matched | sop_reviewing |
               active | paused | graduated
TaskStatus = todo | doing | submitted | changes_requested | accepted |
             overdue | cancelled
ReviewStatus = draft | submitted | mentor_feedback | closed
```

`GET /api/nfc/resolve` 先校验卡片生命周期，再根据卡片类型和学生阶段决定页面。不得继续用单个 `nfc_cards.status` 同时表达卡片挂失和学生 SOP 状态。

### 15.3 学生任务执行接口

```text
GET  /api/students/me/action-center
GET  /api/tasks?scope=current
GET  /api/tasks/{id}
POST /api/tasks/{id}/start
POST /api/tasks/{id}/submissions
POST /api/task-submissions/{id}/withdraw
POST /api/mentor/task-submissions/{id}/accept
POST /api/mentor/task-submissions/{id}/request-changes
GET  /api/students/me/growth-events
POST /api/reviews
POST /api/mentor/reviews/{id}/feedback
```

成果提交请求示例：

```json
{
  "content": "已完成比赛报名和第一次训练，附报名截图与代码仓库。",
  "evidence_file_ids": ["file_101"],
  "evidence_links": ["https://example.com/repository"],
  "self_rating": 4,
  "blockers": []
}
```

导师退回必须填写原因和补充要求。验收通过必须记录验收人、时间、评语和可选成长积分；任务只有进入 `accepted` 才计入正式完成率、荣誉和奖金规则。

### 15.4 新增数据表

| 表 | 用途 |
| --- | --- |
| `card_bindings` | 支持一个学生绑定多卡、主副卡和亲情卡 |
| `task_submissions` | 学生每次成果提交及版本 |
| `task_submission_files` | 成果证据文件关联 |
| `task_reviews` | 导师通过/退回记录 |
| `period_reviews` | 周、月、学期复盘 |
| `growth_events` | 任务验收、荣誉、目标变更等成长时间线 |
| `honor_records` | 荣誉申报、审核和展示 |
| `bonus_ledger` | 奖金应计、审核、待支付、已结算流水 |
| `parent_relations` | 家长身份、学生授权范围和关系状态 |
| `encouragement_messages` | 家长鼓励消息 |
| `notifications` | 站内消息及短信/邮件投递状态 |

关键约束：

- `card_bindings(idd)` 唯一；同一学生最多一张有效 `student_primary`。
- `task_submissions(task_id, version)` 唯一且版本递增。
- 同一任务同时最多一个有效待审提交。
- `bonus_ledger` 使用不可变流水，修正通过冲正记录完成，不直接改历史金额。
- 家长权限由 `parent_relations.consent_scope` 决定，不从学生接口裁剪后复用。

### 15.5 异步与通知

使用队列处理文档解析、Dify、媒体转码/预览、通知和荣誉规则计算。建议第一阶段采用 Redis + BullMQ；若部署环境暂不引入 Redis，则使用 PostgreSQL job 表和定时 worker，但 API 契约保持一致。

通知事件至少包括：

```text
student.activated
documents.analysis_completed
mentor.assigned
sop.confirmed
task.due_soon
task.submitted
task.changes_requested
task.accepted
review.feedback_added
goal_revision.reviewed
parent.encouragement_received
bonus.status_changed
```

### 15.6 静态资源实现

将根目录资源复制或映射到前端 `apps/web/public/img`、`apps/web/public/mp4`，生产 URL 保持：

```text
/img/yayasmart-logo-5A-FFFFFF.png
/img/yayasmart-logo-5A-005A53.png
/img/yayasmart-logo-5A-B81F24.png
/img/yayasmart-logo-1-1152-928.png
/img/yayasmart-logo-2A-900-900.png
/img/yayasmart-logo-2B-900-900.png
/img/yayasmart-logo-3A-1280-1080.png
/img/yayasmart-logo-3B-1280-1080.png
/img/yayasmart-logo-3C-1280-1080.jpg
/img/yayasmart-logo-4A.png
/img/yayasmart-logo-4B.png
/mp4/yaya-smart.mp4
```

Vue 组件：

```text
BrandLogo.vue
BrandSceneImage.vue
JourneyVideo.vue
MotionFallback.vue
```

`JourneyVideo.vue` 必须支持 `poster`、播放失败静态图、可见区域外暂停、低流量降级和 `prefers-reduced-motion`。

源文件 `img/yayasmart-logo-1-1152 -928.png` 含不可见窄空格，构建时必须复制并规范化为 `apps/web/public/img/yayasmart-logo-1-1152-928.png`，业务代码禁止引用原始特殊字符文件名。

### 15.7 demo 迁移原则

- 复用颜色、卡片、时间轴、抽屉、响应式断点和陪伴式文案。
- 不复制 demo 中的 `alert`、`setTimeout` 模拟状态、硬编码学生数据和 `href="#"`。
- demo 中任务复选框改为打开任务详情；提交成果后由服务端状态驱动 UI。
- “模拟匹配”只保留在开发环境 Story/测试夹具，不进入生产页面。
- 所有按钮具备 loading、disabled、成功、失败和幂等处理。

## 16. 修订后交付顺序

1. NFC 双 ID、多卡绑定、激活和鉴权。
2. 资料上传、Dify V0.1、导师分配和 SOP V1.0。
3. 学生行动中心、任务成果提交和导师验收。
4. 周复盘、风险干预、目标修订和 SOP 新版本。
5. 家长观察室、鼓励消息和授权撤回。
6. 荣誉审核、奖金不可变流水和支付状态。
7. 细分 RBAC、运营后台和全链路审计。

每阶段均需提供 API 测试、状态机单元测试和至少一条端到端主流程测试。

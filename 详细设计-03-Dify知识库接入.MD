# 详细设计-03-Dify 知识库接入

## 1. 模块目标

Dify 知识库接入模块负责为系统提供资料摘要、规则提取、SOP 草案生成、日常问答和目标修订影响分析能力。

前端不得直接调用 Dify，所有 Dify 请求必须经过 NestJS 后端代理。

## 2. 接入原则

- Dify API Key 只保存在后端环境变量。
- 前端只调用网站后端 API。
- 后端负责注入学生上下文和权限范围。
- 后端负责校验 Dify 返回格式。
- AI 输出不能替代导师确认。
- 涉及政策、升学资格、奖金金额等高风险内容必须提示人工确认。

## 3. 知识库分类

| 知识库 | 内容 | 权限 |
| --- | --- | --- |
| 学校公共知识库 | 学生手册、培养方案、评奖政策 | 同校学生可用 |
| 学生私有知识库 | 学生上传资料、目标、SOP 历史 | 学生本人、匹配导师、管理员可用 |
| 平台方法论知识库 | 保研、考研、就业、竞赛、科研方法论 | 全平台可用 |
| 导师知识库 | 导师经验、模板、案例复盘 | 导师本人和授权学生可用 |

## 4. 环境变量

```text
DIFY_API_BASE_URL=
DIFY_API_KEY=
DIFY_CHAT_APP_ID=
DIFY_WORKFLOW_APP_ID=
DIFY_DATASET_ID_SCHOOL=
DIFY_DATASET_ID_PLATFORM=
```

学生私有知识库和导师知识库可通过数据库维护 Dify dataset / document 映射关系。

## 5. 主要调用场景

### 5.1 资料上传后自动摘要

触发条件：

- 学生完成资料上传。
- documents 状态为 `uploaded` 或 `scanning` 后进入处理队列。
- 文件通过格式、大小、文件头和安全扫描校验。
- documents 状态进入 `parsing`。

输出：

- 文件摘要。
- 关键规则。
- 风险项。
- 与目标相关的机会点。
- SOP V0.1 生成建议。

### 5.2 学生日常问答

输入：

- 学生问题。
- 学校、专业、年级。
- 当前目标。
- 当前 SOP。
- 可访问知识库范围。

输出：

- 回答内容。
- 引用来源。
- 行动建议。
- 是否建议转导师。

### 5.3 导师生成 SOP

输入：

- 学生档案。
- 目标标签。
- 文件摘要。
- 导师补充要求。

输出：

- 四年路线图。
- 学期任务。
- 当前行动指南。
- 红线预警。
- 需要导师确认的疑点。

### 5.4 目标修订影响分析

输入：

- 原目标。
- 新目标。
- 当前进度。
- 已完成成果。

输出：

- 可行性分析。
- 需要补齐的能力。
- 受影响任务。
- 新 SOP 草案建议。

## 6. 后端接口设计

### 6.1 文档分析

```text
POST /api/ai/analyze-documents
```

请求：

```json
{
  "student_id": "stu_001",
  "document_ids": ["doc_001", "doc_002"]
}
```

返回：

```json
{
  "status": "queued",
  "job_id": "job_001"
}
```

### 6.2 AI 问答

```text
POST /api/ai/chat
```

请求：

```json
{
  "student_id": "stu_001",
  "conversation_id": "conv_001",
  "question": "我大一上想保研，应该优先做什么？"
}
```

返回：

```json
{
  "answer": "建议优先稳定 GPA，并尽早了解学院保研细则。",
  "basis": "部分依据来自培养方案，部分为系统推断建议。",
  "sources": [
    {
      "name": "本科生培养方案.pdf",
      "section": "毕业与学位要求"
    }
  ],
  "actions": [
    "整理本学期专业必修课清单",
    "确认绩点目标",
    "预约导师沟通保研路径"
  ],
  "need_mentor": false
}
```

### 6.3 生成 SOP 草案

```text
POST /api/ai/generate-sop
```

### 6.4 目标修订分析

```text
POST /api/ai/revise-goal
```

## 7. Dify 返回格式约束

后端应要求 Dify 尽量返回 JSON，并对结果做 schema 校验。

推荐结构：

```json
{
  "summary": "摘要",
  "rules": [],
  "risks": [],
  "opportunities": [],
  "actions": [],
  "sources": [],
  "need_mentor": false
}
```

若 Dify 返回非 JSON 或字段缺失，后端应进行兜底处理，不把原始异常直接暴露给前端。

## 8. 数据表设计

### 8.1 ai_logs

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar | 日志 ID |
| student_id | varchar | 学生 ID |
| user_id | varchar | 提问人 |
| conversation_id | varchar | 会话 ID |
| scenario | varchar | chat / generate_sop / revise_goal / document_summary |
| question | text | 输入问题 |
| answer | text | 输出回答 |
| sources | jsonb | 引用来源 |
| need_mentor | boolean | 是否建议导师介入 |
| created_at | timestamp | 创建时间 |

### 8.2 ai_jobs

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar | 任务 ID |
| student_id | varchar | 学生 ID |
| job_type | varchar | analyze_documents / generate_sop |
| status | varchar | queued / running / success / failed |
| input | jsonb | 输入 |
| output | jsonb | 输出 |
| error_message | text | 错误信息 |
| created_at | timestamp | 创建时间 |
| finished_at | timestamp | 完成时间 |

## 9. NestJS 模块建议

```text
AiModule
  AiController
  AiService
  DifyClient
  AiPromptService
  AiResponseValidator
  AiJobProcessor
```

核心方法：

```text
analyzeDocuments(studentId, documentIds)
chat(studentId, question, conversationId)
generateSop(studentId)
reviseGoal(studentId, payload)
validateAiResponse(response)
```

## 10. 异常处理

| 场景 | 处理 |
| --- | --- |
| 文件未通过安全校验 | 不提交 Dify，标记 rejected |
| 文件仍是临时归属 | 等待激活完成后再提交 Dify |
| 文件读取失败 | 标记 failed，保留原文件并允许重试 |
| Dify 超时 | 返回处理中或稍后重试 |
| Dify 返回格式异常 | 使用兜底格式并记录日志 |
| 知识库无结果 | 明确提示暂无资料依据 |
| 权限不匹配 | 拒绝访问 |
| 高风险问题 | 提示咨询导师或学校官方 |

## 11. 验收标准

- 前端无法直接看到 Dify API Key。
- 学生提问能返回回答、来源和行动建议。
- 政策类回答能展示来源或人工确认提示。
- 未通过文件安全校验的资料不会进入 Dify。
- 临时上传但未完成激活的资料不会进入学生私有知识库。
- Dify 失败不影响核心业务页面访问。
- 所有 AI 问答和工作流调用均记录日志。
- AI 生成 SOP 只能作为 V0.1 草案，不能自动变成 V1.0。

## 12. V2.4 执行闭环边界

Dify 可在学生执行阶段提供：

- 根据任务完成标准生成提交清单建议。
- 对学生复盘内容进行摘要，提取阻塞项。
- 根据逾期、退回和红线数据生成风险建议。
- 为导师汇总成果证据，但不能代替导师判断证据真伪。

Dify 不得直接执行：

- 将人工验收任务标记为 `accepted`。
- 自动认定学生获得荣誉。
- 自动确定奖金金额、分润比例或结算状态。
- 自动关闭高风险事件。
- 向家长暴露学生私有问答和原始资料。

新增场景值：

```text
submission_summary
period_review_summary
risk_suggestion
```

AI 产生的风险统一标记 `source=ai_suggestion`，必须由导师或有权限的工作人员确认后才进入正式风险干预流程。

# 详细设计-04-SOP 版本与任务系统

## 1. 模块目标

SOP 版本与任务系统负责将学生目标转化为可执行的四年路线图、学期任务、本周行动指南和红线预警。

该模块必须支持目标的“生长性”：学生大学四年目标会变化，系统要保留历史版本并生成新版本。

## 2. 核心概念

| 概念 | 说明 |
| --- | --- |
| SOP V0.1 | AI 根据学生资料生成的初版草案 |
| SOP V1.0 | 导师确认后的正式陪跑路线图 |
| SOP V2.0+ | 目标修订或阶段变化后产生的新版本 |
| 任务 | SOP 下可执行的行动项 |
| 红线预警 | 不可触碰的底线或高风险规则 |
| 当前行动指南 | 学生当下最需要执行的策略 |

## 3. SOP 状态机

```text
draft
  ↓ AI 生成 V0.1
reviewing
  ↓ 导师确认
confirmed
  ↓ 目标修订
archived + new draft
```

状态说明：

| 状态 | 含义 |
| --- | --- |
| draft | 草案 |
| reviewing | 导师审核中 |
| confirmed | 已确认生效 |
| archived | 已归档 |

同一学生同一时间只能有一个 `confirmed` SOP。

## 4. SOP 内容结构

推荐 JSON 结构：

```json
{
  "summary": "四年路线图总览",
  "goals": ["保研/推免", "竞赛"],
  "timeline": [
    {
      "semester": "大一上",
      "theme": "夯实 GPA 和英语基础",
      "tasks": []
    }
  ],
  "current_actions": [],
  "red_lines": [],
  "mentor_notes": ""
}
```

## 5. 任务类型

| 类型 | 示例 |
| --- | --- |
| 学业任务 | 高数成绩 90+，专业课保持前 10% |
| 英语任务 | 通过四级，准备六级 |
| 竞赛任务 | 每学期至少参加 1 次竞赛 |
| 科研任务 | 联系导师，参与课题 |
| 就业任务 | 完成简历，准备实习 |
| 申请任务 | 准备保研材料、出国材料 |

## 6. 前端页面

### 6.1 仪表盘摘要

展示：

- 当前目标。
- 当前学期目标。
- 本周任务。
- 红线预警。
- 连续打卡天数。
- SOP 版本号。

### 6.2 SOP 详情页

展示：

- 四年时间轴。
- 按学期拆解的任务。
- 当前行动指南。
- 红线预警。
- 版本历史。
- 导师备注。

### 6.3 目标修订页

展示：

- 当前目标。
- 修订原因。
- 新目标选择。
- Dify 影响分析。
- 提交导师确认。
- 历史版本记录。

## 7. 后端接口设计

### 7.1 获取当前 SOP

```text
GET /api/sops/current
```

### 7.2 获取 SOP 历史

```text
GET /api/sops/history
```

### 7.3 生成 SOP 草案

```text
POST /api/sops/generate
```

### 7.4 导师确认 SOP

```text
POST /api/mentor/sops/{id}/confirm
```

### 7.5 导师编辑 SOP

```text
PATCH /api/mentor/sops/{id}
```

### 7.6 获取当前任务

```text
GET /api/tasks/current
```

### 7.7 更新任务状态

```text
PATCH /api/tasks/{id}
```

### 7.8 打卡

```text
POST /api/checkins
```

## 8. 数据表设计

### 8.1 sops

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar | SOP ID |
| student_id | varchar | 学生 ID |
| version | varchar | V0.1 / V1.0 / V2.0 |
| status | varchar | draft / reviewing / confirmed / archived |
| summary | text | 总览 |
| content | jsonb | 完整 SOP 内容 |
| created_by | varchar | ai / mentor / system |
| confirmed_by | varchar | 确认导师 |
| created_at | timestamp | 创建时间 |
| confirmed_at | timestamp | 确认时间 |

### 8.2 tasks

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar | 任务 ID |
| sop_id | varchar | SOP ID |
| student_id | varchar | 学生 ID |
| semester | varchar | 学期 |
| title | varchar | 任务名称 |
| description | text | 任务说明 |
| task_type | varchar | 任务类型 |
| priority | varchar | high / medium / low |
| deadline | date | 截止时间 |
| completion_criteria | text | 完成标准 |
| source | jsonb | 资料来源 |
| mentor_note | text | 导师备注 |
| status | varchar | todo / doing / done / delayed |

### 8.3 red_lines

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar | 红线 ID |
| sop_id | varchar | SOP ID |
| student_id | varchar | 学生 ID |
| title | varchar | 红线标题 |
| description | text | 说明 |
| severity | varchar | high / medium / low |
| source | jsonb | 来源 |
| active | boolean | 是否生效 |

### 8.4 checkins

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar | 打卡 ID |
| student_id | varchar | 学生 ID |
| task_id | varchar | 关联任务 |
| content | text | 打卡内容 |
| created_at | timestamp | 打卡时间 |

## 9. 版本规则

- V0.1：AI 首次生成。
- V1.0：导师首次确认。
- V2.0：学生目标修订后导师确认。
- V3.0+：后续重大目标变化或阶段变化。

版本生成规则：

```text
当前无 confirmed SOP -> 生成 V1.0
当前已有 V1.0 -> 修订后生成 V2.0
当前已有 V2.0 -> 修订后生成 V3.0
```

旧版本只能归档，不能物理删除。

## 10. NestJS 模块建议

```text
SopsModule
  SopsController
  SopsService
  SopVersionService

TasksModule
  TasksController
  TasksService

CheckinsModule
  CheckinsController
  CheckinsService
```

## 11. 异常处理

| 场景 | 处理 |
| --- | --- |
| AI 未生成草案 | 展示导师正在完善 |
| 导师未确认 | 学生只能查看概览或等待状态 |
| 重复确认 SOP | 拒绝重复操作 |
| 目标修订中 | 保留当前 confirmed SOP 继续可用 |
| 任务延期 | 标记 delayed，不自动删除 |

## 12. 验收标准

- 学生能查看当前 SOP 和版本号。
- AI 生成的 SOP 默认为 V0.1 草案。
- 导师确认后生成 V1.0。
- 目标修订后生成新版本，不覆盖旧版本。
- 学生仪表盘能显示本周任务和红线预警。
- 打卡后连续天数能更新。

## 13. V2.4 学生执行闭环修订

### 13.1 任务状态机

```text
todo → doing → submitted → accepted
                   ↓
           changes_requested → submitted

todo/doing/submitted/changes_requested → overdue
任意未验收状态 → cancelled（仅导师或管理员）
```

学生不能直接把任务改成 `done`。正式完成状态统一为 `accepted`，必须存在导师验收记录；纯习惯类任务可配置 `review_mode=auto`，由规则引擎验收并标明系统验收。

### 13.2 成果提交

新增 `task_submissions`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar | 提交 ID |
| task_id | varchar | 任务 |
| student_id | varchar | 学生 |
| version | integer | 第几次提交 |
| content | text | 成果说明 |
| evidence_links | jsonb | 外部证据链接 |
| self_rating | integer | 1-5 自评 |
| blockers | jsonb | 阻塞项 |
| status | varchar | submitted / withdrawn / accepted / changes_requested |
| submitted_at | timestamp | 提交时间 |

新增 `task_reviews`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar | 验收 ID |
| submission_id | varchar | 对应提交 |
| reviewer_id | varchar | 导师或系统 |
| decision | varchar | accept / request_changes |
| comment | text | 反馈 |
| requirements | jsonb | 补充要求 |
| reviewed_at | timestamp | 验收时间 |

### 13.3 周期复盘

新增 `period_reviews`，支持 `weekly/monthly/semester`：

- 学生总结完成事项、困难、状态评分和下一周期意向。
- 系统汇总任务验收率、延期项、红线和 AI 问答关注点。
- 导师给出反馈并确认下一周期重点。
- 复盘关闭后写入 `growth_events`，并可批量生成下一周期任务。

### 13.4 荣誉与奖金联动

只有验收通过或后台审核通过的成果可触发：

- 成长事件。
- 连续行动与任务完成率。
- 荣誉规则计算。
- 奖金应计流水。

奖金状态为 `pending_evidence/pending_review/approved/pending_payment/settled/rejected`。金额记录与任务状态解耦，任务通过不代表自动支付。

### 13.5 验收补充

- 学生提交图片、文件、链接或文字成果后状态进入 `submitted`。
- 导师退回后，学生能看到具体原因并提交新版本。
- 导师通过后任务进入 `accepted`，历史提交与反馈不可删除。
- 仪表盘完成率只统计 `accepted`。
- 每个周期均可形成学生复盘、导师反馈和下一周期任务。

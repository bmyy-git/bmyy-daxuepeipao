# 详细设计-01-NFC 路由与卡片状态

## 1. 模块目标

NFC 路由模块负责承接学生“碰一碰”入口，根据 NFC 链接参数和卡片状态，将学生分发到正确页面。

本模块必须服务于“入学三部曲”：

1. 第一次碰卡：进入首次激活页。
2. 第二次碰卡：进入导师就位页或等待匹配页。
3. 第三次及以后碰卡：进入个人仪表盘。

## 2. 技术边界

- 前端：Vue 3 + Vite + TypeScript。
- 后端：NestJS + TypeScript。
- 数据库：PostgreSQL + Prisma。
- 部署：Nginx 托管前端静态文件，反向代理 NestJS API。
- Dify 不参与 NFC 路由判断。

## 3. NFC 链接格式

生产链接建议保持原始思路要求：

```text
https://e.yayasmart.com?id1=xxx&id2=xxx
```

字段含义：

| 参数 | 含义 | 是否必填 |
| --- | --- | --- |
| id1 | NFC 卡片 ID | 是 |
| id2 | 卡片批次 ID | 是 |

前端读取 `id1`、`id2` 后调用后端解析接口，不在前端自行判断状态。

## 4. 状态定义

### 4.1 卡片状态

| 状态 | 含义 | 页面去向 |
| --- | --- | --- |
| unbound | 未绑定学生 | 首次激活页 |
| pending_match | 已激活，等待导师匹配 | 等待匹配页 |
| mentor_matched | 已匹配导师，SOP 未确认或确认中 | 导师就位页 |
| sop_finalized | SOP V1.0 已确认 | 学生仪表盘 |
| disabled | 卡片停用 | 停用提示页 |

### 4.2 派生异常状态

| 状态 | 含义 | 页面去向 |
| --- | --- | --- |
| invalid_params | 缺少 id1 或 id2 | 异常提示页 |
| card_not_found | 卡片不存在 | 异常提示页 |
| batch_mismatch | 卡片批次不匹配 | 异常提示页 |

异常状态不一定写入数据库，可由后端接口临时返回。

## 5. 状态流转

```text
unbound
  ↓ 学生完成首次激活
pending_match
  ↓ 管理员或系统分配导师
mentor_matched
  ↓ 导师确认 SOP V1.0
sop_finalized
```

特殊流转：

- 任意状态可由管理员停用为 `disabled`。
- `disabled` 状态不允许学生继续激活或查看仪表盘。
- MVP 阶段不建议支持学生自行解绑卡片。

## 6. 前端流程

1. 学生碰卡后打开 H5。
2. 前端从 URL 读取 `id1`、`id2`。
3. 若参数缺失，直接展示前端异常页，并可同时上报日志。
4. 若参数完整，调用 `GET /api/nfc/resolve`。
5. 后端返回页面去向。
6. 前端根据 `redirect_to` 跳转。

前端路由建议：

| 页面 | 路由 |
| --- | --- |
| 路由承接页 | `/entry` |
| 首次激活页 | `/activation` |
| 等待匹配页 | `/waiting` |
| 导师就位页 | `/mentor-ready` |
| 学生仪表盘 | `/dashboard` |
| 异常提示页 | `/error` |

## 7. 后端接口设计

### 7.1 解析 NFC 路由

```text
GET /api/nfc/resolve?id1=card_001&id2=batch_2026
```

返回示例：

```json
{
  "card_id": "card_001",
  "batch_id": "batch_2026",
  "status": "pending_match",
  "redirect_to": "waiting",
  "student_id": "stu_001"
}
```

异常返回：

```json
{
  "status": "card_not_found",
  "redirect_to": "error",
  "message": "这张卡片还没有准备好，请联系工作人员确认。"
}
```

### 7.2 管理员停用卡片

```text
PATCH /api/admin/nfc-cards/{id}/disable
```

### 7.3 管理员恢复卡片

```text
PATCH /api/admin/nfc-cards/{id}/enable
```

恢复时只能恢复到停用前状态，需记录操作日志。

## 8. 数据表设计

### 8.1 nfc_cards

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | varchar | primary key | 卡片 ID，对应 id1 |
| batch_id | varchar | not null | 批次 ID，对应 id2 |
| status | varchar | not null | 卡片状态 |
| student_id | varchar | nullable | 绑定学生 ID |
| previous_status | varchar | nullable | 停用前状态 |
| created_at | timestamp | not null | 创建时间 |
| activated_at | timestamp | nullable | 激活时间 |
| disabled_at | timestamp | nullable | 停用时间 |

建议索引：

```text
unique(id)
index(batch_id)
index(student_id)
index(status)
```

### 8.2 nfc_access_logs

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar | 日志 ID |
| card_id | varchar | 卡片 ID |
| batch_id | varchar | 批次 ID |
| resolved_status | varchar | 解析结果 |
| user_agent | text | 访问设备信息 |
| ip | varchar | 访问 IP |
| created_at | timestamp | 访问时间 |

## 9. NestJS 模块建议

```text
NfcModule
  NfcController
  NfcService
  NfcRepository
  NfcResolveDto
```

核心方法：

```text
resolveCard(id1, id2)
bindCard(cardId, studentId)
updateCardStatus(cardId, status)
recordAccessLog(payload)
```

## 10. 异常处理

| 场景 | 处理 |
| --- | --- |
| id1 缺失 | 返回 invalid_params |
| id2 缺失 | 返回 invalid_params |
| 卡片不存在 | 返回 card_not_found |
| 批次不匹配 | 返回 batch_mismatch |
| 卡片停用 | 返回 disabled |
| 数据库异常 | 返回通用友好提示并记录错误日志 |

前端异常文案必须陪伴式表达，避免“系统错误”“非法参数”等冷冰冰文案直接暴露给学生。

## 11. 验收标准

- 使用未绑定卡片链接访问时，进入首次激活页。
- 完成激活后再次访问，进入等待匹配页。
- 分配导师后再次访问，进入导师就位页。
- SOP 确认后再次访问，进入学生仪表盘。
- 缺少 `id1` 或 `id2` 时进入异常提示页。
- 停用卡片不能继续访问业务页面。
- 每次 NFC 访问均记录解析日志。

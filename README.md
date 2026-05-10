# 游泳店官网前后端框架

这是一个前后端分离的 React + Express/TypeScript 项目骨架，覆盖官网展示、在线预约、装备租赁、订单支付入口、联系我们和后台管理的基础结构。

## 目录

- `frontend`: React + Vite 前台与后台管理界面
- `backend`: Node.js + Express API 服务

## 本地启动

```bash
npm run install:all
npm run dev
```

默认地址：

- 前端：http://localhost:5173
- 后端：http://localhost:4000/api/health

## 已搭建模块

- 网上预约：泳道、课程、包场咨询入口，日期时间段选择，人数和费用预估
- 在线缴费：订单明细、待支付状态、支付方式占位
- 联系信息：电话、营业时间、地址、交通和地图占位
- 装备租赁：租赁目录、押金方案、库存字段
- 后台管理：仪表盘、预约、订单、装备、内容和用户管理入口
- 后端 API：`/api/bookings`、`/api/courses`、`/api/equipment`、`/api/orders`、`/api/admin/summary`

## 后端接口

浏览器打开 `http://localhost:4000/api` 可以查看接口清单。

常用接口示例：

```bash
# 查询服务、课程、装备
GET /api/services
GET /api/courses
GET /api/equipment

# 查询某天泳道可用时间段
GET /api/bookings/availability?date=2026-05-12&serviceId=lane

# 创建预约，会自动校验容量/库存并生成待支付订单
POST /api/bookings
{
  "serviceId": "lane",
  "contactName": "张三",
  "phone": "13800138000",
  "date": "2026-05-12",
  "slot": "10:00-11:00",
  "people": 2,
  "hours": 1,
  "rentalIds": ["goggles"]
}

# 支付订单，订单变为 paid，预约变为 confirmed
POST /api/orders/:orderId/payments
{
  "method": "wechat"
}

# 取消预约，释放装备库存；已支付订单进入退款审核
POST /api/bookings/:bookingId/cancel

# 后台汇总、管理装备、课程和内容
GET /api/admin/summary
POST /api/admin/equipment
PATCH /api/admin/equipment/:equipmentId
POST /api/admin/courses
PATCH /api/admin/content/contact
```

## 后续接入建议

- 数据库：PostgreSQL 或 MySQL，使用 Prisma/TypeORM 管理模型
- 支付：微信支付、支付宝，订单支付回调需要验签和幂等处理
- 通知：短信服务商 + 站内信，预约前 24 小时和 2 小时定时提醒
- 安全：HTTPS、密码哈希、JWT/Session、接口限流、支付 webhook 白名单

export const services = [
  { id: "lane", name: "泳道预约", price: 40, unit: "小时", description: "标准泳道按小时预约，适合个人训练和亲子陪伴。" },
  { id: "course", name: "课程预约", price: 128, unit: "节", description: "成人、儿童、进阶训练课程，按剩余名额预约。" },
  { id: "private", name: "包场咨询", price: 1200, unit: "场", description: "企业团建、生日派对、集训队包场申请。" }
];

export const timeSlots = ["09:00-10:00", "10:00-11:00", "14:00-15:00", "16:00-17:00", "19:00-20:00", "20:00-21:00"];

export const courses = [
  { id: "adult-basic", title: "成人初级班", coach: "林教练", time: "周二/周四 19:30", seats: 6, price: 128 },
  { id: "kids-summer", title: "儿童暑期班", coach: "周教练", time: "周一/三/五 10:00", seats: 4, price: 168 },
  { id: "advanced", title: "自由泳进阶", coach: "陈教练", time: "周六 15:00", seats: 8, price: 188 }
];

export const equipment = [
  { id: "goggles", name: "防雾泳镜", price: 12, deposit: 50, stock: 18, description: "成人通用款，现场消毒后发放。" },
  { id: "cap", name: "硅胶泳帽", price: 6, deposit: 20, stock: 35, description: "弹性舒适，适合长发用户。" },
  { id: "float-ring", name: "儿童泳圈", price: 18, deposit: 80, stock: 12, description: "亲子陪游推荐，按次租赁。" },
  { id: "dry-bag", name: "防水袋", price: 10, deposit: 40, stock: 20, description: "可放手机和小件物品。" }
];

export const orders = [
  { id: "O20260509001", type: "泳道预约", amount: 100, status: "待支付", date: "2026-05-10 19:00" },
  { id: "O20260508008", type: "课程预约", amount: 168, status: "已完成", date: "2026-05-08 10:00" }
];

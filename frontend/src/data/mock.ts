export const services = [
  { id: "lane", name: "泳道预约", price: 40, unit: "小时", description: "标准泳道按小时预约，适合个人训练和亲子陪伴。" },
  { id: "course", name: "课程预约", price: 128, unit: "节", description: "成人、儿童、进阶训练课程，按剩余名额预约。" },
  { id: "private", name: "包场咨询", price: 1200, unit: "场", description: "企业团建、生日派对、集训队包场申请。" }
];

export const timeSlots = ["09:00-10:00", "10:00-11:00", "14:00-15:00", "16:00-17:00", "19:00-20:00", "20:00-21:00"];

export const courses = [
  {
    id: "adult-basic",
    title: "成人初级班",
    coach: "林教练",
    time: "周二/周四 19:30",
    seats: 6,
    price: 128,
    image: "https://images.unsplash.com/photo-1600965962102-9d260a71890d?auto=format&fit=crop&w=1200&q=80",
    intro: "面向零基础成人，从水中呼吸、漂浮、蹬腿和安全入水开始，帮助学员建立稳定的水感和自信。",
    highlights: ["小班教学，动作反馈更及时", "适合下班后训练", "提供阶段性训练记录"]
  },
  {
    id: "kids-summer",
    title: "儿童暑期班",
    coach: "周教练",
    time: "周一/三/五 10:00",
    seats: 4,
    price: 168,
    image: "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1200&q=80",
    intro: "为儿童设计的暑期密集课程，结合安全教育、趣味练习和基础泳姿训练，让孩子愿意下水、敢于练习。",
    highlights: ["儿童友好教学节奏", "课前安全规则引导", "家长可查看训练反馈"]
  },
  {
    id: "advanced",
    title: "自由泳进阶",
    coach: "陈教练",
    time: "周六 15:00",
    seats: 8,
    price: 188,
    image: "https://images.unsplash.com/photo-1519315901367-f34ff9154487?auto=format&fit=crop&w=1200&q=80",
    intro: "适合已经掌握基础泳姿的学员，重点优化划水效率、身体转动、换气节奏和长距离配速。",
    highlights: ["专项技术拆解", "适合备赛或体能提升", "训练强度可分层"]
  }
];

export const equipment = [
  {
    id: "goggles",
    name: "防雾泳镜",
    price: 12,
    deposit: 20,
    stock: 18,
    description: "成人通用款，现场消毒后发放。",
    image: "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?auto=format&fit=crop&w=1200&q=80",
    intro: "清晰视野和柔软贴合是训练体验的关键。防雾泳镜适合临时到店、忘带装备或亲子陪游用户。",
    highlights: ["现场消毒后发放", "成人通用尺码", "适合训练和休闲游泳"]
  },
  {
    id: "cap",
    name: "硅胶泳帽",
    price: 6,
    deposit: 20,
    stock: 35,
    description: "弹性舒适，适合长发用户。",
    image: "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?auto=format&fit=crop&w=1200&q=80",
    intro: "硅胶材质贴合头型，减少头发入水和池水接触，适合短时租用和课程学员备用。",
    highlights: ["弹性舒适不勒头", "适合成人和青少年", "取还流程快速"]
  },
  {
    id: "float-ring",
    name: "儿童泳圈",
    price: 18,
    deposit: 20,
    stock: 12,
    description: "亲子陪游推荐，按次租赁。",
    image: "https://images.unsplash.com/photo-1560090995-01632a28895b?auto=format&fit=crop&w=1200&q=80",
    intro: "儿童泳圈适合亲子浅水区陪游使用，帮助孩子保持浮力，更轻松适应水中环境。",
    highlights: ["亲子陪游推荐", "现场检查气密性", "适合浅水区辅助使用"]
  },
  {
    id: "dry-bag",
    name: "防水袋",
    price: 10,
    deposit: 20,
    stock: 20,
    description: "可放手机和小件物品。",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    intro: "防水袋可放手机、钥匙和零钱，适合亲子陪游、团建活动和需要随身保管小物的用户。",
    highlights: ["透明触控窗口", "适合小件随身物品", "取用方便，按次租赁"]
  }
];

export const orders = [
  { id: "O20260509001", type: "泳道预约", amount: 100, status: "待支付", date: "2026-05-10 19:00" },
  { id: "O20260508008", type: "课程预约", amount: 168, status: "已完成", date: "2026-05-08 10:00" }
];

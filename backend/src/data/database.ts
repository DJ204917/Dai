import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/database.db');
const db: any = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    unit TEXT NOT NULL,
    capacity_per_slot INTEGER NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    coach TEXT NOT NULL,
    time TEXT NOT NULL,
    seats INTEGER NOT NULL,
    enrolled INTEGER DEFAULT 0,
    price INTEGER NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    deposit INTEGER NOT NULL,
    stock INTEGER NOT NULL,
    total_stock INTEGER NOT NULL,
    description TEXT,
    deposit_mode TEXT DEFAULT 'offline'
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    member_card_no TEXT,
    points INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    account TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL,
    course_id TEXT,
    contact_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    date TEXT NOT NULL,
    slot TEXT NOT NULL,
    people INTEGER NOT NULL,
    hours INTEGER NOT NULL,
    rental_ids TEXT, -- JSON string of rental IDs
    status TEXT NOT NULL,
    amount INTEGER NOT NULL,
    notes TEXT,
    member_account TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL,
    payment_method TEXT,
    fee_items TEXT, -- JSON string of fee items
    invoice_title TEXT,
    invoice_tax_no TEXT,
    invoice_email TEXT,
    invoice_status TEXT,
    paid_at TEXT,
    refund_requested_at TEXT,
    refunded_at TEXT,
    created_at TEXT,
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
  );

  CREATE TABLE IF NOT EXISTS site_content (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

const orderColumns = db.prepare(`PRAGMA table_info(orders)`).all();
if (!orderColumns.some((column: any) => column.name === 'created_at')) {
  db.prepare(`ALTER TABLE orders ADD COLUMN created_at TEXT`).run();
}

db.prepare(`
  UPDATE orders
  SET created_at = COALESCE(
    created_at,
    (SELECT bookings.created_at FROM bookings WHERE bookings.id = orders.booking_id),
    paid_at,
    datetime('now')
  )
  WHERE created_at IS NULL
`).run();

const bookingColumns = db.prepare(`PRAGMA table_info(bookings)`).all();
if (!bookingColumns.some((column: any) => column.name === 'member_account')) {
  db.prepare(`ALTER TABLE bookings ADD COLUMN member_account TEXT`).run();
}

// Insert initial data
const insertService = db.prepare(`
  INSERT OR IGNORE INTO services (id, name, price, unit, capacity_per_slot, description)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertCourse = db.prepare(`
  INSERT OR IGNORE INTO courses (id, title, coach, time, seats, enrolled, price, description)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertEquipment = db.prepare(`
  INSERT OR IGNORE INTO equipment (id, name, price, deposit, stock, total_stock, description, deposit_mode)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (id, name, phone, member_card_no, points)
  VALUES (?, ?, ?, ?, ?)
`);

const insertBooking = db.prepare(`
  INSERT OR IGNORE INTO bookings (id, service_id, course_id, contact_name, phone, date, slot, people, hours, rental_ids, status, amount, notes, member_account, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertOrder = db.prepare(`
  INSERT OR IGNORE INTO orders (id, booking_id, amount, status, payment_method, fee_items, paid_at, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertSiteContent = db.prepare(`
  INSERT OR IGNORE INTO site_content (key, value)
  VALUES (?, ?)
`);

// Services
insertService.run('lane', '泳道预约', 40, 'hour', 8, '标准泳道按小时预约，适合个人训练和亲子陪伴。');
insertService.run('course', '课程预约', 128, 'lesson', 12, '成人、儿童、进阶训练课程，按剩余名额预约。');
insertService.run('private', '包场咨询', 1200, 'session', 60, '企业团建、生日派对、集训队包场申请。');
insertService.run('rental', '装备租赁', 0, 'session', 999, '泳镜、泳帽、泳圈等装备按次租赁。');

// Courses
insertCourse.run('adult-basic', '成人初级班', '林教练', '周二/周四 19:30', 6, 0, 128, '适合零基础成人，重点训练换气和水中安全。');
insertCourse.run('kids-summer', '儿童暑期班', '周教练', '周一/三/五 10:00', 4, 0, 168, '6-12 岁儿童小班教学，含基础漂浮和蛙泳入门。');
insertCourse.run('advanced', '自由泳进阶', '陈教练', '周六 15:00', 8, 0, 188, '适合有基础学员，优化自由泳动作效率。');

// Equipment
insertEquipment.run('goggles', '防雾泳镜', 12, 20, 18, 18, '成人通用款，现场消毒后发放。', 'offline');
insertEquipment.run('cap', '硅胶泳帽', 6, 20, 35, 35, '弹性舒适，适合长发用户。', 'offline');
insertEquipment.run('float-ring', '儿童泳圈', 18, 20, 12, 12, '亲子陪游推荐，按次租赁。', 'offline');
insertEquipment.run('dry-bag', '防水袋', 10, 20, 20, 20, '可放手机和小件物品。', 'offline');

// Users
insertUser.run('U10001', '示例会员', '13800000000', 'M20260509001', 120);

// Bookings
insertBooking.run('B20260509001', 'lane', null, '示例会员', '13800000000', '2026-05-10', '19:00-20:00', 2, 1, '["goggles","cap"]', 'confirmed', 98, null, null, '2026-05-09T08:00:00.000Z', '2026-05-09T08:05:00.000Z');

// Orders
insertOrder.run('O20260509001', 'B20260509001', 98, 'paid', 'wechat', '[{"label":"泳道预约 1小时","amount":80},{"label":"防雾泳镜租赁","amount":12},{"label":"硅胶泳帽租赁","amount":6}]', '2026-05-09T08:05:00.000Z', '2026-05-09T08:00:00.000Z');

// Site content
insertSiteContent.run('shopName', '澄蓝泳馆');
insertSiteContent.run('phone', '400-800-6688');
insertSiteContent.run('workTime', '周一至周日 08:00 - 22:00');
insertSiteContent.run('address', '北京市朝阳区建国路88号现代城A座1层');
insertSiteContent.run('email', 'service@chenglan.com');

console.log('Database initialized successfully');

export default db;

import {
  mysqlTable,
  mysqlEnum,
  varchar,
  text,
  timestamp,
  decimal,
  index,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// ==================== 用户表 ====================
export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  avatar: varchar('avatar', { length: 500 }),
  role: mysqlEnum('role', ['admin', 'finance', 'boss', 'viewer']).notNull().default('viewer'),
  passwordHash: varchar('password_hash', { length: 255 }),
  feishuUserId: varchar('feishu_user_id', { length: 255 }),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  feishuIdx: index('feishu_user_idx').on(table.feishuUserId),
  emailIdx: index('email_idx').on(table.email),
}));

// ==================== 项目表 ====================
export const projects = mysqlTable('projects', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),           // 项目名称
  code: varchar('code', { length: 100 }).notNull().unique(),  // 项目编号
  status: mysqlEnum('status', ['ongoing', 'completed', 'pending_payment', 'suspended', 'planning']).default('ongoing'),
  // ongoing: 进行中, completed: 已完成, pending_payment: 未收齐, suspended: 已暂停, planning: 规划中
  client: varchar('client', { length: 255 }),                 // 甲方
  contractor: varchar('contractor', { length: 255 }).default('汇信电力'), // 乙方
  contractNo: varchar('contract_no', { length: 100 }),        // 合同编号
  contractAmount: decimal('contract_amount', { precision: 15, scale: 2 }), // 合同金额
  startDate: timestamp('start_date'),                         // 开工日期
  endDate: timestamp('end_date'),                             // 完工日期
  remark: text('remark'),                                     // 备注
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  codeIdx: index('project_code_idx').on(table.code),
  statusIdx: index('project_status_idx').on(table.status),
}));

// ==================== 供应商表 ====================
export const suppliers = mysqlTable('suppliers', {
  id: varchar('id', { length: 36 }).primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(),  // 供应商编号
  name: varchar('name', { length: 255 }).notNull(),           // 供应商名称
  category: mysqlEnum('category', ['equipment', 'installation', 'construction', 'other']).default('equipment'),
  // equipment: 设备材料, installation: 安装, construction: 土建, other: 生活/其他
  contactPerson: varchar('contact_person', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  bank: varchar('bank', { length: 255 }),                     // 开户行
  account: varchar('account', { length: 100 }),               // 账号
  rating: decimal('rating', { precision: 2, scale: 1 }),      // 评级 1-5
  remark: text('remark'),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

// ==================== 采购表 ====================
export const purchases = mysqlTable('purchases', {
  id: varchar('id', { length: 36 }).primaryKey(),
  purchaseNo: varchar('purchase_no', { length: 100 }).notNull().unique(), // 采购单号
  logisticsStatus: mysqlEnum('logistics_status', ['arrived', 'ordered', 'pending']).default('ordered'),
  // arrived: 已到货, ordered: 已下单, pending: 待发货
  projectId: varchar('project_id', { length: 36 }).references(() => projects.id),
  supplierId: varchar('supplier_id', { length: 36 }).references(() => suppliers.id),
  purchaseDate: timestamp('purchase_date').notNull(),         // 采购日期
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(), // 采购金额
  content: text('content').notNull(),                         // 采购内容
  remark: text('remark'),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  projectIdx: index('purchase_project_idx').on(table.projectId),
  supplierIdx: index('purchase_supplier_idx').on(table.supplierId),
}));

// ==================== 收付款表 ====================
export const transactions = mysqlTable('transactions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  date: timestamp('date').notNull(),                         // 交易日期
  type: mysqlEnum('type', ['receipt', 'payment']).notNull(), // 收款/付款
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(), // 金额（正=收款，负=付款）
  paymentMethod: mysqlEnum('payment_method', ['bank', 'cash', 'wechat', 'alipay']).default('bank'),
  // bank: 银行转账, cash: 现金, wechat: 微信, alipay: 支付宝
  projectId: varchar('project_id', { length: 36 }).references(() => projects.id),
  supplierId: varchar('supplier_id', { length: 36 }).references(() => suppliers.id),
  purchaseId: varchar('purchase_id', { length: 36 }).references(() => purchases.id),
  remark: text('remark'),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  projectIdx: index('tx_project_idx').on(table.projectId),
  dateIdx: index('tx_date_idx').on(table.date),
}));

// ==================== 发票表 ====================
export const invoices = mysqlTable('invoices', {
  id: varchar('id', { length: 36 }).primaryKey(),
  type: mysqlEnum('type', ['input', 'output']).notNull(),     // 进项/销项
  invoiceNo: varchar('invoice_no', { length: 100 }).notNull().unique(), // 发票号码
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(), // 金额
  taxAmount: decimal('tax_amount', { precision: 15, scale: 2 }), // 税额
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }), // 总金额
  invoiceDate: timestamp('invoice_date').notNull(),           // 开票日期
  supplierId: varchar('supplier_id', { length: 36 }).references(() => suppliers.id), // 对方名称
  projectId: varchar('project_id', { length: 36 }).references(() => projects.id),     // 所属项目
  purchaseId: varchar('purchase_id', { length: 36 }).references(() => purchases.id),   // 关联采购
  status: mysqlEnum('status', ['unpaid', 'paid', 'cancelled']).default('unpaid'),
  remark: text('remark'),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  invoiceNoIdx: index('invoice_no_idx').on(table.invoiceNo),
  projectIdx: index('invoice_project_idx').on(table.projectId),
  supplierIdx: index('invoice_supplier_idx').on(table.supplierId),
}));
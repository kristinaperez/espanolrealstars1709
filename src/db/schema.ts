import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Accounts & billing.
 *
 * The learning progress itself stays local (localStorage) — these tables only
 * back the features that genuinely need a server: Telegram login, Telegram
 * Stars payments and issued license keys.
 *
 * A local license key is still handed to the client after payment, so the
 * offline-first architecture of the trainer keeps working.
 */

export const telegramUsers = pgTable(
  "telegram_users",
  {
    id: serial("id").primaryKey(),
    telegramId: bigint("telegram_id", { mode: "number" }).notNull().unique(),
    username: text("username"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    photoUrl: text("photo_url"),
    languageCode: text("language_code"),
    isTelegramPremium: boolean("is_telegram_premium").notNull().default(false),
    lastAuthAt: timestamp("last_auth_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("telegram_users_username_idx").on(table.username)],
);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => telegramUsers.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    /** pending | paid | cancelled | refunded */
    status: text("status").notNull().default("pending"),
    currency: text("currency").notNull().default("XTR"),
    stars: integer("stars").notNull(),
    payload: text("payload").notNull().unique(),
    invoiceLink: text("invoice_link"),
    chargeId: text("charge_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => [
    index("orders_user_idx").on(table.userId),
    index("orders_status_idx").on(table.status),
  ],
);

export const licenses = pgTable(
  "licenses",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    userId: integer("user_id")
      .notNull()
      .references(() => telegramUsers.id, { onDelete: "cascade" }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    /** telegram_stars | manual | gift */
    source: text("source").notNull().default("telegram_stars"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
  },
  (table) => [index("licenses_user_idx").on(table.userId)],
);

export const telegramUsersRelations = relations(telegramUsers, ({ many }) => ({
  orders: many(orders),
  licenses: many(licenses),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(telegramUsers, {
    fields: [orders.userId],
    references: [telegramUsers.id],
  }),
}));

export const licensesRelations = relations(licenses, ({ one }) => ({
  user: one(telegramUsers, {
    fields: [licenses.userId],
    references: [telegramUsers.id],
  }),
  order: one(orders, { fields: [licenses.orderId], references: [orders.id] }),
}));

export type TelegramUserRow = typeof telegramUsers.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type LicenseRow = typeof licenses.$inferSelect;

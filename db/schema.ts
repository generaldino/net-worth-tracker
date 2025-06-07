import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const accountTypeEnum = pgEnum("account_type", [
  "Current",
  "Savings",
  "Investment",
  "Stock",
  "Crypto",
  "Pension",
  "Commodity",
  "Stock_options",
]);

export const accountCategoryEnum = pgEnum("account_category", [
  "Cash",
  "Investments",
]);

// Tables
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull(),
  category: accountCategoryEnum("category").notNull().default("Investments"),
  isISA: boolean("is_isa").notNull().default(false),
  owner: text("owner").notNull().default("all"),
  isClosed: boolean("is_closed").notNull().default(false),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const monthlyEntries = pgTable("monthly_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  month: text("month").notNull(), // Format: "YYYY-MM"
  endingBalance: numeric("ending_balance").notNull(),
  cashIn: numeric("cash_in").notNull(),
  cashOut: numeric("cash_out").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type MonthlyEntry = typeof monthlyEntries.$inferSelect;
export type NewMonthlyEntry = typeof monthlyEntries.$inferInsert;

// Indexes
export const monthlyEntriesMonthIdx = monthlyEntries.month;
export const monthlyEntriesAccountIdIdx = monthlyEntries.accountId;

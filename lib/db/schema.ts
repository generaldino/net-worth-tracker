import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const monthlyEntries = pgTable("monthly_entries", {
  id: serial("id").primaryKey(),
  accountId: serial("account_id")
    .references(() => accounts.id)
    .notNull(),
  month: text("month").notNull(),
  endingBalance: numeric("ending_balance").notNull(),
  cashIn: numeric("cash_in").notNull().default("0"),
  cashOut: numeric("cash_out").notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

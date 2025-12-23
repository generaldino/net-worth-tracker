import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  boolean,
  pgEnum,
  integer,
  jsonb,
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
  "Credit_Card",
  "Loan",
]);

export const accountCategoryEnum = pgEnum("account_category", [
  "Cash",
  "Investments",
]);

export const currencyEnum = pgEnum("currency", [
  "GBP",
  "EUR",
  "USD",
  "AED",
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
  currency: currencyEnum("currency").notNull().default("GBP"),
  isISA: boolean("is_isa").notNull().default(false),
  owner: text("owner").notNull().default("all"),
  isClosed: boolean("is_closed").notNull().default(false),
  closedAt: timestamp("closed_at"),
  displayOrder: integer("display_order").notNull().default(0),
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
  workIncome: numeric("work_income").notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const exchangeRates = pgTable("exchange_rates", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: text("date").notNull().unique(), // Format: "YYYY-MM-DD" (last day of month)
  baseCurrency: currencyEnum("base_currency").notNull().default("GBP"),
  gbpRate: numeric("gbp_rate").notNull().default("1"),
  eurRate: numeric("eur_rate").notNull(),
  usdRate: numeric("usd_rate").notNull(),
  aedRate: numeric("aed_rate").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectionScenarios = pgTable("projection_scenarios", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  monthlyIncome: numeric("monthly_income").notNull(),
  savingsRate: numeric("savings_rate").notNull(), // Percentage (0-100)
  timePeriodMonths: integer("time_period_months").notNull(),
  growthRates: jsonb("growth_rates").notNull(), // JSON object: { "Current": 0, "Savings": 2.5, ... }
  savingsAllocation: jsonb("savings_allocation"), // JSON object: { "Current": 20, "Stock": 40, ... } - percentages that sum to 100
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
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type NewExchangeRate = typeof exchangeRates.$inferInsert;
export type ProjectionScenario = typeof projectionScenarios.$inferSelect;
export type NewProjectionScenario = typeof projectionScenarios.$inferInsert;

// Indexes
export const monthlyEntriesMonthIdx = monthlyEntries.month;
export const monthlyEntriesAccountIdIdx = monthlyEntries.accountId;

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
  primaryKey,
  index,
  uniqueIndex,
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
  "Asset",
]);

export const accountCategoryEnum = pgEnum("account_category", [
  "Cash",
  "Investments",
]);

export const currencyEnum = pgEnum("currency", ["GBP", "EUR", "USD", "AED"]);

export const expenseSourceEnum = pgEnum("expense_source", [
  "manual", // entered by hand
  "import", // one row of an imported CSV statement
  "backfill", // one aggregated row for a historic month
]);

// Tables
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  name: text("name"),
  image: text("image"),
  // Legacy fields for backward compatibility
  avatarUrl: text("avatar_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const financialAccounts = pgTable("accounts", {
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

export const monthlyEntries = pgTable(
  "monthly_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccounts.id, { onDelete: "cascade" }),
    month: text("month").notNull(), // Format: "YYYY-MM"
    endingBalance: numeric("ending_balance").notNull(),
    cashIn: numeric("cash_in").notNull(),
    cashOut: numeric("cash_out").notNull(),
    income: numeric("income").notNull().default("0"),
    expenditure: numeric("expenditure").notNull().default("0"), // Auto-computed: Current/Credit_Card = cashOut, others = 0
    internalTransfersOut: numeric("internal_transfers_out")
      .notNull()
      .default("0"), // Deprecated: new entries write 0
    debtPayments: numeric("debt_payments").notNull().default("0"), // Deprecated: new entries write 0
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    accountIdIdx: index("monthly_entries_account_id_idx").on(table.accountId),
    monthIdx: index("monthly_entries_month_idx").on(table.month),
    accountMonthIdx: index("monthly_entries_account_id_month_idx").on(
      table.accountId,
      table.month
    ),
  })
);

export const incomeStreams = pgTable(
  "income_streams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    month: text("month").notNull(), // Format: "YYYY-MM"
    name: text("name").notNull(), // e.g. "Salary", "Freelance", "Rental"
    amount: numeric("amount").notNull().default("0"),
    currency: currencyEnum("currency").notNull().default("GBP"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("income_streams_user_id_idx").on(table.userId),
    userMonthIdx: index("income_streams_user_id_month_idx").on(
      table.userId,
      table.month
    ),
  })
);

// ============================================================================
// Budget: categorised expenses
// ============================================================================

export const expenseCategories = pgTable(
  "expense_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("blue"), // key from lib/color-variants
    /** Card payments / transfers are not spending — excluded from spend totals. */
    excludeFromSpend: boolean("exclude_from_spend").notNull().default(false),
    /** Monthly spending target in GBP; NULL = no target set. */
    monthlyTarget: numeric("monthly_target"),
    /** Fixed costs (rent, utilities) group separately from variable spending. */
    isFixed: boolean("is_fixed").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    /** Soft delete, so historic expenses keep their label. */
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("expense_categories_user_id_idx").on(table.userId),
  })
);

export const importBatches = pgTable(
  "import_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => financialAccounts.id, {
      onDelete: "cascade",
    }),
    filename: text("filename").notNull(),
    rowCount: integer("row_count").notNull().default(0),
    /** Column mapping used, reused as the default for this account's next import. */
    columnMapping: jsonb("column_mapping"),
    importedAt: timestamp("imported_at").defaultNow().notNull(),
  },
  (table) => ({
    userAccountIdx: index("import_batches_user_id_account_id_idx").on(
      table.userId,
      table.accountId
    ),
  })
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // Format: "YYYY-MM-DD"
    month: text("month").notNull(), // Format: "YYYY-MM", derived from date
    /** Positive = spend, negative = refund/credit. Normalised on import. */
    amount: numeric("amount").notNull().default("0"),
    currency: currencyEnum("currency").notNull().default("GBP"),
    description: text("description").notNull().default(""),
    /** Normalised merchant, used for grouping and rule matching. */
    merchant: text("merchant"),
    /** NULL = uncategorised. */
    categoryId: uuid("category_id").references(() => expenseCategories.id, {
      onDelete: "set null",
    }),
    accountId: uuid("account_id").references(() => financialAccounts.id, {
      onDelete: "set null",
    }),
    source: expenseSourceEnum("source").notNull().default("manual"),
    importBatchId: uuid("import_batch_id").references(() => importBatches.id, {
      onDelete: "cascade",
    }),
    /** Re-import guard; NULL for manual/backfill rows. */
    dedupeHash: text("dedupe_hash"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userMonthIdx: index("expenses_user_id_month_idx").on(
      table.userId,
      table.month
    ),
    userCategoryIdx: index("expenses_user_id_category_id_idx").on(
      table.userId,
      table.categoryId
    ),
    userDedupeUnique: uniqueIndex("expenses_user_id_dedupe_hash_unique").on(
      table.userId,
      table.dedupeHash
    ),
  })
);

export const categoryRules = pgTable(
  "category_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Lowercased substring matched against an expense description. */
    matchText: text("match_text").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => expenseCategories.id, { onDelete: "cascade" }),
    priority: integer("priority").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("category_rules_user_id_idx").on(table.userId),
  })
);

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

export const dashboardShares = pgTable("dashboard_shares", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sharedWithUserId: uuid("shared_with_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dashboardInvitations = pgTable("dashboard_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  inviteeEmail: text("invitee_email").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, expired
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
});

// ============================================================================
// NextAuth.js Tables
// ============================================================================

export const nextAuthAccounts = pgTable("next_auth_accounts", {
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (account) => ({
  compoundKey: primaryKey({
    columns: [account.provider, account.providerAccountId]
  }),
}));

export const nextAuthSessions = pgTable("next_auth_sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const nextAuthVerificationTokens = pgTable("next_auth_verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (vt) => ({
  compoundKey: primaryKey({
    columns: [vt.identifier, vt.token]
  }),
}));

// ============================================================================
// Types
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof financialAccounts.$inferSelect;
export type NewAccount = typeof financialAccounts.$inferInsert;
export type MonthlyEntry = typeof monthlyEntries.$inferSelect;
export type NewMonthlyEntry = typeof monthlyEntries.$inferInsert;
export type IncomeStream = typeof incomeStreams.$inferSelect;
export type NewIncomeStream = typeof incomeStreams.$inferInsert;
export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type NewExpenseCategory = typeof expenseCategories.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type ImportBatch = typeof importBatches.$inferSelect;
export type NewImportBatch = typeof importBatches.$inferInsert;
export type CategoryRule = typeof categoryRules.$inferSelect;
export type NewCategoryRule = typeof categoryRules.$inferInsert;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type NewExchangeRate = typeof exchangeRates.$inferInsert;
export type ProjectionScenario = typeof projectionScenarios.$inferSelect;
export type NewProjectionScenario = typeof projectionScenarios.$inferInsert;
export type DashboardShare = typeof dashboardShares.$inferSelect;
export type NewDashboardShare = typeof dashboardShares.$inferInsert;
export type DashboardInvitation = typeof dashboardInvitations.$inferSelect;
export type NewDashboardInvitation = typeof dashboardInvitations.$inferInsert;
export type NextAuthAccount = typeof nextAuthAccounts.$inferSelect;
export type NextAuthSession = typeof nextAuthSessions.$inferSelect;
export type NextAuthVerificationToken = typeof nextAuthVerificationTokens.$inferSelect;


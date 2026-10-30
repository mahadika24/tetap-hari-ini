import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const communityProfiles = mysqlTable("community_profiles", {
  userId: int("userId").notNull().primaryKey().references(() => users.id, { onDelete: "cascade" }),
  alias: varchar("alias", { length: 24 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("community_alias_unique").on(table.alias)]);

export const supportCircles = mysqlTable("support_circles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 60 }).notNull(),
  inviteCode: varchar("inviteCode", { length: 32 }).notNull(),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("support_circle_invite_unique").on(table.inviteCode)]);

export const supportMembers = mysqlTable("support_members", {
  id: int("id").autoincrement().primaryKey(),
  circleId: int("circleId").notNull().references(() => supportCircles.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["owner", "member"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("support_member_unique").on(table.circleId, table.userId), index("support_member_user_idx").on(table.userId)]);

export const supportMessages = mysqlTable("support_messages", {
  id: int("id").autoincrement().primaryKey(),
  circleId: int("circleId").notNull().references(() => supportCircles.id, { onDelete: "cascade" }),
  authorId: int("authorId").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: varchar("body", { length: 1200 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (table) => [index("support_message_circle_time_idx").on(table.circleId, table.createdAt)]);

export const communityStories = mysqlTable("community_stories", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull().references(() => users.id, { onDelete: "cascade" }),
  circleId: int("circleId").references(() => supportCircles.id, { onDelete: "cascade" }),
  audience: mysqlEnum("audience", ["circle", "public"]).notNull(),
  body: varchar("body", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  deletedAt: timestamp("deletedAt"),
}, (table) => [index("community_story_feed_idx").on(table.audience, table.expiresAt), index("community_story_circle_idx").on(table.circleId, table.expiresAt)]);

export const communityBlocks = mysqlTable("community_blocks", {
  id: int("id").autoincrement().primaryKey(),
  blockerId: int("blockerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  blockedId: int("blockedId").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("community_block_pair_unique").on(table.blockerId, table.blockedId)]);

export const communityReports = mysqlTable("community_reports", {
  id: int("id").autoincrement().primaryKey(),
  reporterId: int("reporterId").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: mysqlEnum("targetType", ["story", "message"]).notNull(),
  targetId: int("targetId").notNull(),
  reason: mysqlEnum("reason", ["gambling", "harassment", "spam", "other"]).notNull(),
  status: mysqlEnum("status", ["open", "reviewed", "dismissed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("community_report_once_unique").on(table.reporterId, table.targetType, table.targetId), index("community_report_status_idx").on(table.status, table.createdAt)]);

import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, isNull, ne, or } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  communityBlocks,
  communityProfiles,
  communityReports,
  communityStories,
  supportCircles,
  supportMembers,
  supportMessages,
} from "../drizzle/schema";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";

const COMMUNITY_RULES_ERROR = "Jaga privasi: jangan kirim tautan, informasi keuangan, kata sandi, atau data pribadi.";
const looksLikeLink = (value: string) => /(?:https?:\/\/|www\.)/i.test(value);
const aliasSchema = z.string().trim().min(3).max(24).regex(/^[\p{L}\p{N}_ -]+$/u, "Gunakan 3–24 huruf, angka, spasi, garis bawah, atau tanda hubung.");
const aliasReserved = /^(admin|administrator|moderator|manus|support|tetaphariini)$/i;

async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Layanan komunitas belum tersedia. Coba lagi sebentar." });
  return db;
}

async function requireProfile(db: Awaited<ReturnType<typeof getDb>>, userId: number) {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const [profile] = await db.select({ userId: communityProfiles.userId, alias: communityProfiles.alias })
    .from(communityProfiles).where(eq(communityProfiles.userId, userId)).limit(1);
  if (!profile) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Pilih nama samaran terlebih dahulu." });
  return profile;
}

async function requireMembership(db: Awaited<ReturnType<typeof getDb>>, circleId: number, userId: number) {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const [membership] = await db.select({ id: supportMembers.id })
    .from(supportMembers)
    .where(and(eq(supportMembers.circleId, circleId), eq(supportMembers.userId, userId)))
    .limit(1);
  if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Pesan dan Story lingkaran hanya untuk anggotanya." });
}

async function blockedUserIds(db: Awaited<ReturnType<typeof getDb>>, userId: number) {
  if (!db) return new Set<number>();
  const rows = await db.select({ blockerId: communityBlocks.blockerId, blockedId: communityBlocks.blockedId })
    .from(communityBlocks)
    .where(or(eq(communityBlocks.blockerId, userId), eq(communityBlocks.blockedId, userId)));
  return new Set(rows.map((row) => row.blockerId === userId ? row.blockedId : row.blockerId));
}

async function isBlocked(db: Awaited<ReturnType<typeof getDb>>, firstId: number, secondId: number) {
  if (!db) return false;
  const [match] = await db.select({ id: communityBlocks.id }).from(communityBlocks)
    .where(or(
      and(eq(communityBlocks.blockerId, firstId), eq(communityBlocks.blockedId, secondId)),
      and(eq(communityBlocks.blockerId, secondId), eq(communityBlocks.blockedId, firstId)),
    )).limit(1);
  return Boolean(match);
}

async function requireNoBlockedMembers(db: Awaited<ReturnType<typeof getDb>>, circleId: number, userId: number) {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const members = await db.select({ userId: supportMembers.userId }).from(supportMembers)
    .where(eq(supportMembers.circleId, circleId));
  for (const member of members) {
    if (member.userId !== userId && await isBlocked(db, userId, member.userId)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Ada anggota yang diblokir di lingkaran ini. Keluar atau buka blokir sebelum melanjutkan." });
    }
  }
}

async function removeCircleMember(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  circleId: number,
  userId: number,
) {
  return db.transaction(async (tx) => {
    const [circle] = await tx.select({ ownerId: supportCircles.ownerId }).from(supportCircles)
      .where(eq(supportCircles.id, circleId)).limit(1);
    if (!circle) return { circleDeleted: false, ownerTransferred: false };

    if (circle.ownerId === userId) {
      const [successor] = await tx.select({ userId: supportMembers.userId }).from(supportMembers)
        .where(and(eq(supportMembers.circleId, circleId), ne(supportMembers.userId, userId)))
        .orderBy(asc(supportMembers.joinedAt), asc(supportMembers.id)).limit(1);
      if (!successor) {
        await tx.delete(supportCircles).where(eq(supportCircles.id, circleId));
        return { circleDeleted: true, ownerTransferred: false };
      }
      await tx.update(supportCircles).set({ ownerId: successor.userId }).where(eq(supportCircles.id, circleId));
      await tx.update(supportMembers).set({ role: "owner" })
        .where(and(eq(supportMembers.circleId, circleId), eq(supportMembers.userId, successor.userId)));
      await tx.delete(supportMembers).where(and(eq(supportMembers.circleId, circleId), eq(supportMembers.userId, userId)));
      return { circleDeleted: false, ownerTransferred: true };
    }

    await tx.delete(supportMembers).where(and(eq(supportMembers.circleId, circleId), eq(supportMembers.userId, userId)));
    return { circleDeleted: false, ownerTransferred: false };
  });
}

export const communityRouter = router({
  profile: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      const [profile] = await db.select({ alias: communityProfiles.alias })
        .from(communityProfiles).where(eq(communityProfiles.userId, ctx.user.id)).limit(1);
      return { alias: profile?.alias ?? null, isModerator: ctx.user.role === "admin" };
    }),
    saveAlias: protectedProcedure.input(z.object({ alias: aliasSchema })).mutation(async ({ ctx, input }) => {
      const alias = input.alias.trim().replace(/\s+/g, " ");
      if (aliasReserved.test(alias)) throw new TRPCError({ code: "BAD_REQUEST", message: "Nama itu dicadangkan. Pilih nama samaran lain." });
      const db = await database();
      const [takenAlias] = await db.select({ userId: communityProfiles.userId }).from(communityProfiles)
        .where(eq(communityProfiles.alias, alias)).limit(1);
      if (takenAlias && takenAlias.userId !== ctx.user.id) {
        throw new TRPCError({ code: "CONFLICT", message: "Nama samaran itu sudah dipakai. Coba nama lain." });
      }
      try {
        const [ownProfile] = await db.select({ userId: communityProfiles.userId }).from(communityProfiles)
          .where(eq(communityProfiles.userId, ctx.user.id)).limit(1);
        if (ownProfile) {
          await db.update(communityProfiles).set({ alias, updatedAt: new Date() })
            .where(eq(communityProfiles.userId, ctx.user.id));
        } else {
          await db.insert(communityProfiles).values({ userId: ctx.user.id, alias });
        }
      } catch {
        throw new TRPCError({ code: "CONFLICT", message: "Nama samaran itu sudah dipakai. Coba nama lain." });
      }
      return { alias };
    }),
  }),

  circles: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      return db.select({
        id: supportCircles.id,
        name: supportCircles.name,
        inviteCode: supportCircles.inviteCode,
        role: supportMembers.role,
        ownerAlias: communityProfiles.alias,
        createdAt: supportCircles.createdAt,
      })
        .from(supportMembers)
        .innerJoin(supportCircles, eq(supportMembers.circleId, supportCircles.id))
        .leftJoin(communityProfiles, eq(supportCircles.ownerId, communityProfiles.userId))
        .where(eq(supportMembers.userId, ctx.user.id))
        .orderBy(desc(supportCircles.createdAt));
    }),
    create: protectedProcedure.input(z.object({ name: z.string().trim().min(3).max(60) })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await requireProfile(db, ctx.user.id);
      const inviteCode = randomBytes(8).toString("hex").toUpperCase();
      return db.transaction(async (tx) => {
        await tx.insert(supportCircles).values({ name: input.name.trim(), inviteCode, ownerId: ctx.user.id });
        const [circle] = await tx.select({ id: supportCircles.id, name: supportCircles.name, inviteCode: supportCircles.inviteCode })
          .from(supportCircles).where(eq(supportCircles.inviteCode, inviteCode)).limit(1);
        if (!circle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Lingkaran belum dapat dibuat." });
        await tx.insert(supportMembers).values({ circleId: circle.id, userId: ctx.user.id, role: "owner" });
        return circle;
      });
    }),
    join: protectedProcedure.input(z.object({ inviteCode: z.string().trim().min(8).max(32) })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await requireProfile(db, ctx.user.id);
      const code = input.inviteCode.trim().toUpperCase();
      const [circle] = await db.select({ id: supportCircles.id, name: supportCircles.name, ownerId: supportCircles.ownerId })
        .from(supportCircles).where(eq(supportCircles.inviteCode, code)).limit(1);
      if (!circle) throw new TRPCError({ code: "NOT_FOUND", message: "Kode undangan tidak cocok." });
      const [existing] = await db.select({ id: supportMembers.id }).from(supportMembers)
        .where(and(eq(supportMembers.circleId, circle.id), eq(supportMembers.userId, ctx.user.id))).limit(1);
      if (existing) return { id: circle.id, name: circle.name, alreadyMember: true };
      const currentMembers = await db.select({ userId: supportMembers.userId }).from(supportMembers)
        .where(eq(supportMembers.circleId, circle.id));
      const existingUserIds = new Set([circle.ownerId, ...currentMembers.map((member) => member.userId)]);
      for (const memberId of existingUserIds) {
        if (await isBlocked(db, ctx.user.id, memberId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Undangan ini tidak tersedia." });
        }
      }
      await db.insert(supportMembers).values({ circleId: circle.id, userId: ctx.user.id, role: "member" });
      return { id: circle.id, name: circle.name, alreadyMember: false };
    }),
    leave: protectedProcedure.input(z.object({ circleId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await requireMembership(db, input.circleId, ctx.user.id);
      return removeCircleMember(db, input.circleId, ctx.user.id);
    }),
    messages: protectedProcedure.input(z.object({ circleId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const db = await database();
      await requireProfile(db, ctx.user.id);
      await requireMembership(db, input.circleId, ctx.user.id);
      await requireNoBlockedMembers(db, input.circleId, ctx.user.id);
      const hiddenAuthors = await blockedUserIds(db, ctx.user.id);
      const rows = await db.select({
        id: supportMessages.id,
        authorId: supportMessages.authorId,
        authorAlias: communityProfiles.alias,
        body: supportMessages.body,
        createdAt: supportMessages.createdAt,
      })
        .from(supportMessages)
        .innerJoin(communityProfiles, eq(supportMessages.authorId, communityProfiles.userId))
        .where(and(eq(supportMessages.circleId, input.circleId), isNull(supportMessages.deletedAt)))
        .orderBy(desc(supportMessages.createdAt)).limit(60);
      return rows.filter((row) => !hiddenAuthors.has(row.authorId)).reverse();
    }),
    send: protectedProcedure.input(z.object({ circleId: z.number().int().positive(), body: z.string().trim().min(1).max(1000) })).mutation(async ({ ctx, input }) => {
      if (looksLikeLink(input.body)) throw new TRPCError({ code: "BAD_REQUEST", message: COMMUNITY_RULES_ERROR });
      const db = await database();
      await requireProfile(db, ctx.user.id);
      await requireMembership(db, input.circleId, ctx.user.id);
      await requireNoBlockedMembers(db, input.circleId, ctx.user.id);
      await db.insert(supportMessages).values({ circleId: input.circleId, authorId: ctx.user.id, body: input.body.trim() });
      return { success: true };
    }),
    deleteMessage: protectedProcedure.input(z.object({ messageId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await database();
      const [message] = await db.select({ id: supportMessages.id, authorId: supportMessages.authorId, circleId: supportMessages.circleId })
        .from(supportMessages).where(eq(supportMessages.id, input.messageId)).limit(1);
      if (!message) throw new TRPCError({ code: "NOT_FOUND" });
      if (message.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Kamu hanya bisa menghapus pesanmu sendiri." });
      await requireMembership(db, message.circleId, ctx.user.id);
      await db.update(supportMessages).set({ deletedAt: new Date() }).where(eq(supportMessages.id, message.id));
      return { success: true };
    }),
  }),

  stories: router({
    feed: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      await requireProfile(db, ctx.user.id);
      const memberRows = await db.select({ circleId: supportMembers.circleId }).from(supportMembers)
        .where(eq(supportMembers.userId, ctx.user.id));
      const circleIds = memberRows.map((row) => row.circleId);
      const audienceFilter = circleIds.length
        ? or(eq(communityStories.audience, "public"), and(eq(communityStories.audience, "circle"), inArray(communityStories.circleId, circleIds)))
        : eq(communityStories.audience, "public");
      const hiddenAuthors = await blockedUserIds(db, ctx.user.id);
      const rows = await db.select({
        id: communityStories.id,
        authorId: communityStories.authorId,
        authorAlias: communityProfiles.alias,
        audience: communityStories.audience,
        circleId: communityStories.circleId,
        circleName: supportCircles.name,
        body: communityStories.body,
        createdAt: communityStories.createdAt,
        expiresAt: communityStories.expiresAt,
      })
        .from(communityStories)
        .innerJoin(communityProfiles, eq(communityStories.authorId, communityProfiles.userId))
        .leftJoin(supportCircles, eq(communityStories.circleId, supportCircles.id))
        .where(and(isNull(communityStories.deletedAt), gt(communityStories.expiresAt, new Date()), audienceFilter))
        .orderBy(desc(communityStories.createdAt)).limit(80);
      return rows.filter((row) => !hiddenAuthors.has(row.authorId));
    }),
    create: protectedProcedure.input(z.object({
      body: z.string().trim().min(3).max(500),
      audience: z.enum(["circle", "public"]),
      circleId: z.number().int().positive().optional(),
      confirmPublic: z.boolean().default(false),
    })).mutation(async ({ ctx, input }) => {
      if (looksLikeLink(input.body)) throw new TRPCError({ code: "BAD_REQUEST", message: COMMUNITY_RULES_ERROR });
      const db = await database();
      await requireProfile(db, ctx.user.id);
      if (input.audience === "public") {
        if (!input.confirmPublic) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Konfirmasi audiens publik terlebih dahulu." });
        if (input.circleId !== undefined) throw new TRPCError({ code: "BAD_REQUEST" });
      } else {
        if (!input.circleId) throw new TRPCError({ code: "BAD_REQUEST", message: "Pilih lingkaran privat untuk Story ini." });
        await requireMembership(db, input.circleId, ctx.user.id);
        await requireNoBlockedMembers(db, input.circleId, ctx.user.id);
      }
      const now = new Date();
      await db.insert(communityStories).values({
        authorId: ctx.user.id,
        audience: input.audience,
        circleId: input.audience === "circle" ? input.circleId! : null,
        body: input.body.trim(),
        createdAt: now,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      });
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ storyId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await database();
      const [story] = await db.select({ id: communityStories.id, authorId: communityStories.authorId })
        .from(communityStories).where(eq(communityStories.id, input.storyId)).limit(1);
      if (!story) throw new TRPCError({ code: "NOT_FOUND" });
      if (story.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Kamu hanya bisa menghapus Story milikmu." });
      await db.update(communityStories).set({ deletedAt: new Date() }).where(eq(communityStories.id, story.id));
      return { success: true };
    }),
  }),

  safety: router({
    blocked: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      return db.select({ userId: communityBlocks.blockedId, alias: communityProfiles.alias, createdAt: communityBlocks.createdAt })
        .from(communityBlocks)
        .innerJoin(communityProfiles, eq(communityBlocks.blockedId, communityProfiles.userId))
        .where(eq(communityBlocks.blockerId, ctx.user.id)).orderBy(desc(communityBlocks.createdAt));
    }),
    block: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Kamu tidak perlu memblokir dirimu sendiri." });
      const db = await database();
      const [target] = await db.select({ userId: communityProfiles.userId }).from(communityProfiles)
        .where(eq(communityProfiles.userId, input.userId)).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Akun tidak ditemukan." });
      await db.insert(communityBlocks).values({ blockerId: ctx.user.id, blockedId: input.userId })
        .onDuplicateKeyUpdate({ set: { createdAt: new Date() } });
      const ownCircles = await db.select({ circleId: supportMembers.circleId }).from(supportMembers)
        .where(eq(supportMembers.userId, ctx.user.id));
      const targetCircles = new Set((await db.select({ circleId: supportMembers.circleId }).from(supportMembers)
        .where(eq(supportMembers.userId, input.userId))).map((row) => row.circleId));
      let leftCircleCount = 0;
      for (const membership of ownCircles) {
        if (!targetCircles.has(membership.circleId)) continue;
        await removeCircleMember(db, membership.circleId, ctx.user.id);
        leftCircleCount += 1;
      }
      return { success: true, leftCircleCount };
    }),
    unblock: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.delete(communityBlocks).where(and(eq(communityBlocks.blockerId, ctx.user.id), eq(communityBlocks.blockedId, input.userId)));
      return { success: true };
    }),
    report: protectedProcedure.input(z.object({ targetType: z.enum(["story", "message"]), targetId: z.number().int().positive(), reason: z.enum(["gambling", "harassment", "spam", "other"]) })).mutation(async ({ ctx, input }) => {
      const db = await database();
      let authorId: number;
      if (input.targetType === "story") {
        const [story] = await db.select().from(communityStories).where(eq(communityStories.id, input.targetId)).limit(1);
        if (!story || story.deletedAt || story.expiresAt <= new Date()) throw new TRPCError({ code: "NOT_FOUND" });
        if (story.audience === "circle") {
          if (!story.circleId) throw new TRPCError({ code: "NOT_FOUND" });
          await requireMembership(db, story.circleId, ctx.user.id);
        }
        authorId = story.authorId;
      } else {
        const [message] = await db.select().from(supportMessages).where(eq(supportMessages.id, input.targetId)).limit(1);
        if (!message || message.deletedAt) throw new TRPCError({ code: "NOT_FOUND" });
        await requireMembership(db, message.circleId, ctx.user.id);
        authorId = message.authorId;
      }
      if (authorId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Kamu tidak bisa melaporkan kontenmu sendiri." });
      try {
        await db.insert(communityReports).values({ reporterId: ctx.user.id, targetType: input.targetType, targetId: input.targetId, reason: input.reason });
      } catch {
        throw new TRPCError({ code: "CONFLICT", message: "Konten ini sudah kamu laporkan." });
      }
      return { success: true };
    }),
  }),

  moderation: router({
    open: adminProcedure.query(async () => {
      const db = await database();
      const reports = await db.select().from(communityReports).where(eq(communityReports.status, "open"))
        .orderBy(desc(communityReports.createdAt)).limit(100);
      return Promise.all(reports.map(async (report) => {
        const [reporter] = await db.select({ alias: communityProfiles.alias }).from(communityProfiles)
          .where(eq(communityProfiles.userId, report.reporterId)).limit(1);
        const [target] = report.targetType === "story"
          ? await db.select({ body: communityStories.body, authorId: communityStories.authorId }).from(communityStories)
              .where(eq(communityStories.id, report.targetId)).limit(1)
          : await db.select({ body: supportMessages.body, authorId: supportMessages.authorId }).from(supportMessages)
              .where(eq(supportMessages.id, report.targetId)).limit(1);
        const [author] = target ? await db.select({ alias: communityProfiles.alias }).from(communityProfiles)
          .where(eq(communityProfiles.userId, target.authorId)).limit(1) : [];
        return { ...report, reporterAlias: reporter?.alias ?? "Teman", targetBody: target?.body ?? "Konten telah dihapus", authorAlias: author?.alias ?? "Teman" };
      }));
    }),
    resolve: adminProcedure.input(z.object({ reportId: z.number().int().positive(), action: z.enum(["hide", "reviewed", "dismiss"]) })).mutation(async ({ input }) => {
      const db = await database();
      const [report] = await db.select().from(communityReports).where(eq(communityReports.id, input.reportId)).limit(1);
      if (!report) throw new TRPCError({ code: "NOT_FOUND" });
      if (input.action === "hide") {
        const now = new Date();
        if (report.targetType === "story") await db.update(communityStories).set({ deletedAt: now }).where(eq(communityStories.id, report.targetId));
        else await db.update(supportMessages).set({ deletedAt: now }).where(eq(supportMessages.id, report.targetId));
        await db.update(communityReports).set({ status: "reviewed" }).where(eq(communityReports.id, report.id));
      } else {
        await db.update(communityReports).set({ status: input.action === "dismiss" ? "dismissed" : "reviewed" }).where(eq(communityReports.id, report.id));
      }
      return { success: true };
    }),
  }),
});

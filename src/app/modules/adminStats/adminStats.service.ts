import { Prisma } from "../../../generated/prisma/client";
import {
  IdeaStatus,
  PaymentStatus,
  UserRole,
  UserStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { IAdminDashboardStats } from "./adminStats.interface";

const TREND_DAYS = 30;
const RECENT_LIMIT = 5;
const TOP_LIMIT = 5;

const getDateFromDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toNumber = (value: Prisma.Decimal | null | undefined) =>
  value ? Number(value) : 0;

const formatDateKey = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};

const buildIdeaStatusMap = (
  rows: Array<{ status: IdeaStatus; _count: { id: number } }>,
) => {
  const map = Object.values(IdeaStatus).reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<IdeaStatus, number>,
  );

  rows.forEach((row) => {
    map[row.status] = row._count.id;
  });

  return map;
};

const buildPurchaseStatusMap = (
  rows: Array<{ paymentStatus: PaymentStatus; _count: { id: number } }>,
) => {
  const map = Object.values(PaymentStatus).reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<PaymentStatus, number>,
  );

  rows.forEach((row) => {
    map[row.paymentStatus] = row._count.id;
  });

  return map;
};

const getDashboardStats = async (): Promise<IAdminDashboardStats> => {
  const trendSince = getDateFromDaysAgo(TREND_DAYS);
  const notDeletedUser = { isDeleted: false };

  const [
    totalUsers,
    memberCount,
    adminCount,
    activeUsers,
    inactiveUsers,
    verifiedUsers,
    totalIdeas,
    paidIdeas,
    freeIdeas,
    totalVotes,
    totalComments,
    activeComments,
    totalCategories,
    newsletterTotal,
    newsletterActive,
    purchaseTotals,
    ideaStatusGroups,
    purchaseStatusGroups,
    ideasByCategoryGroups,
    pendingIdeas,
    recentPurchases,
    recentUsers,
    topVotedIdeas,
    topPurchaseGroups,
    ideaTrendRows,
    purchaseTrendRows,
    revenueTrendRows,
  ] = await Promise.all([
    prisma.user.count({ where: notDeletedUser }),
    prisma.user.count({
      where: { ...notDeletedUser, role: UserRole.MEMBER },
    }),
    prisma.user.count({
      where: { ...notDeletedUser, role: UserRole.ADMIN },
    }),
    prisma.user.count({
      where: { ...notDeletedUser, status: UserStatus.ACTIVE },
    }),
    prisma.user.count({
      where: { ...notDeletedUser, status: UserStatus.INACTIVE },
    }),
    prisma.user.count({
      where: { ...notDeletedUser, emailVerified: true },
    }),
    prisma.idea.count(),
    prisma.idea.count({ where: { isPaid: true } }),
    prisma.idea.count({ where: { isPaid: false } }),
    prisma.vote.count(),
    prisma.comment.count(),
    prisma.comment.count({ where: { isDeleted: false } }),
    prisma.category.count(),
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({ where: { isActive: true } }),
    prisma.ideaPurchase.aggregate({
      _count: { id: true },
      _sum: { amountPaid: true },
      where: { paymentStatus: PaymentStatus.COMPLETED },
    }),
    prisma.idea.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.ideaPurchase.groupBy({
      by: ["paymentStatus"],
      _count: { id: true },
    }),
    prisma.idea.groupBy({
      by: ["categoryId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.idea.findMany({
      where: {
        status: {
          in: [IdeaStatus.PENDING, IdeaStatus.UNDER_REVIEW],
        },
      },
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
      select: {
        id: true,
        title: true,
        status: true,
        isPaid: true,
        price: true,
        createdAt: true,
        author: {
          select: { id: true, name: true, email: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
    prisma.ideaPurchase.findMany({
      where: { paymentStatus: PaymentStatus.COMPLETED },
      orderBy: { completedAt: "desc" },
      take: RECENT_LIMIT,
      select: {
        id: true,
        transactionId: true,
        amountPaid: true,
        completedAt: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        idea: {
          select: { id: true, title: true, isPaid: true },
        },
      },
    }),
    prisma.user.findMany({
      where: notDeletedUser,
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
    }),
    prisma.idea.findMany({
      where: { status: IdeaStatus.APPROVED },
      orderBy: { upvoteCount: "desc" },
      take: TOP_LIMIT,
      select: {
        id: true,
        title: true,
        upvoteCount: true,
        downvoteCount: true,
        isPaid: true,
        price: true,
        publishedAt: true,
        author: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { votes: true, comments: true, purchases: true },
        },
      },
    }),
    prisma.ideaPurchase.groupBy({
      by: ["ideaId"],
      where: { paymentStatus: PaymentStatus.COMPLETED },
      _count: { id: true },
      _sum: { amountPaid: true },
      orderBy: { _count: { id: "desc" } },
      take: TOP_LIMIT,
    }),
    prisma.$queryRaw<Array<{ date: Date; count: number }>>`
      SELECT DATE("createdAt") as date, COUNT(*)::int as count
      FROM ideas
      WHERE "createdAt" >= ${trendSince}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
    prisma.$queryRaw<Array<{ date: Date; count: number }>>`
      SELECT DATE("completedAt") as date, COUNT(*)::int as count
      FROM idea_purchases
      WHERE "paymentStatus" = 'COMPLETED'
        AND "completedAt" IS NOT NULL
        AND "completedAt" >= ${trendSince}
      GROUP BY DATE("completedAt")
      ORDER BY date ASC
    `,
    prisma.$queryRaw<Array<{ date: Date; count: number; amount: number }>>`
      SELECT DATE("completedAt") as date,
             COUNT(*)::int as count,
             COALESCE(SUM("amountPaid"), 0)::float as amount
      FROM idea_purchases
      WHERE "paymentStatus" = 'COMPLETED'
        AND "completedAt" IS NOT NULL
        AND "completedAt" >= ${trendSince}
      GROUP BY DATE("completedAt")
      ORDER BY date ASC
    `,
  ]);

  const ideaStatusMap = buildIdeaStatusMap(ideaStatusGroups);
  const purchaseStatusMap = buildPurchaseStatusMap(purchaseStatusGroups);

  const totalPurchaseCount = purchaseStatusGroups.reduce(
    (sum, row) => sum + row._count.id,
    0,
  );

  const categoryIds = ideasByCategoryGroups.map((row) => row.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, slug: true },
  });

  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  const ideasByCategory = ideasByCategoryGroups.map((row) => {
    const category = categoryMap.get(row.categoryId);

    return {
      categoryId: row.categoryId,
      name: category?.name ?? "Unknown",
      slug: category?.slug ?? "unknown",
      count: row._count.id,
    };
  });

  const topPurchaseIdeaIds = topPurchaseGroups.map((row) => row.ideaId);
  const topPurchaseIdeas = await prisma.idea.findMany({
    where: { id: { in: topPurchaseIdeaIds } },
    select: {
      id: true,
      title: true,
      isPaid: true,
      price: true,
      author: {
        select: { id: true, name: true },
      },
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  const topPurchaseIdeaMap = new Map(
    topPurchaseIdeas.map((idea) => [idea.id, idea]),
  );

  const byPurchases = topPurchaseGroups.map((row) => ({
  purchaseCount: row._count.id,
  totalRevenue: toNumber(row._sum.amountPaid),
  idea: topPurchaseIdeaMap.get(row.ideaId) ?? null,
}));

  return {
    overview: {
      users: {
        total: totalUsers,
        members: memberCount,
        admins: adminCount,
        active: activeUsers,
        inactive: inactiveUsers,
        emailVerified: verifiedUsers,
      },
      ideas: {
        total: totalIdeas,
        draft: ideaStatusMap[IdeaStatus.DRAFT],
        pending: ideaStatusMap[IdeaStatus.PENDING],
        underReview: ideaStatusMap[IdeaStatus.UNDER_REVIEW],
        approved: ideaStatusMap[IdeaStatus.APPROVED],
        rejected: ideaStatusMap[IdeaStatus.REJECTED],
        paid: paidIdeas,
        free: freeIdeas,
      },
      engagement: {
        votes: totalVotes,
        comments: totalComments,
        activeComments,
      },
      categories: {
        total: totalCategories,
      },
      newsletter: {
        total: newsletterTotal,
        active: newsletterActive,
        inactive: newsletterTotal - newsletterActive,
      },
      purchases: {
        total: totalPurchaseCount,
        pending: purchaseStatusMap[PaymentStatus.PENDING],
        completed: purchaseStatusMap[PaymentStatus.COMPLETED],
        failed: purchaseStatusMap[PaymentStatus.FAILED],
        totalRevenue: toNumber(purchaseTotals._sum.amountPaid),
      },
    },
    ideasByStatus: Object.values(IdeaStatus).map((status) => ({
      status,
      count: ideaStatusMap[status],
    })),
    ideasByCategory,
    purchasesByStatus: Object.values(PaymentStatus).map((status) => ({
      status,
      count: purchaseStatusMap[status],
    })),
    trends: {
      ideasLast30Days: ideaTrendRows.map((row) => ({
        date: formatDateKey(row.date),
        count: row.count,
      })),
      purchasesLast30Days: purchaseTrendRows.map((row) => ({
        date: formatDateKey(row.date),
        count: row.count,
      })),
      revenueLast30Days: revenueTrendRows.map((row) => ({
        date: formatDateKey(row.date),
        count: row.count,
        amount: Number(row.amount),
      })),
    },
    recent: {
      pendingIdeas: pendingIdeas.map((idea) => ({
        ...idea,
        price: idea.price ? Number(idea.price) : null,
      })),
      recentPurchases: recentPurchases.map((purchase) => ({
        ...purchase,
        amountPaid: Number(purchase.amountPaid),
      })),
      recentUsers,
    },
    topIdeas: {
      byVotes: topVotedIdeas.map((idea) => ({
        ...idea,
        price: idea.price ? Number(idea.price) : null,
      })),
      byPurchases,
    },
  };
};

export const AdminStatsServices = {
  getDashboardStats,
};

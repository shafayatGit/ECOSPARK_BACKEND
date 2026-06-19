import { executeListQuery } from "../../utils/queryHelper";
import { prisma } from "../../lib/prisma";

const ideaPurchaseInclude = {
  idea: {
    select: {
      id: true,
      title: true,
      isPaid: true,
      price: true,
      status: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

const getAllPurchases = async (query: Record<string, unknown> = {}) => {
  return executeListQuery({
    model: prisma.ideaPurchase,
    query,
    config: {
      searchableFields: ["transactionId", "gateway"],
      filterableFields: ["paymentStatus", "gateway", "ideaId"],
    },
    include: ideaPurchaseInclude,
    defaultSort: { sortBy: "createdAt", sortOrder: "desc" },
  });
};

export const AdminPurchaseServices = {
  getAllPurchases,
};

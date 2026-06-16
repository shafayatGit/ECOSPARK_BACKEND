import status from "http-status";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { executeListQuery } from "../../utils/queryHelper";
import { ICreateCategory } from "./categories.interface";

const categoryInclude = {
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  _count: { select: { ideas: true } },
} as const;

const getAllCategories = async (query: Record<string, unknown> = {}) => {
  return executeListQuery({
    model: prisma.category,
    query,
    config: {
      searchableFields: ["name", "slug", "description"],
      filterableFields: ["name", "slug", "createdById"],
    },
    include: categoryInclude,
    defaultSort: { sortBy: "name", sortOrder: "asc" },
  });
};

const createCategory = async (
  payload: ICreateCategory,
  adminUserId: string,
) => {
  const existing = await prisma.category.findFirst({
    where: {
      OR: [{ name: payload.name }, { slug: payload.slug }],
    },
  });

  if (existing) {
    throw new AppError(
      status.CONFLICT,
      "Category with this name or slug already exists",
    );
  }

  return prisma.category.create({
    data: {
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      createdById: adminUserId,
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
};

const deleteCategory = async (categoryId: string) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { _count: { select: { ideas: true } } },
  });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }

  if (category._count.ideas > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "Cannot delete category with associated ideas",
    );
  }

  await prisma.category.delete({ where: { id: categoryId } });
  return { id: categoryId };
};

export const CategoryServices = {
  getAllCategories,
  createCategory,
  deleteCategory,
};

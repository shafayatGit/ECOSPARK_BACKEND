import {
  IQueryConfig,
  IQueryResult,
  PrismaModelDelegate,
} from "../interfaces/query.interface";
import { QueryBuilder } from "./quaryBuilder";
import { isCommentsCountSort, parseQueryParams } from "./parseQueryParams";

interface IExecuteListQueryOptions<T> {
  model: PrismaModelDelegate;
  query: Record<string, unknown>;
  config?: IQueryConfig;
  where?: Record<string, unknown>;
  include?: Record<string, unknown>;
  defaultSort?: { sortBy: string; sortOrder: "asc" | "desc" };
  transform?: (item: T) => T;
}

export const executeListQuery = async <T>({
  model,
  query,
  config,
  where,
  include,
  defaultSort,
  transform,
}: IExecuteListQueryOptions<T>): Promise<IQueryResult<T>> => {
  const queryParams = parseQueryParams(query);

  if (defaultSort && !queryParams.sortBy) {
    queryParams.sortBy = defaultSort.sortBy;
    queryParams.sortOrder = defaultSort.sortOrder;
  }

  const useCommentsCountSort = isCommentsCountSort(queryParams);

  const builder = new QueryBuilder<T>(model, queryParams, config)
    .search()
    .filter()
    .paginate();

  if (!useCommentsCountSort) {
    builder.sort();
  }

  if (where) {
    builder.where(where);
  }

  if (include) {
    builder.include(include);
  }

  if (useCommentsCountSort) {
    const builtQuery = builder.getQuery();
    builtQuery.orderBy = { comments: { _count: "desc" } };

    const page = Number(queryParams.page) || 1;
    const limit = Number(queryParams.limit) || 10;

    const [total, data] = await Promise.all([
      model.count({ where: builtQuery.where }),
      model.findMany(builtQuery),
    ]);

    const transformed = transform
      ? (data as T[]).map((item) => transform(item))
      : (data as T[]);

    return {
      data: transformed,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  const result = await builder.execute();

  if (transform) {
    result.data = result.data.map((item) => transform(item));
  }

  return result;
};

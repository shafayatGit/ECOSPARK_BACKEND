import { IQueryParams } from "../interfaces/query.interface";

const SORT_ALIASES: Record<string, { sortBy: string; sortOrder: "asc" | "desc" }> =
  {
    recent: { sortBy: "createdAt", sortOrder: "desc" },
    topVoted: { sortBy: "upvoteCount", sortOrder: "desc" },
    mostCommented: { sortBy: "__comments_count__", sortOrder: "desc" },
  };

export const parseQueryParams = (
  query: Record<string, unknown>,
): IQueryParams => {
  const params: IQueryParams = {};

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    if (Array.isArray(value)) {
      params[key] = value.map(String).join(",");
      return;
    }

    if (typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(
        ([operator, operatorValue]) => {
          if (operatorValue !== undefined && operatorValue !== null) {
            params[`${key}[${operator}]`] = String(operatorValue);
          }
        },
      );
      return;
    }

    params[key] = String(value);
  });

  if (params.q && !params.searchTerm) {
    params.searchTerm = params.q;
  }

  if (params.sort && SORT_ALIASES[params.sort]) {
    const alias = SORT_ALIASES[params.sort];
    params.sortBy = alias.sortBy;
    params.sortOrder = alias.sortOrder;
    delete params.sort;
  }

  return params;
};

export const isCommentsCountSort = (queryParams: IQueryParams) =>
  queryParams.sortBy === "__comments_count__";

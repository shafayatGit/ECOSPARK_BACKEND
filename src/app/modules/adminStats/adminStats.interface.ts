export interface IStatusCount {
  status: string;
  count: number;
}

export interface ICategoryIdeaCount {
  categoryId: string;
  name: string;
  slug: string;
  count: number;
}

export interface ITrendPoint {
  date: string;
  count: number;
}

export interface IRevenueTrendPoint {
  date: string;
  count: number;
  amount: number;
}

export interface IAdminDashboardStats {
  overview: {
    users: {
      total: number;
      members: number;
      admins: number;
      active: number;
      inactive: number;
      emailVerified: number;
    };
    ideas: {
      total: number;
      draft: number;
      pending: number;
      underReview: number;
      approved: number;
      rejected: number;
      paid: number;
      free: number;
    };
    engagement: {
      votes: number;
      comments: number;
      activeComments: number;
    };
    categories: {
      total: number;
    };
    newsletter: {
      total: number;
      active: number;
      inactive: number;
    };
    purchases: {
      total: number;
      pending: number;
      completed: number;
      failed: number;
      totalRevenue: number;
    };
  };
  ideasByStatus: IStatusCount[];
  ideasByCategory: ICategoryIdeaCount[];
  purchasesByStatus: IStatusCount[];
  trends: {
    ideasLast30Days: ITrendPoint[];
    purchasesLast30Days: ITrendPoint[];
    revenueLast30Days: IRevenueTrendPoint[];
  };
  recent: {
    pendingIdeas: unknown[];
    recentPurchases: unknown[];
    recentUsers: unknown[];
  };
  topIdeas: {
    byVotes: unknown[];
    byPurchases: unknown[];
  };
}

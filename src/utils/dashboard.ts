import { DashboardSummary, SaleRecord, User, OperatingCost } from '../types';

export const INITIAL_SUMMARY: DashboardSummary = {
  totalRevenue: 0,
  totalSales: 0,
  totalCosts: 0,
  netProfit: 0
};

export const calculateDashboardSummary = (
  sales: SaleRecord[],
  users: User[],
  costs: OperatingCost[]
): DashboardSummary => {
  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.amount), 0);
  const totalSales = sales.length;
  const totalCosts = costs.reduce((sum, cost) => sum + Number(cost.amount), 0);
  const netProfit = totalRevenue - totalCosts;

  return {
    totalRevenue,
    totalSales,
    totalCosts,
    netProfit
  };
};

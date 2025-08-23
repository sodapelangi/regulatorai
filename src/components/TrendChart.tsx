import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DashboardMetrics } from "../data/mockData";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TrendChartProps {
  data: DashboardMetrics['weeklyTrend'];
}

export function TrendChart({ data }: TrendChartProps) {
  // Ensure data is valid and not empty
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Weekly Regulation Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No trend data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(item => ({
    ...item,
    formattedDate: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }));

  // Calculate trend percentages with proper error checking
  const calculateTrendPercentage = (current: number, previous: number) => {
    if (!current || !previous || previous === 0 || isNaN(previous) || isNaN(current)) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Safe array access with fallbacks
  const currentWeekData = data[data.length - 1];
  const previousWeekData = data.length > 1 ? data[data.length - 2] : null;
  
  const currentWeekRegulations = currentWeekData?.regulations ?? 0;
  const previousWeekRegulations = previousWeekData?.regulations ?? 0;
  const regulationsTrend = calculateTrendPercentage(currentWeekRegulations, previousWeekRegulations);

  const currentWeekHighImpact = currentWeekData?.highImpact ?? 0;
  const previousWeekHighImpact = previousWeekData?.highImpact ?? 0;
  const highImpactTrend = calculateTrendPercentage(currentWeekHighImpact, previousWeekHighImpact);

  // Don't show trends if we don't have enough data
  const showTrends = data.length >= 2 && previousWeekData;

  return (
    <Card className="col-span-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Weekly Regulation Trends</CardTitle>
          {showTrends && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-sm">
                  {regulationsTrend >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <Badge variant={regulationsTrend >= 0 ? "default" : "destructive"}>
                    {regulationsTrend >= 0 ? '+' : ''}{regulationsTrend.toFixed(1)}%
                  </Badge>
                  <span className="text-muted-foreground">Total</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-sm">
                  {highImpactTrend >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <Badge variant={highImpactTrend >= 0 ? "default" : "destructive"}>
                    {highImpactTrend >= 0 ? '+' : ''}{highImpactTrend.toFixed(1)}%
                  </Badge>
                  <span className="text-muted-foreground">High Impact</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="regulations" 
              stroke="#8884d8" 
              strokeWidth={2}
              name="Total Regulations"
              dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="highImpact" 
              stroke="#82ca9d" 
              strokeWidth={2}
              name="High Impact"
              dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
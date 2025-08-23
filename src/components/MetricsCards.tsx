import { Card, CardContent } from "./ui/card";
import { TrendingUp, AlertTriangle, FileText, Clock, Building2 } from "lucide-react";
import { DashboardMetrics } from "../data/mockData";

interface MetricsCardsProps {
  metrics: DashboardMetrics;
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  // Calculate total high impact across all sectors with error handling
  const totalHighImpact = Object.values(metrics.highImpactRegulations || {})
    .reduce((sum, count) => sum + (Number.isFinite(count) ? count : 0), 0);
  
  // Calculate number of active sectors (sectors with at least 1 high impact regulation)
  const activeSectors = Object.values(metrics.highImpactRegulations || {})
    .filter(count => Number.isFinite(count) && count > 0).length;

  // Calculate weekly trend percentage
  const weeklyTrend = metrics.weeklyTrend || [];
  const currentWeekAvg = weeklyTrend.slice(-3).reduce((sum, day) => sum + day.regulations, 0) / 3;
  const previousWeekAvg = weeklyTrend.slice(-7, -3).reduce((sum, day) => sum + day.regulations, 0) / 4;
  const trendPercentage = previousWeekAvg > 0 ? ((currentWeekAvg - previousWeekAvg) / previousWeekAvg * 100) : 0;

  const metricCards = [
    {
      title: "Total Regulations",
      value: metrics.totalRegulations || 0,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      title: "Daily Updates",
      value: metrics.dailyUpdates || 0,
      icon: Clock,
      color: "text-emerald-600", 
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      trend: trendPercentage > 0 ? `+${trendPercentage.toFixed(1)}%` : `${trendPercentage.toFixed(1)}%`,
      trendColor: trendPercentage > 0 ? "text-emerald-600" : "text-red-600"
    },
    {
      title: "High Impact",
      value: totalHighImpact,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50", 
      borderColor: "border-red-200",
      highlight: true
    },
    {
      title: "Active Sectors",
      value: activeSectors,
      icon: Building2,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {metricCards.map((metric, index) => (
        <Card 
          key={metric.title} 
          className={`transition-all duration-200 hover:shadow-md hover:-translate-y-1 border-2 ${
            metric.highlight ? metric.borderColor : 'border-transparent hover:border-gray-200'
          }`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </p>
                  {metric.highlight && (
                    <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
                
                <div className="space-y-1">
                  <div className="text-3xl font-bold tracking-tight">
                    {typeof metric.value === 'number' && Number.isFinite(metric.value) 
                      ? metric.value.toLocaleString() 
                      : '0'
                    }
                  </div>
                  
                  {metric.trend && (
                    <div className={`flex items-center gap-1 text-xs ${metric.trendColor}`}>
                      <TrendingUp className="h-3 w-3" />
                      <span className="font-medium">{metric.trend}</span>
                      <span className="text-muted-foreground">vs last week</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className={`p-3 rounded-xl ${metric.bgColor}`}>
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
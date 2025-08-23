import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DashboardMetrics } from "../data/mockData";
import { mockRegulations } from "../data/mockData";
import { Badge } from "./ui/badge";
import { Info } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface SectorImpactChartProps {
  metrics: DashboardMetrics;
}

export function SectorImpactChart({ metrics }: SectorImpactChartProps) {
  // Calculate high/medium/low impact regulations by sector from actual data
  const sectorCounts = mockRegulations.reduce((acc, regulation) => {
    regulation.impactedSectors.forEach(sectorImpact => {
      if (!acc[sectorImpact.sector]) {
        acc[sectorImpact.sector] = { high: 0, medium: 0, low: 0 };
      }
      acc[sectorImpact.sector][sectorImpact.importance]++;
    });
    return acc;
  }, {} as Record<string, { high: number; medium: number; low: number }>);

  // Sort sectors by total impact for better visualization
  const sortedSectors = Object.entries(sectorCounts)
    .map(([sector, counts]) => ({
      sector: sector.length > 25 ? sector.substring(0, 25) + "..." : sector,
      fullSector: sector,
      high: counts.high,
      medium: counts.medium,
      low: counts.low,
      total: counts.high + counts.medium + counts.low
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10); // Show top 10 sectors

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Find the full sector name from the data
      const fullSectorName = sortedSectors.find(d => d.sector === label)?.fullSector || label;
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      
      return (
        <div className="bg-card border border-gray-200 rounded-lg p-4 shadow-lg">
          <p className="font-semibold text-sm mb-3 text-foreground">{fullSectorName}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm font-medium">
                    {entry.dataKey === 'high' && 'High Impact'}
                    {entry.dataKey === 'medium' && 'Medium Impact'}
                    {entry.dataKey === 'low' && 'Low Impact'}
                  </span>
                </div>
                <span className="text-sm font-bold">{entry.value}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total</span>
                <span className="text-sm font-bold">{total}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex justify-center gap-6 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium text-muted-foreground">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="col-span-3">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">Impact Rating by Sector</CardTitle>
            <p className="text-sm text-muted-foreground">
              Top {sortedSectors.length} sectors by regulation count
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {mockRegulations.length} total regulations
            </Badge>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">
                    Chart shows the distribution of high, medium, and low impact regulations across business sectors. 
                    Higher bars indicate more regulatory activity affecting that sector.
                  </p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <ResponsiveContainer width="100%" height={450}>
          <BarChart 
            data={sortedSectors} 
            margin={{ top: 20, right: 20, left: 20, bottom: 100 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="sector" 
              tick={{ fontSize: 10, fill: '#666' }}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#666' }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Bar 
              dataKey="high" 
              stackId="a"
              fill="#dc2626" 
              name="High Impact"
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="medium" 
              stackId="a"
              fill="#f59e0b" 
              name="Medium Impact"
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="low" 
              stackId="a"
              fill="#10b981" 
              name="Low Impact"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
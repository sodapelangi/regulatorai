import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CheckCircle2, AlertCircle, Clock, TrendingUp } from "lucide-react";

export function ComplianceAnalysis() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1>Compliance Analysis</h1>
        <p className="text-muted-foreground">
          Analyze your organization's compliance status and get AI-powered recommendations
        </p>
      </div>

      {/* Compliance Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliant</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground">
              of tracked regulations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              regulations need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              awaiting assessment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Improvement</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+5.2%</div>
            <p className="text-xs text-muted-foreground">
              compliance score this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for future features */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Analysis Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3>Coming Soon:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Gap analysis across regulations</li>
                <li>• Compliance roadmap generation</li>
                <li>• Risk assessment matrix</li>
                <li>• Automated reporting</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3>AI-Powered Features:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Smart compliance recommendations</li>
                <li>• Predictive risk analysis</li>
                <li>• Automated policy mapping</li>
                <li>• Impact assessment automation</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-4">
            <Button>
              Contact Sales for Full Access
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
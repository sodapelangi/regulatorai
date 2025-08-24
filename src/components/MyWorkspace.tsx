import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Eye, Clock, ExternalLink, Search } from "lucide-react";
import { viewTrackingApi } from "../lib/api";
import { useState } from "react";
import { toast } from "sonner";

interface HistoryPageProps {
  onViewRegulation: (regulationId: string) => void;
}

export function HistoryPage({ onViewRegulation }: HistoryPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewHistory, setViewHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load view history on component mount
  React.useEffect(() => {
    loadViewHistory();
  }, []);

  const loadViewHistory = async () => {
    try {
      setLoading(true);
      const response = await viewTrackingApi.getViewHistory({
        limit: 50,
        search: searchTerm
      });
      setViewHistory(response.data || []);
    } catch (error) {
      console.error('Failed to load view history:', error);
      toast.error('Failed to load view history');
    } finally {
      setLoading(false);
    }
  };

  // Reload when search term changes
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!loading) {
        loadViewHistory();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const filteredHistory = viewHistory.filter(item => 
    item && item.judul_lengkap.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'proposed': return 'secondary';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  const handleViewRegulation = async (regulationId: string) => {
    // Record the view
    try {
      await viewTrackingApi.recordView(regulationId, {
        source: 'history'
      });
    } catch (error) {
      console.error('Failed to record view:', error);
    }
    
    onViewRegulation(regulationId);
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1>Recent View History</h1>
        <p className="text-muted-foreground">
          Track your recently viewed regulatory updates and analysis
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search viewed regulations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* History List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recently Viewed Regulations
            <Badge variant="secondary" className="text-xs">
              Today's views: {viewHistory.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading view history...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No regulations match your search.' : 'No viewing history yet.'}
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{item.judul_lengkap}</h3>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Year: {item.tahun}</span>
                      <span>Number: {item.number}</span>
                      <span>Authority: {item.instansi}</span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {item.tentang}
                    </p>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                      </span>
                    </div>

                    {/* Sector Impacts */}
                    <div className="flex flex-wrap gap-2">
                      {item.impactedSectors.slice(0, 2).map((sectorImpact, index) => (
                        <Badge 
                          key={index}
                          variant={sectorImpact.importance === 'high' ? 'destructive' : 
                                  sectorImpact.importance === 'medium' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {sectorImpact.sector}: {sectorImpact.importance}
                        </Badge>
                      ))}
                      {item.impactedSectors.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{item.impactedSectors.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onViewRegulation(item.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
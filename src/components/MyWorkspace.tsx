import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Eye, Clock, ExternalLink, Search } from "lucide-react";
import { workspaceApi } from "../lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface MyWorkspaceProps {
  onViewRegulation: (regulationId: string) => void;
}

export function MyWorkspace({ onViewRegulation }: MyWorkspaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [workspaceItems, setWorkspaceItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load workspace items on component mount
  useEffect(() => {
    loadWorkspace();
  }, []);

  const loadWorkspace = async () => {
    try {
      setLoading(true);
      const response = await workspaceApi.getWorkspace();
      setWorkspaceItems(response.data || []);
    } catch (error) {
      console.error('Failed to load workspace:', error);
      toast.error('Failed to load workspace');
    } finally {
      setLoading(false);
    }
  };

  // Filter workspace items by search term
  const filteredWorkspace = workspaceItems.filter(item => 
    item?.regulations?.judul_lengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item?.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRemoveFromWorkspace = async (workspaceId: string) => {
    try {
      await workspaceApi.removeFromWorkspace(workspaceId);
      setWorkspaceItems(prev => prev.filter(item => item.id !== workspaceId));
      toast.success('Removed from workspace');
    } catch (error) {
      console.error('Failed to remove from workspace:', error);
      toast.error('Failed to remove from workspace');
    }
  };

  const handleUpdatePriority = async (workspaceId: string, priority: string) => {
    try {
      await workspaceApi.updateWorkspaceItem(workspaceId, { priority });
      setWorkspaceItems(prev => prev.map(item => 
        item.id === workspaceId ? { ...item, priority } : item
      ));
      toast.success('Priority updated');
    } catch (error) {
      console.error('Failed to update priority:', error);
      toast.error('Failed to update priority');
    }
  };

  const handleUpdateStatus = async (workspaceId: string, status: string) => {
    try {
      await workspaceApi.updateWorkspaceItem(workspaceId, { status });
      setWorkspaceItems(prev => prev.map(item => 
        item.id === workspaceId ? { ...item, status } : item
      ));
      toast.success('Status updated');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  // Reload when search term changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!loading && searchTerm) {
        // For search, we filter locally since workspace is typically small
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const formatDateAdded = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in-progress': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1>My Workspace</h1>
        <p className="text-muted-foreground">
          Manage and track your saved regulations with priorities and notes
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search workspace items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Workspace List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Workspace Items
            <Badge variant="secondary" className="text-xs">
              {workspaceItems.length} saved
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading workspace...</p>
            </div>
          ) : filteredWorkspace.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No workspace items match your search.' : 'No regulations in workspace yet.'}
            </div>
          ) : (
            filteredWorkspace.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{item.regulations?.judul_lengkap}</h3>
                      <Badge variant={getPriorityColor(item.priority)} className="text-xs">
                        {item.priority.toUpperCase()}
                      </Badge>
                      <Badge variant={getStatusColor(item.status)} className="text-xs">
                        {item.status.replace('-', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Number: {item.regulations?.nomor}</span>
                      <span>Year: {item.regulations?.tahun}</span>
                      <span>Authority: {item.regulations?.instansi}</span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {item.regulations?.tentang}
                    </p>

                    {item.notes && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">{item.notes}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Added {formatDateAdded(item.added_at)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onViewRegulation(item.regulation_id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveFromWorkspace(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
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
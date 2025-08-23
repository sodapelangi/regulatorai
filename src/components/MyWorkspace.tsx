import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Eye, Trash2, Edit2, Plus, Search, Calendar, User, AlertTriangle, Clock } from "lucide-react";
import { mockRegulations, mockWorkspaceItems, WorkspaceItem } from "../data/mockData";
import { useState } from "react";

interface MyWorkspaceProps {
  onViewRegulation: (regulationId: string) => void;
}

export function MyWorkspace({ onViewRegulation }: MyWorkspaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [workspaceItems, setWorkspaceItems] = useState(mockWorkspaceItems);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const getWorkspaceRegulations = () => {
    return workspaceItems.map(item => {
      const regulation = mockRegulations.find(r => r.id === item.regulationId);
      return regulation ? { ...regulation, workspaceData: item } : null;
    }).filter(Boolean);
  };

  const filteredItems = getWorkspaceRegulations().filter(item => {
    if (!item) return false;
    
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.workspaceData.notes.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || item.workspaceData.status === filterStatus;
    const matchesPriority = filterPriority === "all" || item.workspaceData.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

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
      case 'completed': return 'outline';
      case 'in-progress': return 'default';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return null;
      case 'in-progress': return <User className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return null;
    }
  };

  const updateWorkspaceItem = (regulationId: string, updates: Partial<WorkspaceItem>) => {
    setWorkspaceItems(items => 
      items.map(item => 
        item.regulationId === regulationId ? { ...item, ...updates } : item
      )
    );
  };

  const removeFromWorkspace = (regulationId: string) => {
    setWorkspaceItems(items => items.filter(item => item.regulationId !== regulationId));
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1>My Workspace</h1>
          <p className="text-muted-foreground">
            Manage and track your saved regulatory intelligence items
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Regulation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Regulation to Workspace</DialogTitle>
              <DialogDescription>
                Select regulations from the intelligence dashboard to add them to your personal workspace for tracking and management.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a regulation from the intelligence dashboard to add to your workspace.
              </p>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Go to Dashboard
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workspace items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Workspace Items */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center space-y-2">
                <h3>No items in workspace</h3>
                <p className="text-muted-foreground">
                  {workspaceItems.length === 0 
                    ? "Add regulations from the intelligence dashboard to start tracking them here."
                    : "No items match your current filters."
                  }
                </p>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{item.title}</h3>
                        <Badge variant={getPriorityColor(item.workspaceData.priority)}>
                          {item.workspaceData.priority} priority
                        </Badge>
                        <Badge variant={getStatusColor(item.workspaceData.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(item.workspaceData.status)}
                            {item.workspaceData.status.replace('-', ' ')}
                          </div>
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Established: {new Date(item.establishedDate).toLocaleDateString()}</span>
                        <span>Promulgated: {new Date(item.promulgatedDate).toLocaleDateString()}</span>
                        <span>Location: {item.location}</span>
                        <span>Added: {formatTimeAgo(item.workspaceData.addedAt)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onViewRegulation(item.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeFromWorkspace(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground">{item.description}</p>

                  {/* Sector Impacts */}
                  <div className="flex flex-wrap gap-2">
                    {item.impactedSectors.map((sectorImpact, index) => (
                      <Badge 
                        key={index}
                        variant={sectorImpact.importance === 'high' ? 'destructive' : 
                                sectorImpact.importance === 'medium' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {sectorImpact.sector}: {sectorImpact.importance}
                      </Badge>
                    ))}
                  </div>

                  {/* Notes */}
                  {item.workspaceData.notes && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Notes:</h4>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                        {item.workspaceData.notes}
                      </p>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Select 
                      value={item.workspaceData.status} 
                      onValueChange={(value) => updateWorkspaceItem(item.id, { status: value as any })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select 
                      value={item.workspaceData.priority} 
                      onValueChange={(value) => updateWorkspaceItem(item.id, { priority: value as any })}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button variant="outline" size="sm">
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit Notes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
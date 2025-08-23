import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Search, Filter, ExternalLink, Brain, Eye, BookmarkPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { Regulation } from "../data/mockData";
import { useState } from "react";

interface RegulationsListProps {
  regulations: Regulation[];
  onViewRegulation?: (regulationId: string) => void;
  onAddToWorkspace?: (regulationId: string) => void;
  showPagination?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function RegulationsList({ 
  regulations, 
  onViewRegulation, 
  onAddToWorkspace,
  showPagination = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange 
}: RegulationsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSector, setFilterSector] = useState("all");
  const [filterImportance, setFilterImportance] = useState("all");
  const [addedToWorkspace, setAddedToWorkspace] = useState<Set<string>>(new Set());

  const filteredRegulations = regulations.filter(regulation => {
    const matchesSearch = regulation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         regulation.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSector = filterSector === "all" || 
                         regulation.impactedSectors.some(sector => 
                           sector.sector.toLowerCase() === filterSector.toLowerCase());
    
    const matchesImportance = filterImportance === "all" ||
                             regulation.impactedSectors.some(sector => 
                               sector.importance === filterImportance);

    return matchesSearch && matchesSector && matchesImportance;
  });

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const handleViewDetails = (regulationId: string) => {
    if (onViewRegulation) {
      onViewRegulation(regulationId);
    }
  };

  const handleAddToWorkspace = (regulationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setAddedToWorkspace(prev => new Set([...prev, regulationId]));
    if (onAddToWorkspace) {
      onAddToWorkspace(regulationId);
    }
  };

  const renderPagination = () => {
    if (!showPagination || totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-6 pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {!showPagination && (
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            Recent Regulatory Updates
            <Badge variant="secondary" className="ml-2">
              {filteredRegulations.length} regulations
            </Badge>
          </CardTitle>
        </div>
      )}
      
      {/* Filters - only show when not in pagination mode */}
      {!showPagination && (
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search regulations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterSector} onValueChange={setFilterSector}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sector" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
              <SelectItem value="energy">Energy</SelectItem>
              <SelectItem value="digital">Digital</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterImportance} onValueChange={setFilterImportance}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Importance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="space-y-4">
        {filteredRegulations.map((regulation) => (
          <Card key={regulation.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{regulation.title}</h3>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Established: {new Date(regulation.establishedDate).toLocaleDateString()}</span>
                      <span>Promulgated: {new Date(regulation.promulgatedDate).toLocaleDateString()}</span>
                      <span>Location: {regulation.location}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(regulation.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                    <Button 
                      variant={addedToWorkspace.has(regulation.id) ? "default" : "ghost"} 
                      size="sm"
                      onClick={(e) => handleAddToWorkspace(regulation.id, e)}
                      disabled={addedToWorkspace.has(regulation.id)}
                    >
                      <BookmarkPlus className="h-4 w-4" />
                      {addedToWorkspace.has(regulation.id) ? "Added" : ""}
                    </Button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground">
                  {regulation.description}
                </p>

                {/* AI Suggested Sector Impacts */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Brain className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">AI-Suggested Sector Impact:</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {regulation.impactedSectors.map((sectorImpact, index) => (
                      <Badge 
                        key={index}
                        variant={getImportanceColor(sectorImpact.importance)}
                        className="text-xs"
                      >
                        {sectorImpact.sector}: {sectorImpact.importance}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredRegulations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No regulations match your current filters.
          </div>
        )}
      </div>

      {renderPagination()}
    </div>
  );
}
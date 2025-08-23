import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { ScrollArea } from "./ui/scroll-area";
import { Brain, Edit2, ArrowLeft, BookmarkPlus, User, Calendar, CheckCircle2, Clock, AlertTriangle, Plus, Info, FileText, MapPin, History, Eye, Settings, MessageSquare, Send, Users, ExternalLink, Search } from "lucide-react";
import { DetailedRegulation, REGULATION_SECTORS } from "../data/mockData";
import { useState } from "react";

interface RegulationDetailProps {
  regulation: DetailedRegulation;
  onBack: () => void;
  onAddToWorkspace: () => void;
  onUpdateSectorImpact: (sectorIndex: number, importance: string) => void;
  onToggleChecklistItem: (itemId: string) => void;
}

export function RegulationDetail({ 
  regulation, 
  onBack, 
  onAddToWorkspace, 
  onUpdateSectorImpact,
  onToggleChecklistItem 
}: RegulationDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [checklist, setChecklist] = useState(regulation.checklist);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      id: "1",
      sender: "ai",
      message: "Hello! I'm your AI Legal Analyst Assistant. I can help you understand the implications of this regulation. What would you like to know?",
      timestamp: new Date().toISOString()
    }
  ]);

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'proposed': return 'secondary';
      case 'draft': return 'outline';
      case 'revoked': return 'destructive';
      default: return 'outline';
    }
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      const newItem = {
        id: Date.now().toString(),
        task: newChecklistItem.trim(),
        completed: false,
        isAiGenerated: false
      };
      setChecklist([...checklist, newItem]);
      setNewChecklistItem("");
    }
  };

  const handleToggleChecklistItem = (itemId: string) => {
    setChecklist(checklist.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
    onToggleChecklistItem(itemId);
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      const userMessage = {
        id: Date.now().toString(),
        sender: "user",
        message: chatMessage.trim(),
        timestamp: new Date().toISOString()
      };

      // Simulate AI response
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        message: "Based on this regulation, I recommend reviewing your current compliance framework. The increased penalties and reporting requirements will significantly impact your operations. Would you like me to suggest specific action items?",
        timestamp: new Date().toISOString()
      };

      setChatHistory([...chatHistory, userMessage, aiResponse]);
      setChatMessage("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
          <div>
            <h1>{regulation.title}</h1>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant={regulation.inWorkspace ? "default" : "outline"}
            onClick={onAddToWorkspace}
            disabled={regulation.inWorkspace}
          >
            <BookmarkPlus className="h-4 w-4 mr-2" />
            {regulation.inWorkspace ? "In Workspace" : "Add to Workspace"}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            {isEditing ? "Done Editing" : "Edit"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-2 space-y-6">
          {/* Enhanced Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Regulation Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <span className="font-medium">Number:</span>
                    <p className="text-muted-foreground">{regulation.number}</p>
                  </div>
                  <div>
                    <span className="font-medium">Established:</span>
                    <p className="text-muted-foreground">{new Date(regulation.establishedDate).toLocaleDateString('id-ID', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}</p>
                  </div>
                  <div>
                    <span className="font-medium">Promulgated:</span>
                    <p className="text-muted-foreground">{new Date(regulation.promulgatedDate).toLocaleDateString('id-ID', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium">Location:</span>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {regulation.location}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">About:</span>
                    <p className="text-muted-foreground">{regulation.about}</p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <Badge variant={getStatusColor(regulation.status)} className="ml-2">
                      {regulation.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {regulation.revokedRegulations && regulation.revokedRegulations.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <span className="font-medium">Revoked Regulations:</span>
                    <div className="mt-2 space-y-1">
                      {regulation.revokedRegulations.map((revokedReg, index) => (
                        <p key={index} className="text-sm text-muted-foreground bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-800">
                          {revokedReg}
                        </p>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* AI Analysis - Consolidated */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-500" />
                AI Analysis
                <Badge variant="outline" className="ml-auto">
                  {Math.round(regulation.aiAnalysis.confidence * 100)}% confidence
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground italic">
                Disclaimer: AI Analysis is provided for guidance only. Always verify regulations interpretation with legal experts.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Background */}
              <div>
                <h4 className="font-medium mb-3">Background</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{regulation.aiAnalysis.background}</p>
              </div>

              <Separator />

              {/* Key Points */}
              <div>
                <h4 className="font-medium mb-3">Key Points</h4>
                <div className="space-y-3">
                  {regulation.aiAnalysis.keyPoints.map((point, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="text-xs">{point.article}</Badge>
                        <div className="flex-1">
                          <h5 className="font-medium text-sm">{point.title}</h5>
                          <p className="text-sm text-muted-foreground mt-1">{point.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Old and New Comparison Table */}
              <div>
                <h4 className="font-medium mb-3">What Changed - Side by Side Comparison</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Article</TableHead>
                        <TableHead className="text-red-600">Previous Version</TableHead>
                        <TableHead className="text-green-600">Current Version</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {regulation.aiAnalysis.oldNewComparison.map((comparison, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{comparison.article}</TableCell>
                          <TableCell className="text-sm bg-red-50 dark:bg-red-950/20">
                            {comparison.oldText}
                          </TableCell>
                          <TableCell className="text-sm bg-green-50 dark:bg-green-950/20">
                            {comparison.newText}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Separator />

              {/* Why It Matters For Business */}
              <div>
                <h4 className="font-medium mb-3">Why It Matters For Business</h4>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-line">{regulation.aiAnalysis.whyItMattersForBusiness}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>Action Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center space-x-3 p-3 border rounded">
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => handleToggleChecklistItem(item.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {item.task}
                      </p>
                      {item.isAiGenerated && (
                        <Badge variant="secondary" className="text-xs ml-2">
                          Generate by AI
                        </Badge>
                      )}
                    </div>
                  </div>
                  {item.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-orange-500" />
                  )}
                </div>
              ))}
              
              {/* Add new checklist item */}
              <div className="flex gap-2 pt-3 border-t">
                <Input
                  placeholder="Add new action item..."
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddChecklistItem();
                    }
                  }}
                />
                <Button onClick={handleAddChecklistItem} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - AI Chat */}
        <div className="lg:col-span-1 space-y-6">
        </div>

        {/* Left Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Sector Impact (Editable) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Sector Impact Analysis
                {isEditing && <Badge variant="outline">Editing Mode</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {regulation.impactedSectors.map((sectorImpact, index) => (
                <div key={index} className="space-y-2 p-3 border rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{sectorImpact.sector}</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(sectorImpact.aiConfidence * 100)}% AI confidence
                    </span>
                  </div>
                  
                  {isEditing ? (
                    <Select 
                      value={sectorImpact.importance} 
                      onValueChange={(value) => onUpdateSectorImpact(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Impact</SelectItem>
                        <SelectItem value="medium">Medium Impact</SelectItem>
                        <SelectItem value="high">High Impact</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={getImportanceColor(sectorImpact.importance)}>
                      {sectorImpact.importance} impact
                    </Badge>
                  )}
                </div>
              ))}
              
              {isEditing && (
                <div className="space-y-2">
                  <Select onValueChange={(value) => {
                    // Add new sector logic would go here
                    console.log('Add sector:', value);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add new sector..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {REGULATION_SECTORS
                        .filter(sector => !regulation.impactedSectors.some(s => s.sector === sector))
                        .map(sector => (
                          <SelectItem key={sector} value={sector}>
                            {sector}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* History Workspace */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-500" />
                History Workspace
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* View History */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  View History
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                    <span>Last viewed</span>
                    <span className="text-muted-foreground">
                      {regulation.viewedAt ? new Date(regulation.viewedAt).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Never'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                    <span>Total views</span>
                    <Badge variant="outline">3 times</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                    <span>First viewed</span>
                    <span className="text-muted-foreground">15 Aug 2024</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Edit History for Sector Impact */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Edit History
                </h4>
                <div className="space-y-2">
                  <div className="p-2 border rounded text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">Sector Impact Analysis</span>
                      <span className="text-xs text-muted-foreground">18 Aug 2024, 14:30</span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Changed "Manufacturing" sector from medium to high impact
                    </p>
                  </div>
                  <div className="p-2 border rounded text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">Manual Action Added</span>
                      <span className="text-xs text-muted-foreground">17 Aug 2024, 09:15</span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Added: "Consult with environmental law expert"
                    </p>
                  </div>
                  <div className="p-2 border rounded text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">Added to Workspace</span>
                      <span className="text-xs text-muted-foreground">16 Aug 2024, 11:20</span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Regulation added to personal workspace
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Manual Action Checklist History */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Manual Actions Log
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">Consult with environmental law expert</p>
                      <p className="text-xs text-muted-foreground">Completed on 18 Aug 2024 - Added manually</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded text-sm">
                    <Clock className="h-4 w-4 text-orange-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">Schedule board meeting for compliance review</p>
                      <p className="text-xs text-muted-foreground">Added on 17 Aug 2024 - Manual addition</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Timeline Summary */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline Summary
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span>Regulation effective</span>
                    <span className="text-muted-foreground">{new Date(regulation.establishedDate).toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>First discovered</span>
                    <span className="text-muted-foreground">15 Aug 2024</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last activity</span>
                    <span className="text-muted-foreground">18 Aug 2024</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Workspace status</span>
                    <Badge variant={regulation.inWorkspace ? "default" : "secondary"} className="text-xs">
                      {regulation.inWorkspace ? "Active" : "Not Added"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
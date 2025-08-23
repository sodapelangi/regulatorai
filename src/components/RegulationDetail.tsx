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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Progress } from "./ui/progress";
import { Brain, Edit2, ArrowLeft, BookmarkPlus, User, Calendar, CheckCircle2, Clock, AlertTriangle, Plus, Info, FileText, MapPin, History, Eye, Settings, MessageSquare, Send, Users, ExternalLink, Search, Shield, TrendingUp, Building2, Gavel, AlertCircleIcon } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("overview");

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

  const completedTasks = checklist.filter(item => item.completed).length;
  const totalTasks = checklist.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Back button and title */}
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <Button 
                variant="ghost" 
                onClick={onBack} 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to List
              </Button>
              
              <div className="h-6 w-px bg-gray-300" />
              
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                  <Gavel className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-semibold text-gray-900 truncate">
                    {regulation.title}
                  </h1>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-500 font-medium">{regulation.number}</span>
                    <Badge variant={getStatusColor(regulation.status)} className="text-xs">
                      {regulation.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right side - Actions */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <Button 
                variant={regulation.inWorkspace ? "default" : "outline"}
                onClick={onAddToWorkspace}
                disabled={regulation.inWorkspace}
                className="flex items-center gap-2"
              >
                <BookmarkPlus className="h-4 w-4" />
                {regulation.inWorkspace ? "In Workspace" : "Add to Workspace"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                {isEditing ? "Done" : "Edit"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm border">
            <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <Info className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">
              <Brain className="h-4 w-4" />
              AI Analysis
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Actions ({completedTasks}/{totalTasks})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Main Content - 2 columns */}
              <div className="lg:col-span-2 space-y-6">
                {/* Key Information Card */}
                <Card className="shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <FileText className="h-6 w-6 text-blue-600" />
                      Regulation Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid gap-6">
                      {/* Basic Details */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex flex-col space-y-1">
                            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Number</span>
                            <span className="text-lg font-semibold text-gray-900">{regulation.number}</span>
                          </div>
                          <div className="flex flex-col space-y-1">
                            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Established</span>
                            <span className="text-base text-gray-900">
                              {new Date(regulation.establishedDate).toLocaleDateString('en-US', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                          <div className="flex flex-col space-y-1">
                            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Promulgated</span>
                            <span className="text-base text-gray-900">
                              {new Date(regulation.promulgatedDate).toLocaleDateString('en-US', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex flex-col space-y-1">
                            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Location</span>
                            <div className="flex items-center gap-2 text-base text-gray-900">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              {regulation.location}
                            </div>
                          </div>
                          <div className="flex flex-col space-y-1">
                            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Status</span>
                            <div>
                              <Badge variant={getStatusColor(regulation.status)} className="text-sm px-3 py-1">
                                {regulation.status.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-1">
                            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Source</span>
                            <span className="text-base text-gray-900">{regulation.source || 'Official Gazette'}</span>
                          </div>
                        </div>
                      </div>

                      {/* About Section */}
                      <div className="pt-4 border-t">
                        <div className="flex flex-col space-y-2">
                          <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">About</span>
                          <p className="text-base text-gray-900 leading-relaxed">{regulation.about}</p>
                        </div>
                      </div>

                      {/* Revoked Regulations */}
                      {regulation.revokedRegulations && regulation.revokedRegulations.length > 0 && (
                        <div className="pt-4 border-t">
                          <div className="flex flex-col space-y-3">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                              <span className="text-sm font-medium text-gray-900 uppercase tracking-wide">Revoked Regulations</span>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                              {regulation.revokedRegulations.map((revokedReg, index) => (
                                <div key={index} className="text-sm text-amber-800 font-medium">
                                  {revokedReg}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Description Card */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed text-base">{regulation.description}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar - 1 column */}
              <div className="space-y-6">
                {/* Sector Impact Analysis */}
                <Card className="shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Sector Impact
                      </CardTitle>
                      {isEditing && <Badge variant="outline" className="text-xs">Editing Mode</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {regulation.impactedSectors.map((sectorImpact, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 text-sm leading-tight">{sectorImpact.sector}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  {Math.round(sectorImpact.aiConfidence * 100)}% AI confidence
                                </span>
                                <Brain className="h-3 w-3 text-blue-500" />
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            {isEditing ? (
                              <Select 
                                value={sectorImpact.importance} 
                                onValueChange={(value) => onUpdateSectorImpact(index, value)}
                              >
                                <SelectTrigger className="h-8 w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant={getImportanceColor(sectorImpact.importance)} className="text-xs font-medium">
                                {sectorImpact.importance.toUpperCase()} IMPACT
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isEditing && (
                      <div className="pt-2 border-t">
                        <Select onValueChange={(value) => {
                          console.log('Add sector:', value);
                        }}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="+ Add new sector..." />
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

                {/* Quick Stats */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="h-5 w-5 text-blue-600" />
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">Last viewed</span>
                        <span className="text-sm font-medium text-gray-900">
                          {regulation.viewedAt ? new Date(regulation.viewedAt).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          }) : 'Never'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">Total views</span>
                        <Badge variant="outline" className="text-xs font-medium">3 times</Badge>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">Workspace status</span>
                        <Badge variant={regulation.inWorkspace ? "default" : "secondary"} className="text-xs font-medium">
                          {regulation.inWorkspace ? "Active" : "Not Added"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">Action progress</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{completionPercentage}%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* AI Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Brain className="h-6 w-6 text-purple-600" />
                    AI Analysis
                  </CardTitle>
                  <Badge variant="outline" className="bg-white font-medium">
                    {Math.round(regulation.aiAnalysis.confidence * 100)}% confidence
                  </Badge>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 mb-1">Legal Disclaimer</p>
                      <p className="text-sm text-amber-700">
                        AI Analysis is provided for guidance only. Always verify regulation interpretation with qualified legal experts before making compliance decisions.
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 p-8">
                {/* Background */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    Background Context
                  </h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <p className="text-gray-700 leading-relaxed">{regulation.aiAnalysis.background}</p>
                  </div>
                </div>

                <Separator />

                {/* Key Points */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Key Regulatory Points
                  </h3>
                  <div className="space-y-4">
                    {regulation.aiAnalysis.keyPoints.map((point, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
                        <div className="flex items-start gap-4">
                          <Badge variant="outline" className="text-xs font-mono font-medium px-3 py-1">
                            {point.article}
                          </Badge>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-3">{point.title}</h4>
                            <p className="text-gray-700 leading-relaxed">{point.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Comparison Table */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    Changes Comparison
                  </h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-24 font-semibold text-center">Article</TableHead>
                          <TableHead className="text-red-700 font-semibold">Previous Version</TableHead>
                          <TableHead className="text-green-700 font-semibold">Current Version</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {regulation.aiAnalysis.oldNewComparison.map((comparison, index) => (
                          <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell className="font-medium text-center bg-gray-50 border-r">
                              <Badge variant="outline" className="font-mono text-xs">
                                {comparison.article}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm bg-red-50 border-l-4 border-red-200 p-4">
                              <p className="leading-relaxed">{comparison.oldText}</p>
                            </TableCell>
                            <TableCell className="text-sm bg-green-50 border-l-4 border-green-200 p-4">
                              <p className="leading-relaxed">{comparison.newText}</p>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <Separator />

                {/* Business Impact */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-orange-600" />
                    Business Impact Analysis
                  </h3>
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-6">
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                        {regulation.aiAnalysis.whyItMattersForBusiness}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Action Items Tab */}
          <TabsContent value="actions" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    Action Checklist
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600 font-medium">
                      {completedTasks} of {totalTasks} completed
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-green-500 h-3 rounded-full transition-all duration-300" 
                          style={{ width: `${completionPercentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-green-600">{completionPercentage}%</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {checklist.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all">
                    <div className="flex items-start space-x-4">
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() => handleToggleChecklistItem(item.id)}
                        className="mt-1 h-5 w-5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`text-base ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'} leading-relaxed`}>
                            {item.task}
                          </p>
                          <div className="flex items-center gap-3 ml-4">
                            {item.isAiGenerated && (
                              <Badge variant="secondary" className="text-xs">
                                <Brain className="h-3 w-3 mr-1" />
                                AI Generated
                              </Badge>
                            )}
                            {item.completed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-orange-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Add new item */}
                <div className="border-t pt-6 mt-6">
                  <div className="flex gap-3">
                    <Input
                      placeholder="Add new action item..."
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddChecklistItem();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button onClick={handleAddChecklistItem} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Task
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <History className="h-6 w-6 text-orange-600" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Timeline */}
                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="p-2 bg-green-100 rounded-full flex-shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-900">Task Completed</h4>
                      <p className="text-green-700 mt-1">Consult with environmental law expert</p>
                      <p className="text-xs text-green-600 mt-2 font-medium">18 Aug 2024, 14:30 • Manual action</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
                      <Edit2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900">Sector Impact Updated</h4>
                      <p className="text-blue-700 mt-1">Changed "Manufacturing" sector from medium to high impact</p>
                      <p className="text-xs text-blue-600 mt-2 font-medium">18 Aug 2024, 14:30</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="p-2 bg-gray-100 rounded-full flex-shrink-0">
                      <Plus className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">Manual Action Added</h4>
                      <p className="text-gray-700 mt-1">Added: "Schedule board meeting for compliance review"</p>
                      <p className="text-xs text-gray-600 mt-2 font-medium">17 Aug 2024, 09:15</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="p-2 bg-purple-100 rounded-full flex-shrink-0">
                      <BookmarkPlus className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900">Added to Workspace</h4>
                      <p className="text-purple-700 mt-1">Regulation added to personal workspace</p>
                      <p className="text-xs text-purple-600 mt-2 font-medium">16 Aug 2024, 11:20</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
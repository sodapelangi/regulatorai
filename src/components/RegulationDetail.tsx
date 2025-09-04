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
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { userChecklistApi } from "../lib/api";

// UUID validation helper
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

interface RegulationDetailProps {
  regulation: {
    id: string;
    title: string;
    number: string;
    establishedDate: string;
    promulgatedDate: string;
    description: string;
    about: string;
    impactedSectors: Array<{
      sector: string;
      importance: string;
      aiConfidence: number;
    }>;
    location: string;
    documentType: string;
    status: string;
    fullText?: {
      new: string;
    };
    aiAnalysis?: {
      confidence: number;
      background: string;
      key_points: Array<{
        title: string;
        description: string;
        article: string;
      }>;
      old_new_comparison: Array<{
        article: string;
        old_text: string;
        new_text: string;
      }> | null;
      business_impact: string;
    };
    background?: {
      context: string;
    };
    inWorkspace: boolean;
    viewedAt?: string;
    aiChecklist?: Array<{
      id: string;
      task: string;
      article_reference?: string;
    }>;
    userChecklist?: Array<{
      id: string;
      task: string;
      completed: boolean;
      article_reference?: string;
    }>;
  };
  onBack: () => void;
  onAddToWorkspace: () => void;
}

export function RegulationDetail({ 
  regulation, 
  onBack, 
  onAddToWorkspace
}: RegulationDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [userChecklist, setUserChecklist] = useState<Array<{
    id: string;
    task: string;
    completed: boolean;
    article_reference?: string;
  }>>([]);
  const [aiChecklist, setAiChecklist] = useState<Array<{
    id: string;
    task: string;
    article_reference?: string;
  }>>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(regulation.aiAnalysis);
  const [activityHistory, setActivityHistory] = useState<Array<{
    id: string;
    action: string;
    description: string;
    timestamp: string;
    type: 'view' | 'workspace' | 'analysis' | 'edit';
  }>>([]);

  const loadRegulationData = async () => {
    // Validate regulation ID before making any database calls
    if (!isValidUUID(regulation.id)) {
      console.error('Invalid regulation ID format:', regulation.id);
      toast.error('Invalid regulation ID format');
      return;
    }

    try {
      // Initialize checklists from regulation data
      if (regulation.aiChecklist) {
        setAiChecklist(regulation.aiChecklist);
      }
      if (regulation.userChecklist) {
        setUserChecklist(regulation.userChecklist);
      }

      // Load activity history from regulation_views
      const { data: views, error: viewsError } = await supabase
        .from('regulation_views')
        .select('*')
        .eq('regulation_id', regulation.id)
        .order('viewed_at', { ascending: false })
        .limit(10);

      if (!viewsError && views) {
        const history = views.map(view => ({
          id: view.id,
          action: 'Regulation Viewed',
          description: `Viewed regulation for ${view.view_duration_seconds || 0} seconds`,
          timestamp: view.viewed_at,
          type: 'view' as const
        }));
        setActivityHistory(history);
      }

      // Load workspace status for history
      const { data: workspace, error: workspaceError } = await supabase
        .from('user_workspaces')
        .select('*')
        .eq('regulation_id', regulation.id)
        .limit(1);

      if (!workspaceError && workspace && workspace.length > 0) {
        setActivityHistory(prev => [...prev, {
          id: workspace[0].id,
          action: 'Added to Workspace',
          description: `Added with ${workspace[0].priority} priority`,
          timestamp: workspace[0].added_at,
          type: 'workspace'
        }]);
      }


    } catch (error) {
      console.error('Failed to load regulation data:', error);
    }
  };

  // Load real checklist and activity data
  useEffect(() => {
    loadRegulationData();
  }, [regulation.id]);

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
        article_reference: undefined
      };
      
      // Add to database
      userChecklistApi.addItem(regulation.id, newItem.task, newItem.article_reference)
        .then(() => {
          setUserChecklist([...userChecklist, newItem]);
          toast.success('Task added successfully');
        })
        .catch((error) => {
          console.error('Failed to add checklist item:', error);
          toast.error('Failed to add task');
        });
      
      setNewChecklistItem("");
    }
  };

  const handleToggleChecklistItem = (itemId: string, source: 'ai' | 'user') => {
    if (source === 'user') {
      const item = userChecklist.find(item => item.id === itemId);
      if (item) {
        const updatedItem = { ...item, completed: !item.completed };
        
        userChecklistApi.updateItem(regulation.id, itemId, updatedItem.task, updatedItem.completed, updatedItem.article_reference)
          .then(() => {
            setUserChecklist(userChecklist.map(item => 
              item.id === itemId ? updatedItem : item
            ));
          })
          .catch((error) => {
            console.error('Failed to update checklist item:', error);
            toast.error('Failed to update task');
          });
      }
    }
  };

  const handleRemoveUserChecklistItem = (itemId: string) => {
    userChecklistApi.removeItem(regulation.id, itemId)
      .then(() => {
        setUserChecklist(userChecklist.filter(item => item.id !== itemId));
        toast.success('Task removed');
      })
      .catch((error) => {
        console.error('Failed to remove checklist item:', error);
        toast.error('Failed to remove task');
      });
  };

  const handleCopyAIChecklist = () => {
    if (aiChecklist.length === 0) {
      toast.error('No AI suggestions to copy');
      return;
    }

    userChecklistApi.copyAIChecklist(regulation.id, aiChecklist)
      .then(() => {
        const newUserItems = aiChecklist.map(item => ({
          ...item,
          completed: false
        }));
        setUserChecklist([...userChecklist, ...newUserItems]);
        toast.success('AI suggestions copied to your tasks');
      })
      .catch((error) => {
        console.error('Failed to copy AI checklist:', error);
        toast.error('Failed to copy AI suggestions');
      });
  };

  const handleReanalyze = async () => {
    // Validate regulation ID before making API call
    if (!isValidUUID(regulation.id)) {
      toast.error('Invalid regulation ID format');
      return;
    }

    setIsAnalyzing(true);
    try {
      const { error } = await supabase.functions.invoke('analyze-regulation', {
        body: { regulation_id: regulation.id }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Fetch updated analysis
      const { data: updatedRegulation, error: fetchError } = await supabase
        .from('regulations')
        .select('ai_analysis, sector_impacts, analysis_confidence')
        .eq('id', regulation.id)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (updatedRegulation.ai_analysis) {
        setAiAnalysis(updatedRegulation.ai_analysis);
        toast.success('AI analysis updated successfully');
        
        // Add to activity history
        setActivityHistory(prev => [{
          id: Date.now().toString(),
          action: 'AI Analysis Updated',
          description: 'Regulation re-analyzed with latest AI model',
          timestamp: new Date().toISOString(),
          type: 'analysis'
        }, ...prev]);
      }

    } catch (error) {
      console.error('Re-analysis error:', error);
      toast.error(`Re-analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateSectorImpact = (sectorIndex: number, importance: string) => {
    // Update local state for immediate UI feedback
    const updatedSectors = [...regulation.impactedSectors];
    updatedSectors[sectorIndex] = {
      ...updatedSectors[sectorIndex],
      importance
    };
    
    // Add to activity history
    setActivityHistory(prev => [{
      id: Date.now().toString(),
      action: 'Sector Impact Updated',
      description: `Changed "${updatedSectors[sectorIndex].sector}" impact to ${importance}`,
      timestamp: new Date().toISOString(),
      type: 'edit'
    }, ...prev]);
    
    toast.success('Sector impact updated');
  };

  const completedTasks = userChecklist.filter(item => item.completed).length;
  const totalTasks = userChecklist.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Clean Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between gap-6">
            {/* Left: Navigation & Title */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <Button 
                variant="ghost" 
                onClick={onBack} 
                className="mt-1 flex-shrink-0 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to List
              </Button>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <Badge variant={getStatusColor(regulation.status)} className="text-xs font-medium">
                    {regulation.status.toUpperCase()}
                  </Badge>
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
                  {regulation.title} {regulation.number}
                </h1>
                
              </div>
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
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
                onClick={handleReanalyze}
                disabled={isAnalyzing}
                className="flex items-center gap-2"
              >
                <Brain className="h-4 w-4" />
                {isAnalyzing ? "Analyzing..." : "Re-analyze"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Clean Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="bg-white rounded-lg border border-gray-200 p-1">
            <TabsList className="grid w-full grid-cols-4 bg-gray-100 gap-1">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-md"
              >
                <Info className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="analysis" 
                className="flex items-center gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-md"
              >
                <Brain className="h-4 w-4" />
                AI Analysis
              </TabsTrigger>
              <TabsTrigger 
                value="actions" 
                className="flex items-center gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-md"
              >
                <CheckCircle2 className="h-4 w-4" />
                Actions ({completedTasks}/{totalTasks})
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-md"
              >
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab - Clean Layout */}
          <TabsContent value="overview" className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-12">
              {/* Main Content - 8 columns */}
              <div className="lg:col-span-8 space-y-6">
                {/* Regulation Details - Clean Card */}
                <Card className="border-gray-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Regulation Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Key Information Grid */}
                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500 mb-1">Number</dt>
                          <dd className="text-base font-semibold text-gray-900">{regulation.number}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500 mb-1">Established</dt>
                          <dd className="text-base text-gray-900">
                            {new Date(regulation.establishedDate).toLocaleDateString('en-US', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500 mb-1">Promulgated</dt>
                          <dd className="text-base text-gray-900">
                            {new Date(regulation.promulgatedDate).toLocaleDateString('en-US', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </dd>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500 mb-1">Location</dt>
                          <dd className="text-base text-gray-900">{regulation.location}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500 mb-1">Status</dt>
                          <dd>
                            <Badge variant={getStatusColor(regulation.status)} className="text-sm">
                              {regulation.status.toUpperCase()}
                            </Badge>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500 mb-1">Source</dt>
                          <dd className="text-base text-gray-900">{regulation.documentType}</dd>
                        </div>
                      </div>
                    </div>

                    {/* About Section */}
                    <div className="pt-6 border-t border-gray-200">
                      <dt className="text-sm font-medium text-gray-500 mb-3">About</dt>
                      <dd className="text-base text-gray-900 leading-relaxed">{regulation.about}</dd>
                    </div>

                    {/* Revoked Regulations */}
                    {regulation.revokedRegulations && regulation.revokedRegulations.length > 0 && (
                      <div className="pt-6 border-t border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          <dt className="text-sm font-medium text-gray-900">Revoked Regulations</dt>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          {regulation.revokedRegulations.map((revokedReg, index) => (
                            <dd key={index} className="text-sm text-amber-800 font-medium">
                              {revokedReg}
                            </dd>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Description Card */}
                <Card className="border-gray-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base text-gray-700 leading-relaxed">{regulation.description}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar - 4 columns */}
              <div className="lg:col-span-4 space-y-6">
                {/* Sector Impact - Clean Design */}
                <Card className="border-gray-200">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Sector Impact
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsEditing(!isEditing)}
                          className="flex items-center gap-2"
                        >
                          <Edit2 className="h-3 w-3" />
                          {isEditing ? "Done" : "Edit"}
                        </Button>
                        {isEditing && <Badge variant="outline" className="text-xs">Edit Mode</Badge>}
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                      <div className="flex items-start gap-2">
                        <Brain className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-amber-700">
                          <strong>AI Generated</strong> - Please double check these sector impacts with legal experts
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {regulation.impactedSectors.map((sectorImpact, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 text-sm mb-1">{sectorImpact.sector}</h4>
                              <div className="flex items-center gap-2">
                                <Brain className="h-3 w-3 text-blue-500" />
                                <span className="text-xs text-gray-500">
                                  {Math.round(sectorImpact.aiConfidence * 100)}% AI confidence
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            {isEditing ? (
                              <Select 
                                value={sectorImpact.importance} 
                                onValueChange={(value) => handleUpdateSectorImpact(index, value)}
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
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="border-gray-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
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
                            month: 'short'
                          }) : 'Never'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">Total views</span>
                        <Badge variant="outline" className="text-xs">3 times</Badge>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">Workspace status</span>
                        <Badge variant={regulation.inWorkspace ? "default" : "secondary"} className="text-xs">
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
            <Card className="border-gray-200">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Brain className="h-6 w-6 text-purple-600" />
                    AI Analysis
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white font-medium">
                      {Math.round((aiAnalysis?.overall_confidence || regulation.aiAnalysis.confidence) * 100)}% confidence
                    </Badge>
                    {isAnalyzing && (
                      <Badge variant="secondary" className="animate-pulse">
                        Analyzing...
                      </Badge>
                    )}
                  </div>
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
                    <p className="text-gray-700 leading-relaxed">
                      {aiAnalysis?.background || regulation.aiAnalysis?.background || 'Background analysis not available'}
                    </p>
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
                    {(aiAnalysis?.key_points || regulation.aiAnalysis?.key_points || []).map((point, index) => (
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
                        {(aiAnalysis?.old_new_comparison || regulation.aiAnalysis?.old_new_comparison || []).map((comparison, index) => (
                          <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell className="font-medium text-center bg-gray-50 border-r">
                              <Badge variant="outline" className="font-mono text-xs">
                                {comparison.article || 'Art. N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm bg-red-50 border-l-4 border-red-200 p-4">
                              <p className="leading-relaxed">{comparison.old_text}</p>
                            </TableCell>
                            <TableCell className="text-sm bg-green-50 border-l-4 border-green-200 p-4">
                              <p className="leading-relaxed">{comparison.new_text}</p>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!aiAnalysis?.old_new_comparison && !regulation.aiAnalysis?.old_new_comparison) && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                              Previous regulation not available in system
                            </TableCell>
                          </TableRow>
                        )}
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
                        {aiAnalysis?.business_impact || regulation.aiAnalysis?.business_impact || 'Business impact analysis not available'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Action Items Tab */}
          <TabsContent value="actions" className="space-y-6">
            <Card className="border-gray-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
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
                {/* AI Suggestions Section */}
                {aiChecklist.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-purple-600" />
                        <h3 className="text-lg font-semibold text-gray-900">AI Suggestions</h3>
                        <Badge variant="secondary" className="text-xs">
                          {aiChecklist.length} items
                        </Badge>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleCopyAIChecklist}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Copy to My Tasks
                      </Button>
                    </div>
                    
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="space-y-3">
                        {aiChecklist.map((item) => (
                          <div key={item.id} className="flex items-start gap-3">
                            <div className="mt-1 h-4 w-4 rounded border-2 border-purple-300 bg-purple-100" />
                            <div className="flex-1">
                              <p className="text-sm text-purple-900 leading-relaxed">{item.task}</p>
                              {item.article_reference && (
                                <Badge variant="outline" className="mt-2 text-xs">
                                  {item.article_reference}
                                </Badge>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              *AI Generated
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* User Tasks Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">My Tasks</h3>
                    <Badge variant="secondary" className="text-xs">
                      {userChecklist.length} items
                    </Badge>
                  </div>
                  
                  {userChecklist.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No tasks added yet. Add your first task below or copy AI suggestions.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userChecklist.map((item) => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all">
                          <div className="flex items-start space-x-4">
                            <Checkbox
                              checked={item.completed}
                              onCheckedChange={() => handleToggleChecklistItem(item.id, 'user')}
                              className="mt-1 h-5 w-5"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className={`text-base ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'} leading-relaxed`}>
                                  {item.task}
                                </p>
                                <div className="flex items-center gap-3 ml-4">
                                  <Badge variant="outline" className="text-xs">
                                    *User Input
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveUserChecklistItem(item.id)}
                                    className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                                  >
                                    ×
                                  </Button>
                                  {item.completed ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <Clock className="h-5 w-5 text-orange-500" />
                                  )}
                                </div>
                              </div>
                              {item.article_reference && (
                                <Badge variant="outline" className="mt-2 text-xs">
                                  {item.article_reference}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Add new task section */}
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
            <Card className="border-gray-200">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <History className="h-6 w-6 text-orange-600" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  {activityHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No activity history available for this regulation.
                    </div>
                  ) : (
                    activityHistory.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="p-2 bg-gray-100 rounded-full flex-shrink-0">
                          {activity.type === 'view' && <Eye className="h-5 w-5 text-blue-600" />}
                          {activity.type === 'workspace' && <BookmarkPlus className="h-5 w-5 text-purple-600" />}
                          {activity.type === 'analysis' && <Brain className="h-5 w-5 text-green-600" />}
                          {activity.type === 'edit' && <Edit2 className="h-5 w-5 text-orange-600" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{activity.action}</h4>
                          <p className="text-gray-700 mt-1">{activity.description}</p>
                          <p className="text-xs text-gray-600 mt-2 font-medium">
                            {new Date(activity.timestamp).toLocaleDateString('en-US', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
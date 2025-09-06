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
import { Brain, Edit2, ArrowLeft, BookmarkPlus, User, Calendar, CheckCircle2, Clock, AlertTriangle, Plus, Info, FileText, MapPin, History, Eye, Settings, MessageSquare, Send, Users, ExternalLink, Search, Shield, TrendingUp, Building2, Gavel, AlertCircleIcon, ChevronDown, ChevronUp, Copy, Download, Share2, Bookmark, Star, Target, Lightbulb, Scale, Zap } from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { userChecklistApi } from "../lib/api";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

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
      rationale?: string;
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
  onRegulationUpdated?: () => void;
}

export function RegulationDetail({ 
  regulation, 
  onBack, 
  onAddToWorkspace,
  onRegulationUpdated
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
  const [expandedKeyPoints, setExpandedKeyPoints] = useState<Set<number>>(new Set([0])); // First item expanded by default
  const [showAllSectors, setShowAllSectors] = useState(false);
  const [readingTime, setReadingTime] = useState(0);

  // Calculate reading time for the regulation
  useEffect(() => {
    const wordCount = regulation.fullText?.new?.split(' ').length || 0;
    const avgWordsPerMinute = 200; // Average reading speed for legal text
    setReadingTime(Math.ceil(wordCount / avgWordsPerMinute));
  }, [regulation.fullText]);

  const toggleKeyPoint = (index: number) => {
    const newExpanded = new Set(expandedKeyPoints);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedKeyPoints(newExpanded);
  };

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
      userChecklistApi.addChecklistItem(regulation.id, newItem.task, newItem.article_reference)
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
        
        userChecklistApi.updateChecklistItem(regulation.id, itemId, {
          task: updatedItem.task,
          completed: updatedItem.completed,
          article_reference: updatedItem.article_reference
        })
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
    userChecklistApi.removeChecklistItem(regulation.id, itemId)
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

    userChecklistApi.copyAIChecklistToUser(regulation.id, aiChecklist)
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
        
        // Notify parent component to refresh regulation data
        if (onRegulationUpdated) {
          onRegulationUpdated();
        }
        
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
  
  // Calculate priority sectors (high impact only)
  const prioritySectors = regulation.impactedSectors.filter(sector => sector.importance === 'high');
  const displayedSectors = showAllSectors ? regulation.impactedSectors : regulation.impactedSectors.slice(0, 3);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Clean Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between gap-6">
            {/* Left: Navigation & Title */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <Button 
                variant="ghost" 
                onClick={onBack} 
                className="mt-1 flex-shrink-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to List
              </Button>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <Badge variant={getStatusColor(regulation.status)} className="text-xs font-medium">
                    {regulation.status.toUpperCase()}
                  </Badge>
                  {prioritySectors.length > 0 && (
                    <Badge variant="destructive" className="text-xs font-medium animate-pulse">
                      HIGH IMPACT
                    </Badge>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs font-medium cursor-help">
                        <Clock className="h-3 w-3 mr-1" />
                        {readingTime} min read
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Estimated reading time for full regulation text</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
                  {regulation.title} {regulation.number}
                </h1>
                
                <p className="text-gray-600 leading-relaxed max-w-3xl">
                  {regulation.description}
                </p>
                
              </div>
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share regulation</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download PDF</TooltipContent>
              </Tooltip>
              
              <Button 
                variant={regulation.inWorkspace ? "default" : "outline"}
                onClick={onAddToWorkspace}
                disabled={regulation.inWorkspace}
                className="flex items-center gap-2 transition-all duration-200"
              >
                <BookmarkPlus className="h-4 w-4" />
                {regulation.inWorkspace ? "In Workspace" : "Add to Workspace"}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleReanalyze}
                disabled={isAnalyzing}
                className="flex items-center gap-2 transition-all duration-200"
              >
                <Brain className={`h-4 w-4 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                {isAnalyzing ? "Analyzing..." : "Re-analyze"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Clean Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
            <TabsList className="grid w-full grid-cols-4 bg-gray-50 gap-1">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg transition-all duration-200 data-[state=active]:shadow-sm"
              >
                <Info className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="analysis" 
                className="flex items-center gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg transition-all duration-200 data-[state=active]:shadow-sm"
              >
                <Brain className="h-4 w-4" />
                AI Analysis
              </TabsTrigger>
              <TabsTrigger 
                value="actions" 
                className="flex items-center gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-lg transition-all duration-200 data-[state=active]:shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                Actions ({completedTasks}/{totalTasks})
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-lg transition-all duration-200 data-[state=active]:shadow-sm"
              >
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab - Clean Layout */}
          <TabsContent value="overview" className="space-y-8">
            {/* Critical Impact Alert */}
            {prioritySectors.length > 0 && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-400 rounded-lg p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-900 mb-2">High Impact Regulation</h3>
                    <p className="text-red-800 leading-relaxed">
                      This regulation has been classified as having <strong>high impact</strong> on {prioritySectors.length} business sector{prioritySectors.length > 1 ? 's' : ''}. 
                      Immediate attention and compliance review recommended.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {prioritySectors.map((sector, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {sector.sector}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-8 lg:grid-cols-12">
              {/* Main Content - 8 columns */}
              <div className="lg:col-span-8 space-y-6">
                {/* Regulation Details - Clean Card */}
                <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="pb-6 bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-lg">
                    <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <Gavel className="h-5 w-5 text-blue-600" />
                      Regulation Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8 p-8">
                    {/* Key Information Grid */}
                    <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                      <div className="space-y-4">
                        <div className="group">
                          <dt className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Number
                          </dt>
                          <dd className="text-lg font-bold text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border">
                            {regulation.number}
                          </dd>
                        </div>
                        <div className="group">
                          <dt className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Established
                          </dt>
                          <dd className="text-base font-semibold text-gray-900">
                            {new Date(regulation.establishedDate).toLocaleDateString('en-US', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </dd>
                        </div>
                        <div className="group">
                          <dt className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Promulgated
                          </dt>
                          <dd className="text-base font-semibold text-gray-900">
                            {new Date(regulation.promulgatedDate).toLocaleDateString('en-US', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </dd>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="group">
                          <dt className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Location
                          </dt>
                          <dd className="text-base font-semibold text-gray-900">{regulation.location}</dd>
                        </div>
                        <div className="group">
                          <dt className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Status
                          </dt>
                          <dd>
                            <Badge variant={getStatusColor(regulation.status)} className="text-sm px-3 py-1">
                              {regulation.status.toUpperCase()}
                            </Badge>
                          </dd>
                        </div>
                        <div className="group">
                          <dt className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Source
                          </dt>
                          <dd className="text-base font-semibold text-gray-900">{regulation.documentType}</dd>
                        </div>
                      </div>
                    </div>

                    {/* About Section */}
                    <div className="pt-8 border-t border-gray-200">
                      <dt className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        About This Regulation
                      </dt>
                      <dd className="text-base text-gray-900 leading-relaxed bg-gray-50 p-6 rounded-lg border">
                        {regulation.about}
                      </dd>
                    </div>

                    {/* Revoked Regulations */}
                    {regulation.revokedRegulations && regulation.revokedRegulations.length > 0 && (
                      <div className="pt-8 border-t border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          <dt className="text-sm font-medium text-gray-900">Superseded Regulations</dt>
                        </div>
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
                          {regulation.revokedRegulations.map((revokedReg, index) => (
                            <dd key={index} className="text-sm text-amber-900 font-medium leading-relaxed">
                              {revokedReg}
                            </dd>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Summary Card */}
                <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="pb-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-t-lg">
                    <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-emerald-600" />
                      Executive Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-blue-900">{regulation.impactedSectors.length}</div>
                          <div className="text-sm text-blue-700 font-medium">Sectors Affected</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-100">
                          <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-red-900">{prioritySectors.length}</div>
                          <div className="text-sm text-red-700 font-medium">High Impact</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                          <Scale className="h-8 w-8 text-green-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-green-900">{Math.round((aiAnalysis?.overall_confidence || regulation.aiAnalysis?.confidence || 0) * 100)}%</div>
                          <div className="text-sm text-green-700 font-medium">AI Confidence</div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-lg border">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Info className="h-4 w-4 text-gray-600" />
                          What This Regulation Does
                        </h4>
                        <p className="text-gray-700 leading-relaxed">{regulation.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar - 4 columns */}
              <div className="lg:col-span-4 space-y-6">
                {/* Sector Impact - Clean Design */}
                <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="pb-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Sector Impact
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsEditing(!isEditing)}
                          className="flex items-center gap-2 transition-all duration-200"
                        >
                          <Edit2 className="h-3 w-3" />
                          {isEditing ? "Done" : "Edit"}
                        </Button>
                        {isEditing && (
                          <Badge variant="outline" className="text-xs animate-pulse border-blue-300 text-blue-700">
                            Edit Mode
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4 mt-6">
                      <div className="flex items-start gap-2">
                        <Brain className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-amber-700">
                          <strong>AI Generated Analysis</strong> - Please verify these sector impacts with qualified legal experts before making compliance decisions
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    {displayedSectors.map((sectorImpact, index) => (
                      <div key={index} className="group p-6 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-base mb-2 leading-tight">{sectorImpact.sector}</h4>
                              <div className="flex items-center gap-2">
                                <Brain className="h-3 w-3 text-blue-500" />
                                <span className="text-xs text-gray-500">
                                  {Math.round(sectorImpact.aiConfidence * 100)}% AI confidence
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* AI Rationale */}
                          {sectorImpact.rationale && (
                            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold text-blue-800 mb-2 uppercase tracking-wide">AI Rationale</p>
                                  <p className="text-sm text-blue-700 leading-relaxed">{sectorImpact.rationale}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            {isEditing ? (
                              <Select 
                                value={sectorImpact.importance} 
                                onValueChange={(value) => handleUpdateSectorImpact(index, value)}
                              >
                                <SelectTrigger className="h-9 w-36 border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant={getImportanceColor(sectorImpact.importance)} className="text-xs font-semibold px-3 py-1.5">
                                {sectorImpact.importance.toUpperCase()} IMPACT
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Show More/Less Button */}
                    {regulation.impactedSectors.length > 3 && (
                      <div className="pt-4 border-t border-gray-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllSectors(!showAllSectors)}
                          className="w-full flex items-center gap-2 text-gray-600 hover:text-gray-900"
                        >
                          {showAllSectors ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Show {regulation.impactedSectors.length - 3} More Sectors
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="pb-6 bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-lg">
                    <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <Eye className="h-5 w-5 text-blue-600" />
                      Activity Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border">
                        <span className="text-sm text-gray-600">Last viewed</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {regulation.viewedAt ? new Date(regulation.viewedAt).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short'
                          }) : 'Never'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border">
                        <span className="text-sm text-gray-600">Total views</span>
                        <Badge variant="outline" className="text-xs font-medium">3 times</Badge>
                      </div>
                      <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border">
                        <span className="text-sm text-gray-600">Workspace status</span>
                        <Badge variant={regulation.inWorkspace ? "default" : "secondary"} className="text-xs font-medium">
                          {regulation.inWorkspace ? "Active" : "Not Added"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border">
                        <span className="text-sm text-gray-600">Action progress</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-700">{completionPercentage}%</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-gradient-to-r from-green-400 to-emerald-500 h-2.5 rounded-full transition-all duration-500" 
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
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 rounded-t-lg border-b border-purple-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Brain className="h-6 w-6 text-purple-600" />
                    AI Analysis
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white font-semibold border-purple-200 text-purple-700">
                      {Math.round((aiAnalysis?.overall_confidence || regulation.aiAnalysis.confidence) * 100)}% confidence
                    </Badge>
                    {isAnalyzing && (
                      <Badge variant="secondary" className="animate-pulse bg-purple-100 text-purple-700">
                        Analyzing...
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-5 mt-6">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800 mb-2 uppercase tracking-wide">Legal Disclaimer</p>
                      <p className="text-sm text-amber-700">
                        AI Analysis is provided for guidance only. Always verify regulation interpretation with qualified legal experts before making compliance decisions.
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-10 p-8">
                {/* Background */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <Info className="h-5 w-5 text-blue-600" />
                    Background Context
                  </h3>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8 shadow-sm">
                    <p className="text-gray-800 leading-relaxed text-base">
                      {aiAnalysis?.background || regulation.aiAnalysis?.background || 'Background analysis not available'}
                    </p>
                  </div>
                </div>

                <Separator className="my-8" />

                {/* Key Points */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <Zap className="h-6 w-6 text-emerald-600" />
                    Key Regulatory Points
                  </h3>
                  {(aiAnalysis?.key_points || regulation.aiAnalysis?.key_points || []).length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-gray-50">
                      <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No key points available</p>
                      <p className="text-sm text-gray-400 mt-1">AI analysis may not have identified specific regulatory points</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(aiAnalysis?.key_points || regulation.aiAnalysis?.key_points || []).map((point, index) => (
                        <Collapsible key={index} open={expandedKeyPoints.has(index)} onOpenChange={() => toggleKeyPoint(index)}>
                          <div className="border border-gray-200 rounded-xl bg-white hover:shadow-lg hover:border-blue-200 transition-all duration-300 overflow-hidden">
                            <CollapsibleTrigger asChild>
                              <div className="w-full p-6 cursor-pointer hover:bg-gray-50/50 transition-colors duration-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                        {index + 1}
                                      </div>
                                      <Badge 
                                        variant="outline" 
                                        className="text-xs font-mono font-semibold px-3 py-1.5 bg-blue-50 border-blue-200 text-blue-700"
                                      >
                                        {point.article}
                                      </Badge>
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-900 leading-tight">
                                      {point.title}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                                      Point {index + 1} of {(aiAnalysis?.key_points || regulation.aiAnalysis?.key_points || []).length}
                                    </Badge>
                                    {expandedKeyPoints.has(index) ? (
                                      <ChevronUp className="h-5 w-5 text-gray-400" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5 text-gray-400" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent>
                              <div className="px-6 pb-6 pt-0">
                                <div className="border-t border-gray-100 pt-6">
                                  <div className="prose prose-base max-w-none">
                                    <p className="text-gray-700 leading-relaxed text-base m-0">
                                      {point.description}
                                    </p>
                                  </div>
                                  
                                  {/* Action buttons for each key point */}
                                  <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-100">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                          <Copy className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Copy this point</TooltipContent>
                                    </Tooltip>
                                    
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                          <Bookmark className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Bookmark this point</TooltipContent>
                                    </Tooltip>
                                    
                                    <div className="flex items-center gap-2 ml-auto">
                                      <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                                      <span className="text-xs font-medium text-emerald-700">Key Provision</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      ))}
                    </div>
                  )}
                </div>

                <Separator className="my-10" />

                {/* Comparison Table */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <FileText className="h-5 w-5 text-purple-600" />
                    Changes Comparison
                  </h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <Table>
                      <TableHeader className="bg-gradient-to-r from-gray-50 to-slate-50">
                        <TableRow className="border-b-2 border-gray-200">
                          <TableHead className="w-28 font-bold text-center text-gray-900 py-4">Article</TableHead>
                          <TableHead className="text-red-700 font-bold py-4">Previous Version</TableHead>
                          <TableHead className="text-green-700 font-bold py-4">Current Version</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(aiAnalysis?.old_new_comparison || regulation.aiAnalysis?.old_new_comparison || []).map((comparison, index) => (
                          <TableRow key={index} className="hover:bg-gray-50/50 transition-colors duration-200">
                            <TableCell className="font-medium text-center bg-gradient-to-r from-gray-50 to-slate-50 border-r-2 border-gray-200">
                              <Badge variant="outline" className="font-mono text-xs font-bold">
                                {comparison.article || 'Art. N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-300 p-6">
                              <p className="leading-relaxed text-red-900">{comparison.old_text}</p>
                            </TableCell>
                            <TableCell className="text-sm bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-300 p-6">
                              <p className="leading-relaxed text-green-900">{comparison.new_text}</p>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(aiAnalysis?.old_new_comparison === null || regulation.aiAnalysis?.old_new_comparison === null || 
                          (!aiAnalysis?.old_new_comparison && !regulation.aiAnalysis?.old_new_comparison)) && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-12 bg-gray-50">
                              <FileText className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                              <p className="font-medium">Previous regulation not available in system</p>
                              <p className="text-sm mt-1">This appears to be a new regulation or the previous version hasn't been ingested</p>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <Separator className="my-10" />

                {/* Business Impact */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-orange-600" />
                    Business Impact Analysis
                  </h3>
                  <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 border border-orange-200 rounded-xl p-8 shadow-sm">
                    <div className="prose prose-base max-w-none">
                      <p className="text-gray-900 leading-relaxed whitespace-pre-line text-base">
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
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 rounded-t-lg border-b border-green-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    Action Checklist
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-700 font-semibold">
                      {completedTasks} of {totalTasks} completed
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-40 bg-gray-200 rounded-full h-3 shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-500 shadow-sm" 
                          style={{ width: `${completionPercentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-green-600">{completionPercentage}%</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {/* AI Suggestions Section */}
                {aiChecklist.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Brain className="h-5 w-5 text-purple-600" />
                        <h3 className="text-xl font-bold text-gray-900">AI Suggestions</h3>
                        <Badge variant="secondary" className="text-xs font-medium">
                          {aiChecklist.length} items
                        </Badge>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleCopyAIChecklist}
                        className="flex items-center gap-2 transition-all duration-200 hover:bg-purple-50 hover:border-purple-200"
                      >
                        <Plus className="h-4 w-4" />
                        Copy to My Tasks
                      </Button>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6 shadow-sm">
                      <div className="space-y-4">
                        {aiChecklist.map((item) => (
                          <div key={item.id} className="flex items-start gap-4 p-4 bg-white/60 rounded-lg border border-purple-100 hover:bg-white/80 transition-colors duration-200">
                            <div className="mt-1 h-5 w-5 rounded-md border-2 border-purple-300 bg-purple-100 flex items-center justify-center">
                              <Brain className="h-3 w-3 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-base text-purple-900 leading-relaxed font-medium">{item.task}</p>
                              {item.article_reference && (
                                <Badge variant="outline" className="mt-3 text-xs font-mono">
                                  {item.article_reference}
                                </Badge>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 font-medium">
                              AI Generated
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* User Tasks Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">My Tasks</h3>
                    <Badge variant="secondary" className="text-xs font-medium">
                      {userChecklist.length} items
                    </Badge>
                  </div>
                  
                  {userChecklist.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border-2 border-dashed border-gray-300">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="font-medium text-gray-600">No tasks added yet</p>
                      <p className="text-sm text-gray-500 mt-1">Add your first task below or copy AI suggestions above</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userChecklist.map((item) => (
                        <div key={item.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-blue-200 transition-all duration-200 bg-white">
                          <div className="flex items-start space-x-4">
                            <Checkbox
                              checked={item.completed}
                              onCheckedChange={() => handleToggleChecklistItem(item.id, 'user')}
                              className="mt-1 h-5 w-5 border-2"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className={`text-base ${item.completed ? 'line-through text-gray-500' : 'text-gray-900 font-medium'} leading-relaxed`}>
                                  {item.task}
                                </p>
                                <div className="flex items-center gap-3 ml-4">
                                  <Badge variant="outline" className="text-xs font-medium bg-blue-50 border-blue-200 text-blue-700">
                                    User Created
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveUserChecklistItem(item.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 rounded-full transition-all duration-200"
                                  >
                                    ×
                                  </Button>
                                  {item.completed ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500 animate-pulse" />
                                  ) : (
                                    <Clock className="h-5 w-5 text-orange-500" />
                                  )}
                                </div>
                              </div>
                              {item.article_reference && (
                                <Badge variant="outline" className="mt-3 text-xs font-mono">
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
                <div className="border-t border-gray-200 pt-8 mt-8">
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
                      className="flex-1 h-11 text-base"
                    />
                    <Button onClick={handleAddChecklistItem} className="flex items-center gap-2 h-11 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all duration-200">
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
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 rounded-t-lg border-b border-orange-100">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <History className="h-6 w-6 text-orange-600" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-6">
                  {activityHistory.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border-2 border-dashed border-gray-300">
                      <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="font-medium text-gray-600">No activity history available</p>
                      <p className="text-sm text-gray-500 mt-1">Activity will appear here as you interact with this regulation</p>
                    </div>
                  ) : (
                    activityHistory.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-6 p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-gray-300 transition-all duration-200">
                        <div className="p-3 bg-gradient-to-br from-gray-100 to-slate-100 rounded-full flex-shrink-0 border border-gray-200">
                          {activity.type === 'view' && <Eye className="h-5 w-5 text-blue-600" />}
                          {activity.type === 'workspace' && <BookmarkPlus className="h-5 w-5 text-purple-600" />}
                          {activity.type === 'analysis' && <Brain className="h-5 w-5 text-green-600" />}
                          {activity.type === 'edit' && <Edit2 className="h-5 w-5 text-orange-600" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg">{activity.action}</h4>
                          <p className="text-gray-700 mt-2 leading-relaxed">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-3 font-medium bg-gray-100 px-2 py-1 rounded-md inline-block">
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
    </TooltipProvider>
  );
}
import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  Upload, 
  FileText, 
  Database, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Zap,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface ProcessingStage {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  description: string;
  current_chunk?: number;
  total_chunks?: number;
}

interface IngestionJob {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    stage: string;
    progress: number;
    message: string;
    current_chunk?: number;
    total_chunks?: number;
  };
  regulation_id?: string;
  error_message?: string;
  created_at: string;
}

interface IngestionPageProps {
  onBack?: () => void;
}

export function IngestionPage({ onBack }: IngestionPageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentJob, setCurrentJob] = useState<IngestionJob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [processingStages, setProcessingStages] = useState<ProcessingStage[]>([
    {
      id: "validation",
      name: "Document Validation",
      status: "pending",
      progress: 0,
      description: "Validating document format and content"
    },
    {
      id: "processing",
      name: "Document Processing",
      status: "pending", 
      progress: 0,
      description: "Extracting metadata and creating chunks"
    },
    {
      id: "embedding",
      name: "Generate Embeddings",
      status: "pending",
      progress: 0,
      description: "Creating vector embeddings for search"
    },
    {
      id: "storing",
      name: "Database Storage",
      status: "pending",
      progress: 0,
      description: "Storing regulation and chunks in database"
    }
  ]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.match(/\.(txt|md)$/i)) {
      toast.error("Please select a TXT or MD file");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error("File size must be less than 10MB");
      return;
    }
    
    setSelectedFile(file);
    toast.success("Document selected successfully");
  }, []);

  const processDocument = async () => {
    if (!selectedFile) {
      toast.error("Please select a document first");
      return;
    }

    setIsProcessing(true);
    setActiveTab("processing");
    
    // Reset processing stages
    setProcessingStages(stages => stages.map(stage => ({
      ...stage,
      status: 'pending',
      progress: 0
    })));

    try {
      // Read file content
      const documentText = await selectedFile.text();
      
      // Create ingestion job
      const { data: job, error: jobError } = await supabase
        .from('ingestion_jobs')
        .insert({
          filename: selectedFile.name,
          file_size: selectedFile.size,
          status: 'pending'
        })
        .select()
        .single();

      if (jobError) {
        throw new Error(`Failed to create job: ${jobError.message}`);
      }

      setCurrentJob(job);
      
      // Start processing with Edge Function
      const { error: processError } = await supabase.functions.invoke('process-document', {
        body: {
          jobId: job.id,
          documentText: documentText,
          filename: selectedFile.name
        }
      });

      if (processError) {
        throw new Error(`Processing failed: ${processError.message}`);
      }

      // Start polling for progress
      pollJobProgress(job.id);
      
    } catch (error) {
      console.error('Processing error:', error);
      toast.error(`Processing failed: ${error.message}`);
      setIsProcessing(false);
      
      // Update stages to show error
      setProcessingStages(stages => stages.map(stage => ({
        ...stage,
        status: stage.status === 'processing' ? 'error' : stage.status
      })));
    }
  };

  const pollJobProgress = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data: job, error } = await supabase
          .from('ingestion_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) {
          console.error('Error fetching job:', error);
          return;
        }

        setCurrentJob(job);
        
        // Update processing stages based on job progress
        if (job.progress) {
          updateStagesFromJobProgress(job.progress);
        }

        // Check if job is completed or failed
        if (job.status === 'completed') {
          clearInterval(pollInterval);
          setIsProcessing(false);
          setActiveTab("results");
          toast.success("Document processed successfully!");
        } else if (job.status === 'failed') {
          clearInterval(pollInterval);
          setIsProcessing(false);
          toast.error(`Processing failed: ${job.error_message}`);
        }
        
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Clean up interval after 30 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (isProcessing) {
        setIsProcessing(false);
        toast.error("Processing timeout - please check job status manually");
      }
    }, 30 * 60 * 1000);
  };

  const updateStagesFromJobProgress = (progress: any) => {
    const { stage, progress: progressPercent, message, current_chunk, total_chunks } = progress;
    
    setProcessingStages(stages => stages.map(stageItem => {
      if (stage === 'validation' && stageItem.id === 'validation') {
        return {
          ...stageItem,
          status: progressPercent >= 100 ? 'completed' : 'processing',
          progress: Math.min(progressPercent, 100)
        };
      } else if ((stage === 'processing' || stage === 'parsing' || stage === 'chunking') && stageItem.id === 'processing') {
        return {
          ...stageItem,
          status: progressPercent >= 70 ? 'completed' : 'processing',
          progress: Math.min(progressPercent, 70),
          current_chunk,
          total_chunks
        };
      } else if (stage === 'embedding' && stageItem.id === 'embedding') {
        return {
          ...stageItem,
          status: progressPercent >= 95 ? 'completed' : 'processing',
          progress: Math.max(0, Math.min(progressPercent - 70, 25))
        };
      } else if ((stage === 'storing' || stage === 'completed') && stageItem.id === 'storing') {
        return {
          ...stageItem,
          status: stage === 'completed' ? 'completed' : 'processing',
          progress: stage === 'completed' ? 100 : Math.max(0, progressPercent - 95)
        };
      } else if (stageItem.status === 'pending' && shouldStageBeCompleted(stageItem.id, stage, progressPercent)) {
        return {
          ...stageItem,
          status: 'completed',
          progress: 100
        };
      }
      return stageItem;
    }));
  };

  const shouldStageBeCompleted = (stageId: string, currentStage: string, progress: number): boolean => {
    if (stageId === 'validation' && (currentStage !== 'validation' && progress > 5)) return true;
    if (stageId === 'processing' && (currentStage === 'embedding' || currentStage === 'storing' || currentStage === 'completed')) return true;
    if (stageId === 'embedding' && (currentStage === 'storing' || currentStage === 'completed')) return true;
    return false;
  };

  const getStageIcon = (status: ProcessingStage['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'processing': return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Document Ingestion</h2>
          <p className="text-muted-foreground">
            Process regulatory documents into structured vector database
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Database className="h-3 w-3" />
          Supabase Ready
        </Badge>
      </div>

      {/* Processing Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Document Upload</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Regulation Document
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {selectedFile ? selectedFile.name : "Drop your regulation document here"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  Supports TXT and MD files up to 10MB
                </p>
                <Button variant="outline">
                  Choose File
                </Button>
                <input
                  id="file-input"
                  type="file"
                  accept=".txt,.md"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>
              
              {selectedFile && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Ready for processing
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={processDocument} 
                      disabled={isProcessing}
                      className="flex items-center gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      {isProcessing ? "Processing..." : "Process Document"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Processing Tab */}
        <TabsContent value="processing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Processing Pipeline</CardTitle>
              {currentJob && (
                <div className="text-sm text-muted-foreground">
                  Job ID: {currentJob.id} • Status: {currentJob.status}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {processingStages.map((stage, index) => (
                  <div key={stage.id} className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {getStageIcon(stage.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{stage.name}</h3>
                        <div className="flex items-center gap-2">
                          {stage.current_chunk && stage.total_chunks && (
                            <span className="text-xs text-muted-foreground">
                              {stage.current_chunk}/{stage.total_chunks} chunks
                            </span>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {stage.progress}%
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {stage.description}
                      </p>
                      <Progress value={stage.progress} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
              
              {currentJob?.progress?.message && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {currentJob.progress.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          {currentJob?.status === 'completed' && currentJob.regulation_id ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Processing Completed Successfully
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="font-medium">Regulation Created</p>
                        <p className="text-sm text-muted-foreground">ID: {currentJob.regulation_id}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="font-medium">Stored in Database</p>
                        <p className="text-sm text-muted-foreground">With vector embeddings</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-4">
                    The regulation has been successfully processed and is now available in the system.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={() => {
                      setActiveTab("upload");
                      setSelectedFile(null);
                      setCurrentJob(null);
                      setIsProcessing(false);
                    }}>
                      Process Another Document
                    </Button>
                    <Button variant="outline" onClick={onBack}>
                      Back to Dashboard
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : currentJob?.status === 'failed' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Processing Failed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {currentJob.error_message || "An unknown error occurred during processing."}
                  </AlertDescription>
                </Alert>
                
                <div className="mt-4">
                  <Button onClick={() => {
                    setActiveTab("upload");
                    setSelectedFile(null);
                    setCurrentJob(null);
                    setIsProcessing(false);
                  }}>
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <h3>No Results Yet</h3>
                  <p className="text-muted-foreground">
                    Process a document to see results here.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
      
      // Stage 4: Level 2 Chunking (BAB)
      await updateProcessingStage("chunk-level2", "processing", 40);
      const level2Chunks = DocumentProcessor.createLevel2Chunks(extractedText);
      await updateProcessingStage("chunk-level2", "completed", 100);
      
      // Stage 5: Level 3 Chunking (Pasal)
      await updateProcessingStage("chunk-level3", "processing", 60);
      const level3Chunks = DocumentProcessor.createLevel3Chunks(extractedText);
      await updateProcessingStage("chunk-level3", "completed", 100);
      
      // Combine all chunks
      let allChunks = [...level1Chunks, ...level2Chunks, ...level3Chunks];
      
      // Validate chunks
      const validation = DocumentProcessor.validateChunks(allChunks);
      if (!validation.valid) {
        console.warn("Chunk validation warnings:", validation.errors);
      }
      
      setChunks(allChunks);
      
      // Stage 6: Generate Embeddings
      await updateProcessingStage("embeddings", "processing", 70);
      allChunks = await DocumentProcessor.generateEmbeddings(allChunks);
      await updateProcessingStage("embeddings", "completed", 100);
      
      // Stage 7: Database Storage
      await updateProcessingStage("database", "processing", 90);
      await SupabaseVectorDB.storeMetadata(documentMetadata as ProcessorMetadata);
      await SupabaseVectorDB.storeChunks(allChunks);
      await updateProcessingStage("database", "completed", 100);
      
      toast.success("Document processed and stored successfully!");
      setActiveTab("results");
      
    } catch (error) {
      toast.error("Error processing document");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateProcessingStage = async (stageId: string, status: ProcessingStage['status'], progress: number) => {
    setProcessingStages(prev => prev.map(stage => 
      stage.id === stageId ? { ...stage, status, progress } : stage
    ));
    await new Promise(resolve => setTimeout(resolve, 500)); // Visual delay
  };



  const getStageIcon = (status: ProcessingStage['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'processing': return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Document Ingestion</h2>
          <p className="text-muted-foreground">
            Process regulatory documents into structured vector database
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Database className="h-3 w-3" />
          Vector Database Ready
        </Badge>
      </div>

      {/* Processing Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">Document Upload</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Regulation Document
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {selectedFile ? selectedFile.name : "Drop your regulation document here"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  Supports TXT and MD files up to 10MB
                </p>
                <Button variant="outline">
                  Choose File
                </Button>
                <input
                  id="file-input"
                  type="file"
                  accept=".txt,.md"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>
              
              {selectedFile && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Text extracted
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={processDocument} 
                      disabled={isProcessing}
                      className="flex items-center gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      Process Document
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {extractedText && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Extracted Text Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={extractedText.substring(0, 500) + (extractedText.length > 500 ? "..." : "")}
                  readOnly
                  className="min-h-32 font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Showing first 500 characters of {extractedText.length} total characters
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Jenis Peraturan</label>
                  <Input
                    value={documentMetadata.jenis || ""}
                    onChange={(e) => setDocumentMetadata(prev => ({ ...prev, jenis: e.target.value }))}
                    placeholder="e.g., PERATURAN PRESIDEN"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Instansi</label>
                  <Input
                    value={documentMetadata.instansi || ""}
                    onChange={(e) => setDocumentMetadata(prev => ({ ...prev, instansi: e.target.value }))}
                    placeholder="e.g., PRESIDEN REPUBLIK INDONESIA"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Nomor</label>
                  <Input
                    value={documentMetadata.nomor}
                    onChange={(e) => setDocumentMetadata(prev => ({ ...prev, nomor: e.target.value }))}
                    placeholder="e.g., 123 TAHUN 2024"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tahun</label>
                  <Input
                    value={documentMetadata.tahun}
                    onChange={(e) => setDocumentMetadata(prev => ({ ...prev, tahun: e.target.value }))}
                    placeholder="e.g., 2024"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Judul Lengkap</label>
                <Input
                  value={documentMetadata.judul}
                  onChange={(e) => setDocumentMetadata(prev => ({ ...prev, judul: e.target.value }))}
                  placeholder="Full regulation title"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Tentang</label>
                <Input
                  value={documentMetadata.tentang}
                  onChange={(e) => setDocumentMetadata(prev => ({ ...prev, tentang: e.target.value }))}
                  placeholder="Subject matter of the regulation"
                />
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium">Menimbang</label>
                <Textarea
                  value={documentMetadata.menimbang}
                  onChange={(e) => setDocumentMetadata(prev => ({ ...prev, menimbang: e.target.value }))}
                  placeholder="Consideration section"
                  className="min-h-20"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Mengingat</label>
                <Textarea
                  value={documentMetadata.mengingat}
                  onChange={(e) => setDocumentMetadata(prev => ({ ...prev, mengingat: e.target.value }))}
                  placeholder="Reference section"
                  className="min-h-20"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Processing Tab */}
        <TabsContent value="processing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Processing Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {processingStages.map((stage, index) => (
                  <div key={stage.id} className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {getStageIcon(stage.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{stage.name}</h3>
                        <span className="text-sm text-muted-foreground">
                          {stage.progress}%
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {stage.description}
                      </p>
                      <Progress value={stage.progress} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Layers className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{chunks.filter(c => c.level === 1).length}</p>
                    <p className="text-sm text-muted-foreground">Level 1 Chunks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Layers className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{chunks.filter(c => c.level === 2).length}</p>
                    <p className="text-sm text-muted-foreground">BAB Chunks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Layers className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold">{chunks.filter(c => c.level === 3).length}</p>
                    <p className="text-sm text-muted-foreground">Pasal Chunks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Generated Chunks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {chunks.map((chunk, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          chunk.level === 1 ? "default" : 
                          chunk.level === 2 ? "secondary" : "outline"
                        }>
                          Level {chunk.level} - {chunk.type.toUpperCase()}
                        </Badge>
                        {chunk.title && (
                          <span className="font-medium">{chunk.title}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {chunk.content.substring(0, 200)}
                      {chunk.content.length > 200 && "..."}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
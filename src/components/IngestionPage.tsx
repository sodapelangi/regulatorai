import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Alert, AlertDescription } from "./ui/alert";
import { Separator } from "./ui/separator";
import { 
  Upload, 
  FileText, 
  Database, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Zap,
  Eye,
  Download,
  Trash2
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { DocumentProcessor, SupabaseVectorDB, DocumentChunk, DocumentMetadata as ProcessorMetadata } from "../utils/documentProcessor";

interface ProcessingStage {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  description: string;
}

interface DocumentMetadata {
  judul: string;
  nomor: string;
  tahun: string;
  tentang: string;
  menimbang: string;
  mengingat: string;
  mencabut?: string;
  diubah?: string;
  jenis?: string;
  instansi?: string;
}

export function IngestionPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [documentMetadata, setDocumentMetadata] = useState<DocumentMetadata>({
    judul: "",
    nomor: "",
    tahun: "",
    tentang: "",
    menimbang: "",
    mengingat: "",
    mencabut: "",
    diubah: "",
    jenis: "",
    instansi: ""
  });
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [processingStages, setProcessingStages] = useState<ProcessingStage[]>([
    {
      id: "extract",
      name: "Text Extraction",
      status: "pending",
      progress: 0,
      description: "Extracting text from uploaded document"
    },
    {
      id: "metadata",
      name: "Metadata Analysis",
      status: "pending", 
      progress: 0,
      description: "Parsing document metadata and headers"
    },
    {
      id: "chunk-level1",
      name: "Level 1 Chunking",
      status: "pending",
      progress: 0,
      description: "Creating metadata chunks"
    },
    {
      id: "chunk-level2", 
      name: "Level 2 Chunking",
      status: "pending",
      progress: 0,
      description: "Creating BAB (chapter) chunks"
    },
    {
      id: "chunk-level3",
      name: "Level 3 Chunking", 
      status: "pending",
      progress: 0,
      description: "Creating Pasal (article) chunks"
    },
    {
      id: "embeddings",
      name: "Generate Embeddings",
      status: "pending",
      progress: 0,
      description: "Creating vector embeddings for search"
    },
    {
      id: "database",
      name: "Database Storage",
      status: "pending",
      progress: 0,
      description: "Storing in Supabase vector database"
    }
  ]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.match(/\.(txt|md)$/i)) {
      toast.error("Please select a TXT or MD file");
      return;
    }
    
    setSelectedFile(file);
    extractTextFromFile(file);
  }, []);

  const extractTextFromFile = async (file: File) => {
    const text = await file.text();
    setExtractedText(text);
    
    // Auto-parse metadata from document
    parseDocumentMetadata(text);
    
    toast.success("Document text extracted successfully");
  };

  const parseDocumentMetadata = (text: string) => {
    const extractedMetadata = DocumentProcessor.extractMetadata(text);
    setDocumentMetadata(prev => ({ 
      ...prev, 
      ...extractedMetadata,
      judul: extractedMetadata.judul || prev.judul,
      nomor: extractedMetadata.nomor || prev.nomor,
      tahun: extractedMetadata.tahun || prev.tahun,
      tentang: extractedMetadata.tentang || prev.tentang,
      menimbang: extractedMetadata.menimbang || prev.menimbang,
      mengingat: extractedMetadata.mengingat || prev.mengingat,
      jenis: extractedMetadata.jenis || prev.jenis,
      instansi: extractedMetadata.instansi || prev.instansi
    }));
  };

  const processDocument = async () => {
    if (!selectedFile || !extractedText) {
      toast.error("Please select and extract a document first");
      return;
    }

    setIsProcessing(true);
    setActiveTab("processing");

    try {
      // Stage 1: Text Extraction (already done)
      await updateProcessingStage("extract", "completed", 100);
      
      // Stage 2: Metadata Analysis
      await updateProcessingStage("metadata", "processing", 50);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
      await updateProcessingStage("metadata", "completed", 100);
      
      // Stage 3: Level 1 Chunking (Metadata)
      await updateProcessingStage("chunk-level1", "processing", 30);
      const level1Chunks = DocumentProcessor.createLevel1Chunks(documentMetadata as ProcessorMetadata);
      await updateProcessingStage("chunk-level1", "completed", 100);
      
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
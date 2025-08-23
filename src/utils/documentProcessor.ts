export interface DocumentChunk {
  id: string;
  level: 1 | 2 | 3;
  type: 'metadata' | 'bab' | 'pasal';
  content: string;
  title?: string;
  number?: string;
  parentChunk?: string;
  embedding?: number[];
  metadata: {
    wordCount: number;
    characterCount: number;
    language: string;
    extractedAt: string;
  };
}

export interface DocumentMetadata {
  judul: string;
  nomor: string;
  tahun: string;
  tentang: string;
  menimbang: string;
  mengingat: string;
  mencabut?: string;
  diubah?: string;
  jenis: string;
  instansi: string;
  tanggalPenetapan?: string;
  tanggalPengundangan?: string;
  sumber?: string;
}

export class DocumentProcessor {
  static extractMetadata(text: string): Partial<DocumentMetadata> {
    const lines = text.split('\n').map(line => line.trim());
    const metadata: Partial<DocumentMetadata> = {};
    
    // Find title patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Extract regulation type and title
      if (line.match(/^(PERATURAN|UNDANG-UNDANG|KEPUTUSAN|INSTRUKSI|SURAT EDARAN)/i)) {
        metadata.jenis = line.split(' ')[0];
        metadata.judul = line;
        
        // Look for institution in next lines
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (nextLine.match(/(PRESIDEN|MENTERI|DIREKTUR|KEPALA|GUBERNUR|BUPATI|WALIKOTA)/i)) {
            metadata.instansi = nextLine;
          }
        }
      }
      
      // Extract number
      const nomorMatch = line.match(/NOMOR\s*:?\s*([A-Z0-9\/\-\s]+)/i);
      if (nomorMatch) {
        metadata.nomor = nomorMatch[1].trim();
      }
      
      // Extract year
      const tahunMatch = line.match(/TAHUN\s+(\d{4})/i);
      if (tahunMatch) {
        metadata.tahun = tahunMatch[1];
      }
      
      // Extract subject
      if (line.match(/^TENTANG/i)) {
        metadata.tentang = line.replace(/^TENTANG\s*/i, '');
      }
      
      // Extract considerations
      if (line.match(/^MENIMBANG/i)) {
        let considerationText = '';
        for (let j = i; j < lines.length && !lines[j].match(/^MENGINGAT/i); j++) {
          considerationText += lines[j] + ' ';
        }
        metadata.menimbang = considerationText.trim();
      }
      
      // Extract references
      if (line.match(/^MENGINGAT/i)) {
        let referenceText = '';
        for (let j = i; j < lines.length && !lines[j].match(/^(MEMUTUSKAN|MENETAPKAN)/i); j++) {
          referenceText += lines[j] + ' ';
        }
        metadata.mengingat = referenceText.trim();
      }
    }
    
    return metadata;
  }

  static createLevel1Chunks(metadata: DocumentMetadata): DocumentChunk[] {
    const timestamp = new Date().toISOString();
    
    return [{
      id: `metadata-${Date.now()}`,
      level: 1,
      type: 'metadata',
      content: JSON.stringify(metadata, null, 2),
      title: "Document Metadata",
      metadata: {
        wordCount: JSON.stringify(metadata).split(' ').length,
        characterCount: JSON.stringify(metadata).length,
        language: 'id',
        extractedAt: timestamp
      }
    }];
  }

  static createLevel2Chunks(text: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const timestamp = new Date().toISOString();
    
    // Split by BAB (chapters)
    const babPattern = /(?=BAB\s+([IVX]+|[0-9]+)\s*\n)/gi;
    const sections = text.split(babPattern).filter(section => section.trim().length > 0);
    
    sections.forEach((section, index) => {
      const babMatch = section.match(/BAB\s+([IVX]+|[0-9]+)\s*\n([^\n]+)/i);
      if (babMatch) {
        const babNumber = babMatch[1];
        const babTitle = babMatch[2]?.trim() || '';
        
        chunks.push({
          id: `bab-${babNumber}-${Date.now()}-${index}`,
          level: 2,
          type: 'bab',
          content: section.trim(),
          title: `BAB ${babNumber}`,
          number: babNumber,
          metadata: {
            wordCount: section.trim().split(' ').length,
            characterCount: section.trim().length,
            language: 'id',
            extractedAt: timestamp
          }
        });
      }
    });
    
    return chunks;
  }

  static createLevel3Chunks(text: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const timestamp = new Date().toISOString();
    
    // Split by Pasal (articles)
    const pasalPattern = /(?=Pasal\s+(\d+))/gi;
    const sections = text.split(pasalPattern).filter(section => section.trim().length > 0);
    
    for (let i = 0; i < sections.length; i += 2) {
      const pasalNumber = sections[i];
      const pasalContent = sections[i + 1];
      
      if (pasalNumber && pasalContent && pasalNumber.match(/^\d+$/)) {
        // Extract the full article including all ayat, huruf, etc.
        let fullContent = `Pasal ${pasalNumber}\n${pasalContent}`;
        
        // Look for explanations (penjelasan) that belong to this pasal
        const explanationMatch = pasalContent.match(/Penjelasan Pasal \d+.*?(?=Pasal|\n\n|$)/is);
        if (explanationMatch) {
          fullContent += '\n\nPenjelasan:\n' + explanationMatch[0];
        }
        
        chunks.push({
          id: `pasal-${pasalNumber}-${Date.now()}`,
          level: 3,
          type: 'pasal',
          content: fullContent.trim(),
          title: `Pasal ${pasalNumber}`,
          number: pasalNumber,
          metadata: {
            wordCount: fullContent.trim().split(' ').length,
            characterCount: fullContent.trim().length,
            language: 'id',
            extractedAt: timestamp
          }
        });
      }
    }
    
    return chunks;
  }

  static async generateEmbeddings(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    // Simulate embedding generation
    return chunks.map(chunk => ({
      ...chunk,
      embedding: Array.from({ length: 1536 }, () => Math.random() - 0.5) // OpenAI embedding dimension
    }));
  }

  static validateChunks(chunks: DocumentChunk[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for required fields
    chunks.forEach((chunk, index) => {
      if (!chunk.id) errors.push(`Chunk ${index}: Missing ID`);
      if (!chunk.content?.trim()) errors.push(`Chunk ${index}: Empty content`);
      if (!chunk.level || ![1, 2, 3].includes(chunk.level)) {
        errors.push(`Chunk ${index}: Invalid level`);
      }
      if (!chunk.metadata) errors.push(`Chunk ${index}: Missing metadata`);
    });
    
    // Check for duplicate IDs
    const ids = chunks.map(c => c.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate chunk IDs: ${duplicateIds.join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Mock Supabase integration functions
export class SupabaseVectorDB {
  static async storeMetadata(metadata: DocumentMetadata): Promise<{ success: boolean; id?: string }> {
    // Simulate database storage
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      id: `doc_${Date.now()}`
    };
  }

  static async storeChunks(chunks: DocumentChunk[]): Promise<{ success: boolean; storedCount: number }> {
    // Simulate vector database storage
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      storedCount: chunks.length
    };
  }

  static async searchSimilar(query: string, limit: number = 10): Promise<DocumentChunk[]> {
    // Simulate vector similarity search
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Return mock results
    return [];
  }
}
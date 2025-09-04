import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

const AVAILABLE_SECTORS = [
  "Technology, Media and Telecommunications",
  "Manufacturing & Industry",
  "Pharmaceuticals, Health Industry, and Food & Drug Standards",
  "Natural Resources",
  "Banking",
  "Capital Market",
  "Employment",
  "Energy",
  "Environment",
  "General Corporate",
  "General Financial Services",
  "Infrastructure and Construction Services",
  "Land and Property",
  "Miscellaneous",
  "Monetary and Payment System",
  "Non-Banking Financial Services",
  "Professions",
  "Tax and Non-Tax Charges",
  "Trade",
  "Transportation and Logistics Services"
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    const { regulation_id } = await req.json();
    
    if (!regulation_id) {
      throw new Error('Missing required parameter: regulation_id');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch regulation data
    const { data: regulation, error: fetchError } = await supabase
      .from('regulations')
      .select('*')
      .eq('id', regulation_id)
      .single();

    if (fetchError || !regulation) {
      throw new Error(`Failed to fetch regulation: ${fetchError?.message}`);
    }

    console.log(`Analyzing regulation: ${regulation.judul_lengkap}`);

    // Extract complete metadata from full_text
    const extractedMetadata = extractCompleteMetadata(regulation.full_text || '');
    
    // Check if old regulation exists
    const oldRegulationInfo = await findOldRegulation(regulation, supabase);
    
    // Generate AI analysis
    const analysis = await generateAIAnalysis(regulation, oldRegulationInfo);
    const sectorImpacts = await generateSectorImpacts(regulation);

    // Store analysis results with complete metadata
    const updateData = {
      ai_analysis: analysis,
      sector_impacts: sectorImpacts,
      ai_checklist: analysis.action_checklist || [],
      analysis_confidence: analysis.overall_confidence,
      last_analyzed_at: new Date().toISOString(),
      // Add the missing metadata fields
      tanggal_penetapan: extractedMetadata.tanggal_penetapan || regulation.tanggal_penetapan,
      tempat_penetapan: extractedMetadata.tempat_penetapan || regulation.tempat_penetapan,
      tanggal_pengundangan: extractedMetadata.tanggal_pengundangan || regulation.tanggal_pengundangan,
      // Store complete extracted metadata as JSON
      meta_data: {
        ...extractedMetadata,
        extraction_timestamp: new Date().toISOString(),
        source: 'ai_analysis'
      }
    };

    const { error: updateError } = await supabase
      .from('regulations')
      .update(updateData)
      .eq('id', regulation_id);

    if (updateError) {
      throw new Error(`Failed to store analysis: ${updateError.message}`);
    }

    console.log(`Successfully analyzed regulation ${regulation_id}`);

    return new Response(JSON.stringify({
      success: true,
      regulation_id,
      analysis,
      sector_impacts: sectorImpacts,
      confidence: analysis.overall_confidence,
      extracted_metadata: extractedMetadata
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});

// NEW FUNCTION: Extract complete metadata from document text
function extractCompleteMetadata(text) {
  const metadata = {};

  // Helper function to safely parse dates into ISO format
  function toIsoDate(value) {
    // Accept numbers (e.g. 2) or strings (e.g. "2", "2025-09-04")
    if (typeof value === "number") {
      // If it's just a number, return null (can't determine valid date)
      return null;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      
      // If it's already a full ISO date, keep it
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

      // If it's just a number like "2", return null
      if (/^\d+$/.test(trimmed)) {
        return null;
      }

      // Indonesian month mapping
      const monthMap = {
        'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
        'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
        'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
      };
      
      // Try to parse Indonesian date format: "2 Januari 2025"
      const indonesianDateMatch = trimmed.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);
      if (indonesianDateMatch) {
        const [, day, monthName, year] = indonesianDateMatch;
        const month = monthMap[monthName.toLowerCase()];
        if (month) {
          const paddedDay = day.padStart(2, '0');
          return `${year}-${month}-${paddedDay}`;
        }
      }
      
      // Fallback: let Date constructor try (covers "2025/09/04")
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    }

    return null; // unable to parse
  }

  // Extract tanggal_penetapan and tempat_penetapan
  const signingMatch = text.match(
    /Ditetapkan di\s+(.+?)\s+pada tanggal\s+(.+?)\s+(.+?),?\s*ttd\s+(.+?)(?=\n|$)/i
  );
  
  if (signingMatch) {
    metadata.tempat_penetapan = signingMatch[1].trim();
    metadata.tanggal_penetapan = toIsoDate(signingMatch[2].trim());
    metadata.jabatan_penandatangan = signingMatch[3].trim();
    metadata.nama_penandatangan = signingMatch[4].trim();
  }

  // Extract tanggal_pengundangan
  const pengundanganMatch = text.match(
    /Diundangkan di\s+(.+?)\s+pada tanggal\s+(.+?)/i
  );
  
  if (pengundanganMatch) {
    metadata.tanggal_pengundangan = toIsoDate(pengundanganMatch[2].trim());
    metadata.tempat_pengundangan = pengundanganMatch[1].trim();
  }

  // Extract other useful metadata
  const nomorMatch = text.match(/NOMOR\s+(\d+\s+TAHUN\s+\d{4})/i);
  if (nomorMatch) {
    metadata.nomor = nomorMatch[1].trim();
  }

  const tahunMatch = text.match(/TAHUN\s+(\d{4})/i);
  if (tahunMatch) {
    metadata.tahun = tahunMatch[1].trim();
  }

  return metadata;
}

async function findOldRegulation(regulation, supabase) {
  try {
    // Look for revocation patterns
    const revocationPatterns = [
      /perlu dilakukan perubahan/i,
      /dicabut dan dinyatakan tidak berlaku/i,
      /mengubah.*peraturan/i,
      /mencabut.*peraturan/i
    ];

    const hasRevocation = revocationPatterns.some(pattern => 
      pattern.test(regulation.menimbang || '') || 
      pattern.test(regulation.full_text || '')
    );

    if (!hasRevocation) {
      return null;
    }

    // Extract regulation numbers from text
    const numberPattern = /(?:peraturan|undang-undang).*?nomor\s*(\d+)\s*tahun\s*(\d{4})/gi;
    const matches = [...(regulation.menimbang || '').matchAll(numberPattern)];

    if (matches.length > 0) {
      const [, number, year] = matches[0];
      
      // Try to find the old regulation in database
      const { data: oldRegulation } = await supabase
        .from('regulations')
        .select('*')
        .eq('nomor', number)
        .eq('tahun', parseInt(year))
        .single();

      return oldRegulation;
    }

    return null;
  } catch (error) {
    console.warn('Error finding old regulation:', error);
    return null;
  }
}

function parseAIAnalysis(analysisText, hasOldRegulation) {
  try {
    const sections = {
      background: '',
      key_points: [],
      old_new_comparison: [],
      business_impact: '',
      action_checklist: [],
      overall_confidence: 0.8
    };

    // Extract Background section
    const backgroundMatch = analysisText.match(/### 1\. Background\s*\n(.*?)(?=###|$)/s);
    if (backgroundMatch) {
      sections.background = backgroundMatch[1].trim();
    }

    // Extract Key Points section
    const keyPointsMatch = analysisText.match(/### 2\. Key Points\s*\n(.*?)(?=###|$)/s);
    if (keyPointsMatch) {
      const keyPointsText = keyPointsMatch[1];
      const bulletPoints = keyPointsText.split(/\n[-•]\s*/).filter(point => point.trim());
      
      sections.key_points = bulletPoints.map((point, index) => {
        const articleMatch = point.match(/\(Art\.\s*(\d+[a-z]*)\)/i);
        return {
          title: `Key Point ${index + 1}`,
          description: point.trim(),
          article: articleMatch ? `Art. ${articleMatch[1]}` : `Art. ${index + 1}`
        };
      });
    }

    // Extract Old vs New Comparison (only if old regulation exists)
    if (hasOldRegulation) {
      const comparisonMatch = analysisText.match(/### 3\. Old vs New Comparison\s*\n(.*?)(?=###|$)/s);
      if (comparisonMatch) {
        const comparisonText = comparisonMatch[1];
        // Parse table format or bullet points
        const rows = comparisonText.split('\n').filter(row => row.includes('|') || row.includes('Art.'));
        
        sections.old_new_comparison = rows.map((row, index) => {
          const parts = row.split('|').map(part => part.trim());
          return {
            article: `Art. ${index + 1}`,
            old_text: parts[1] || 'Previous version not available',
            new_text: parts[2] || 'Current version not available'
          };
        });
      }
    }

    // Extract Business Impact section
    const businessMatch = analysisText.match(/### 4\. Why It Matters for Business\s*\n(.*?)(?=###|$)/s);
    if (businessMatch) {
      sections.business_impact = businessMatch[1].trim();
    }

    // Extract Action Checklist
    const checklistMatch = analysisText.match(/### 6\. Recommended Action Checklist\s*\n(.*?)(?=###|$)/s);
    if (checklistMatch) {
      const checklistText = checklistMatch[1];
      const items = checklistText.split(/\n□\s*/).filter(item => item.trim());
      
      sections.action_checklist = items.map((item, index) => {
        const articleMatch = item.match(/\(Art\.\s*(\d+[a-z]*)\)/i);
        return {
          id: `ai_${Date.now()}_${index}`,
          task: item.trim(),
          article_reference: articleMatch ? `Art. ${articleMatch[1]}` : undefined
        };
      });
    }

    // Extract confidence level
    const confidenceMatch = analysisText.match(/(\d+)%\s*confidence/i);
    if (confidenceMatch) {
      sections.overall_confidence = parseInt(confidenceMatch[1]) / 100;
    }

    return sections;
  } catch (error) {
    console.error('Error parsing AI analysis:', error);
    return {
      background: 'Analysis parsing failed',
      key_points: [],
      old_new_comparison: [],
      business_impact: 'Business impact analysis unavailable',
      action_checklist: [],
      overall_confidence: 0.5
    };
  }
}

function parseSectorImpacts(impactText) {
  try {
    const sectors = [];
    const lines = impactText.split('\n').filter(line => line.trim());
    
    let currentSector = null;
    
    for (const line of lines) {
      if (line.startsWith('Sector:')) {
        if (currentSector) {
          sectors.push(currentSector);
        }
        currentSector = {
          sector: line.replace('Sector:', '').trim(),
          importance: 'medium',
          confidence: 0.8,
          rationale: ''
        };
      } else if (line.startsWith('Impact Level:') && currentSector) {
        currentSector.importance = line.replace('Impact Level:', '').trim().toLowerCase();
      } else if (line.startsWith('Rationale:') && currentSector) {
        currentSector.rationale = line.replace('Rationale:', '').trim();
      } else if (line.startsWith('Confidence:') && currentSector) {
        const confidenceStr = line.replace('Confidence:', '').trim();
        currentSector.confidence = parseFloat(confidenceStr) || 0.8;
      }
    }
    
    if (currentSector) {
      sectors.push(currentSector);
    }
    
    return sectors.length > 0 ? sectors : [{
      sector: 'General Corporate',
      importance: 'medium',
      confidence: 0.5,
      rationale: 'Default classification due to parsing error'
    }];
  } catch (error) {
    console.error('Error parsing sector impacts:', error);
    return [{
      sector: 'General Corporate',
      importance: 'medium',
      confidence: 0.5,
      rationale: 'Default classification due to parsing error'
    }];
  }
}

async function generateAIAnalysis(regulation, oldRegulation) {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    throw new Error('Gemini API key not configured');
  }

  const prompt = createAnalysisPrompt(regulation, oldRegulation);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 4000,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      console.error('Invalid Gemini response structure:', result);
      throw new Error('Invalid response structure from Gemini API');
    }

    const analysisText = result.candidates[0].content.parts[0].text;
    console.log('Raw analysis text:', analysisText.substring(0, 500) + '...');

    // Parse the structured response
    return parseAIAnalysis(analysisText, oldRegulation !== null);
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

async function generateSectorImpacts(regulation) {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    throw new Error('Gemini API key not configured');
  }

  const prompt = createSectorImpactPrompt(regulation);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 1500,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Sector impact API error:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      console.error('Invalid sector impact response:', result);
      throw new Error('Invalid response structure from Gemini API');
    }

    const impactText = result.candidates[0].content.parts[0].text;
    console.log('Raw sector impact text:', impactText);

    return parseSectorImpacts(impactText);
  } catch (error) {
    console.error('Sector impact analysis error:', error);
    throw new Error(`Sector impact analysis failed: ${error.message}`);
  }
}

function createAnalysisPrompt(regulation, oldRegulation) {
  return `# Indonesian Regulatory AI Analysis

You are an AI legal analyst specializing in Indonesian regulatory interpretation. Analyze the provided regulation with absolute neutrality, using factual descriptors and direct legal text references.

## Regulation Data:
**Title**: ${regulation.judul_lengkap}
**Number**: ${regulation.nomor}
**Year**: ${regulation.tahun}
**Subject**: ${regulation.tentang}
**Authority**: ${regulation.instansi}
**Establishment Date**: ${regulation.tanggal_penetapan}

**Menimbang (Whereas)**: ${regulation.menimbang}
**Mengingat (Considering)**: ${regulation.mengingat}

**Full Text**: ${regulation.full_text}

${oldRegulation ? `**Previous Regulation Available**: ${oldRegulation.judul_lengkap} (${oldRegulation.nomor}/${oldRegulation.tahun})` : '**Previous Regulation**: Not available in system'}

## CRITICAL: You MUST provide analysis in the exact format below:

### 1. Background
[2-3 sentences about the regulation background]

### 2. Key Points
[4-6 bullet points of main provisions with article references]

### 3. Old vs New Comparison
${oldRegulation ? '[Create comparison table]' : 'Previous regulation not available in system'}

### 4.  Why It Matters for Business
    **Content**: Focus on practical business implications
    **Style**: Use factual statements about risks, compliance requirements, and operational changes
    **Length**: 4-7 sentences maximum

    **Structure**:
    1. Primary business risk/opportunity
    2. Specific compliance implications  
    3. Financial/operational impact
    4. Timeline considerations (if applicable)

    ### 6. Recommended Action Checklist
    **Requirements**:
    - Generate 5-8 actionable items
    - Mark as "*AI Generated"
    - Use imperative verbs
    - Include specific timeframes where applicable
    - Reference relevant articles

    **Format**:
    \`\`\`
    Recommended Action Checklist *AI Generated

    □ [Action item with specific deadline/reference]
    □ [Action item with specific deadline/reference]
    □ [Action item with specific deadline/reference]
    \`\`\`

    ## Output Requirements

    ### Confidence Level
    State AI confidence percentage in matching requirements and include disclaimer:
    "AI Analysis is provided for guidance only. Always verify regulation interpretations with legal experts."

    ### Legal Referencing Standards
    - Use Indonesian article citation format: (Art. [number])
    - For multiple articles: (Arts. [X]-[Y]) or (Arts. [X], [Y], [Z])
    - Include regulation number and year in first reference
    - Use consistent abbreviation format

    ### Language Guidelines
    - *Absolute neutrality : no personal opinions, promotional language or emotional expressions
    - Avoids aggregated adjective (very important, ground breaking), instead using factual descriptors (maximum fines increased) 
    Prioritized data and direct legal text over narrative commentary
    - **Preferred**: Specific numbers, dates, and measurable changes
    - **Prohibited**: Subjective assessments, comparative superlatives, promotional language

    ## Quality Checklist
    Before finalizing analysis, verify:
    - [ ] All article references are accurate
    - [ ] No promotional or subjective language used
    - [ ] Sector impacts have clear rationales
    - [ ] Action items are specific and actionable
    - [ ] Comparison table shows concrete differences (when applicable)
    - [ ] Business implications are practical and measurable

`;
}

function createSectorImpactPrompt(regulation) {
  return `# Sector Impact Classification

Analyze this Indonesian regulation and identify 4-5 business sectors most impacted.

**Regulation**: ${regulation.judul_lengkap}
**Subject**: ${regulation.tentang}
**Full Text**: ${regulation.full_text}

**Available Sectors**:
${AVAILABLE_SECTORS.map(sector => `- ${sector}`).join('\n')}

**CRITICAL: You MUST respond in this EXACT format:**

Sector: [Exact sector name from list]
Impact Level: [High/Medium/Low]
Rationale: [One sentence with article reference]
Confidence: [0.0-1.0]

Sector: [Another exact sector name from list]
Impact Level: [High/Medium/Low]
Rationale: [One sentence with article reference]
Confidence: [0.0-1.0]

[Continue for 4-5 sectors total]

IMPORTANT: 
- Use ONLY sector names from the provided list
- Follow the exact format above`;
}
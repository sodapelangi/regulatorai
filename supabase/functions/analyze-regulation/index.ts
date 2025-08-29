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

  // Extract tanggal_penetapan and tempat_penetapan
  const signingMatch = text.match(
    /Ditetapkan di\s+(.+?)\s+pada tanggal\s+(.+?)\s+(.+?),?\s*ttd\s+(.+?)(?=\n|$)/i
  );
  
  if (signingMatch) {
    metadata.tempat_penetapan = signingMatch[1].trim();
    metadata.tanggal_penetapan = signingMatch[2].trim();
    metadata.jabatan_penandatangan = signingMatch[3].trim();
    metadata.nama_penandatangan = signingMatch[4].trim();
  }

  // Extract tanggal_pengundangan
  const pengundanganMatch = text.match(
    /Diundangkan di\s+(.+?)\s+pada tanggal\s+(.+?)/i
  );
  
  if (pengundanganMatch) {
    metadata.tanggal_pengundangan = pengundanganMatch[2].trim();
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

### 4. Why It Matters for Business
[3-4 sentences about business implications]

### 5. Action Checklist
□ [Action item 1] *AI Generated
□ [Action item 2] *AI Generated  
□ [Action item 3] *AI Generated
□ [Action item 4] *AI Generated
□ [Action item 5] *AI Generated

**Analysis Confidence**: 85%

IMPORTANT: You MUST include the Action Checklist with at least 5 items in the exact format shown above.`;
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
- Include exactly 4-5 sectors
- Follow the exact format above`;
}

// IMPROVED: Better parsing functions
function parseAIAnalysis(analysisText, hasOldRegulation) {
  console.log('Parsing analysis text:', analysisText.substring(0, 200) + '...');
  
  try {
    return {
      background: extractSection(analysisText, 'Background') || 'Analysis background not available',
      key_points: parseKeyPoints(extractSection(analysisText, 'Key Points') || ''),
      old_new_comparison: hasOldRegulation ? 
        parseComparison(extractSection(analysisText, 'Old vs New Comparison') || '') : 
        null,
      business_impact: extractSection(analysisText, 'Why It Matters for Business') || 
        'Business impact analysis not available',
      action_checklist: parseActionChecklist(extractSection(analysisText, 'Action Checklist') || ''),
      overall_confidence: extractConfidence(analysisText) || 0.85
    };
  } catch (error) {
    console.error('Error parsing AI analysis:', error);
    // Return fallback structure
    return {
      background: 'Analysis parsing failed',
      key_points: [],
      old_new_comparison: null,
      business_impact: 'Analysis parsing failed',
      action_checklist: [],
      overall_confidence: 0.5
    };
  }
}

function parseSectorImpacts(impactText) {
  console.log('Parsing sector impacts:', impactText);
  
  const impacts = [];
  const lines = impactText.split('\n').filter(line => line.trim());
  
  let currentImpact = {};
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('Sector:')) {
      // Save previous impact if complete
      if (currentImpact.sector && currentImpact.impact_level) {
        impacts.push({...currentImpact});
      }
      
      // Start new impact
      currentImpact = {
        sector: trimmedLine.replace('Sector:', '').trim()
      };
    } else if (trimmedLine.startsWith('Impact Level:')) {
      currentImpact.impact_level = trimmedLine.replace('Impact Level:', '').trim();
    } else if (trimmedLine.startsWith('Rationale:')) {
      currentImpact.rationale = trimmedLine.replace('Rationale:', '').trim();
    } else if (trimmedLine.startsWith('Confidence:')) {
      currentImpact.confidence = parseFloat(trimmedLine.replace('Confidence:', '').trim()) || 0.8;
    }
  }
  
  // Add the last impact
  if (currentImpact.sector && currentImpact.impact_level) {
    impacts.push(currentImpact);
  }
  
  console.log('Parsed impacts:', impacts);
  return impacts.slice(0, 5); // Ensure max 5 sectors
}

function extractSection(text, sectionName) {
  const regex = new RegExp(`###?\\s*\\d*\\.?\\s*${sectionName}[^#]*?([\\s\\S]*?)(?=###|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function parseKeyPoints(text) {
  if (!text) return [];
  
  const points = text.split(/[-•]\s*/).filter(p => p.trim());
  return points.slice(0, 6).map((point, index) => ({
    title: `Key Point ${index + 1}`,
    description: point.trim(),
    article: extractArticleReference(point) || '',
    confidence: 0.85
  }));
}

function parseComparison(text) {
  return [{
    aspect: 'Main Changes',
    old_text: 'Previous provisions',
    new_text: 'Updated provisions',
    article: 'Various articles'
  }];
}

function parseActionChecklist(text) {
  if (!text) return [];
  
  console.log('Parsing action checklist from:', text);
  
  // Look for checkbox items
  const checkboxPattern = /[□☐]\s*(.+?)(?=\s*[□☐]|\*AI Generated|$)/gs;
  const matches = [...text.matchAll(checkboxPattern)];
  
  const items = matches.map((match, index) => ({
    id: `action_${index + 1}`,
    task: match[1].trim().replace('*AI Generated', '').trim(),
    article_reference: extractArticleReference(match[1]),
    is_ai_generated: true
  }));
  
  console.log('Parsed action items:', items);
  return items.slice(0, 8);
}

function extractArticleReference(text) {
  const match = text.match(/\(Arts?\.\s*[\d\-,\s]+\)/i);
  return match ? match[0] : null;
}

function extractConfidence(text) {
  const match = text.match(/(?:confidence[:\s]*|Analysis Confidence[:\s]*)(\d+(?:\.\d+)?)\s*%/i);
  return match ? parseFloat(match[1]) / 100 : null;
}
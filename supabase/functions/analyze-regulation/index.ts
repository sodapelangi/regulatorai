import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface RegulationData {
  id: string
  judul_lengkap: string
  nomor: string
  tahun: number
  tentang: string
  menimbang: string
  mengingat: string
  full_text: string
  tanggal_penetapan: string
  instansi: string
  jenis_peraturan: string
}

interface SectorImpact {
  sector: string
  impact_level: 'High' | 'Medium' | 'Low'
  rationale: string
  confidence: number
}

interface AIAnalysis {
  background: string
  key_points: Array<{
    title: string
    description: string
    article: string
    confidence: number
  }>
  old_new_comparison: Array<{
    aspect: string
    old_text: string
    new_text: string
    article: string
  }> | null
  business_impact: string
  action_checklist: Array<{
    id: string
    task: string
    article_reference?: string
    timeline?: string
    is_ai_generated: boolean
  }>
  overall_confidence: number
}

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
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { regulation_id } = await req.json()

    if (!regulation_id) {
      throw new Error('Missing required parameter: regulation_id')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch regulation data
    const { data: regulation, error: fetchError } = await supabase
      .from('regulations')
      .select('*')
      .eq('id', regulation_id)
      .single()

    if (fetchError || !regulation) {
      throw new Error(`Failed to fetch regulation: ${fetchError?.message}`)
    }

    console.log(`Analyzing regulation: ${regulation.judul_lengkap}`)

    // Check if old regulation exists (look for revocation patterns)
    const oldRegulationInfo = await findOldRegulation(regulation, supabase)

    // Generate AI analysis
    const analysis = await generateAIAnalysis(regulation, oldRegulationInfo)
    const sectorImpacts = await generateSectorImpacts(regulation)

    // Store analysis results
    const { error: updateError } = await supabase
      .from('regulations')
      .update({
        ai_analysis: analysis,
        sector_impacts: sectorImpacts,
        analysis_confidence: analysis.overall_confidence,
        last_analyzed_at: new Date().toISOString()
      })
      .eq('id', regulation_id)

    if (updateError) {
      throw new Error(`Failed to store analysis: ${updateError.message}`)
    }

    console.log(`Successfully analyzed regulation ${regulation_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        regulation_id,
        analysis,
        sector_impacts: sectorImpacts,
        confidence: analysis.overall_confidence
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Analysis error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function findOldRegulation(regulation: RegulationData, supabase: any) {
  try {
    // Look for revocation patterns in menimbang or full_text
    const revocationPatterns = [
      /perlu dilakukan perubahan/i,
      /dicabut dan dinyatakan tidak berlaku/i,
      /mengubah.*peraturan/i,
      /mencabut.*peraturan/i
    ]

    const hasRevocation = revocationPatterns.some(pattern => 
      pattern.test(regulation.menimbang || '') || 
      pattern.test(regulation.full_text || '')
    )

    if (!hasRevocation) {
      return null
    }

    // Extract regulation numbers from text
    const numberPattern = /(?:peraturan|undang-undang).*?nomor\s*(\d+)\s*tahun\s*(\d{4})/gi
    const matches = [...(regulation.menimbang || '').matchAll(numberPattern)]

    if (matches.length > 0) {
      const [, number, year] = matches[0]
      
      // Try to find the old regulation in database
      const { data: oldRegulation } = await supabase
        .from('regulations')
        .select('*')
        .eq('nomor', number)
        .eq('tahun', parseInt(year))
        .single()

      return oldRegulation
    }

    return null
  } catch (error) {
    console.warn('Error finding old regulation:', error)
    return null
  }
}

async function generateAIAnalysis(regulation: RegulationData, oldRegulation: any): Promise<AIAnalysis> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiApiKey) {
    throw new Error('Gemini API key not configured')
  }

  const prompt = createAnalysisPrompt(regulation, oldRegulation)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const result = await response.json()
    const analysisText = result.candidates[0].content.parts[0].text

    // Parse the structured response
    return parseAIAnalysis(analysisText, oldRegulation !== null)

  } catch (error) {
    console.error('Gemini API error:', error)
    throw new Error(`AI analysis failed: ${error.message}`)
  }
}

async function generateSectorImpacts(regulation: RegulationData): Promise<SectorImpact[]> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiApiKey) {
    throw new Error('Gemini API key not configured')
  }

  const prompt = createSectorImpactPrompt(regulation)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const result = await response.json()
    const impactText = result.candidates[0].content.parts[0].text

    return parseSectorImpacts(impactText)

  } catch (error) {
    console.error('Sector impact analysis error:', error)
    throw new Error(`Sector impact analysis failed: ${error.message}`)
  }
}

function createAnalysisPrompt(regulation: RegulationData, oldRegulation: any): string {
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

## Required Analysis Structure:

### 1. Background (2-3 sentences maximum)
Summarize the "mengingat" and "menimbang" clauses using this template:
"The Government previously enacted [Previous Regulation] on [Subject], which [brief description]. In order to [stated objective], [Authority] issued [New Regulation] on [Subject], effective [date]. This regulation [action taken] [number] existing frameworks."

### 2. Key Points (4-6 points)
Extract main provisions using format:
"[Title] - [Specific requirement]. (Art. [X])"

### 3. Old vs New Comparison
${oldRegulation ? 'Create side-by-side comparison table showing specific changes' : 'Display: "Previous regulation not available in system"'}

### 4. Why It Matters for Business (3-4 sentences)
Focus on practical implications: risks, compliance requirements, financial impact, timeline.

### 5. Action Checklist (5-8 items)
Generate actionable items with format:
"□ [Action with timeline/reference] *AI Generated"

Provide your analysis confidence percentage and include disclaimer: "AI Analysis is provided for guidance only. Always verify regulation interpretations with legal experts."

Use Indonesian article citation format: (Art. [number]) or (Arts. [X]-[Y])
Avoid promotional language. Use specific numbers and measurable changes only.`
}

function createSectorImpactPrompt(regulation: RegulationData): string {
  return `# Sector Impact Classification

Analyze this Indonesian regulation and identify 4-5 business sectors most impacted.

**Regulation**: ${regulation.judul_lengkap}
**Subject**: ${regulation.tentang}
**Full Text**: ${regulation.full_text}

**Available Sectors**:
${AVAILABLE_SECTORS.map(sector => `- ${sector}`).join('\n')}

**Impact Rating Criteria**:
- **High**: Revokes existing law with penalties involved
- **Medium**: Changes definitions/requirements but not core provisions  
- **Low**: Administrative updates only

**Required Output Format**:
For each of 4-5 sectors, provide:
Sector: [Exact sector name from list]
Impact Level: [High/Medium/Low]
Rationale: [One sentence with article reference]
Confidence: [0.0-1.0]

Select only from the available sectors list. Provide factual rationales with specific article references.`
}

function parseAIAnalysis(analysisText: string, hasOldRegulation: boolean): AIAnalysis {
  // This is a simplified parser - in production, you'd want more robust parsing
  const sections = analysisText.split(/###?\s*\d+\.?\s*/);
  
  return {
    background: extractSection(analysisText, 'Background') || 'Analysis background not available',
    key_points: parseKeyPoints(extractSection(analysisText, 'Key Points') || ''),
    old_new_comparison: hasOldRegulation ? parseComparison(extractSection(analysisText, 'Comparison') || '') : null,
    business_impact: extractSection(analysisText, 'Why It Matters') || 'Business impact analysis not available',
    action_checklist: parseActionChecklist(extractSection(analysisText, 'Action Checklist') || ''),
    overall_confidence: extractConfidence(analysisText)
  }
}

function parseSectorImpacts(impactText: string): SectorImpact[] {
  const impacts: SectorImpact[] = []
  const lines = impactText.split('\n')
  
  let currentImpact: Partial<SectorImpact> = {}
  
  for (const line of lines) {
    if (line.startsWith('Sector:')) {
      if (currentImpact.sector) {
        impacts.push(currentImpact as SectorImpact)
      }
      currentImpact = { sector: line.replace('Sector:', '').trim() }
    } else if (line.startsWith('Impact Level:')) {
      currentImpact.impact_level = line.replace('Impact Level:', '').trim() as 'High' | 'Medium' | 'Low'
    } else if (line.startsWith('Rationale:')) {
      currentImpact.rationale = line.replace('Rationale:', '').trim()
    } else if (line.startsWith('Confidence:')) {
      currentImpact.confidence = parseFloat(line.replace('Confidence:', '').trim())
    }
  }
  
  if (currentImpact.sector) {
    impacts.push(currentImpact as SectorImpact)
  }
  
  return impacts.slice(0, 5) // Ensure max 5 sectors
}

function extractSection(text: string, sectionName: string): string | null {
  const regex = new RegExp(`###?\\s*\\d*\\.?\\s*${sectionName}[^#]*?([\\s\\S]*?)(?=###|$)`, 'i')
  const match = text.match(regex)
  return match ? match[1].trim() : null
}

function parseKeyPoints(text: string): AIAnalysis['key_points'] {
  const points = text.split(/[-•]\s*/).filter(p => p.trim())
  return points.slice(0, 6).map((point, index) => ({
    title: `Key Point ${index + 1}`,
    description: point.trim(),
    article: extractArticleReference(point) || '',
    confidence: 0.85
  }))
}

function parseComparison(text: string): AIAnalysis['old_new_comparison'] {
  // Simplified comparison parsing
  return [{
    aspect: 'Main Changes',
    old_text: 'Previous provisions',
    new_text: 'Updated provisions',
    article: 'Various articles'
  }]
}

function parseActionChecklist(text: string): AIAnalysis['action_checklist'] {
  const items = text.split(/[□☐]\s*/).filter(item => item.trim())
  return items.slice(0, 8).map((item, index) => ({
    id: `action_${index + 1}`,
    task: item.trim(),
    article_reference: extractArticleReference(item),
    is_ai_generated: true
  }))
}

function extractArticleReference(text: string): string | null {
  const match = text.match(/\(Arts?\.\s*[\d\-,\s]+\)/i)
  return match ? match[0] : null
}

function extractConfidence(text: string): number {
  const match = text.match(/confidence[:\s]*(\d+(?:\.\d+)?)\s*%/i)
  return match ? parseFloat(match[1]) / 100 : 0.85
}
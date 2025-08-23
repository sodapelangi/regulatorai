export interface Regulation {
  id: string;
  title: string;
  number: string;
  establishedDate: string;
  promulgatedDate: string;
  description: string;
  about: string;
  impactedSectors: Array<{
    sector: string;
    importance: 'low' | 'medium' | 'high';
    aiConfidence: number;
  }>;
  location: string;
  status: 'active' | 'draft' | 'proposed' | 'revoked';
}

export interface DetailedRegulation extends Regulation {
  fullText: {
    old?: string;
    new: string;
  };
  keyChanges: Array<{
    title: string;
    description: string;
    impact: string;
    oldText: string;
    newText: string;
  }>;
  whyItMatters: string;
  checklist: Array<{
    id: string;
    task: string;
    completed: boolean;
    isAiGenerated?: boolean;
  }>;
  aiAnalysis: {
    confidence: number;
    background: string;
    keyPoints: Array<{
      title: string;
      description: string;
      article: string;
    }>;
    oldNewComparison: Array<{
      article: string;
      oldText: string;
      newText: string;
    }>;
    whyItMattersForBusiness: string;
  };
  background: {
    context: string;
    amend?: string;
    repeal?: string;
  };
  revokedRegulations?: string[];
  inWorkspace: boolean;
  viewedAt?: string;
}

export interface WorkspaceItem {
  regulationId: string;
  addedAt: string;
  priority: 'low' | 'medium' | 'high';
  notes: string;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface DashboardMetrics {
  totalRegulations: number;
  dailyUpdates: number;
  highImpactRegulations: {
    [key: string]: number;
  };
  weeklyTrend: Array<{
    date: string;
    regulations: number;
    highImpact: number;
  }>;
}

// Comprehensive sector list as provided
export const REGULATION_SECTORS = [
  "Technology, Media And Telecomunication",
  "Manufacturing & Industry", 
  "Pharmacies, Health Industry, And Foods & Drugs Standard",
  "Natural Resource",
  "Banking",
  "Capital Market",
  "Employment",
  "Energy",
  "Environment",
  "General Corporate",
  "General Financial Service",
  "Infrastructure and Construction Services",
  "Land And Property",
  "Miscellaneous",
  "Monetary And Payment System",
  "Non-Banking Financial Services",
  "Professions",
  "Tax And Non-Tax Charges",
  "Trade",
  "Transportation And Logistic Service"
];

export const mockRegulations: Regulation[] = [
  {
    id: "1",
    title: "Peraturan Menteri Lingkungan Hidup dan Kehutanan Nomor 14 Tahun 2024",
    number: "No. 14 Tahun 2024",
    establishedDate: "2024-09-19",
    promulgatedDate: "2024-09-19",
    description: "Organization of Supervision and Administrative Sanctions Within the Environmental Sector",
    about: "Organization of Supervision and Administrative Sanctions Within the Environmental Sector",
    impactedSectors: [
      { sector: "Environment", importance: "high", aiConfidence: 0.95 },
      { sector: "Manufacturing & Industry", importance: "high", aiConfidence: 0.89 },
      { sector: "Energy", importance: "medium", aiConfidence: 0.73 },
      { sector: "Natural Resource", importance: "medium", aiConfidence: 0.68 }
    ],
    location: "Pemerintah Pusat",
    status: "active"
  },
  {
    id: "2",
    title: "Peraturan Pemerintah Nomor 28 Tahun 2025",
    number: "No. 28 Tahun 2025",
    establishedDate: "2024-08-08",
    promulgatedDate: "2024-08-14",
    description: "Updated capital adequacy requirements for international banks",
    about: "Capital adequacy requirements for international banks",
    impactedSectors: [
      { sector: "Banking", importance: "high", aiConfidence: 0.98 },
      { sector: "General Financial Service", importance: "high", aiConfidence: 0.92 },
      { sector: "Capital Market", importance: "medium", aiConfidence: 0.78 },
      { sector: "Non-Banking Financial Services", importance: "medium", aiConfidence: 0.72 }
    ],
    location: "Pemerintahan Pusat",
    status: "active"
  },
  {
    id: "3",
    title: "Undang - Undang Nomor 71 Tahun 2024",
    number: "No. 71 Tahun 2024",
    establishedDate: "2024-08-05",
    promulgatedDate: "2024-08-13",
    description: "New standards for integrating renewable energy sources into the national grid",
    about: "Renewable energy integration standards",
    impactedSectors: [
      { sector: "Energy", importance: "high", aiConfidence: 0.92 },
      { sector: "Infrastructure and Construction Services", importance: "high", aiConfidence: 0.88 },
      { sector: "Technology, Media And Telecomunication", importance: "medium", aiConfidence: 0.75 },
      { sector: "General Financial Service", importance: "medium", aiConfidence: 0.67 }
    ],
    location: "Pemerintahan Pusat",
    status: "proposed"
  },
  {
    id: "4",
    title: "Peraturan Daerah Kabupaten Cianjur Nomor 29 Tahun 2025",
    number: "No. 29 Tahun 2025",
    establishedDate: "2024-08-07",
    promulgatedDate: "2024-08-12",
    description: "Guidelines for implementing AI systems in healthcare settings",
    about: "AI implementation in healthcare",
    impactedSectors: [
      { sector: "Pharmacies, Health Industry, And Foods & Drugs Standard", importance: "high", aiConfidence: 0.96 },
      { sector: "Technology, Media And Telecomunication", importance: "high", aiConfidence: 0.89 },
      { sector: "Professions", importance: "medium", aiConfidence: 0.73 },
      { sector: "General Corporate", importance: "low", aiConfidence: 0.58 }
    ],
    location: "Pemerintah Kabupaten Cianjur",
    status: "draft"
  },
  {
    id: "5",
    title: "Undang - Undang Nomor 2 tahun 2025",
    number: "No. 2 Tahun 2025",
    establishedDate: "2024-08-06",
    promulgatedDate: "2024-08-11",
    description: "New regulations for cryptocurrency trading platforms and digital asset custody",
    about: "Cryptocurrency and digital asset regulations",
    impactedSectors: [
      { sector: "Banking", importance: "high", aiConfidence: 0.94 },
      { sector: "Capital Market", importance: "high", aiConfidence: 0.91 },
      { sector: "Technology, Media And Telecomunication", importance: "high", aiConfidence: 0.87 },
      { sector: "Monetary And Payment System", importance: "high", aiConfidence: 0.85 },
      { sector: "Tax And Non-Tax Charges", importance: "medium", aiConfidence: 0.78 }
    ],
    location: "Pemerintahan Pusat",
    status: "proposed"
  },
  {
    id: "6",
    title: "Peraturan Pemerintah Nomor 27 Tahun 2025",
    number: "No. 27 Tahun 2025",
    establishedDate: "2024-08-04",
    promulgatedDate: "2024-08-10",
    description: "Cybersecurity framework for smart grid infrastructure",
    about: "Smart grid cybersecurity framework",
    impactedSectors: [
      { sector: "Energy", importance: "high", aiConfidence: 0.91 },
      { sector: "Technology, Media And Telecomunication", importance: "high", aiConfidence: 0.88 },
      { sector: "Infrastructure and Construction Services", importance: "medium", aiConfidence: 0.72 },
      { sector: "General Corporate", importance: "low", aiConfidence: 0.58 }
    ],
    location: "Pemerintahan Pusat",
    status: "active"
  },
  {
    id: "7",
    title: "Peraturan Menteri Tenaga Kerja Nomor 15 Tahun 2024",
    number: "No. 15 Tahun 2024",
    establishedDate: "2024-07-15",
    promulgatedDate: "2024-07-20",
    description: "New minimum wage standards and employment regulations",
    about: "Employment and wage regulations",
    impactedSectors: [
      { sector: "Employment", importance: "high", aiConfidence: 0.97 },
      { sector: "Manufacturing & Industry", importance: "high", aiConfidence: 0.89 },
      { sector: "General Corporate", importance: "high", aiConfidence: 0.86 },
      { sector: "Trade", importance: "medium", aiConfidence: 0.74 }
    ],
    location: "Pemerintahan Pusat",
    status: "active"
  },
  {
    id: "8",
    title: "Peraturan Pemerintah Nomor 35 Tahun 2024",
    number: "No. 35 Tahun 2024",
    establishedDate: "2024-06-10",
    promulgatedDate: "2024-06-15",
    description: "New regulations for transportation and logistics services",
    about: "Transportation and logistics framework",
    impactedSectors: [
      { sector: "Transportation And Logistic Service", importance: "high", aiConfidence: 0.93 },
      { sector: "Trade", importance: "high", aiConfidence: 0.87 },
      { sector: "Infrastructure and Construction Services", importance: "medium", aiConfidence: 0.75 },
      { sector: "Technology, Media And Telecomunication", importance: "medium", aiConfidence: 0.69 }
    ],
    location: "Pemerintahan Pusat",
    status: "active"
  }
];

export const mockMetrics: DashboardMetrics = {
  totalRegulations: 156,
  dailyUpdates: 12,
  highImpactRegulations: {
    "Banking": 23,
    "Energy": 18,
    "Technology, Media And Telecomunication": 31,
    "Pharmacies, Health Industry, And Foods & Drugs Standard": 14,
    "Manufacturing & Industry": 19,
    "Environment": 16,
    "Employment": 12,
    "Transportation And Logistic Service": 15,
    "Capital Market": 11,
    "General Financial Service": 13,
    "Infrastructure and Construction Services": 10,
    "Natural Resource": 8,
    "Trade": 9,
    "Monetary And Payment System": 7,
    "Tax And Non-Tax Charges": 6,
    "Non-Banking Financial Services": 5,
    "General Corporate": 4,
    "Professions": 3,
    "Land And Property": 2,
    "Miscellaneous": 1
  },
  weeklyTrend: [
    { date: "2024-08-11", regulations: 8, highImpact: 3 },
    { date: "2024-08-12", regulations: 15, highImpact: 7 },
    { date: "2024-08-13", regulations: 12, highImpact: 4 },
    { date: "2024-08-14", regulations: 18, highImpact: 9 },
    { date: "2024-08-15", regulations: 22, highImpact: 12 },
    { date: "2024-08-16", regulations: 16, highImpact: 6 },
    { date: "2024-08-17", regulations: 19, highImpact: 8 }
  ]
};

export const mockDetailedRegulations: DetailedRegulation[] = [
  {
    ...mockRegulations[0],
    fullText: {
      old: "Environmental supervision shall be conducted by designated officers with quarterly reporting requirements.",
      new: "Environmental supervision shall be conducted by designated officers with monthly reporting requirements and enhanced monitoring systems."
    },
    keyChanges: [
      {
        title: "Enhanced monitoring frequency",
        description: "Supervision reporting changed from quarterly to monthly",
        impact: "Increased compliance burden but better environmental oversight",
        oldText: "quarterly reporting requirements",
        newText: "monthly reporting requirements"
      },
      {
        title: "Advanced monitoring systems",
        description: "Introduction of digital monitoring and reporting systems",
        impact: "Technology investment required for compliance",
        oldText: "",
        newText: "and enhanced monitoring systems"
      }
    ],
    whyItMatters: "Environmental compliance now requires more frequent reporting and significant technology upgrades, affecting operational costs and procedures.",
    checklist: [
      { id: "1", task: "Review current environmental monitoring procedures", completed: false, isAiGenerated: true },
      { id: "2", task: "Assess technology upgrade requirements", completed: false, isAiGenerated: true },
      { id: "3", task: "Calculate increased compliance costs", completed: false, isAiGenerated: true },
      { id: "4", task: "Train staff on new reporting requirements", completed: false, isAiGenerated: true },
      { id: "5", task: "Consult with environmental law expert", completed: true, isAiGenerated: false },
      { id: "6", task: "Schedule board meeting for compliance review", completed: false, isAiGenerated: false }
    ],
    aiAnalysis: {
      confidence: 0.95,
      background: "The Government previously enacted Regulation No. 22 of 2021 on Environmental Protection and Management (\"Regulation 22/2021\"), which outlined mechanisms for supervision, enforcement, and sanctions for non-compliance. In order to refine enforcement, the Ministry of Environment and Forestry issued Regulation No. 14 of 2024 on the Organization of Supervision and Administrative Sanctions in the Environmental Sector (\"Regulation 14/2024\"), effective as of 26 September 2024. This new regulation repeals five existing frameworks, including Ministerial Regulation No. 2 of 2013 and several decrees concerning environmental supervision.",
      keyPoints: [
        {
          title: "Authority Reaffirmed",
          description: "Ministers, governors, and mayors remain authorized to oversee compliance and impose sanctions.",
          article: "Art. 77"
        },
        {
          title: "Tiered Supervision System",
          description: "Both online monitoring and on-site inspections are to be conducted periodically.",
          article: "Arts. 4 – 17"
        },
        {
          title: "Enhanced Administrative Sanctions",
          description: "Maximum fines increased from Rp 1 Billion to Rp 10 billion for severe violations.",
          article: "Arts. 33 – 48"
        }
      ],
      oldNewComparison: [
        {
          article: "Article 15",
          oldText: "Environmental supervision shall be conducted quarterly with standard reporting procedures.",
          newText: "Environmental supervision shall be conducted monthly with digital monitoring and enhanced reporting systems."
        },
        {
          article: "Article 33",
          oldText: "Maximum administrative fine shall not exceed Rp 1,000,000,000 (one billion rupiah).",
          newText: "Maximum administrative fine shall not exceed Rp 10,000,000,000 (ten billion rupiah)."
        },
        {
          article: "Article 45",
          oldText: "Permit suspension may be imposed for 30 days maximum.",
          newText: "Permit suspension may be imposed for 90 days maximum with progressive penalties."
        }
      ],
      whyItMattersForBusiness: "Non-compliance now carries higher financial and operational risks, including fines proportional to investment value. Administrative Sanctions include: Written reprimands – For minor violations; must be addressed within 30 days. Government coercion (paksaan pemerintah) – For failure to comply with reprimands. Administrative fines – Imposable up to Rp10 billion per violation; calculated based on investment value or specific obligations. Suspension of permits – For failure to comply with coercion or fines. Revocation of permits – For irreparable or severe environmental damage."
    },
    background: {
      context: "This regulation addresses the increasing need for stricter environmental oversight following numerous environmental violations. The updated requirements aim to enhance environmental protection through more frequent monitoring and stronger penalties.",
      repeal: "Peraturan Menteri Lingkungan Hidup Nomor 02 Tahun 2013 tentang Pedoman Penerapan Sanksi Administratif di Bidang Perlindungan dan Pengelolaan Lingkungan Hidup"
    },
    revokedRegulations: [
      "Peraturan Menteri Lingkungan Hidup Nomor 02 Tahun 2013 tentang Pedoman Penerapan Sanksi Administratif di Bidang Perlindungan dan Pengelolaan Lingkungan Hidup"
    ],
    inWorkspace: false,
    viewedAt: "2024-08-18T10:30:00Z"
  },
  {
    ...mockRegulations[1],
    fullText: {
      old: "Tier 1 banks must maintain a minimum Common Equity Tier 1 (CET1) capital ratio of 4.5% and a total capital ratio of 8%.",
      new: "Tier 1 banks must maintain a minimum Common Equity Tier 1 (CET1) capital ratio of 5.0% and a total capital ratio of 8.5%, with quarterly stress testing requirements."
    },
    keyChanges: [
      {
        title: "CET1 ratio increased",
        description: "Minimum Common Equity Tier 1 capital ratio raised from 4.5% to 5.0%",
        impact: "Requires additional capital reserves and potential funding adjustments",
        oldText: "4.5%",
        newText: "5.0%"
      },
      {
        title: "Total capital ratio increased",
        description: "Total capital ratio requirement raised from 8% to 8.5%",
        impact: "Higher overall capital requirements may affect lending capacity",
        oldText: "8%",
        newText: "8.5%"
      },
      {
        title: "Quarterly stress testing",
        description: "New requirement for quarterly stress testing",
        impact: "Additional operational burden and risk management processes",
        oldText: "",
        newText: "with quarterly stress testing requirements"
      }
    ],
    whyItMatters: "Capital requirement increases will require strategic planning for funding and may impact profitability and lending operations.",
    checklist: [
      { id: "5", task: "Calculate capital gap and funding needs", completed: false, isAiGenerated: true },
      { id: "6", task: "Update risk management framework", completed: false, isAiGenerated: true },
      { id: "7", task: "Implement quarterly stress testing", completed: false, isAiGenerated: true },
      { id: "8", task: "Board presentation on capital strategy", completed: false, isAiGenerated: true }
    ],
    aiAnalysis: {
      confidence: 0.98,
      background: "Following recent global banking instabilities and regulatory reviews, this regulation strengthens capital requirements to ensure financial system resilience. The enhanced stress testing requirements provide early warning mechanisms for potential capital inadequacies and align with international banking standards.",
      keyPoints: [
        {
          title: "Increased Capital Requirements",
          description: "Both CET1 and total capital ratios increased to strengthen bank resilience.",
          article: "Arts. 12-15"
        },
        {
          title: "Quarterly Stress Testing",
          description: "Mandatory stress testing every quarter to assess capital adequacy under adverse scenarios.",
          article: "Arts. 20-25"
        },
        {
          title: "Enhanced Reporting",
          description: "More detailed capital adequacy reporting requirements to regulators.",
          article: "Arts. 30-35"
        }
      ],
      oldNewComparison: [
        {
          article: "Article 12",
          oldText: "Banks must maintain CET1 ratio of minimum 4.5%",
          newText: "Banks must maintain CET1 ratio of minimum 5.0%"
        },
        {
          article: "Article 15",
          oldText: "Total capital ratio requirement is 8%",
          newText: "Total capital ratio requirement is 8.5%"
        },
        {
          article: "Article 25",
          oldText: "Annual stress testing is required",
          newText: "Quarterly stress testing is required with detailed scenario analysis"
        }
      ],
      whyItMattersForBusiness: "Banks must raise additional capital or adjust their business models to meet higher requirements. This affects profitability, lending capacity, and may require strategic changes. Quarterly stress testing adds operational costs but improves risk management. Non-compliance may result in regulatory action including business restrictions."
    },
    background: {
      context: "Following recent global banking instabilities, this regulation strengthens capital requirements to ensure financial system resilience. The enhanced stress testing requirements provide early warning mechanisms for potential capital inadequacies.",
      amend: "Undang - Undang No 27 Tahun 2021",
      repeal: "Peraturan Pemerintah No 30 Tahun 2020"
    },
    inWorkspace: true,
    viewedAt: "2024-08-17T14:15:00Z"
  }
];

export const mockWorkspaceItems: WorkspaceItem[] = [
  {
    regulationId: "2",
    addedAt: "2024-08-17T14:20:00Z",
    priority: "high",
    notes: "Critical for Q4 capital planning. Need to coordinate with treasury team.",
    status: "in-progress"
  },
  {
    regulationId: "1",
    addedAt: "2024-08-16T09:30:00Z",
    priority: "medium",
    notes: "Review with tech team for implementation timeline.",
    status: "pending"
  }
];

export const mockViewHistory: Array<{ regulationId: string; viewedAt: string; }> = [
  { regulationId: "1", viewedAt: "2024-08-18T10:30:00Z" },
  { regulationId: "2", viewedAt: "2024-08-17T14:15:00Z" },
  { regulationId: "3", viewedAt: "2024-08-16T11:45:00Z" },
  { regulationId: "4", viewedAt: "2024-08-15T16:20:00Z" }
];
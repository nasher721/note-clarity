import { useMemo, useState } from 'react';
import {
  Brain,
  Sparkles,
  ShieldCheck,
  Workflow,
  Activity,
  Bot,
  FileText,
  Stethoscope,
  Cpu,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClinicalAlertsPanel } from './ClinicalAlertsPanel';
import { GeneratorWorkspace } from './GeneratorWorkspace';
import { SemanticSearchPanel } from './SemanticSearchPanel';

const modelBadges = [
  { name: 'GPT-4o', tone: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100' },
  { name: 'Claude 3.5 Sonnet', tone: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100' },
  { name: 'Med-PaLM 2', tone: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100' },
  { name: 'BioMedBERT', tone: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100' },
  { name: 'ClinicalBERT', tone: 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100' },
  { name: 'SciBERT', tone: 'bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-100' },
  { name: 'BioBERT', tone: 'bg-teal-100 text-teal-900 dark:bg-teal-900/40 dark:text-teal-100' },
];

export const IntelligenceHub = () => {
  const [mode, setMode] = useState<'fast' | 'comprehensive'>('comprehensive');
  const insights = useMemo(
    () => ({
      totalNotes: 12480,
      accuracy: 96.2,
      costSavings: '$218K',
      qualityScore: 92,
    }),
    []
  );

  return (
    <ScrollArea className="h-full">
      <div className="container max-w-6xl py-8 space-y-8">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">AI Medical Intelligence Platform</p>
              <h2 className="text-3xl font-semibold">Unified clinical AI for extraction, reasoning, and decision support</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-2">
                <Brain className="h-3.5 w-3.5" /> Multi-model AI
              </Badge>
              <Badge variant="outline" className="gap-2">
                <ShieldCheck className="h-3.5 w-3.5" /> HIPAA-ready
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground">
            Orchestrate advanced extraction, generative documentation, semantic search, clinical decision support,
            and privacy-preserving workflows across the entire lifecycle of medical notes.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" /> AI Extraction & NLU Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Processing mode</p>
                  <p className="text-xs text-muted-foreground">Toggle between rapid local extraction and full AI analysis.</p>
                </div>
                <Tabs value={mode} onValueChange={(value) => setMode(value as 'fast' | 'comprehensive')}>
                  <TabsList>
                    <TabsTrigger value="fast">Fast Mode</TabsTrigger>
                    <TabsTrigger value="comprehensive">Comprehensive Mode</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Stage 1 · Local NER</p>
                  <p className="font-medium">Medications, vitals, dates</p>
                  <p className="text-xs text-muted-foreground">&lt; 2s · 90%+ confidence</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Stage 2 · Deep analysis</p>
                  <p className="font-medium">Reasoning, relations, summaries</p>
                  <p className="text-xs text-muted-foreground">5-10s · GPT-4o/Claude</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Stage 3 · Verification</p>
                  <p className="font-medium">Consensus + human review</p>
                  <p className="text-xs text-muted-foreground">Auto-approve high confidence</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Consensus confidence</span>
                  <span className="font-medium">{mode === 'fast' ? '91%' : '97%'}</span>
                </div>
                <Progress value={mode === 'fast' ? 91 : 97} />
              </div>
              <div className="flex flex-wrap gap-2">
                {modelBadges.map((model) => (
                  <span key={model.name} className={`rounded-full px-3 py-1 text-xs font-medium ${model.tone}`}>
                    {model.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" /> Conversational AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Assistant summary</p>
                  <p className="text-sm font-medium">Detected CHF with elevated BNP and medication non-adherence risk.</p>
                </div>
                <div className="text-xs text-muted-foreground">Suggested questions</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    "What's the primary diagnosis?",
                    'Are there any drug interactions?',
                    'List abnormal labs from last week',
                  ].map((question) => (
                    <Badge key={question} variant="secondary" className="text-xs">
                      {question}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                  <p>RAG-powered answers with citations from note sections, PubMed, and UpToDate.</p>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-primary mt-0.5" />
                  <p>Natural language commands: export vitals, highlight abnormalities, or generate ICD-10/CPT codes.</p>
                </div>
              </div>
              <Button className="w-full">Open AI Assistant</Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <GeneratorWorkspace />
          <ClinicalAlertsPanel />

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> Intelligent Autocomplete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">As-you-type guidance with ICD-10 suggestions and lab prompts.</p>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Typing: “shortness of”</p>
                  <p className="font-medium">Suggested: Dyspnea (R06.02) · Add SpO₂</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Potential issue detected</p>
                  <p className="font-medium">Heart rate 18 bpm · verify value</p>
                </div>
              </div>
              <Button variant="outline" className="w-full">Configure Autocomplete</Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <SemanticSearchPanel />

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-primary" /> AI Workflow Automation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="font-medium">Cardiology referral for chest pain</p>
                  <p className="text-xs text-muted-foreground">
                    Trigger: chest pain + troponin &gt; 0.04 → create referral + notify team
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="font-medium">Urgent sepsis pathway</p>
                  <p className="text-xs text-muted-foreground">Trigger: fever + lactate + hypotension</p>
                </div>
              </div>
              <Button variant="outline" className="w-full">Launch Workflow Builder</Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> Analytics & Model Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="text-xs text-muted-foreground">Total notes</p>
                  <p className="text-xl font-semibold">{insights.totalNotes.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="text-xs text-muted-foreground">Extraction accuracy</p>
                  <p className="text-xl font-semibold text-green-600 dark:text-green-400">{insights.accuracy}%</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="text-xs text-muted-foreground">AI cost savings</p>
                  <p className="text-xl font-semibold">{insights.costSavings}</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="text-xs text-muted-foreground">Quality score</p>
                  <p className="text-xl font-semibold">{insights.qualityScore}/100</p>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                <p className="font-medium mb-2">Model scorecards</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <span>GPT-4o</span>
                    <span className="text-muted-foreground">F1 0.96 · 720ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Claude 3.5</span>
                    <span className="text-muted-foreground">F1 0.95 · 840ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Med-PaLM 2</span>
                    <span className="text-muted-foreground">F1 0.93 · 610ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>BioBERT</span>
                    <span className="text-muted-foreground">F1 0.91 · 210ms</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Privacy & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span>PHI encryption at rest</span>
                  <Badge variant="secondary">Compliant</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Audit logging</span>
                  <Badge variant="secondary">Real-time</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Data retention</span>
                  <Badge variant="outline">Review needed</Badge>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="font-medium">Privacy-preserving AI</p>
                <p className="text-xs text-muted-foreground">
                  Local processing, federated learning, differential privacy, and de-identification workflows.
                </p>
              </div>
              <Button variant="outline" className="w-full">Open Compliance Dashboard</Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" /> Multi-modal AI Processing
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="font-medium">Vision AI</p>
                <p className="text-xs text-muted-foreground">OCR handwriting, extract lab PDFs, interpret imaging findings.</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="font-medium">Audio intelligence</p>
                <p className="text-xs text-muted-foreground">Whisper transcription, diarization, SOAP summarization.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Intelligent Annotation Studio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="font-medium">Active learning queue</p>
                <p className="text-xs text-muted-foreground">
                  Prioritize low-confidence notes, disagreements, and high-impact cases for review.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="font-medium">Collaborative review</p>
                <p className="text-xs text-muted-foreground">
                  Real-time annotation, consensus scoring, and exportable gold-standard datasets.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </ScrollArea>
  );
};

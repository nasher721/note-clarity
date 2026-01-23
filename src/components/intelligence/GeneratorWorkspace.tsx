import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const generatorTemplates = {
  generate: 'Draft a progress note from the following bullet points.',
  transform: 'Transform the following note into SOAP format.',
  enhance: 'Improve the clarity and compliance of this note.',
};

export const GeneratorWorkspace = () => {
  const [mode, setMode] = useState<'generate' | 'transform' | 'enhance'>('generate');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const handleGenerate = () => {
    const starter = generatorTemplates[mode];
    const sampleOutput =
      mode === 'generate'
        ? 'Assessment: Acute CHF exacerbation. Plan: continue diuretics, monitor weight, schedule follow-up in 1 week.'
        : mode === 'transform'
        ? 'S: Patient reports improved dyspnea. O: BNP 780. A: CHF, hypertension. P: adjust diuretic dose.'
        : 'Clarified narrative, ensured documentation of vitals, allergies, and follow-up instructions.';
    setOutput(`${starter}\n\n${sampleOutput}`);
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Generative Note Studio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={(value) => setMode(value as 'generate' | 'transform' | 'enhance')}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="transform">Transform</TabsTrigger>
            <TabsTrigger value="enhance">Enhance</TabsTrigger>
          </TabsList>
          <TabsContent value={mode} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Input</p>
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Paste bullet points or an existing note..."
                  className="min-h-[140px]"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Generated output</p>
                <Textarea value={output} readOnly className="min-h-[140px]" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleGenerate}>Generate</Button>
              <Button variant="secondary">Regenerate</Button>
              <Button variant="outline">Accept</Button>
            </div>
          </TabsContent>
        </Tabs>
        <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          Streaming generation · Temperature 0.3 · GPT-4o
        </div>
      </CardContent>
    </Card>
  );
};

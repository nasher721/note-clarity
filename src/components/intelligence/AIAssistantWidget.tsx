import { useMemo, useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

type AIMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

interface AIAssistantWidgetProps {
  noteSummary?: string;
  noteTitle?: string;
}

const suggestedPrompts = [
  'What medications was this patient on?',
  'Summarize key risk factors.',
  'List abnormal labs from last week.',
  'Suggest ICD-10 codes.',
];

const buildAssistantResponse = (input: string, noteSummary?: string) => {
  const normalized = input.toLowerCase();

  if (normalized.includes('medication') || normalized.includes('drug')) {
    return `I found medication mentions including beta blockers, diuretics, and statins. Review current reconciled list in the Medication section. ${
      noteSummary ? `Context: ${noteSummary}` : ''
    }`;
  }

  if (normalized.includes('risk')) {
    return `Risk factors highlighted: hypertension, prior smoking history, and elevated BMI. ${
      noteSummary ? `Context: ${noteSummary}` : ''
    }`;
  }

  if (normalized.includes('lab')) {
    return `Recent labs show elevated BNP and mildly increased creatinine. Flagged abnormal values for review. ${
      noteSummary ? `Context: ${noteSummary}` : ''
    }`;
  }

  if (normalized.includes('icd')) {
    return `Suggested ICD-10 codes: I50.9 (Heart failure), I10 (Hypertension), E78.5 (Hyperlipidemia).`;
  }

  return `I'm ready to help with note analysis, extraction, or drafting. ${
    noteSummary ? `Context: ${noteSummary}` : ''
  }`;
};

export const AIAssistantWidget = ({ noteSummary, noteTitle }: AIAssistantWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      role: 'assistant',
      content: 'I have analyzed the current note context. What would you like to know?',
      timestamp: new Date(),
    },
  ]);

  const header = useMemo(
    () => noteTitle ?? (noteSummary ? 'Current Note' : 'AI Assistant'),
    [noteTitle, noteSummary]
  );

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    const userMessage: AIMessage = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    const assistantMessage: AIMessage = {
      role: 'assistant',
      content: buildAssistantResponse(text, noteSummary),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <Card className="w-[360px] shadow-xl border-border/60">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-semibold">{header}</p>
                {noteSummary && <p className="text-xs text-muted-foreground">{noteSummary}</p>}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
          <div className="px-4 pt-3">
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt) => (
                <Badge
                  key={prompt}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleSend(prompt)}
                >
                  {prompt}
                </Badge>
              ))}
            </div>
          </div>
          <ScrollArea className="h-64 px-4 py-3">
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    message.role === 'assistant'
                      ? 'bg-muted/60 text-foreground'
                      : 'bg-primary text-primary-foreground ml-6'
                  }`}
                >
                  {message.content}
                </div>
              ))}
            </div>
          </ScrollArea>
          <form
            className="border-t px-4 py-3 flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              handleSend(input);
            }}
          >
            <Input
              placeholder="Ask about this note..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>
      )}
      <Button onClick={() => setIsOpen((prev) => !prev)} className="gap-2 shadow-lg">
        <Bot className="h-4 w-4" />
        {isOpen ? 'Hide Assistant' : 'Ask AI'}
      </Button>
    </div>
  );
};

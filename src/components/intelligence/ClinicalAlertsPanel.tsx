import { Siren } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const alerts = [
  {
    title: 'Critical drug interaction',
    description: 'Warfarin + TMP/SMX · Recommend INR monitoring within 48 hours.',
    severity: 'critical',
  },
  {
    title: 'CHADS2-VASc risk',
    description: 'Score 4 · Consider anticoagulation review and shared decision making.',
    severity: 'warning',
  },
  {
    title: 'Guideline compliance',
    description: 'Diabetes foot exam overdue · schedule in next visit.',
    severity: 'info',
  },
];

const severityStyles: Record<string, string> = {
  critical: 'border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-900/20',
  warning: 'border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-900/20',
  info: 'border-border bg-muted/40',
};

export const ClinicalAlertsPanel = () => (
  <Card className="border-border/60">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Siren className="h-5 w-5 text-primary" /> Clinical Decision Support
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.title} className={`rounded-lg border p-3 text-sm ${severityStyles[alert.severity]}`}>
            <div className="flex items-center justify-between">
              <p className="font-medium">{alert.title}</p>
              <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                {alert.severity}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{alert.description}</p>
          </div>
        ))}
      </div>
      <Button variant="outline" className="w-full">
        Review All Alerts
      </Button>
    </CardContent>
  </Card>
);

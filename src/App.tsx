
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { DocumentProvider } from "./contexts/DocumentContext";
import { TrainingRoute } from "./routes/TrainingRoute";
import { BatchRoute } from "./routes/BatchRoute";
import { ChartRoute } from "./routes/ChartRoute";
import { InferenceRoute } from './routes/InferenceRoute';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SettingsProvider } from '@/contexts/SettingsContext';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SettingsProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />

            <Route path="/workspace" element={
              <DocumentProvider>
                <DashboardLayout />
              </DocumentProvider>
            }>
              <Route path="training" element={<TrainingRoute />} />
              <Route path="batch" element={<BatchRoute />} />
              <Route path="chart" element={<ChartRoute />} />
              <Route path="inference" element={<InferenceRoute />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route index element={<Navigate to="training" replace />} />
            </Route>

            {/* Redirect root to workspace */}
            <Route path="/" element={<Navigate to="/workspace/training" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </SettingsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;


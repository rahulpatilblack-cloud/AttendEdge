import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CompanyProvider } from "./contexts/CompanyContext";
import { SessionProvider } from "./contexts/SessionContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import UpdatePassword from "./pages/UpdatePassword";
import ResetPassword from "./pages/ResetPassword";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectFormPage from "./pages/ProjectFormPage";
import ProjectTeamPage from "./pages/ProjectTeamPage";
import ProjectTeamMemberPage from "./pages/ProjectTeamMemberPage";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProjectProvider } from "@/contexts/ProjectContext";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CompanyProvider>
            <SessionProvider>
              <ProjectProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                <Routes future={{ v7_startTransition: true }}>
                  <Route path="/" element={<Index />} />
                  
                  {/* Project Management Routes */}
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/project-form" element={<ProjectFormPage />} />
                  <Route path="/project-form/:id" element={<ProjectFormPage />} />
                  <Route path="/project-team/:projectId" element={<ProjectTeamPage />} />
                  <Route path="/project-team/:projectId/member/:memberId" element={<ProjectTeamMemberPage />} />
                  
                  {/* Auth Routes */}
                  <Route path="/update-password" element={
                    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                      <UpdatePassword />
                    </div>
                  } />
                  <Route path="/reset-password" element={
                    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                      <ResetPassword />
                    </div>
                  } />
                  
                  {/* Catch-all route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
              </ProjectProvider>
            </SessionProvider>
          </CompanyProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;

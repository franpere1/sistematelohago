import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ChatProvider } from "@/context/ChatContext";
import { ContractProvider } from "@/context/ContractContext";
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Loader2 } from "lucide-react";

// Lazy load pages for better initial performance
const Index = React.lazy(() => import("./pages/Index"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Auth = React.lazy(() => import("./pages/Auth"));
const ClientDashboard = React.lazy(() => import("./pages/ClientDashboard"));
const ProviderDashboard = React.lazy(() => import("./pages/ProviderDashboard"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <div className="flex-grow flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center p-4 flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-foreground" />
        <h1 className="text-2xl font-bold text-foreground dark:text-foreground">
          Cargando...
        </h1>
      </div>
    </div>
    <MadeWithDyad />
  </div>
);

const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ChatProvider>
            <ContractProvider>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/client-dashboard" element={<ClientDashboard />} />
                  <Route path="/provider-dashboard" element={<ProviderDashboard />} />
                  <Route path="/admin-dashboard" element={<AdminDashboard />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ContractProvider>
          </ChatProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AuthProvider>
);

export default App;
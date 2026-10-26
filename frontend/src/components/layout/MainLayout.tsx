import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AIAssistantLogo } from '../common/AIAssistantLogo';

export const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAssistantPage =
    location.pathname.startsWith('/assistant') || location.pathname.startsWith('/ai-assistant');

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans relative">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        {/* Page View Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* Floating AI Query Assistant Launcher */}
      {!isAssistantPage && (
        <button
          onClick={() => navigate('/assistant')}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-gov-navy-900 via-gov-navy-800 to-teal-900 hover:from-gov-navy-800 hover:to-teal-800 text-white rounded-full shadow-2xl border border-teal-400/40 hover:scale-105 active:scale-95 transition-all group"
          title="Ask AI Query Assistant"
        >
          <AIAssistantLogo size="sm" withGlow={true} />
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
              <span>Ask AI Assistant</span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            </div>
            <div className="text-[10px] text-teal-300 font-medium">Have a query? Click here</div>
          </div>
        </button>
      )}
    </div>
  );
};

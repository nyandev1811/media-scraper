import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrapeForm } from './components/ScrapeForm';
import { MediaGrid } from './components/MediaGrid';
import { AdminDashboard } from './components/AdminDashboard';
import { Layers, Settings } from 'lucide-react';
import { Toaster } from 'sonner';

const queryClient = new QueryClient();

function App() {
  const [currentView] = useState<'client' | 'admin'>(
    window.location.search.includes('admin=true') ? 'admin' : 'client'
  );

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
        {currentView === 'admin' ? (
          <AdminDashboard />
        ) : (
          <>
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-600 p-2 rounded-lg text-white">
                    <Layers size={20} />
                  </div>
                  <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    Media Scraper
                  </h1>
                </div>

                <div className="flex items-center gap-4">
                  <a
                    href="?admin=true"
                    target="_blank"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Settings size={16} />
                    Admin
                  </a>

                  <a
                    href="http://localhost:3000/api"
                    target="_blank"
                    className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    API Documentation
                  </a>
                </div>
              </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="space-y-8">
                <section>
                  <ScrapeForm />
                </section>

                <section>
                  <MediaGrid />
                </section>
              </div>
            </main>
          </>
        )}

        {/* Admin Toggle Removed */}
        <Toaster position="top-right" richColors />
      </div>
    </QueryClientProvider>
  )
}

export default App

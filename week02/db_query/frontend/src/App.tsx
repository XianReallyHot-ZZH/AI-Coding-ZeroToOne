import { BrowserRouter, Route, Routes, Link, useLocation } from "react-router-dom";
import { ConfigProvider, App as AntdApp } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DatabaseOutlined, SearchOutlined, MenuOutlined, CloseOutlined } from "@ant-design/icons";
import { useState } from "react";
import { DatabaseListPage } from "./pages/DatabaseListPage";
import { DatabaseDetailPage } from "./pages/DatabaseDetailPage";
import { QueryPage } from "./pages/QueryPage";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

function Navigation() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-[var(--md-gray-200)] px-4 md:px-6">
      <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-[var(--md-blue)] tracking-tight flex-shrink-0 hover:opacity-80 transition-opacity">
          <DatabaseOutlined className="text-xl" />
          <span>DB Query</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-1">
          <Link
            to="/dbs"
            className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-all ${
              isActive("/dbs")
                ? "bg-[var(--md-blue)] text-[var(--md-yellow)]"
                : "text-[var(--md-gray-600)] hover:text-[var(--md-blue)] hover:bg-[var(--md-blue-light)]"
            }`}
          >
            <DatabaseOutlined />
            Databases
          </Link>
        </div>

        <button 
          className="md:hidden p-2 rounded-[var(--radius-md)] text-[var(--md-gray-600)] hover:text-[var(--md-blue)] hover:bg-[var(--md-blue-light)]"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--md-gray-200)] bg-white py-2">
          <Link
            to="/dbs"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
              isActive("/dbs")
                ? "bg-[var(--md-blue-light)] text-[var(--md-blue)]"
                : "text-[var(--md-gray-600)] hover:text-[var(--md-blue)] hover:bg-[var(--md-gray-100)]"
            }`}
          >
            <DatabaseOutlined />
            Databases
          </Link>
        </div>
      )}
    </nav>
  );
}

function HomePage() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 md:p-8">
      <div className="text-center max-w-2xl px-4">
        <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full bg-[var(--md-yellow-pale)] border border-[var(--md-yellow)] text-xs md:text-sm font-medium text-[var(--md-blue)] mb-4 md:mb-6">
          <span className="w-2 h-2 rounded-full bg-[var(--md-teal)]"></span>
          DATABASE QUERY TOOL
        </div>
        
        <h1 className="text-3xl md:text-5xl font-bold text-[var(--md-blue)] tracking-tight leading-tight mb-4 md:mb-6">
          Query Your Databases<br />
          <span className="text-[var(--md-duck-orange)]">With Confidence</span>
        </h1>
        
        <p className="text-base md:text-lg text-[var(--md-gray-600)] leading-relaxed mb-8 md:mb-10 max-w-lg mx-auto">
          Connect to PostgreSQL databases, browse metadata, execute SQL queries, 
          and generate queries using natural language.
        </p>
        
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/dbs"
            className="md-btn md-btn-primary text-sm md:text-base px-6 md:px-8 py-2.5 md:py-3"
          >
            <DatabaseOutlined />
            Get Started
          </Link>
        </div>
      </div>
      
      <div className="mt-8 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl w-full px-4">
        <div className="md-card text-center">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-[var(--radius-md)] bg-[var(--md-blue-light)] flex items-center justify-center mx-auto mb-3 md:mb-4 text-lg md:text-xl">
            <DatabaseOutlined className="text-[var(--md-blue)]" />
          </div>
          <h3 className="font-bold text-[var(--md-blue)] text-sm md:text-base mb-1 md:mb-2">Connect</h3>
          <p className="text-xs md:text-sm text-[var(--md-gray-600)]">Add PostgreSQL database connections securely</p>
        </div>
        
        <div className="md-card text-center">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-[var(--radius-md)] bg-[var(--md-yellow-pale)] flex items-center justify-center mx-auto mb-3 md:mb-4 text-lg md:text-xl">
            <SearchOutlined className="text-[var(--md-blue)]" />
          </div>
          <h3 className="font-bold text-[var(--md-blue)] text-sm md:text-base mb-1 md:mb-2">Browse</h3>
          <p className="text-xs md:text-sm text-[var(--md-gray-600)]">Explore tables, views, and column metadata</p>
        </div>
        
        <div className="md-card text-center">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-[var(--radius-md)] bg-[rgba(0,191,165,0.1)] flex items-center justify-center mx-auto mb-3 md:mb-4 text-lg md:text-xl">
            <span className="text-[var(--md-teal)]">✨</span>
          </div>
          <h3 className="font-bold text-[var(--md-blue)] text-sm md:text-base mb-1 md:mb-2">Generate</h3>
          <p className="text-xs md:text-sm text-[var(--md-gray-600)]">Create SQL from natural language queries</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: "#FFE234",
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: 10,
            },
          }}
        >
          <AntdApp>
            <div className="min-h-screen bg-[var(--md-off-white)]">
              <Navigation />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/dbs" element={<DatabaseListPage />} />
                <Route path="/dbs/:id" element={<DatabaseDetailPage />} />
                <Route path="/dbs/:id/query" element={<QueryPage />} />
              </Routes>
            </div>
          </AntdApp>
        </ConfigProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { TicketCreatePage } from '@/pages/TicketCreatePage';
import { TicketEditPage } from '@/pages/TicketEditPage';
import { ToastProvider } from '@/components/Toast';

function App() {
  return (
    <ToastProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tickets/new" element={<TicketCreatePage />} />
            <Route path="/tickets/:id/edit" element={<TicketEditPage />} />
          </Routes>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;

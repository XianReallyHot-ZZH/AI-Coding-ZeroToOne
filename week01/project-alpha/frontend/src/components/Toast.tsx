import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastIcon: React.FC<{ type: ToastType }> = ({ type }) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-md-teal" />;
    case 'error':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Info className="h-5 w-5 text-md-blue" />;
  }
};

const ToastItem: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
  const bgColors = {
    success: 'bg-teal-50 border-md-teal',
    error: 'bg-red-50 border-red-400',
    info: 'bg-md-blue-light border-md-blue',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border-2 shadow-md-card animate-in slide-in-from-right-full',
        bgColors[toast.type]
      )}
    >
      <ToastIcon type={toast.type} />
      <p className="flex-1 text-sm font-medium text-md-gray-900">{toast.message}</p>
      <button
        onClick={onClose}
        className="text-md-gray-400 hover:text-md-gray-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;

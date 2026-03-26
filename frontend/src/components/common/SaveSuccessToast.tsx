import React, { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SaveSuccessToastProps {
  show: boolean;
  message?: string;
  onClose: () => void;
  duration?: number;
}

const SaveSuccessToast: React.FC<SaveSuccessToastProps> = ({
  show,
  message = 'Project saved successfully.',
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-white border border-green-200 shadow-lg rounded-xl px-4 py-3 min-w-64 max-w-sm animate-fade-in">
      <div className="flex-shrink-0 bg-green-100 rounded-full p-1.5 mt-0.5">
        <CheckCircle className="w-4 h-4 text-green-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900">Saved</p>
        <p className="text-xs text-gray-500 mt-0.5">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default SaveSuccessToast;

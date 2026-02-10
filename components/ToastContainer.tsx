
import React from 'react';
import { ToastMessage } from '../types';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface ToastContainerProps {
    toasts: ToastMessage[];
    onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
    return (
        <div className="fixed top-20 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
            {toasts.map(toast => (
                <div 
                    key={toast.id}
                    className={`
                        pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md min-w-[300px] animate-in slide-in-from-right fade-in duration-300
                        ${toast.type === 'success' ? 'bg-neural-800/90 border-green-500/50 text-green-100' : 
                          toast.type === 'error' ? 'bg-neural-800/90 border-red-500/50 text-red-100' :
                          'bg-neural-800/90 border-blue-500/50 text-blue-100'}
                    `}
                >
                    {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
                    {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                    {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
                    
                    <p className="flex-1 text-sm font-medium">{toast.message}</p>
                    
                    <button 
                        onClick={() => onRemove(toast.id)}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4 opacity-60 hover:opacity-100" />
                    </button>
                </div>
            ))}
        </div>
    );
};

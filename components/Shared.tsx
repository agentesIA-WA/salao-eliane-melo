import React from 'react';

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  fullWidth?: boolean;
}
export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', fullWidth, className = '', ...props }) => {
  const baseStyle = "px-5 py-3 rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] flex items-center justify-center gap-2 text-sm md:text-base cursor-pointer";
  const variants = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow-[0_4px_14px_rgba(219,39,119,0.3)] focus:ring-primary-100",
    secondary: "bg-slate-900 text-white hover:bg-black focus:ring-slate-100 shadow-sm",
    outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-50",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-100"
  };
  
  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

// Card
export const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl md:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/80 p-5 md:p-6 transition-all duration-300 ${className}`}>
    {children}
  </div>
);

// Badge
export const Badge: React.FC<{ color?: string, children: React.ReactNode }> = ({ color = 'blue', children }) => {
    const colors: Record<string, string> = {
        green: 'bg-green-500/10 text-green-700 border border-green-200/50',
        blue: 'bg-blue-500/10 text-blue-700 border border-blue-200/50',
        yellow: 'bg-amber-500/10 text-amber-700 border border-amber-200/50',
        red: 'bg-red-500/10 text-red-700 border border-red-200/50',
        gray: 'bg-slate-500/10 text-slate-600 border border-slate-200/50',
        pink: 'bg-primary-500/10 text-primary-700 border border-primary-200/50'
    };
    
    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${colors[color] || colors.gray}`}>
            {children}
        </span>
    );
}

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}
export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-xs md:text-sm font-semibold text-slate-700 uppercase tracking-wider mb-1.5">{label}</label>}
    <input 
      className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all duration-300 bg-slate-50/50 focus:bg-white text-slate-800 placeholder-slate-400 text-sm md:text-base ${className}`}
      {...props}
    />
  </div>
);

// Modal
export const Modal: React.FC<{ isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            {/* Backdrop overlay */}
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" aria-hidden="true" onClick={onClose}></div>
            
            {/* Centered content wrapper - must be relative and above backdrop */}
            <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
                <div className="relative bg-white rounded-3xl text-left overflow-hidden shadow-2xl sm:max-w-lg w-full border border-slate-100">
                    <div className="bg-white px-6 pt-6 pb-5">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                            <h3 className="text-lg md:text-xl font-serif font-semibold text-slate-900" id="modal-title">{title}</h3>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 focus:outline-none font-sans text-xl p-1 font-bold cursor-pointer">×</button>
                        </div>
                        <div className="mt-2 text-slate-700 max-h-[70vh] overflow-y-auto">
                            {children}
                        </div>
                    </div>
                    <div className="bg-slate-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto text-sm py-2">Fechar</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
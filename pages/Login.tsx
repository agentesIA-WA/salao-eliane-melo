import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { MOCK_USERS } from '../mockData';
import { Role } from '../types';
import { Card, Button, Input } from '../components/Shared';
import { Lock, User, ChevronLeft, LogIn, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, verifyAdminPassword, businessConfig } = useApp();
  const [view, setView] = useState<'select' | 'admin' | 'client'>('select');
  const [password, setPassword] = useState('');
  
  // Client login form state
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');

  const adminUser = MOCK_USERS.find(u => u.role === Role.ADMIN);

  const handleClientLogin = () => {
      if (!clientName || !clientPhone) {
          setError('Nome e telefone são obrigatórios.');
          return;
      }
      login('client', undefined, { name: clientName, phone: clientPhone, email: clientEmail });
  };

  const handleAdminLogin = async () => {
      if (isLoggingIn) return;
      setError('');
      setIsLoggingIn(true);
      try {
          const tokenOrFalse = await verifyAdminPassword(password);
          if (tokenOrFalse) {
              if (adminUser) {
                  await login(adminUser.id, tokenOrFalse);
              }
          } else {
              setError('Senha incorreta. Tente "123456" caso não tenha alterado.');
          }
      } catch (err) {
          setError('Ocorreu um erro ao validar sua senha administrativa.');
      } finally {
          setIsLoggingIn(false);
      }
  };

  return (
    <div className="min-h-screen bg-[#faf8f6] flex flex-col md:flex-row font-sans">
      
      {/* Brand Panel - Visible on Desktop */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-luxury-900 via-luxury-800 to-primary-950 p-12 text-white flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative vector mesh/circles using Tailwind gradients */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-luxury-400/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
        
        <div className="z-10 flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 shadow-lg">
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <span className="font-serif text-lg tracking-widest uppercase font-semibold text-primary-200">
            {businessConfig.companyName || 'Eliane Melo'}
          </span>
        </div>

        <div className="z-10 max-w-lg space-y-6 my-auto">
          <h1 className="text-5xl font-serif font-light leading-tight tracking-wide text-white">
            Onde a <span className="font-serif italic font-normal text-primary-300">beleza</span> e o <span className="font-serif italic font-normal text-primary-300">bem-estar</span> se encontram.
          </h1>
          <p className="text-luxury-200 text-lg leading-relaxed font-light">
            Vivencie um atendimento exclusivo e personalizado em nosso salão de beleza. Agende seu horário com facilidade e gerencie seus serviços de forma inteligente.
          </p>
          <div className="flex gap-4 pt-4">
            <div className="flex flex-col border-r border-luxury-700 pr-4">
              <span className="text-2xl font-serif text-primary-300">01</span>
              <span className="text-xs uppercase tracking-wider text-luxury-300">Atendimento Premium</span>
            </div>
            <div className="flex flex-col border-r border-luxury-700 pr-4">
              <span className="text-2xl font-serif text-primary-300">100%</span>
              <span className="text-xs uppercase tracking-wider text-luxury-300">Online & Ágil</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-serif text-primary-300">4.9★</span>
              <span className="text-xs uppercase tracking-wider text-luxury-300 font-sans">Avaliação Clientes</span>
            </div>
          </div>
        </div>

        <div className="z-10 text-xs text-luxury-300 flex justify-between">
          <span>© {new Date().getFullYear()} {businessConfig.companyName || 'Salão Eliane Melo'}.</span>
          <span>Beleza Redefinida</span>
        </div>
      </div>

      {/* Login Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-luxury-100 animate-in fade-in duration-500">
          
          <div className="text-center md:text-left space-y-2">
            {/* Logo on mobile */}
            <div className="md:hidden inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-50 text-primary-600 mb-2">
              <Sparkles size={28} />
            </div>
            <h2 className="text-3xl font-serif font-semibold text-slate-900 tracking-wide">
              {view === 'select' ? 'Bem-vinda' : 'Área de Acesso'}
            </h2>
            <p className="text-slate-500 text-sm">
              {view === 'select' ? 'Escolha como deseja prosseguir com seu acesso.' : 'Acesse a área de gerenciamento com sua senha.'}
            </p>
          </div>

          {view === 'select' ? (
            <div className="space-y-4">
              <button 
                onClick={() => setView('client')}
                className="w-full group relative flex items-center p-5 border border-luxury-200 bg-white rounded-2xl hover:shadow-[0_4px_20px_rgba(236,72,153,0.08)] hover:border-primary-300 transition-all text-left transform duration-300 hover:-translate-y-0.5 active:scale-98"
              >
                <div className="p-3 bg-primary-50 rounded-xl mr-4 group-hover:bg-primary-600 group-hover:text-white transition-all text-primary-600 duration-300">
                  <User size={24} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800 text-base md:text-lg flex items-center justify-between">
                    <span>Sou Cliente</span>
                    <span className="text-xs text-primary-600 font-medium font-sans bg-primary-50 px-2 py-0.5 rounded-full group-hover:bg-primary-100 transition-colors">Entrada Rápida</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">Ver serviços, profissionais e agendar um horário</p>
                </div>
              </button>

              <button 
                onClick={() => setView('admin')}
                className="w-full group relative flex items-center p-5 border border-slate-200 bg-slate-50 rounded-2xl hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:bg-white hover:border-slate-300 transition-all text-left transform duration-300 hover:-translate-y-0.5 active:scale-98"
              >
                <div className="p-3 bg-slate-200 rounded-xl mr-4 group-hover:bg-slate-800 group-hover:text-white transition-all text-slate-600 duration-300">
                  <Lock size={24} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800 text-base md:text-lg">Área Administrativa</div>
                  <p className="text-sm text-slate-400 mt-1">Gerenciar equipe, horários, fotos e relatórios</p>
                </div>
              </button>
            </div>
          ) : view === 'client' ? (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-left">
                <button 
                  onClick={() => { setView('select'); setError(''); }} 
                  className="text-sm text-slate-400 hover:text-slate-800 flex items-center hover:underline transition-all mb-2"
                >
                  <ChevronLeft size={16} className="mr-1"/> Voltar ao início
                </button>
              </div>

              <div className="space-y-4">
                <Input 
                  label="Seu Nome Completo" 
                  placeholder="Ex: Maria Carolina" 
                  value={clientName} 
                  onChange={(e) => { setClientName(e.target.value); setError(''); }}
                  required
                />
                <Input 
                  label="Seu WhatsApp" 
                  placeholder="Ex: (11) 9 9999-9999" 
                  type="tel"
                  value={clientPhone} 
                  onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, '');
                      if (v.length > 11) v = v.substring(0, 11);
                      let formatted = v;
                      if (v.length > 2) formatted = `(${v.substring(0, 2)}) ${v.substring(2)}`;
                      if (v.length > 3) formatted = `(${v.substring(0, 2)}) ${v.substring(2, 3)} ${v.substring(3)}`;
                      if (v.length > 7) formatted = `(${v.substring(0, 2)}) ${v.substring(2, 3)} ${v.substring(3, 7)}-${v.substring(7)}`;
                      setClientPhone(formatted);
                      setError('');
                  }}
                  required
                />
                <Input 
                  label="E-mail (opcional)" 
                  placeholder="Ex: maria@email.com" 
                  type="email"
                  value={clientEmail} 
                  onChange={(e) => setClientEmail(e.target.value)}
                />
              </div>
              
              {error && (
                <div className="text-red-500 text-xs font-semibold bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  {error}
                </div>
              )}

              <Button 
                fullWidth 
                onClick={handleClientLogin} 
                className="flex items-center justify-center py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-lg active:scale-98"
              >
                Acessar Área do Cliente
              </Button>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-left">
                <button 
                  onClick={() => { setView('select'); setError(''); setPassword(''); }} 
                  className="text-sm text-slate-400 hover:text-slate-800 flex items-center hover:underline transition-all mb-2"
                >
                  <ChevronLeft size={16} className="mr-1"/> Voltar ao início
                </button>
              </div>

              <div className="relative">
                <Input 
                  type="password" 
                  placeholder="Senha administrativa" 
                  value={password} 
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  className="text-center tracking-widest border-luxury-200 focus:border-primary-500 py-3 rounded-xl shadow-inner text-lg font-mono"
                  autoFocus
                />
              </div>
              
              {error && (
                <div className="text-red-500 text-xs font-semibold bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  {error}
                </div>
              )}

              <Button 
                fullWidth 
                onClick={handleAdminLogin} 
                disabled={isLoggingIn}
                className="flex items-center justify-center py-3 bg-slate-900 text-white rounded-xl hover:bg-black transition-colors shadow-lg active:scale-98 disabled:opacity-50"
              >
                {isLoggingIn ? 'Verificando...' : 'Entrar no Painel'}
              </Button>
            </div>
          )}
          
          <div className="text-xs text-slate-400 pt-6 border-t border-slate-100 flex items-center justify-between">
            <span>{view === 'admin' ? 'Dica: Senha padrão 123456 (pode ser alterada)' : (businessConfig.companyName || 'Salão Eliane Melo')}</span>
            <span className="font-serif italic font-semibold text-slate-500">Exclusividade & Beleza</span>
          </div>
        </div>
      </div>

    </div>
  );
};
import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../../components/Shared';
import { Calendar as CalendarIcon, Users, Scissors, TrendingUp, X, Briefcase, Settings, Sparkles, UserRound } from 'lucide-react';

// Extracted sub-view components
import DashboardOverview from './components/DashboardOverview';
import CalendarManager from './components/CalendarManager';
import ServicesManager from './components/ServicesManager';
import ProfessionalsManager from './components/ProfessionalsManager';
import ClientsManager from './components/ClientsManager';
import SettingsManager from './components/SettingsManager';
import CompanyManager from './components/CompanyManager';

export const AdminDashboard: React.FC = () => {
  const { logout, businessConfig } = useApp();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'services' | 'professionals' | 'clients' | 'settings' | 'company'>('dashboard');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar for Desktop */}
      <aside className="w-68 bg-slate-900 text-white hidden md:flex flex-col shrink-0 border-r border-slate-800 shadow-xl">
        <div className="p-6 border-b border-slate-800 bg-slate-950/20">
           <div className="flex items-center gap-2.5">
             <div className="w-10 h-10 rounded-full bg-primary-600/20 text-primary-400 flex items-center justify-center border border-primary-500/20 font-bold shadow-md">
               <Sparkles size={20} className="animate-pulse" />
             </div>
             <div className="min-w-0 flex-1">
               <h1 className="text-lg font-serif font-bold tracking-wider text-white truncate" title={businessConfig.companyName || 'Eliane Melo'}>
                 {businessConfig.companyName || 'Eliane Melo'}
               </h1>
               <p className="text-[10px] uppercase font-sans tracking-widest text-primary-400/80 font-bold">Painel de Controle</p>
             </div>
           </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 pt-6">
           <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<TrendingUp size={18}/>}>Visão Geral</NavButton>
           <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={18}/>}>Gerenciar Agenda</NavButton>
           <NavButton active={activeTab === 'services'} onClick={() => setActiveTab('services')} icon={<Scissors size={18}/>}>Listagem de Serviços</NavButton>
           <NavButton active={activeTab === 'professionals'} onClick={() => setActiveTab('professionals')} icon={<Users size={18}/>}>Profissionais Parceiros</NavButton>
           <NavButton active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} icon={<UserRound size={18}/>}>Clientes</NavButton>
           <NavButton active={activeTab === 'company'} onClick={() => setActiveTab('company')} icon={<Briefcase size={18}/>}>Dados da Empresa</NavButton>
           <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={18}/>}>Configurações & Acesso</NavButton>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/10">
            <button 
                onClick={logout} 
                className="flex items-center text-slate-400 hover:text-red-400 hover:bg-slate-800/50 w-full px-4 py-3 rounded-xl transition-all font-medium text-sm cursor-pointer"
            >
                <X size={18} className="mr-2" /> Encerrar Sessão
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-hidden pb-24 md:pb-0">
         
         {/* Mobile Premium Header */}
         <header className="bg-white border-b border-slate-100 p-4 md:hidden flex justify-between items-center sticky top-0 z-30 shadow-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-600 animate-pulse shrink-0"></span>
                <span className="font-serif font-bold text-lg text-slate-900 tracking-wide truncate" title={businessConfig.companyName || 'Eliane Melo'}>
                  {businessConfig.companyName || 'Eliane Melo'} Admin
                </span>
              </div>
              <button 
                onClick={logout}
                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 active:scale-95 transition-all cursor-pointer"
                title="Sair"
              >
                <X size={20} />
              </button>
         </header>

         {/* Scrollable Content wrapper */}
         <main className="flex-1 md:overflow-y-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
               {activeTab === 'dashboard' && <DashboardOverview />}
               {activeTab === 'calendar' && <CalendarManager />}
               {activeTab === 'services' && <ServicesManager />}
               {activeTab === 'professionals' && <ProfessionalsManager />}
               {activeTab === 'clients' && <ClientsManager />}
               {activeTab === 'company' && <CompanyManager />}
               {activeTab === 'settings' && <SettingsManager />}
            </div>
         </main>

         {/* Mobile Floating Island Bottom Nav Bar */}
         <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 max-w-lg w-[calc(100%-2rem)] overflow-x-auto no-scrollbar bg-white/95 backdrop-blur-md shadow-[0_15px_30px_rgba(0,0,0,0.08)] border border-slate-100 rounded-3xl z-40">
           <div className="flex justify-around items-center px-4 py-2 min-w-max">
             <MobileNavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<TrendingUp size={20}/>} label="Painel" />
             <MobileNavItem active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={20}/>} label="Agenda" />
             <MobileNavItem active={activeTab === 'services'} onClick={() => setActiveTab('services')} icon={<Scissors size={20}/>} label="Serviços" />
             <MobileNavItem active={activeTab === 'professionals'} onClick={() => setActiveTab('professionals')} icon={<Users size={20}/>} label="Equipe" />
             <MobileNavItem active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} icon={<UserRound size={20}/>} label="Clientes" />
             <MobileNavItem active={activeTab === 'company'} onClick={() => setActiveTab('company')} icon={<Briefcase size={20}/>} label="Empresa" />
             <MobileNavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20}/>} label="Ajustes" />
           </div>
         </div>

      </div>
    </div>
  );
};

// Side Nav Button Helper
const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, children: React.ReactNode }> = ({ active, onClick, icon, children }) => (
    <button 
      onClick={onClick} 
      className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm cursor-pointer border border-transparent select-none active:scale-[0.98] ${active ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/10' : 'text-slate-400 hover:text-white hover:bg-slate-800/40 hover:border-slate-800'}`}
    >
        <span className="mr-3 shrink-0">{icon}</span>
        {children}
    </button>
);

// Mobile Nav Item Helper
const MobileNavItem: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center p-2.5 transition-all outline-none rounded-xl cursor-pointer ${active ? 'text-primary-600 font-bold scale-105' : 'text-slate-400 font-medium hover:text-slate-600'}`}
  >
    {icon}
    <span className={`text-[9px] mt-1 uppercase tracking-widest ${active ? 'text-primary-600' : 'text-slate-400'}`}>{label}</span>
  </button>
);

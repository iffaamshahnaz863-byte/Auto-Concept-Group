
import React from 'react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  role: UserRole;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, role, onLogout }) => {
  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-white border-x border-slate-100 relative shadow-2xl overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-2xl border-b border-slate-100 px-8 py-6 flex justify-between items-center transition-all duration-300">
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setActiveTab('home')}>
          <div className="w-12 h-12 bg-blue-600 rounded-[18px] flex items-center justify-center shadow-2xl shadow-blue-600/30 group-hover:rotate-12 transition-transform duration-500">
            <span className="text-white font-black italic text-xl">AC</span>
          </div>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black tracking-tighter text-slate-900 italic uppercase leading-none">Concept</h1>
            <p className="text-[8px] font-black text-blue-600 uppercase tracking-[0.4em] leading-none">Automotive</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="bg-slate-900 text-white text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-widest hidden sm:block border border-white/10">{role} Node</div>
          <button onClick={() => setActiveTab('profile')} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 scale-110' : 'bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar bg-white">
        {children}
      </main>

      {/* High-Fidelity Nav Bar */}
      <nav className="sticky bottom-0 left-0 w-full bg-white/95 backdrop-blur-3xl border-t border-slate-100 px-12 py-8 flex justify-between items-center z-[90] rounded-t-[48px] shadow-[0_-16px_48px_-12px_rgba(0,0,0,0.1)]">
        {role === UserRole.USER && (
          <>
            <button onClick={() => setActiveTab('home')} className={`relative p-3 rounded-2xl transition-all duration-500 ${activeTab === 'home' ? 'text-blue-600 bg-blue-50 scale-125' : 'text-slate-300 hover:text-slate-500'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </button>
            <button onClick={() => setActiveTab('bookings')} className={`relative p-3 rounded-2xl transition-all duration-500 ${activeTab === 'bookings' ? 'text-blue-600 bg-blue-50 scale-125' : 'text-slate-300 hover:text-slate-500'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>
            </button>
            <button onClick={() => setActiveTab('profile')} className={`relative p-3 rounded-2xl transition-all duration-500 ${activeTab === 'profile' ? 'text-blue-600 bg-blue-50 scale-125' : 'text-slate-300 hover:text-slate-500'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
          </>
        )}

        {role === UserRole.DEALER && (
          <>
            <button onClick={() => setActiveTab('dealer-dashboard')} className={`relative p-3 rounded-2xl transition-all duration-500 ${activeTab === 'dealer-dashboard' ? 'text-blue-600 bg-blue-50 scale-125' : 'text-slate-300 hover:text-slate-500'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><rect width="7" height="9" x="3" y="3" rx="1.5"/><rect width="7" height="5" x="14" y="3" rx="1.5"/><rect width="7" height="9" x="14" y="12" rx="1.5"/><rect width="7" height="5" x="3" y="16" rx="1.5"/></svg>
            </button>
            <button onClick={() => setActiveTab('dealer-cars')} className={`relative p-3 rounded-2xl transition-all duration-500 ${activeTab === 'dealer-cars' ? 'text-blue-600 bg-blue-50 scale-125' : 'text-slate-300 hover:text-slate-500'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg>
            </button>
            <button onClick={() => setActiveTab('profile')} className={`relative p-3 rounded-2xl transition-all duration-500 ${activeTab === 'profile' ? 'text-blue-600 bg-blue-50 scale-125' : 'text-slate-300 hover:text-slate-500'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
          </>
        )}

        {role === UserRole.ADMIN && (
          <>
            <button onClick={() => setActiveTab('admin-stats')} className={`relative p-3 rounded-2xl transition-all duration-500 ${activeTab === 'admin-stats' ? 'text-blue-600 bg-blue-50 scale-125' : 'text-slate-300 hover:text-slate-500'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>
            </button>
            <button onClick={() => setActiveTab('admin-dealers')} className={`relative p-3 rounded-2xl transition-all duration-500 ${activeTab === 'admin-dealers' ? 'text-blue-600 bg-blue-50 scale-125' : 'text-slate-300 hover:text-slate-500'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="19" cy="11" r="2"/></svg>
            </button>
            <button onClick={() => setActiveTab('profile')} className={`relative p-3 rounded-2xl transition-all duration-500 ${activeTab === 'profile' ? 'text-blue-600 bg-blue-50 scale-125' : 'text-slate-300 hover:text-slate-500'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
          </>
        )}
      </nav>
    </div>
  );
};

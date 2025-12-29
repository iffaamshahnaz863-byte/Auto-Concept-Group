
import React, { useEffect, useState } from 'react';

export const SplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
      {/* Carbon Fiber Pattern Overlay */}
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>

      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
      
      {/* Center Content */}
      <div className={`flex flex-col items-center transition-all duration-1000 ease-out transform ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-8'}`}>
        <div className="relative mb-8">
          {/* Abstract Automotive Logo */}
          <div className="w-28 h-28 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[36px] shadow-2xl flex items-center justify-center rotate-12 relative border border-white/10">
            <span className="text-white font-black italic text-4xl -rotate-12 select-none tracking-tighter">AC</span>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center border-4 border-blue-600 shadow-xl">
               <div className="w-4 h-0.5 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
            </div>
          </div>
          {/* Intense Glow Effect */}
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl -z-10 rounded-full animate-pulse" />
        </div>
        
        <h1 className="text-5xl font-black text-white italic tracking-tighter mb-4 flex gap-1">
          AUTO <span className="text-blue-600">CONCEPT</span>
        </h1>
        <div className="h-1.5 w-16 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.6)]" />
      </div>

      {/* Bottom Text - Branded by Request */}
      <div className={`absolute bottom-16 text-center transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.5em] mb-2">
          Auto Concept Group
        </p>
        <div className="flex items-center gap-3 justify-center">
           <div className="h-px w-4 bg-slate-800"></div>
           <p className="text-slate-500 text-[12px] font-bold tracking-widest uppercase">
             by Afaq Maqbool
           </p>
           <div className="h-px w-4 bg-slate-800"></div>
        </div>
      </div>

      {/* Loading Progress Bar - Updated to 6s */}
      <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 animate-[loading_6s_ease-in-out_infinite]" style={{ width: '0%' }}>
        <style>{`
          @keyframes loading {
            0% { width: 0%; }
            50% { width: 60%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    </div>
  );
};

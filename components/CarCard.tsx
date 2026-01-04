
import React from 'react';
import { Car } from '../types';

interface CarCardProps {
  car: Car;
  onClick: (id: string) => void;
}

export const CarCard: React.FC<CarCardProps> = ({ car, onClick }) => {
  return (
    <div 
      onClick={() => onClick(car.id)}
      className="bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-[0_20px_40px_-16px_rgba(0,0,0,0.06)] hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.12)] transition-all duration-500 group cursor-pointer animate-in fade-in slide-in-from-bottom-8"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img 
          src={car.image} 
          alt={car.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1000ms]"
        />
        <div className="absolute top-6 right-6">
          <button className="bg-white/90 backdrop-blur-xl p-3 rounded-2xl shadow-xl hover:bg-blue-600 hover:text-white transition-all duration-300 border border-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </button>
        </div>
        <div className="absolute bottom-4 left-4 flex gap-2">
          <div className="bg-blue-600/90 backdrop-blur-md text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-white/10 shadow-lg">
            {car.category}
          </div>
          {car.fuel === 'Electric' && (
            <div className="bg-green-600/90 backdrop-blur-md text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-white/10 shadow-lg">
              EV NODE
            </div>
          )}
        </div>
      </div>
      
      <div className="p-8 space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">{car.brand}</h4>
            <span className="text-[9px] font-black text-slate-400 border border-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">Available</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 leading-tight italic tracking-tighter uppercase">{car.name}</h3>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">{car.variant} • {car.fuel} • {car.transmission}</p>
        </div>
        
        <div className="flex justify-between items-end pt-2">
          <div className="space-y-0.5">
            <p className="text-3xl font-black text-slate-900 tracking-tighter italic">₹{car.price.toLocaleString('en-IN')}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Ex-Showroom Index</p>
          </div>
          <div className="text-right pb-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">EMI from</p>
            <p className="text-sm font-black text-blue-600 tracking-tight">₹{car.emi.toLocaleString('en-IN')}/mo</p>
          </div>
        </div>
        
        <button className="w-full bg-slate-900 text-white text-[11px] font-black py-6 rounded-[28px] hover:bg-blue-600 transition-all duration-300 uppercase tracking-[0.3em] shadow-xl group-hover:translate-y-[-4px]">
          Inspect Asset
        </button>
      </div>
    </div>
  );
};

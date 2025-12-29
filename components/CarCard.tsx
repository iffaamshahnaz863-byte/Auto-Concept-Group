
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
      className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
    >
      <div className="relative aspect-[16/10]">
        <img 
          src={car.image} 
          alt={car.name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3">
          <button className="bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </button>
        </div>
        <div className="absolute bottom-2 left-2 bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
          {car.category}
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-slate-900 leading-tight truncate">{car.brand} {car.name}</h3>
          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">NEW</span>
        </div>
        <p className="text-xs text-slate-500 mb-3">{car.variant} • {car.fuel}</p>
        
        <div className="flex flex-col gap-0.5 mb-4">
          <span className="text-lg font-bold text-slate-900">₹{car.price.toLocaleString('en-IN')}</span>
          <span className="text-[11px] text-slate-500">EMI starts @ ₹{car.emi.toLocaleString('en-IN')}/mo</span>
        </div>
        
        <button className="w-full bg-slate-900 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-slate-800 transition-colors">
          View Details
        </button>
      </div>
    </div>
  );
};

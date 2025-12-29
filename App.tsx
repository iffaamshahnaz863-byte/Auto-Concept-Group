
import React, { useState, useEffect } from 'react';
import { UserRole, Car, CarCategory, Booking, BookingStatus, FuelType, UserProfile } from './types';
import { MOCK_CARS, CATEGORIES, BRANDS } from './constants';
import { Layout } from './components/Layout';
import { CarCard } from './components/CarCard';
import { LanguageToggle } from './components/LanguageToggle';
import { getCarRecommendation } from './services/geminiService';
import { SplashScreen } from './components/SplashScreen';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [activeCategory, setActiveCategory] = useState<CarCategory>(CarCategory.NEW);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  
  // Auth States
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authView, setAuthView] = useState<UserRole>(UserRole.USER);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Auto-hide splash screen after 6 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  // Sync session with Supabase
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setCurrentUser({
            id: profile.id,
            name: profile.full_name || 'User',
            email: session.user.email!,
            role: profile.role || UserRole.USER,
            phone: profile.phone || '',
          } as UserProfile);
          setActiveTab(profile.role === UserRole.USER ? 'home' : (profile.role === UserRole.DEALER ? 'dealer-dashboard' : 'admin-stats'));
        }
      }
    };
    checkSession();
  }, []);

  // Handle Supabase Login
  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      if (data.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          setCurrentUser({
            id: profile.id,
            name: profile.full_name || 'System User',
            email: data.user.email!,
            role: profile.role || UserRole.USER,
            phone: profile.phone || '',
          });
          setActiveTab(profile.role === UserRole.USER ? 'home' : (profile.role === UserRole.DEALER ? 'dealer-dashboard' : 'admin-stats'));
        }
      }
    } catch (err: any) {
      alert(err.message || 'Login failed.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle Supabase Signup
  const handleSupabaseSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: loginEmail,
        password: loginPassword,
        options: {
          data: {
            full_name: signupName,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Create profile in public.users table
        const { error: profileError } = await supabase
          .from('users')
          .insert([{ 
            id: data.user.id, 
            full_name: signupName, 
            email: loginEmail, 
            role: authView // Uses selected role from toggle (USER/DEALER/ADMIN)
          }]);
        
        if (profileError) {
          console.error("Profile creation error:", profileError);
        }
        
        alert('Signup successful! Check your email to verify account.');
        setAuthMode('login');
      }
    } catch (err: any) {
      alert(err.message || 'Signup failed.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleDemoLogin = (role: UserRole) => {
    const dummyUser: UserProfile = {
      id: 'demo-user-id',
      name: role === UserRole.ADMIN ? 'Super Admin' : (role === UserRole.DEALER ? 'Premier Toyota' : 'Aryan Sharma'),
      email: loginEmail || 'demo@autoconcept.com',
      phone: '+91 9876543210',
      role: role,
      isApprovedDealer: role === UserRole.DEALER
    };
    setCurrentUser(dummyUser);
    setActiveTab(role === UserRole.USER ? 'home' : (role === UserRole.DEALER ? 'dealer-dashboard' : 'admin-stats'));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setAuthMode('login');
    setSelectedCarId(null);
  };

  const handleCarClick = (id: string) => {
    setSelectedCarId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookNow = async (carId: string) => {
    const car = MOCK_CARS.find(c => c.id === carId);
    const newBooking: Booking = {
      id: `BK-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      carId,
      userId: currentUser?.id || 'guest',
      dealerId: car?.dealerId || 'dealer-1',
      status: BookingStatus.CONFIRMED,
      bookingDate: new Date().toISOString(),
      tokenPaid: 10000
    };
    setBookings(prev => [newBooking, ...prev]);
    setActiveTab('bookings');
    setSelectedCarId(null);
  };

  const askAIAdvisor = async () => {
    if (!searchQuery) return;
    setIsAiLoading(true);
    const suggestion = await getCarRecommendation(searchQuery);
    setAiSuggestion(suggestion);
    setIsAiLoading(false);
  };

  const translations = {
    en: { home: "Home", search: "Search", track: "Track", profile: "Profile", ai: "Auto Advisor", dealers: "Dealers", revenue: "Revenue" },
    hi: { home: "होम", search: "खोजें", track: "ट्रैक", profile: "प्रोफाइल", ai: "ऑटो सलाहकार", dealers: "डीलर्स", revenue: "राजस्व" }
  };
  const t = translations[language];

  // --- RENDER FUNCTIONS ---

  const renderAuth = () => (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-y-auto">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
      
      <div className="w-full max-w-sm space-y-6 z-10 py-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-12 shadow-2xl shadow-blue-600/40">
            <span className="text-white font-black italic text-2xl">AC</span>
          </div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Auto Concept</h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Premium Experience</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl p-6 rounded-[32px] border border-white/10 space-y-6 shadow-2xl">
          <div className="flex gap-2 p-1.5 bg-slate-800 rounded-2xl shadow-inner">
            <button onClick={() => setAuthView(UserRole.USER)} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${authView === UserRole.USER ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>USER</button>
            <button onClick={() => setAuthView(UserRole.DEALER)} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${authView === UserRole.DEALER ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>DEALER</button>
            <button onClick={() => setAuthView(UserRole.ADMIN)} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${authView === UserRole.ADMIN ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>ADMIN</button>
          </div>

          <div className="text-center">
            <h2 className="text-white font-bold text-lg">{authMode === 'login' ? 'Welcome Back' : 'Join the Group'}</h2>
            <p className="text-slate-400 text-xs mt-1">{authMode === 'login' ? 'Login to continue' : 'Create an account to start booking'}</p>
          </div>

          <form onSubmit={authMode === 'login' ? handleSupabaseLogin : handleSupabaseSignup} className="space-y-4">
            {authMode === 'signup' && (
              <input 
                type="text" 
                required
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                placeholder="Full Name" 
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 text-sm focus:ring-2 focus:ring-blue-600 outline-none" 
              />
            )}
            <input 
              type="email" 
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="Email Address" 
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 text-sm focus:ring-2 focus:ring-blue-600 outline-none" 
            />
            <input 
              type="password" 
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Password" 
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 text-sm focus:ring-2 focus:ring-blue-600 outline-none" 
            />
            
            <button 
              type="submit"
              disabled={isAuthLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center"
            >
              {isAuthLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (authMode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-blue-500 text-xs font-bold hover:underline"
            >
              {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Login"}
            </button>
          </div>

          <div className="flex items-center gap-4 py-2">
            <div className="h-px flex-1 bg-slate-800"></div>
            <span className="text-[10px] font-bold text-slate-600 uppercase">Demo</span>
            <div className="h-px flex-1 bg-slate-800"></div>
          </div>

          <button 
            type="button"
            onClick={() => handleDemoLogin(authView)}
            className="w-full bg-slate-800 text-slate-400 font-bold py-3 rounded-2xl text-[10px] uppercase tracking-widest border border-slate-700 hover:bg-slate-700 transition-all"
          >
            Bypass for Demo
          </button>
        </div>
        <p className="text-center text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em] pb-10">Secure Cloud Integration • Supabase</p>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t.ai}</h2>
        <LanguageToggle currentLang={language} onToggle={setLanguage} />
      </div>

      <div className="bg-gradient-to-br from-blue-700 to-indigo-900 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden group">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-1">Intelligent Search</h3>
          <p className="text-[10px] text-blue-100 opacity-80 mb-4">AI suggests cars based on your lifestyle.</p>
          <div className="flex gap-2">
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. 5 seater EV for city commute"
              className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 text-sm placeholder:text-blue-200 focus:ring-2 focus:ring-white transition-all outline-none" 
            />
            <button onClick={askAIAdvisor} className="bg-white text-blue-700 px-5 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all">Ask</button>
          </div>
          {aiSuggestion && (
            <div className="mt-4 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-xs animate-slide-up">
              <span className="font-bold text-blue-200 uppercase tracking-widest text-[10px]">AI Recommendation: {aiSuggestion.suggestedCategory}</span>
              <p className="mt-2 opacity-90 leading-relaxed">{aiSuggestion.reasoning}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
        {CATEGORIES.map(cat => (
          <button 
            key={cat} 
            onClick={() => setActiveCategory(cat)}
            className={`px-6 py-3 rounded-2xl text-[11px] font-black transition-all border whitespace-nowrap uppercase tracking-wider shadow-sm ${activeCategory === cat ? 'bg-slate-900 border-slate-900 text-white scale-105' : 'bg-white border-slate-100 text-slate-500'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <h4 className="font-black text-xl text-slate-900 italic">Featured Models</h4>
          <span className="text-[10px] font-bold text-blue-600 uppercase">See all</span>
        </div>
        <div className="grid grid-cols-1 gap-6">
          {MOCK_CARS.filter(c => c.category === activeCategory).map(car => (
            <CarCard key={car.id} car={car} onClick={handleCarClick} />
          ))}
        </div>
      </div>
    </div>
  );

  const renderTracking = () => (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-black text-slate-900 italic tracking-tight">Active Bookings</h2>
      {bookings.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center opacity-40">
           <svg className="w-16 h-16 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M16 16h1M12 12h5"/><path d="M16 10l4.5 6H16v-6z"/></svg>
           <p className="font-bold text-sm">No bookings in progress.</p>
        </div>
      ) : (
        bookings.map(booking => {
          const car = MOCK_CARS.find(c => c.id === booking.carId);
          const steps = Object.values(BookingStatus);
          const currentIndex = steps.indexOf(booking.status);
          return (
            <div key={booking.id} className="bg-white border border-slate-100 rounded-[40px] p-8 shadow-xl space-y-8 animate-slide-up">
              <div className="flex gap-6 items-center">
                <div className="relative">
                  <img src={car?.image} className="w-24 h-24 object-cover rounded-[24px] shadow-lg" alt="" />
                  <div className="absolute -top-2 -right-2 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg">1</div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{booking.id}</p>
                  <h4 className="text-xl font-black text-slate-900 leading-tight">{car?.brand} {car?.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Scheduled: {new Date(booking.bookingDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="relative pl-8 space-y-8">
                <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-slate-100">
                   <div className="absolute top-0 w-full bg-blue-600" style={{ height: `${(currentIndex / (steps.length-1)) * 100}%` }}></div>
                </div>
                {steps.map((step, idx) => (
                  <div key={step} className="relative flex items-center gap-6">
                    <div className={`absolute -left-8 w-8 h-8 rounded-full border-4 shadow-sm z-10 flex items-center justify-center transition-all duration-500 ${idx <= currentIndex ? 'bg-blue-600 border-white text-white' : 'bg-white border-slate-100 text-slate-300'}`}>
                      {idx < currentIndex ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-black uppercase tracking-wider ${idx <= currentIndex ? 'text-slate-900' : 'text-slate-300'}`}>{step}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderDealerDashboard = () => (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900 italic tracking-tighter">Inventory Control</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentUser?.name}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Sales</p>
          <p className="text-2xl font-black text-blue-600">₹12.4 Cr</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Active Leads</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-black">24</p>
          </div>
        </div>
        <div className="bg-blue-600 p-6 rounded-[32px] text-white shadow-xl">
          <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-2">Pending TDs</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-black">08</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-black italic tracking-tighter">Global Control</h2>
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: 'Dealers', v: '142', c: 'text-blue-600' },
          { l: 'Bookings', v: '2,840', c: 'text-slate-900' },
          { l: 'Revenue', v: '₹84Cr', c: 'text-green-600' }
        ].map(stat => (
          <div key={stat.l} className="bg-white border border-slate-100 p-5 rounded-[24px] text-center shadow-sm">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.l}</p>
            <p className={`text-sm font-black ${stat.c}`}>{stat.v}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    if (selectedCarId) {
      const selectedCar = MOCK_CARS.find(c => c.id === selectedCarId);
      return (
        <div className="bg-white min-h-screen animate-in slide-in-from-right duration-300">
          <div className="relative">
            <button onClick={() => setSelectedCarId(null)} className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur-xl p-3 rounded-2xl shadow-2xl active:scale-90 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div className="w-full aspect-[4/3] overflow-hidden">
               <img src={selectedCar?.image} className="w-full h-full object-cover" alt="" />
            </div>
          </div>
          <div className="px-8 py-10 -mt-12 bg-white rounded-t-[50px] relative z-10 space-y-8 shadow-[0_-20px_40px_rgba(0,0,0,0.1)]">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em]">{selectedCar?.brand}</span>
                <h2 className="text-4xl font-black text-slate-900 italic tracking-tight leading-none">{selectedCar?.name}</h2>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{selectedCar?.variant}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-slate-900 leading-none">₹{(selectedCar?.price || 0 / 100000).toFixed(1)}L</p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Ex-Showroom</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {[
                { l: 'Efficiency', v: selectedCar?.mileage, i: '⚡' },
                { l: 'Drivetrain', v: selectedCar?.engine, i: '⚙️' },
                { l: 'Safety', v: selectedCar?.safetyRating, i: '🛡️' },
                { l: 'Capacity', v: `${selectedCar?.seats}S`, i: '👥' }
              ].map(spec => (
                <div key={spec.l} className="bg-slate-50 p-4 rounded-[28px] text-center border border-slate-100 flex flex-col items-center gap-2">
                  <span className="text-lg">{spec.i}</span>
                  <p className="text-[10px] font-black text-slate-900 whitespace-nowrap">{spec.v}</p>
                </div>
              ))}
            </div>

            <div className="pb-32 space-y-4">
               <h3 className="font-black text-lg italic uppercase tracking-tighter">Premium Features</h3>
               <div className="flex flex-wrap gap-2">
                  {['Sunroof', '360 Camera', 'ADAS Level 2', 'Leather Seats'].map(feat => (
                    <span key={feat} className="px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-bold text-slate-600">{feat}</span>
                  ))}
               </div>
            </div>

            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur-2xl border-t border-slate-100 p-6 flex gap-3 z-50">
              <button className="flex-1 bg-slate-900 text-white font-black py-4 rounded-[20px] active:scale-95 transition-all text-[10px] uppercase tracking-widest">Test Drive</button>
              <button onClick={() => handleBookNow(selectedCar?.id || '')} className="flex-[2] bg-blue-600 text-white font-black py-4 rounded-[20px] shadow-2xl shadow-blue-600/40 active:scale-95 transition-all text-[10px] uppercase tracking-[0.2em]">Secure Booking</button>
            </div>
          </div>
        </div>
      );
    }

    if (!currentUser) return renderAuth();

    switch (activeTab) {
      case 'home': return renderHome();
      case 'bookings': return renderTracking();
      case 'dealer-dashboard': return renderDealerDashboard();
      case 'admin-stats': return renderAdminDashboard();
      case 'profile': return (
        <div className="p-8 space-y-10">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[32px] flex items-center justify-center text-white shadow-2xl rotate-3">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter">{currentUser.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{currentUser.email}</p>
              <div className="flex gap-2 mt-3">
                 <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[8px] font-black uppercase tracking-widest">{currentUser.role} Account</span>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-red-600 font-black text-[10px] uppercase tracking-[0.4em] py-6 border-2 border-dashed border-red-100 rounded-[32px] hover:bg-red-50 transition-all">Terminate Session</button>
        </div>
      );
      default: return renderHome();
    }
  };

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      role={currentUser?.role || UserRole.USER} 
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;

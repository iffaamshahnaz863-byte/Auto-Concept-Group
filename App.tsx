
import React, { useState, useEffect } from 'react';
import { UserRole, Car, CarCategory, UserProfile } from './types';
import { CATEGORIES } from './constants';
import { Layout } from './components/Layout';
import { CarCard } from './components/CarCard';
import { LanguageToggle } from './components/LanguageToggle';
import { getCarRecommendation } from './services/geminiService';
import { SplashScreen } from './components/SplashScreen';
import { 
  supabase, 
  fetchAvailableCars, 
  fetchUserBookings, 
  fetchAllCars, 
  fetchAllUsers, 
  fetchAllDealers, 
  fetchAllBookings,
  fetchDealerBookings,
  createBookingRecord,
  registerDealerInDb
} from './services/supabase';

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
  
  // App Data State
  const [cars, setCars] = useState<Car[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allDealers, setAllDealers] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Auth States
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Dealer Management
  const [showAddDealerModal, setShowAddDealerModal] = useState(false);
  const [lastCreatedDealer, setLastCreatedDealer] = useState<{email: string, password: string} | null>(null);
  const [dealerForm, setDealerForm] = useState({
    name: '',
    owner_name: '',
    email: '',
    phone: '',
    location: ''
  });

  // Security
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Initial Splash Logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // AUTOMATIC ROLE DETECTION
  const detectUserRole = async (email: string, id: string): Promise<UserProfile | null> => {
    try {
      // 1. Check Admin (email exists in admins table)
      const { data: admin } = await supabase.from('admins').select('*').eq('email', email).maybeSingle();
      if (admin) {
        return { id, name: admin.name || 'Admin', email, phone: '', role: UserRole.ADMIN };
      }

      // 2. Check Dealer (email exists in dealers table)
      const { data: dealer } = await supabase.from('dealers').select('*').eq('email', email).maybeSingle();
      if (dealer) {
        if (!dealer.is_approved) {
          throw new Error("Your account is not approved yet.");
        }
        if (dealer.needs_password_change) {
          setShowPasswordChange(true);
        }
        return { 
          id, 
          name: dealer.name || 'Dealer', 
          email, 
          phone: dealer.phone || '', 
          role: UserRole.DEALER, 
          is_approved: true, 
          needs_password_change: dealer.needs_password_change 
        };
      }

      // 3. Fallback to User
      const { data: user } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
      return { 
        id, 
        name: user?.full_name || 'Member', 
        email, 
        phone: user?.phone || '', 
        role: UserRole.USER 
      };
    } catch (err: any) {
      throw err;
    }
  };

  const loadDataByRole = async (profile: UserProfile) => {
    setIsLoadingData(true);
    try {
      if (profile.role === UserRole.ADMIN) {
        const [u, d, c, b] = await Promise.all([
          fetchAllUsers(),
          fetchAllDealers(),
          fetchAllCars(),
          fetchAllBookings()
        ]);
        setAllUsers(u);
        setAllDealers(d);
        setCars(c);
        setBookings(b);
      } else if (profile.role === UserRole.DEALER) {
        const [dc, db] = await Promise.all([
          supabase.from('cars').select('*').eq('dealer_id', profile.id),
          fetchDealerBookings(profile.id)
        ]);
        setCars(dc.data || []);
        setBookings(db);
      } else {
        const [ac, ub] = await Promise.all([
          fetchAvailableCars(),
          fetchUserBookings(profile.id)
        ]);
        setCars(ac as any);
        setBookings(ub);
      }
    } catch (err) {
      console.error("Critical Load Error", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          throw new Error("Email not confirmed. Please contact admin.");
        }
        throw new Error("Invalid email or password");
      }

      if (data.user) {
        const profile = await detectUserRole(data.user.email!, data.user.id);
        if (profile) {
          setCurrentUser(profile);
          await loadDataByRole(profile);
          const initialTab = profile.role === UserRole.USER ? 'home' : (profile.role === UserRole.DEALER ? 'dealer-dashboard' : 'admin-stats');
          setActiveTab(initialTab);
        }
      }
    } catch (err: any) {
      // RED ALERT SYSTEM
      setAuthError(err.message || "Something went wrong. Please try again.");
      await supabase.auth.signOut();
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: loginEmail.trim(),
        password: loginPassword,
        options: { data: { full_name: signupName } }
      });

      if (error) throw error;

      if (data.user) {
        await supabase.from('users').insert([{ 
          id: data.user.id, 
          full_name: signupName, 
          email: loginEmail.trim(),
          status: 'active'
        }]);
        const profile: UserProfile = { id: data.user.id, name: signupName, email: loginEmail.trim(), phone: '', role: UserRole.USER };
        setCurrentUser(profile);
        await loadDataByRole(profile);
        setActiveTab('home');
      }
    } catch (err: any) {
      setAuthError(err.message || "Signup failed. Ensure credentials are valid.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setAuthMode('login');
    setSelectedCarId(null);
    setActiveTab('home');
    setShowPasswordChange(false);
    setAuthError(null);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      if (currentUser) {
        await supabase.from('dealers').update({ needs_password_change: false }).eq('id', currentUser.id);
      }
      alert("Password updated successfully. Accessing your dashboard.");
      setShowPasswordChange(false);
    } catch (err: any) {
      alert("Security update failed: " + err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAddDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    
    // 1. Trim and Validate Email
    const trimmedEmail = dealerForm.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      alert("Invalid email format. Please check the address.");
      setIsAuthLoading(false);
      return;
    }

    // 2. Auto-generate Temporary Password
    const tempPassword = `Dealer@${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      // 3. Create Dealer in Supabase Auth
      // Note: For auto-confirmation to work immediately via signUp, 
      // the project settings in Supabase must have "Confirm Email" disabled 
      // or this should be handled by an Edge Function with Service Role.
      // We implement signUp and assume project configuration allows immediate login for admin-initiated flows.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: tempPassword,
        options: { data: { full_name: dealerForm.owner_name } }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 4. Register in Dealers Table in Public Schema
        await registerDealerInDb({ 
          ...dealerForm, 
          email: trimmedEmail,
          id: authData.user.id 
        });
        
        // 5. Success UI: Show temporary password to Admin immediately
        setLastCreatedDealer({ email: trimmedEmail, password: tempPassword });
        setDealerForm({ name: '', owner_name: '', email: '', phone: '', location: '' });
        
        // Refresh local dealer list for Admin Dashboard
        const dealers = await fetchAllDealers();
        setAllDealers(dealers);
      }
    } catch (err: any) {
      alert("Dealer enrollment failed: " + err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleBookNow = async (carId: string) => {
    if (!currentUser) {
      alert("Please login to proceed with booking.");
      setAuthMode('login');
      return;
    }

    const car = cars.find(c => c.id === carId);
    if (!car) return;

    setIsLoadingData(true);
    try {
      const bookingData = {
        car_id: carId,
        user_id: currentUser.id,
        dealer_id: car.dealer_id,
        status: 'Confirmed',
        booking_date: new Date().toISOString(),
        token_paid: 25000
      };

      await createBookingRecord(bookingData);
      const ub = await fetchUserBookings(currentUser.id);
      setBookings(ub);
      
      alert(`Success! Booking request for ${car.name} initialized.`);
      setSelectedCarId(null);
      setActiveTab('bookings');
    } catch (err: any) {
      alert("Booking error: " + err.message);
    } finally {
      setIsLoadingData(false);
    }
  };

  const renderAuth = () => (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>

      <div className="w-full max-w-sm space-y-8 z-10 py-10 animate-slide-up">
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-12 shadow-2xl border border-white/20">
            <span className="text-white font-black italic text-3xl">AC</span>
          </div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Auto Concept</h1>
          <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.5em] mt-3">Elite Node Network</p>
        </div>

        <div className="bg-white/10 backdrop-blur-2xl p-8 rounded-[40px] border border-white/10 space-y-6 shadow-2xl">
          <div className="text-center">
            <h2 className="text-white font-black text-2xl italic tracking-tight">
              {authMode === 'login' ? 'Authentication' : 'Registration'}
            </h2>
          </div>

          {/* RED ALERT FOR LOGIN ERRORS */}
          {authError && (
            <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
               <div className="w-2 h-2 bg-red-500 rounded-full"></div>
               <p className="text-red-400 text-xs font-bold leading-tight uppercase tracking-wider">{authError}</p>
            </div>
          )}

          <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="space-y-4">
            {authMode === 'signup' && (
              <input 
                type="text" required value={signupName} onChange={e => setSignupName(e.target.value)} 
                placeholder="Full Name" 
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-6 py-4 text-white text-sm focus:ring-2 focus:ring-blue-600 outline-none" 
              />
            )}
            <input 
              type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} 
              placeholder="Email Address" 
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-6 py-4 text-white text-sm focus:ring-2 focus:ring-blue-600 outline-none" 
            />
            <input 
              type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} 
              placeholder="Password" 
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-6 py-4 text-white text-sm focus:ring-2 focus:ring-blue-600 outline-none" 
            />
            <button 
              type="submit" disabled={isAuthLoading} 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-[24px] shadow-2xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest active:scale-95"
            >
              {isAuthLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (authMode === 'login' ? 'Authorize' : 'Join Node')}
            </button>
          </form>

          <button 
            onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(null); }} 
            className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-blue-500 transition-colors"
          >
            {authMode === 'login' ? "New Member? Create Node" : "Member? Login Instead"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Discovery Engine</h2>
        <LanguageToggle currentLang={language} onToggle={setLanguage} />
      </div>

      <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
        <div className="relative z-10">
          <h3 className="text-2xl font-black italic tracking-tighter mb-4">Auto Advisor AI</h3>
          <div className="flex gap-2">
            <input 
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} 
              placeholder="Describe your ideal drive..." 
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-600 outline-none" 
            />
            <button 
              onClick={async () => {
                setIsAiLoading(true);
                const sug = await getCarRecommendation(searchQuery);
                setAiSuggestion(sug);
                setIsAiLoading(false);
              }} 
              className="bg-blue-600 text-white px-6 rounded-2xl font-black text-xs uppercase active:scale-95 transition-transform"
            >
              {isAiLoading ? '...' : 'ASK'}
            </button>
          </div>
          {aiSuggestion && (
            <div className="mt-6 p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 text-xs animate-slide-up">
              <span className="font-black text-blue-500 uppercase tracking-widest text-[10px]">{aiSuggestion.suggestedCategory}</span>
              <p className="mt-2 opacity-90 leading-relaxed text-slate-300">{aiSuggestion.reasoning}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
        {CATEGORIES.map(cat => (
          <button 
            key={cat} onClick={() => setActiveCategory(cat as any)} 
            className={`px-8 py-4 rounded-[20px] text-[10px] font-black border uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-400'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 px-2 pb-10">
        {isLoadingData ? (
          <div className="py-20 flex flex-col items-center gap-4">
             <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing Fleet</p>
          </div>
        ) : (
          cars.filter(c => c.category === activeCategory).map(car => (
            <CarCard key={car.id} car={car} onClick={id => setSelectedCarId(id)} />
          ))
        )}
      </div>
    </div>
  );

  const renderAdminStats = () => (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black italic tracking-tighter">Global Hub Metrics</h2>
        <div className="bg-green-100 text-green-600 text-[10px] font-black px-3 py-1 rounded-full animate-pulse border border-green-200 uppercase">System Ready</div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { l: 'Members', v: allUsers.length, c: 'text-blue-600' },
          { l: 'Network Nodes', v: allDealers.length, c: 'text-slate-900' },
          { l: 'Asset Orders', v: bookings.length, c: 'text-indigo-600' }
        ].map(s => (
          <div key={s.l} className="bg-white border border-slate-100 p-6 rounded-[30px] text-center shadow-xl hover:scale-105 transition-transform">
            <p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">{s.l}</p>
            <p className={`text-xl font-black ${s.c}`}>{s.v}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAdminDealers = () => (
    <div className="p-6 space-y-6 pb-32">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black italic tracking-tighter">Network Node Mgmt</h2>
        <button 
          onClick={() => { setLastCreatedDealer(null); setShowAddDealerModal(true); }} 
          className="bg-blue-600 text-white p-4 rounded-2xl shadow-xl active:scale-95 transition-all"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      <div className="space-y-4">
        {allDealers.map(d => (
          <div key={d.id} className="bg-white border border-slate-100 p-6 rounded-[32px] shadow-lg flex justify-between items-center">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 uppercase text-[10px]">{d.name.slice(0,2)}</div>
               <div>
                 <p className="text-sm font-black text-slate-900 leading-tight">{d.name}</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{d.location} • {d.owner_name}</p>
               </div>
            </div>
            <div className={`w-3 h-3 rounded-full ${d.is_approved ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,44,44,0.6)]'}`} />
          </div>
        ))}
      </div>

      {showAddDealerModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6 animate-slide-up">
          <div className="w-full max-w-sm bg-white p-8 rounded-[40px] shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]">
            {!lastCreatedDealer ? (
              <>
                <div className="text-center">
                  <h3 className="text-2xl font-black italic">Enroll New Node</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Authorized Dealer Node</p>
                </div>
                <form onSubmit={handleAddDealer} className="space-y-4">
                  <input type="text" required placeholder="Showroom Name" value={dealerForm.name} onChange={e => setDealerForm({...dealerForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-600" />
                  <input type="text" required placeholder="Owner Name" value={dealerForm.owner_name} onChange={e => setDealerForm({...dealerForm, owner_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-600" />
                  <input type="email" required placeholder="Node Email (Login ID)" value={dealerForm.email} onChange={e => setDealerForm({...dealerForm, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-600" />
                  <input type="text" required placeholder="Phone Number" value={dealerForm.phone} onChange={e => setDealerForm({...dealerForm, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-600" />
                  <input type="text" required placeholder="Location / HQ" value={dealerForm.location} onChange={e => setDealerForm({...dealerForm, location: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-600" />
                  
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowAddDealerModal(false)} className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-[20px] uppercase text-[10px] tracking-widest">Abort</button>
                    <button type="submit" disabled={isAuthLoading} className="flex-[2] bg-blue-600 text-white font-black py-4 rounded-[20px] shadow-xl uppercase text-[10px] tracking-widest">
                      {isAuthLoading ? 'Enrolling...' : 'Enroll Node'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center space-y-8 py-6">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black italic text-slate-900">Enrolled!</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dealer Node Access Ready</p>
                </div>
                <div className="bg-slate-900 p-8 rounded-[36px] text-left space-y-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5"><svg width="100" height="100" viewBox="0 0 24 24" fill="white"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg></div>
                  <div className="relative z-10">
                    <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Authorized Email</label>
                    <p className="text-sm font-bold text-white tracking-tight">{lastCreatedDealer.email}</p>
                  </div>
                  <div className="relative z-10">
                    <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Temporary Key</label>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-2xl font-black text-white italic tracking-tight">{lastCreatedDealer.password}</p>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(lastCreatedDealer.password); alert("Password copied to clipboard."); }}
                        className="p-2 bg-white/10 rounded-lg text-blue-400 hover:bg-white/20 transition-colors"
                      >
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => { setShowAddDealerModal(false); setLastCreatedDealer(null); }} 
                  className="w-full bg-blue-600 text-white font-black py-5 rounded-[24px] uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-transform"
                >
                  Confirm & Access Network
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderDealerDashboard = () => (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter">Showroom Terminal</h2>
        <div className="px-4 py-1.5 bg-green-50 text-green-600 text-[10px] font-black rounded-full border border-green-100 uppercase tracking-widest">Authorized</div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 p-8 rounded-[36px] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Local Fleet</p>
          <p className="text-4xl font-black mt-2 italic">{cars.length}</p>
        </div>
        <div className="bg-blue-600 p-8 rounded-[36px] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors"></div>
          <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Inquiries</p>
          <p className="text-4xl font-black mt-2 italic">{bookings.length}</p>
        </div>
      </div>
      <div className="space-y-4 pt-4">
         <h3 className="font-black text-xl italic text-slate-900 tracking-tighter">Asset Reservation Queue</h3>
         {bookings.length === 0 ? (
           <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-12 rounded-[40px] text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">System waiting for incoming customer reservations</p>
           </div>
         ) : (
           bookings.map(b => (
             <div key={b.id} className="bg-white border border-slate-100 p-6 rounded-[32px] shadow-lg flex justify-between items-center group active:scale-95 transition-transform">
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 rounded-2xl bg-slate-50 overflow-hidden"><img src={b.cars?.image} className="w-full h-full object-cover" /></div>
                   <div>
                     <p className="text-sm font-black text-slate-900 leading-tight">{b.cars?.name}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: {b.status}</p>
                   </div>
                </div>
                <button className="bg-slate-50 p-3 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                </button>
             </div>
           ))
         )}
      </div>
    </div>
  );

  const renderContent = () => {
    if (showPasswordChange) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white p-8 rounded-[40px] shadow-2xl space-y-6 animate-slide-up">
            <div className="text-center">
              <h2 className="text-2xl font-black italic text-slate-900 leading-tight">Security Requirement</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">First login password reset required</p>
            </div>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Set Personal Key</label>
                <input 
                  type="password" required placeholder="New Password" value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-600 outline-none" 
                />
              </div>
              <button type="submit" disabled={isAuthLoading} className="w-full bg-blue-600 text-white font-black py-5 rounded-[24px] uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
                {isAuthLoading ? 'Securing Node...' : 'Update & Access Dashboard'}
              </button>
            </form>
          </div>
        </div>
      );
    }

    if (!currentUser) return renderAuth();

    switch (activeTab) {
      case 'home': return renderHome();
      case 'bookings': return (
        <div className="p-6 space-y-8">
           <h2 className="text-3xl font-black italic tracking-tighter">Fleet Asset Logs</h2>
           {bookings.length === 0 ? (
             <div className="py-24 text-center space-y-4 opacity-30">
                <div className="w-16 h-16 bg-slate-200 rounded-3xl flex items-center justify-center mx-auto"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                <p className="font-black text-xs uppercase tracking-widest">No Active Asset Records</p>
             </div>
           ) : (
             bookings.map(b => (
               <div key={b.id} className="bg-white border border-slate-100 p-8 rounded-[44px] shadow-xl flex gap-8 items-center group active:scale-95 transition-all">
                  <div className="w-24 h-24 bg-slate-50 rounded-[28px] overflow-hidden shadow-inner flex-shrink-0"><img src={b.cars?.image} className="w-full h-full object-cover" /></div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-2">ID: {b.id.slice(0,10)}</p>
                    <h4 className="text-xl font-black italic text-slate-900 truncate">{b.cars?.name}</h4>
                    <div className="mt-3 inline-flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                       <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{b.status}</span>
                    </div>
                  </div>
               </div>
             ))
           )}
        </div>
      );
      case 'admin-stats': return renderAdminStats();
      case 'admin-dealers': return renderAdminDealers();
      case 'admin-cms': return (
        <div className="p-6 space-y-6">
           <h2 className="text-3xl font-black italic tracking-tighter">Fleet Master Control</h2>
           <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-12 rounded-[40px] text-center flex flex-col items-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-relaxed">Management terminal for fleet assets and system parameters</p>
              <button className="mt-6 bg-slate-900 text-white px-10 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Update Node Assets</button>
           </div>
        </div>
      );
      case 'dealer-dashboard': return renderDealerDashboard();
      case 'profile': return (
        <div className="p-10 space-y-12 text-center animate-slide-up">
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 bg-slate-900 rounded-[40px] flex items-center justify-center text-white shadow-2xl border-4 border-blue-600/20 rotate-3 group hover:rotate-0 transition-transform">
               <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <h3 className="text-4xl font-black text-slate-900 italic mt-8 tracking-tighter leading-none">{currentUser.name}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-4">{currentUser.email}</p>
            <div className="mt-8 inline-flex items-center gap-3 bg-blue-50 text-blue-600 px-6 py-3 rounded-full border border-blue-100 shadow-sm">
               <div className="w-2 h-2 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,1)]"></div>
               <span className="text-[9px] font-black uppercase tracking-widest">{currentUser.role} PRIVILEGED NODE</span>
            </div>
          </div>
          <div className="pt-8">
            <button 
              onClick={handleLogout} 
              className="w-full text-red-600 font-black text-[11px] uppercase tracking-[0.5em] py-8 border-2 border-dashed border-red-100 rounded-[44px] hover:bg-red-50 hover:border-red-200 transition-all active:scale-95"
            >
              TERMINATE SECURE SESSION
            </button>
          </div>
        </div>
      );
      default: return renderHome();
    }
  };

  if (showSplash) return <SplashScreen />;

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      role={currentUser?.role || UserRole.USER} 
      onLogout={handleLogout}
    >
      {selectedCarId ? (
        <div className="bg-white min-h-screen animate-slide-up">
          <div className="relative">
            <button onClick={() => setSelectedCarId(null)} className="absolute top-8 left-8 z-10 bg-white/90 p-4 rounded-2xl shadow-2xl border border-slate-100 active:scale-90 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div className="w-full aspect-[4/3] bg-slate-100 shadow-inner">
               <img src={cars.find(c => c.id === selectedCarId)?.image} className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="px-10 py-12 -mt-16 bg-white rounded-t-[60px] relative z-10 space-y-10 shadow-2xl pb-40">
            {(() => {
              const car = cars.find(c => c.id === selectedCarId);
              if (!car) return null;
              return (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{car.brand}</span>
                      <h2 className="text-4xl font-black text-slate-900 italic leading-none mt-2 tracking-tighter">{car.name}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black tracking-tighter text-slate-900 italic">₹{(car.price / 100000).toFixed(1)}L</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Ex-Showroom Index</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-7 rounded-[32px] border border-slate-100 text-center space-y-2">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency</p>
                       <p className="text-sm font-black text-slate-900 uppercase italic">{car.mileage}</p>
                    </div>
                    <div className="bg-slate-50 p-7 rounded-[32px] border border-slate-100 text-center space-y-2">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Energy Node</p>
                       <p className="text-sm font-black text-slate-900 uppercase italic">{car.fuel}</p>
                    </div>
                  </div>
                  <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/80 backdrop-blur-2xl p-8 flex gap-4 z-[100] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] border-t border-slate-100">
                    <button 
                      onClick={() => handleBookNow(car.id)} 
                      className="flex-1 bg-blue-600 text-white font-black py-6 rounded-[28px] shadow-2xl shadow-blue-600/30 text-[11px] uppercase tracking-[0.3em] active:scale-95 transition-all"
                    >
                      INITIALIZE ASSET BOOKING
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : renderContent()}
    </Layout>
  );
};

export default App;

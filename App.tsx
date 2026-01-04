
import React, { useState, useEffect } from 'react';
import { UserRole, Car, CarCategory, UserProfile, FuelType, Transmission } from './types';
import { CATEGORIES, BRANDS } from './constants';
import { Layout } from './components/Layout';
import { CarCard } from './components/CarCard';
import { LanguageToggle } from './components/LanguageToggle';
import { getCarRecommendation } from './services/geminiService';
import { SplashScreen } from './components/SplashScreen';
import { initializeRazorpayPayment } from './services/paymentService';
import { generateInvoicePDF } from './services/invoiceService';
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
  registerDealerInDb,
  addCarListing,
  updateCarStatus,
  fetchUserCars,
  updateCarDetails,
  recordPayment,
  fetchBookingInvoices
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

  // Payment Processing State
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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

  // Dealer Add Car Modal
  const [showAddCarModal, setShowAddCarModal] = useState(false);
  const [carForm, setCarForm] = useState<Partial<Car>>({
    brand: BRANDS[0],
    name: '',
    variant: '',
    year: new Date().getFullYear(),
    fuel: FuelType.PETROL,
    transmission: Transmission.MANUAL,
    price: 0,
    emi: 0,
    mileage: '',
    engine: '',
    seats: 5,
    safetyRating: '5 Star',
    location: '',
    category: CarCategory.NEW,
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c3d9?auto=format&fit=crop&q=80&w=800'
  });

  // Dealer Edit Car State
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [editCarForm, setEditCarForm] = useState<Partial<Car>>({});

  // Security
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Initial Boot Sequence
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // ROLE AUTO-DETECTION SYSTEM
  const detectUserRole = async (email: string, id: string): Promise<UserProfile | null> => {
    try {
      const { data: admin, error: adminError } = await supabase.from('admins').select('*').eq('email', email).maybeSingle();
      if (!adminError && admin) return { id, name: admin.name || 'Master Admin', email, phone: '', role: UserRole.ADMIN };

      const { data: dealer, error: dealerError } = await supabase.from('dealers').select('*').eq('email', email).maybeSingle();
      if (!dealerError && dealer) {
        if (!dealer.is_approved) {
          throw new Error("Your account is not approved yet.");
        }
        if (dealer.needs_password_change) {
          setShowPasswordChange(true);
        }
        return { 
          id, 
          name: dealer.name || 'Partner Dealer', 
          email, 
          phone: dealer.phone || '', 
          role: UserRole.DEALER, 
          is_approved: true, 
          needs_password_change: dealer.needs_password_change,
          showroom_name: dealer.name,
          owner_name: dealer.owner_name
        };
      }

      const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
      return { 
        id, 
        name: user?.full_name || 'Valued Member', 
        email, 
        phone: user?.phone || '', 
        role: UserRole.USER 
      };
    } catch (err: any) {
      console.error("Role Detection Failed:", err.message || err);
      throw err;
    }
  };

  const loadDataByRole = async (profile: UserProfile) => {
    setIsLoadingData(true);
    try {
      if (profile.role === UserRole.ADMIN) {
        const results = await Promise.allSettled([
          fetchAllUsers(),
          fetchAllDealers(),
          fetchAllCars(),
          fetchAllBookings()
        ]);
        const [u, d, c, b] = results.map(r => r.status === 'fulfilled' ? r.value : []);
        setAllUsers(u);
        setAllDealers(d);
        setCars(c);
        setBookings(b);
      } else if (profile.role === UserRole.DEALER) {
        const results = await Promise.allSettled([
          fetchUserCars(profile.id),
          fetchDealerBookings(profile.id)
        ]);
        const [dc, db] = results.map(r => r.status === 'fulfilled' ? r.value : []);
        setCars(dc);
        setBookings(db);
      } else {
        const results = await Promise.allSettled([
          fetchAvailableCars(),
          fetchUserBookings(profile.id)
        ]);
        const [ac, ub] = results.map(r => r.status === 'fulfilled' ? r.value : []);
        setCars(ac);
        setBookings(ub);
      }
    } catch (err: any) {
      console.error("Data Load Sequence Interrupted:", err.message || err);
      setAuthError(`Data Sync Interrupted: ${err.message || "Unknown error"}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  // HANDLERS
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
        throw new Error("Invalid email or password.");
      }

      if (data.user) {
        const profile = await detectUserRole(data.user.email!, data.user.id);
        if (profile) {
          setCurrentUser(profile);
          await loadDataByRole(profile);
          const targetTab = profile.role === UserRole.USER ? 'home' : (profile.role === UserRole.DEALER ? 'dealer-dashboard' : 'admin-stats');
          setActiveTab(targetTab);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed. Please check credentials.");
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
        await supabase.from('users').insert([{ id: data.user.id, full_name: signupName, email: loginEmail.trim(), status: 'active' }]);
        const profile: UserProfile = { id: data.user.id, name: signupName, email: loginEmail.trim(), phone: '', role: UserRole.USER };
        setCurrentUser(profile);
        await loadDataByRole(profile);
        setActiveTab('home');
      }
    } catch (err: any) {
      setAuthError(err.message || "Signup sequence failed.");
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
    setEditingCarId(null);
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
      alert("Credential update successful. Loading dashboard...");
      setShowPasswordChange(false);
    } catch (err: any) {
      alert("Update restricted: " + (err.message || "Unknown error"));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAddDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    const trimmedEmail = dealerForm.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(trimmedEmail)) {
      alert("Invalid email format detected.");
      setIsAuthLoading(false);
      return;
    }

    const tempPassword = `Dealer@${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: tempPassword,
        options: { data: { full_name: dealerForm.owner_name } }
      });
      if (authError) throw authError;
      if (authData.user) {
        await registerDealerInDb({ ...dealerForm, email: trimmedEmail, id: authData.user.id });
        setLastCreatedDealer({ email: trimmedEmail, password: tempPassword });
        setDealerForm({ name: '', owner_name: '', email: '', phone: '', location: '' });
        const dealers = await fetchAllDealers();
        setAllDealers(dealers);
      }
    } catch (err: any) {
      alert("Dealer enrollment failed: " + (err.message || "Unknown error"));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleBookNow = async (carId: string) => {
    if (!currentUser) {
      setAuthMode('login');
      return;
    }
    const car = cars.find(c => c.id === carId);
    if (!car) return;

    setIsProcessingPayment(true);

    initializeRazorpayPayment({
      car,
      user: currentUser,
      onSuccess: async (response) => {
        try {
          // 1. Record Successful Payment
          await recordPayment({
            payment_id: response.razorpay_payment_id,
            amount: 25000,
            currency: 'INR',
            status: 'success',
            user_id: currentUser.id,
            dealer_id: car.dealer_id,
            car_id: car.id,
            created_at: new Date().toISOString()
          });

          // 2. Create Booking
          const booking = await createBookingRecord({
            car_id: car.id,
            user_id: currentUser.id,
            dealer_id: car.dealer_id,
            status: 'Confirmed',
            created_at: new Date().toISOString(),
            token_paid: 25000
          });

          // 3. Update Car Status
          await updateCarStatus(car.id, 'booked');

          // 4. Generate & Save Invoice
          if (booking) {
            await generateInvoicePDF(booking, currentUser, car, response.razorpay_payment_id);
          }

          alert(`Payment successful! Booking confirmed for ${car.name}. Invoice is available in your bookings.`);
          
          // Refresh Data
          await loadDataByRole(currentUser);
          setSelectedCarId(null);
          setActiveTab('bookings');
        } catch (err: any) {
          console.error("Post-payment error:", err);
          alert("Payment was successful but updating records failed. Please contact support with Payment ID: " + response.razorpay_payment_id);
        } finally {
          setIsProcessingPayment(false);
        }
      },
      onFailure: (error) => {
        setIsProcessingPayment(false);
        alert("Payment failed: " + (error.description || error.message || "Transaction aborted."));
        // Record failed attempt for analytics/logs
        recordPayment({
          amount: 25000,
          currency: 'INR',
          status: 'failed',
          user_id: currentUser.id,
          dealer_id: car.dealer_id,
          car_id: car.id,
          created_at: new Date().toISOString()
        }).catch(e => console.error("Log failed payment failed", e));
      }
    });
  };

  const handleDownloadInvoice = async (booking: any) => {
    try {
      const invoices = await fetchBookingInvoices(booking.id);
      if (invoices && invoices.length > 0 && invoices[0].invoice_url) {
        window.open(invoices[0].invoice_url, '_blank');
      } else {
        alert("Invoice generation in progress. Please check again in a few moments.");
      }
    } catch (err) {
      alert("Could not retrieve invoice link.");
    }
  };

  const handleAddCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsAuthLoading(true);
    try {
      const carData = {
        ...carForm,
        dealer_id: currentUser.id,
        status: 'available',
        gallery: [carForm.image]
      };
      await addCarListing(carData);
      const dc = await fetchUserCars(currentUser.id);
      setCars(dc);
      setShowAddCarModal(false);
      setCarForm({
        brand: BRANDS[0],
        name: '',
        variant: '',
        year: new Date().getFullYear(),
        fuel: FuelType.PETROL,
        transmission: Transmission.MANUAL,
        price: 0,
        emi: 0,
        mileage: '',
        engine: '',
        seats: 5,
        safetyRating: '5 Star',
        location: '',
        category: CarCategory.NEW,
        image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c3d9?auto=format&fit=crop&q=80&w=800'
      });
      alert("Car listing created successfully.");
    } catch (err: any) {
      alert("Failed to add car: " + (err.message || "Unknown error"));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSaveEditCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !editingCarId) return;
    setIsAuthLoading(true);
    try {
      const updateData = {
        brand: editCarForm.brand,
        name: editCarForm.name,
        variant: editCarForm.variant,
        year: editCarForm.year,
        fuel: editCarForm.fuel,
        transmission: editCarForm.transmission,
        price: editCarForm.price,
        emi: editCarForm.emi,
        mileage: editCarForm.mileage,
        engine: editCarForm.engine,
        seats: editCarForm.seats,
        safetyRating: editCarForm.safetyRating,
        location: editCarForm.location,
        image: editCarForm.image,
        category: editCarForm.category,
        gallery: [editCarForm.image]
      };
      
      await updateCarDetails(editingCarId, currentUser.id, updateData);
      const dc = await fetchUserCars(currentUser.id);
      setCars(dc);
      setEditingCarId(null);
      setEditCarForm({});
      alert("Car details updated successfully");
    } catch (err: any) {
      alert("Update failed: " + (err.message || "Unknown error"));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleStatusUpdate = async (carId: string, status: string) => {
    if (!currentUser) return;
    try {
      await updateCarStatus(carId, status);
      const dc = await fetchUserCars(currentUser.id);
      setCars(dc);
    } catch (err: any) {
      alert("Status update failed: " + (err.message || "Unknown error"));
    }
  };

  // UI RENDERERS
  const renderAuth = () => (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
      
      <div className="w-full max-w-sm space-y-10 z-10 animate-slide-up">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-blue-600 rounded-[32px] flex items-center justify-center mx-auto rotate-12 shadow-2xl border border-white/20 shadow-blue-600/40">
            <span className="text-white font-black italic text-4xl -rotate-12">AC</span>
          </div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Auto Concept</h1>
          <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.5em]">Security Terminal v2.5</p>
        </div>

        <div className="bg-white/10 backdrop-blur-3xl p-8 rounded-[48px] border border-white/10 space-y-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          <div className="text-center">
            <h2 className="text-white font-black text-2xl italic tracking-tight uppercase">
              {authMode === 'login' ? 'Authentication' : 'Enrollment'}
            </h2>
          </div>

          {authError && (
            <div className="bg-red-500/20 border border-red-500/40 p-5 rounded-3xl flex items-center gap-4 animate-in fade-in zoom-in duration-300">
               <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(239,44,44,1)]"></div>
               <p className="text-red-400 text-xs font-black leading-tight uppercase tracking-wider">{authError}</p>
            </div>
          )}

          <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="space-y-5">
            {authMode === 'signup' && (
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-4 tracking-widest">Full Name</label>
                <input type="text" required value={signupName} onChange={e => setSignupName(e.target.value)} placeholder="Member Name" className="w-full bg-slate-800/60 border border-white/10 rounded-3xl px-7 py-5 text-white text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-600" />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-4 tracking-widest">Email Node</label>
              <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="name@domain.com" className="w-full bg-slate-800/60 border border-white/10 rounded-3xl px-7 py-5 text-white text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-600" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-4 tracking-widest">Access Key</label>
              <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-800/60 border border-white/10 rounded-3xl px-7 py-5 text-white text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-600" />
            </div>
            
            <button type="submit" disabled={isAuthLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-6 rounded-[32px] shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-[0.2em] active:scale-95 disabled:opacity-50">
              {isAuthLoading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : (authMode === 'login' ? 'Initialize' : 'Register')}
            </button>
          </form>

          <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(null); }} className="w-full text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] hover:text-blue-500 transition-colors">
            {authMode === 'login' ? "New Member? Join Node" : "Existing Member? Authenticate"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Discovery Protocol</h2>
        <LanguageToggle currentLang={language} onToggle={setLanguage} />
      </div>

      <div className="bg-slate-900 rounded-[48px] p-10 text-white shadow-2xl relative overflow-hidden group border border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent"></div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
             </div>
             <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Auto Advisor</h3>
          </div>
          <div className="flex gap-3">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Describe your dream drive..." className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-600" />
            <button onClick={async () => { setIsAiLoading(true); setAiSuggestion(await getCarRecommendation(searchQuery)); setIsAiLoading(false); }} className="bg-blue-600 text-white px-8 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 shadow-xl shadow-blue-600/20">
              {isAiLoading ? '...' : 'ANALYZ'}
            </button>
          </div>
          {aiSuggestion && (
            <div className="mt-6 p-8 bg-white/5 backdrop-blur-xl rounded-[32px] border border-white/10 text-xs animate-slide-up">
              <span className="font-black text-blue-500 uppercase tracking-[0.3em] text-[9px]">{aiSuggestion.suggestedCategory}</span>
              <p className="mt-3 opacity-90 leading-relaxed text-slate-300 font-medium text-[13px]">{aiSuggestion.reasoning}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 -mx-2 px-2">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat as any)} className={`px-10 py-5 rounded-[24px] text-[10px] font-black border uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-blue-600 border-blue-600 text-white shadow-2xl shadow-blue-600/30 scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-10 pb-32">
        {isLoadingData ? (
          <div className="py-24 flex flex-col items-center gap-6 opacity-40">
             <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.5em]">Syncing Master Fleet</p>
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
    <div className="p-8 space-y-10 pb-32">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900">Hub Metrics</h2>
        <div className="bg-green-100 text-green-600 text-[9px] font-black px-4 py-2 rounded-full border border-green-200 uppercase tracking-widest flex items-center gap-2">
           <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
           ACTIVE
        </div>
      </div>
      <div className="grid grid-cols-3 gap-5">
        {[
          { l: 'Members', v: allUsers.length, c: 'text-blue-600', bg: 'bg-blue-50' },
          { l: 'Nodes', v: allDealers.length, c: 'text-slate-900', bg: 'bg-slate-50' },
          { l: 'Orders', v: bookings.length, c: 'text-indigo-600', bg: 'bg-indigo-50' }
        ].map(s => (
          <div key={s.l} className={`${s.bg} border border-slate-100 p-8 rounded-[40px] text-center shadow-xl hover:translate-y-[-4px] transition-all`}>
            <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest leading-none">{s.l}</p>
            <p className={`text-2xl font-black ${s.c} leading-none tracking-tighter italic`}>{s.v}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAdminDealers = () => (
    <div className="p-8 space-y-8 pb-32">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900">Node Network</h2>
        <button onClick={() => { setLastCreatedDealer(null); setShowAddDealerModal(true); }} className="bg-blue-600 text-white p-5 rounded-3xl shadow-2xl shadow-blue-600/30 active:scale-95 transition-all">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="5"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      <div className="space-y-5">
        {allDealers.map(d => (
          <div key={d.id} className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-xl flex justify-between items-center group hover:border-blue-200 transition-colors">
            <div className="flex items-center gap-6">
               <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center font-black text-slate-400 uppercase text-xs group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">{d.name.slice(0,2)}</div>
               <div className="space-y-1">
                 <p className="text-lg font-black text-slate-900 leading-none italic">{d.name}</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d.location} • {d.owner_name}</p>
               </div>
            </div>
            <div className={`w-4 h-4 rounded-full ${d.is_approved ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,44,44,0.8)]'}`} />
          </div>
        ))}
      </div>
    </div>
  );

  const renderDealerDashboard = () => (
    <div className="p-8 space-y-10 pb-32">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">Showroom Hub</h2>
        <div className="px-6 py-2 bg-green-50 text-green-600 text-[10px] font-black rounded-full border border-green-200 uppercase tracking-[0.3em]">
          {currentUser?.is_approved ? 'AUTHORIZED' : 'PENDING'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-600/10 group-hover:bg-blue-600/20 transition-colors"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Managed Assets</p>
          <p className="text-5xl font-black mt-4 italic tracking-tighter">{cars.length}</p>
        </div>
        <div className="bg-blue-600 p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-colors"></div>
          <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest leading-none">Active Leads</p>
          <p className="text-5xl font-black mt-4 italic tracking-tighter">
            {bookings.filter(b => ['Requested', 'Confirmed'].includes(b.status)).length}
          </p>
        </div>
      </div>

      <div className="space-y-6 pt-6">
         <h3 className="font-black text-2xl italic text-slate-900 tracking-tighter uppercase">Reservation Pipeline</h3>
         {bookings.length === 0 ? (
           <div className="bg-slate-50 border-3 border-dashed border-slate-200 p-16 rounded-[56px] text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] leading-relaxed">System waiting for incoming customer reservations...</p>
           </div>
         ) : (
           bookings.map(b => (
             <div key={b.id} className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-xl flex justify-between items-center group hover:translate-y-[-4px] transition-all">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 rounded-[20px] bg-slate-50 overflow-hidden shadow-inner">
                      <img src={b.cars?.image} className="w-full h-full object-cover" />
                   </div>
                   <div className="space-y-1">
                     <p className="text-lg font-black text-slate-900 italic leading-none">{b.cars?.name}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ref: {b.id.slice(0,12)}</p>
                     <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Amount: ₹{b.token_paid.toLocaleString()}</p>
                   </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <div className={`px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                      b.status === 'Confirmed' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                      b.status === 'Delivered' ? 'bg-green-50 text-green-600 border-green-100' : 
                      'bg-slate-50 text-slate-500 border-slate-100'
                   }`}>
                      {b.status}
                   </div>
                   <button onClick={() => handleDownloadInvoice(b)} className="text-[8px] font-black text-blue-600 uppercase underline tracking-widest mt-1">View Invoice</button>
                </div>
             </div>
           ))
         )}
      </div>

      <div className="pt-6">
        <button 
          onClick={() => setShowAddCarModal(true)}
          className="w-full bg-slate-900 text-white font-black py-8 rounded-[36px] text-xs uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all"
        >
          Add New Listing
        </button>
      </div>
    </div>
  );

  const renderDealerCars = () => (
    <div className="p-8 space-y-10 pb-32">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">Managed Fleet</h2>
        <button 
          onClick={() => setShowAddCarModal(true)}
          className="bg-blue-600 text-white p-5 rounded-3xl shadow-2xl shadow-blue-600/30 active:scale-95 transition-all"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="5"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>

      <div className="space-y-8">
        {cars.length === 0 ? (
          <div className="py-24 text-center opacity-30 space-y-4">
             <div className="w-20 h-20 bg-slate-100 rounded-[32px] flex items-center justify-center mx-auto text-slate-300">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg>
             </div>
             <p className="font-black text-xs uppercase tracking-[0.5em]">No Assets Found</p>
          </div>
        ) : (
          cars.map(car => (
            <div key={car.id} className="bg-white border border-slate-100 rounded-[44px] shadow-xl overflow-hidden group">
               <div className="aspect-[21/9] overflow-hidden">
                  <img src={car.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
               </div>
               <div className="p-8 space-y-6">
                  <div className="flex justify-between items-start">
                     <div className="space-y-1">
                        <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-none">{car.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{car.variant} • {car.year}</p>
                     </div>
                     <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        car.status === 'available' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                     }`}>
                        {car.status}
                     </div>
                  </div>

                  <div className="flex gap-3">
                     <button 
                        onClick={() => handleStatusUpdate(car.id, car.status === 'available' ? 'sold' : 'available')}
                        className={`flex-1 font-black py-4 rounded-[20px] text-[9px] uppercase tracking-widest transition-all ${
                           car.status === 'available' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                        }`}
                     >
                        Mark {car.status === 'available' ? 'as Sold' : 'as Available'}
                     </button>
                     <button 
                        onClick={() => {
                          setEditingCarId(car.id);
                          setEditCarForm({...car});
                        }}
                        className="bg-slate-50 p-4 rounded-[20px] text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                     </button>
                  </div>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderEditCar = () => (
    <div className="p-8 space-y-10 pb-32 animate-in fade-in duration-500">
      <div className="flex items-center gap-6">
        <button 
          onClick={() => setEditingCarId(null)}
          className="bg-slate-50 p-4 rounded-2xl text-slate-400 active:scale-90 transition-transform"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">Edit Asset</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Update Vehicle Parameters</p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 p-8 rounded-[56px] shadow-3xl">
        <form onSubmit={handleSaveEditCar} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-4">Brand Node</label>
            <select 
              value={editCarForm.brand} 
              onChange={e => setEditCarForm({...editCarForm, brand: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 text-sm outline-none focus:ring-2 focus:ring-blue-600"
            >
              {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-4">Model Name</label>
            <input type="text" required value={editCarForm.name} onChange={e => setEditCarForm({...editCarForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 text-sm outline-none focus:ring-2 focus:ring-blue-600" />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-4">Release Year</label>
              <input type="number" required value={editCarForm.year} onChange={e => setEditCarForm({...editCarForm, year: parseInt(e.target.value) || 2024})} className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 text-sm outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-4">Energy Type</label>
              <select 
                value={editCarForm.fuel} 
                onChange={e => setEditCarForm({...editCarForm, fuel: e.target.value as FuelType})}
                className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 text-sm outline-none focus:ring-2 focus:ring-blue-600"
              >
                {Object.values(FuelType).map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-4">Valuation (₹)</label>
              <input type="number" required value={editCarForm.price} onChange={e => setEditCarForm({...editCarForm, price: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 text-sm outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-4">Monthly Index (₹)</label>
              <input type="number" required value={editCarForm.emi} onChange={e => setEditCarForm({...editCarForm, emi: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 text-sm outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-4">Master Asset Image</label>
            <input type="text" required value={editCarForm.image} onChange={e => setEditCarForm({...editCarForm, image: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 text-sm outline-none focus:ring-2 focus:ring-blue-600" />
          </div>

          <div className="pt-6">
            <button type="submit" disabled={isAuthLoading} className="w-full bg-blue-600 text-white font-black py-7 rounded-[32px] shadow-3xl shadow-blue-600/30 uppercase text-xs tracking-[0.4em] active:scale-95 transition-all">
              {isAuthLoading ? 'Updating Hub...' : 'Save Configuration Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderContent = () => {
    if (showPasswordChange) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 animate-in fade-in duration-700">
          <div className="w-full max-w-sm bg-white p-10 rounded-[56px] shadow-3xl space-y-10 animate-slide-up">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-black italic text-slate-900 uppercase tracking-tighter leading-tight">Security Check</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] leading-relaxed">First login personal key update required</p>
            </div>
            <form onSubmit={handlePasswordUpdate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-5 tracking-widest">Permanent Node Key</label>
                <input type="password" required placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all" />
              </div>
              <button type="submit" disabled={isAuthLoading} className="w-full bg-blue-600 text-white font-black py-7 rounded-[32px] uppercase tracking-[0.3em] text-xs shadow-2xl active:scale-95 transition-all">
                {isAuthLoading ? 'Securing Node...' : 'Establish Secure Connection'}
              </button>
            </form>
          </div>
        </div>
      );
    }

    if (!currentUser) return renderAuth();
    if (editingCarId) return renderEditCar();

    switch (activeTab) {
      case 'home': return renderHome();
      case 'bookings': return (
        <div className="p-8 space-y-10">
           <h2 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900">My Asset Vault</h2>
           {bookings.length === 0 ? (
             <div className="py-32 text-center opacity-30 space-y-4">
                <div className="w-20 h-20 bg-slate-100 rounded-[32px] flex items-center justify-center mx-auto text-slate-300">
                   <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <p className="font-black text-xs uppercase tracking-[0.5em]">No Asset Records Found</p>
             </div>
           ) : (
             bookings.map(b => (
               <div key={b.id} className="bg-white border border-slate-100 p-10 rounded-[56px] shadow-2xl flex gap-8 items-center group active:scale-95 transition-all">
                  <div className="w-28 h-28 bg-slate-50 rounded-[36px] overflow-hidden shadow-inner flex-shrink-0 group-hover:rotate-3 transition-transform"><img src={b.cars?.image} className="w-full h-full object-cover" /></div>
                  <div className="min-w-0 space-y-3">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.4em] leading-none">Ref: {b.id.slice(0,8)}</p>
                    <h4 className="text-2xl font-black italic text-slate-900 truncate leading-none">{b.cars?.name}</h4>
                    <div className="flex gap-2">
                       <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full border border-blue-100">
                          <div className="w-2 h-2 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,1)]"></div>
                          <span className="text-[9px] font-black uppercase tracking-widest">{b.status}</span>
                       </div>
                       <button onClick={() => handleDownloadInvoice(b)} className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full border border-slate-200 text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Invoice
                       </button>
                    </div>
                  </div>
               </div>
             ))
           )}
        </div>
      );
      case 'admin-stats': return renderAdminStats();
      case 'admin-dealers': return renderAdminDealers();
      case 'dealer-dashboard': return renderDealerDashboard();
      case 'dealer-cars': return renderDealerCars();
      case 'profile': return (
        <div className="p-12 space-y-12 text-center animate-slide-up">
          <div className="flex flex-col items-center">
            <div className="w-40 h-40 bg-slate-900 rounded-[56px] flex items-center justify-center text-white shadow-3xl border-4 border-blue-600/20 rotate-6 group hover:rotate-0 transition-transform duration-700">
               <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <h3 className="text-4xl font-black text-slate-900 italic mt-10 tracking-tighter leading-none">
               {currentUser.role === UserRole.DEALER ? currentUser.showroom_name : currentUser.name}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mt-6 leading-none">{currentUser.email}</p>
            {currentUser.role === UserRole.DEALER && (
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Owner: {currentUser.owner_name}</p>
            )}
            <div className="mt-10 inline-flex items-center gap-4 bg-blue-50 text-blue-600 px-8 py-4 rounded-full border border-blue-100 shadow-xl shadow-blue-600/10">
               <div className="w-3 h-3 bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,1)]"></div>
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">{currentUser.role} PRIVILEGED ACCESS</span>
            </div>
          </div>
          <div className="pt-12">
            <button onClick={handleLogout} className="w-full text-red-600 font-black text-[12px] uppercase tracking-[0.6em] py-10 border-3 border-dashed border-red-100 rounded-[56px] hover:bg-red-50 hover:border-red-200 transition-all active:scale-95 leading-none">
              Terminate Session
            </button>
          </div>
        </div>
      );
      default: return renderHome();
    }
  };

  if (showSplash) return <SplashScreen />;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} role={currentUser?.role || UserRole.USER} onLogout={handleLogout}>
      {selectedCarId ? (
        <div className="bg-white min-h-screen animate-slide-up">
          <div className="relative">
            <button onClick={() => setSelectedCarId(null)} className="absolute top-10 left-10 z-50 bg-white/90 p-5 rounded-3xl shadow-2xl border border-slate-100 active:scale-90 transition-transform backdrop-blur-md">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="5"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div className="w-full aspect-[4/3] bg-slate-100 shadow-inner overflow-hidden">
               <img src={cars.find(c => c.id === selectedCarId)?.image} className="w-full h-full object-cover scale-110 hover:scale-100 transition-transform duration-[2000ms]" />
            </div>
          </div>
          <div className="px-12 py-16 -mt-20 bg-white rounded-t-[80px] relative z-10 space-y-12 shadow-[0_-32px_64px_-16px_rgba(0,0,0,0.1)] pb-40">
            {(() => {
              const car = cars.find(c => c.id === selectedCarId);
              if (!car) return null;
              return (
                <>
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">{car.brand} Fleet</span>
                      <h2 className="text-5xl font-black text-slate-900 italic leading-none tracking-tighter uppercase">{car.name}</h2>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-4xl font-black tracking-tighter text-slate-900 italic leading-none">₹{(car.price / 100000).toFixed(1)}L</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ex-Showroom Price</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="bg-slate-50 p-10 rounded-[44px] border border-slate-100 text-center space-y-3 hover:bg-slate-100 transition-colors">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Range Index</p>
                       <p className="text-base font-black text-slate-900 uppercase italic tracking-tighter leading-none">{car.mileage}</p>
                    </div>
                    <div className="bg-slate-50 p-10 rounded-[44px] border border-slate-100 text-center space-y-3 hover:bg-slate-100 transition-colors">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Energy Core</p>
                       <p className="text-base font-black text-slate-900 uppercase italic tracking-tighter leading-none">{car.fuel}</p>
                    </div>
                  </div>
                  <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/90 backdrop-blur-3xl p-10 flex gap-5 z-[100] shadow-[0_-32px_64px_-16px_rgba(0,0,0,0.15)] border-t border-slate-100 rounded-t-[56px]">
                    <button 
                      onClick={() => handleBookNow(car.id)} 
                      disabled={isProcessingPayment}
                      className="flex-1 bg-blue-600 text-white font-black py-8 rounded-[36px] shadow-3xl shadow-blue-600/30 text-xs uppercase tracking-[0.4em] active:scale-95 transition-all disabled:bg-slate-400"
                    >
                      {isProcessingPayment ? 'Processing Gateway...' : 'Initialize Booking (₹25,000)'}
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

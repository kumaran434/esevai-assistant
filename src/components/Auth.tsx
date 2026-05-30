import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface AuthProps {
  onLogin: (agentId: string, agentName: string) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedState, setSelectedState] = useState('Tamil Nadu');
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const states = [
    { name: 'Tamil Nadu', code: 'TN', lang: 'ta' },
    { name: 'Kerala', code: 'KL', lang: 'ml' },
    { name: 'Karnataka', code: 'KA', lang: 'kn' },
    { name: 'Andhra Pradesh', code: 'AP', lang: 'te' },
    { name: 'Puducherry', code: 'PY', lang: 'ta' }
  ];

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setErrorMsg(null);
    const emailStr = email.trim();
    const displayName = emailStr.split('@')[0] || 'Agent';

    if (isSignup) {
      try {
        // Try Firebase Auth Signup
        const userCredential = await createUserWithEmailAndPassword(auth, emailStr, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName });

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          displayName,
          state: selectedState,
          language: "ta",
          createdAt: new Date().toISOString()
        });

        onLogin(user.uid, displayName);
      } catch (err: any) {
        console.error("Firebase SignUp error:", err);
        
        let customError = "பதிவு செய்வதில் பிழை ஏற்பட்டது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.";
        if (err.code === 'auth/email-already-in-use') {
          customError = "இந்த மின்னஞ்சல் முகவரி ஏற்கனவேப் பயன்பாட்டில் உள்ளது!";
        } else if (err.code === 'auth/invalid-email') {
          customError = "மின்னஞ்சல் முகவரி தவறானது!";
        } else if (err.code === 'auth/weak-password') {
          customError = "கடவுச்சொல் மிகவும் எளிமையாக உள்ளது (குறைந்தது 6 எழுத்துக்கள் இருக்க வேண்டும்)!";
        } else if (err.message) {
          customError = err.message;
        }
        setErrorMsg(customError);
      } finally {
        setAuthLoading(false);
      }
    } else {
      try {
        // Try Firebase Auth Login
        const userCredential = await signInWithEmailAndPassword(auth, emailStr, password);
        onLogin(userCredential.user.uid, userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Agent');
      } catch (err: any) {
        console.error("Firebase Login error:", err);
        
        let customError = "உள்நுழைவதில் பிழை ஏற்பட்டது. தயவுசெய்து உங்கள் விவரங்களைச் சரிபார்க்கவும்.";
        if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          customError = "மின்னஞ்சல் அல்லது கடவுச்சொல் தவறானது!";
        } else if (err.code === 'auth/invalid-email') {
          customError = "மின்னஞ்சல் முகவரி தவறானது!";
        } else if (err.message) {
          customError = err.message;
        }
        setErrorMsg(customError);
      } finally {
        setAuthLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
            {isSignup ? "Sign Up" : "Login"}
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">
            {isSignup ? "Create your new secure account" : "Access your workspace panel"}
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-bold text-xs">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAuthAction} className="space-y-4">
          <div className="relative">
             <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="w-full h-14 pl-14 pr-6 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-600 focus:bg-white transition-all outline-none"
              required
            />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type={showPassword ? "text" : "password"} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full h-14 pl-14 pr-14 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-600 focus:bg-white transition-all outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          
          {isSignup && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Select your working State</label>
              <select 
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full h-14 px-6 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-600 focus:bg-white transition-all outline-none appearance-none"
              >
                {states.map(s => (
                  <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          )}

          <button 
            type="submit"
            disabled={authLoading}
            className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-blue-600 transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            {authLoading ? "Processing..." : (isSignup ? "Sign Up" : "Login")}
          </button>
        </form>

        <div className="text-center">
          <button 
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setErrorMsg(null);
            }}
            className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
          >
            {isSignup ? "Already have an account? Login" : "New member? Sign Up"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

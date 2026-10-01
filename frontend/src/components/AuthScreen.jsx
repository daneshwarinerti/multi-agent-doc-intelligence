import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Lock, Mail, User, AlertCircle, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function AuthScreen() {
  const { login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);

  // Isolated Form State for Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Isolated Form State for Signup (Starts completely empty)
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  // Error & Loading States
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  // Switch between Log In and Create Account modes with clean state initialization
  const switchMode = (signupMode) => {
    setIsSignup(signupMode);
    setServerError('');
    setEmailError('');
    setPasswordError('');
    // Clear all fields on mode toggle to prevent credential leakage between forms
    setLoginEmail('');
    setLoginPassword('');
    setShowLoginPassword(false);
    setSignupName('');
    setSignupEmail('');
    setSignupPassword('');
    setSignupConfirmPassword('');
    setShowSignupPassword(false);
    setShowSignupConfirmPassword(false);
  };

  const validateEmail = (val) => {
    if (!val || !val.trim()) {
      setEmailError('');
      return false;
    }
    if (!EMAIL_REGEX.test(val.trim())) {
      setEmailError('Enter a valid email address.');
      return false;
    } else {
      setEmailError('');
      return true;
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setServerError('');
    setPasswordError('');

    if (!validateEmail(loginEmail)) {
      setEmailError('Enter a valid email address.');
      return;
    }

    if (!loginPassword) {
      setPasswordError('Password is required.');
      return;
    }

    setLoading(true);
    try {
      await login(loginEmail.trim(), loginPassword);
    } catch (err) {
      setServerError(err.message || 'Unable to sign in right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setServerError('');
    setPasswordError('');

    if (!validateEmail(signupEmail)) {
      setEmailError('Enter a valid email address.');
      return;
    }

    if (!signupPassword) {
      setPasswordError('Password is required.');
      return;
    }

    if (signupPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await signup(signupEmail.trim(), signupPassword, signupName.trim());
    } catch (err) {
      setServerError(err.message || 'Unable to create account right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0F17] text-slate-100 flex items-center justify-center p-4 font-sans select-text">
      <div className="w-full max-w-md bg-[#151C28] border border-[#232D3F] rounded-2xl shadow-2xl p-8 flex flex-col gap-6 relative overflow-hidden">
        {/* Glow Accent Effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center border border-primary/30 shadow-xs mb-1">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-white">
            Nexus AI
          </h1>
          <p className="text-xs text-slate-400">
            Multi-Agent Document Intelligence System
          </p>
        </div>

        {/* Mode Switcher Pills */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#0E131F] rounded-xl border border-[#232D3F] text-xs">
          <button
            type="button"
            onClick={() => switchMode(false)}
            className={`py-2 rounded-lg font-medium transition-all ${
              !isSignup
                ? 'bg-[#151C28] text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => switchMode(true)}
            className={`py-2 rounded-lg font-medium transition-all ${
              isSignup
                ? 'bg-[#151C28] text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Conditional Forms for Login vs Signup */}
        {isSignup ? (
          /* CREATE ACCOUNT FORM */
          <form onSubmit={handleSignupSubmit} key="signup-form" className="flex flex-col gap-4" autoComplete="on">
            {/* Full Name (Optional) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Full Name (Optional)
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="text"
                  name="name"
                  id="signup-name"
                  autoComplete="name"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full h-10 pl-10 pr-3 rounded-xl bg-[#0E131F] text-xs text-white placeholder:text-slate-500 border border-[#232D3F] focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="email"
                  name="email"
                  id="signup-email"
                  autoComplete="email"
                  value={signupEmail}
                  onChange={(e) => {
                    setSignupEmail(e.target.value);
                    validateEmail(e.target.value);
                  }}
                  placeholder="Enter your email address"
                  className={`w-full h-10 pl-10 pr-3 rounded-xl bg-[#0E131F] text-xs text-white placeholder:text-slate-500 border transition-colors focus:outline-none ${
                    emailError ? 'border-red-500/80 focus:border-red-500' : 'border-[#232D3F] focus:border-primary'
                  }`}
                />
              </div>
              {emailError && (
                <span className="text-[11px] text-red-400 font-medium pl-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {emailError}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  name="new-password"
                  id="signup-password"
                  autoComplete="new-password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 pl-10 pr-10 rounded-xl bg-[#0E131F] text-xs text-white placeholder:text-slate-500 border border-[#232D3F] focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors p-0.5 focus:outline-none"
                  title={showSignupPassword ? 'Hide password' : 'Show password'}
                  tabIndex="-1"
                >
                  {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type={showSignupConfirmPassword ? 'text' : 'password'}
                  name="confirm-password"
                  id="signup-confirm-password"
                  autoComplete="new-password"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 pl-10 pr-10 rounded-xl bg-[#0E131F] text-xs text-white placeholder:text-slate-500 border border-[#232D3F] focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors p-0.5 focus:outline-none"
                  title={showSignupConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex="-1"
                >
                  {showSignupConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {passwordError && (
              <span className="text-[11px] text-red-400 font-medium pl-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {passwordError}
              </span>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-all shadow-md flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Creating Account...</span>
                </div>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* LOGIN FORM */
          <form onSubmit={handleLoginSubmit} key="login-form" className="flex flex-col gap-4" autoComplete="on">
            {/* Email Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="email"
                  name="username"
                  id="login-email"
                  autoComplete="username email"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    validateEmail(e.target.value);
                  }}
                  placeholder="Enter your email address"
                  className={`w-full h-10 pl-10 pr-3 rounded-xl bg-[#0E131F] text-xs text-white placeholder:text-slate-500 border transition-colors focus:outline-none ${
                    emailError ? 'border-red-500/80 focus:border-red-500' : 'border-[#232D3F] focus:border-primary'
                  }`}
                />
              </div>
              {emailError && (
                <span className="text-[11px] text-red-400 font-medium pl-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {emailError}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  name="password"
                  id="login-password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 pl-10 pr-10 rounded-xl bg-[#0E131F] text-xs text-white placeholder:text-slate-500 border border-[#232D3F] focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors p-0.5 focus:outline-none"
                  title={showLoginPassword ? 'Hide password' : 'Show password'}
                  tabIndex="-1"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {passwordError && (
              <span className="text-[11px] text-red-400 font-medium pl-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {passwordError}
              </span>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-all shadow-md flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <>
                  <span>Log In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Toggle Text */}
        <div className="text-center text-xs text-slate-400 pt-2 border-t border-[#232D3F]">
          {isSignup ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode(false)}
                className="text-primary hover:underline font-semibold"
              >
                Log In
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode(true)}
                className="text-primary hover:underline font-semibold"
              >
                Create Account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

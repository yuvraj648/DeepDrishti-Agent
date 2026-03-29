import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({
    name: '',
    email: '',
    requestedRole: 'analyst',
    reason: ''
  });
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate inputs
      if (!email || !password) {
        setError('Please enter both email and password');
        setLoading(false);
        return;
      }

      // Call authentication service
      const user = await authService.login(email, password, rememberMe);
      
      // Navigate to dashboard on successful login
      navigate('/dashboard');
    } catch (err) {
      if (err.isRateLimit) {
        // Special handling for rate limiting
        setError(`⚠️ ${err.message} (${err.currentRequests}/${err.maxRequests} requests used). Wait ${err.retryAfter}s or try a different account.`);
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (e) => {
    e.preventDefault();
    setError('');
    setRequestSuccess('');
    setRequestLoading(true);

    try {
      // Validate inputs
      if (!requestForm.name || !requestForm.email || !requestForm.requestedRole) {
        setError('Please fill in all required fields');
        setRequestLoading(false);
        return;
      }

      // Call request access service
      const response = await authService.requestAccess(
        requestForm.name,
        requestForm.email,
        requestForm.requestedRole,
        requestForm.reason
      );
      
      setRequestSuccess('Access request submitted successfully! Please wait for approval.');
      setRequestForm({ name: '', email: '', requestedRole: 'analyst', reason: '' });
      
    } catch (err) {
      setError(err.message || 'Request failed. Please try again.');
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col overflow-hidden relative">
      {/* Sonar grid background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 212, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 212, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="w-full h-px opacity-30"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.2), transparent)',
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        />
      </div>

      <header className="w-full border-b border-navy-border bg-background-dark/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-2xl">radar</span>
            <h2 className="text-slate-100 text-sm font-bold tracking-[0.2em] uppercase">Deep-Drishti</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-sm">
              <span className="flex h-2 w-2 rounded-full bg-primary"></span>
              <span className="text-primary text-[10px] font-bold uppercase tracking-wider">● Encrypted Connection</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 relative flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="hidden lg:flex flex-col space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-primary mb-2">
                <span className="text-xs font-bold tracking-[0.3em] uppercase">Sector 7-G Monitoring</span>
              </div>
              <h1 className="text-5xl font-extrabold tracking-tight text-white leading-tight">
                Marine <br/>
                Surveillance <br/>
                <span className="text-primary">AI System</span>
              </h1>
            </div>
            <div className="space-y-4 max-w-md">
              <p className="text-slate-400 text-lg leading-relaxed">
                Secure high-readiness operations portal for naval security personnel. 
                Real-time underwater acoustic analysis and tactical threat detection.
              </p>
              <div className="flex flex-col gap-3 pt-4">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="material-symbols-outlined text-primary text-sm">shield</span>
                  <span>System Secure - Kernel 4.2.0-MSAI</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="material-symbols-outlined text-primary text-sm">location_searching</span>
                  <span>Active Sonar Coverage: 98.4%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-md mx-auto">
            <div className="bg-navy-surface border border-primary/30 shadow-2xl relative overflow-hidden">
              <div className="p-8 md:p-10">
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white tracking-wide uppercase">Operator Login</h3>
                  <p className="text-slate-400 text-xs mt-1 uppercase tracking-tighter">Enter credentials for secure terminal access</p>
                </div>
                
                <form className="space-y-5" onSubmit={handleLogin}>
                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-sm text-sm">
                      {error}
                    </div>
                  )}
                  
                  {/* Success Message */}
                  {requestSuccess && (
                    <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-sm text-sm">
                      {requestSuccess}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="email">
                      Naval Email Address
                    </label>
                    <input 
                      className="w-full bg-background-dark border border-navy-border text-white px-4 py-3 rounded-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-600 text-sm" 
                      id="email" 
                      type="email"
                      placeholder="operator@fleet.nav.mil"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="password">
                      Security Credentials
                    </label>
                    <div className="relative">
                      <input 
                        className="w-full bg-background-dark border border-navy-border text-white pl-4 pr-12 py-3 rounded-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-600 text-sm" 
                        id="password" 
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                      >
                        <span className="material-symbols-outlined text-xl leading-none">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        className="w-4 h-4 bg-background-dark border-navy-border rounded-sm text-primary focus:ring-offset-background-dark focus:ring-primary" 
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Remember me</span>
                    </label>
                    <a className="text-xs text-primary hover:underline font-medium" href="#">Reset credentials?</a>
                  </div>
                  
                  <button 
                    className="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold py-4 rounded-sm transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed" 
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined text-sm font-bold animate-spin">progress_activity</span>
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm font-bold">login</span>
                        Login
                      </>
                    )}
                  </button>
                  
                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-navy-border"></div></div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-slate-500 font-bold bg-navy-surface px-2">OR</div>
                  </div>
                  
                  <button 
                    className="w-full border border-primary/40 hover:border-primary text-primary font-bold py-3 rounded-sm transition-all uppercase tracking-widest text-[11px] bg-primary/5" 
                    type="button"
                    onClick={() => setShowRequestForm(!showRequestForm)}
                  >
                    {showRequestForm ? 'Back to Login' : 'Request Access'}
                  </button>
                </form>

                {/* Request Access Form */}
                {showRequestForm && (
                  <form className="mt-6 space-y-4 border-t border-navy-border pt-6" onSubmit={handleRequestAccess}>
                    <div className="text-center mb-4">
                      <h4 className="text-sm font-bold text-white uppercase">Request System Access</h4>
                      <p className="text-slate-400 text-xs mt-1">Submit your information for approval</p>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="req-name">
                        Full Name
                      </label>
                      <input 
                        className="w-full bg-background-dark border border-navy-border text-white px-4 py-3 rounded-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-600 text-sm" 
                        id="req-name" 
                        type="text"
                        placeholder="John Doe"
                        value={requestForm.name}
                        onChange={(e) => setRequestForm({...requestForm, name: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="req-email">
                        Email Address
                      </label>
                      <input 
                        className="w-full bg-background-dark border border-navy-border text-white px-4 py-3 rounded-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-600 text-sm" 
                        id="req-email" 
                        type="email"
                        placeholder="john@example.com"
                        value={requestForm.email}
                        onChange={(e) => setRequestForm({...requestForm, email: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="req-role">
                        Requested Role
                      </label>
                      <select 
                        className="w-full bg-background-dark border border-navy-border text-white px-4 py-3 rounded-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm" 
                        id="req-role"
                        value={requestForm.requestedRole}
                        onChange={(e) => setRequestForm({...requestForm, requestedRole: e.target.value})}
                      >
                        <option value="analyst">Analyst</option>
                        <option value="engineer">Engineer</option>
                        <option value="surveillance_head">Surveillance Head</option>
                        <option value="vice_captain">Vice Captain</option>
                        <option value="captain">Captain</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="req-reason">
                        Reason (Optional)
                      </label>
                      <textarea 
                        className="w-full bg-background-dark border border-navy-border text-white px-4 py-3 rounded-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-600 text-sm resize-none" 
                        id="req-reason" 
                        rows="3"
                        placeholder="Brief description of why you need access..."
                        value={requestForm.reason}
                        onChange={(e) => setRequestForm({...requestForm, reason: e.target.value})}
                      />
                    </div>
                    
                    <button 
                      className="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold py-3 rounded-sm transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" 
                      type="submit"
                      disabled={requestLoading}
                    >
                      {requestLoading ? (
                        <>
                          <span className="material-symbols-outlined text-sm font-bold animate-spin">progress_activity</span>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm font-bold">send</span>
                          Submit Request
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
              
              <div className="px-8 py-3 bg-background-dark/50 border-t border-navy-border flex justify-between items-center">
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Auth Module v2.4</span>
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Node: PACIFIC-NORTH</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-6 border-t border-navy-border bg-background-dark z-50">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-1">
          <p className="text-[10px] font-bold text-red-500/80 uppercase tracking-[0.3em]">
            Authorized Personnel Only
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">
            Unauthorized access prohibited.
          </p>
        </div>
      </footer>

      <div className="fixed bottom-0 right-0 w-1/3 h-1/2 opacity-10 pointer-events-none mix-blend-screen overflow-hidden">
        <img 
          alt="Technical underwater sonar display pattern" 
          className="object-cover w-full h-full grayscale hue-rotate-180" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDsu66CR90Jn8gMs4NYzxJGFZGGJye5EG6tD8S8q1QyGoo7HRBAmjO-YCdMg68i_H0wXObbB8IrGWmHEbqeWa_DnqIMSDn7zTNnjqkcXwl0rOPnC8IJM7GXVDy0Vys8qu5i6eH4rMQaeETg-VLFhDEKnYFN9hmsqbR2f_nx_vX2m5chT9T6FJ6lpFwdT52Zb732CwInim7VCjDxFnwNgftlDxoG5aNq1K8eLHwMfA4ikihpVQIDkoCSrK0eL19xpNO3TtOpLZeX9to"
        />
      </div>
    </div>
  );
};

export default Login;

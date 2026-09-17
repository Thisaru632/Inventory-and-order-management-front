import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div className="min-h-screen flex w-full font-sans">
      {/* Left Column (Dark Side) */}
      <div className="hidden lg:flex w-[40%] bg-[#181C25] text-white flex-col relative overflow-hidden">
        {/* Top Content */}
        <div className="p-12 relative z-10">
          <div className="flex items-center gap-2 mb-4 mt-4">
            <div className="flex items-center">
              {/* Logo icon */}
              <div className="w-10 h-5 rounded-full border-[2.5px] border-[#3B71F3] bg-transparent flex items-center justify-center relative translate-x-2.5 z-10"></div>
              <div className="w-10 h-5 rounded-full border-[2.5px] border-white bg-transparent relative -translate-x-2.5"></div>
            </div>
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-3 mt-8">Tool Link</h1>
          <p className="text-gray-400 text-sm">Stock and delivery, tracked in real time</p>
        </div>

        {/* Diagram Graphic */}
        <div className="flex-1 flex items-center justify-center relative z-10 w-full px-12 -mt-16">
           <div className="relative w-full max-w-[320px] h-32">
             {/* Dotted path */}
             <svg className="absolute top-1/2 left-0 w-full h-16 -translate-y-1/2" preserveAspectRatio="none">
               <path d="M 20 20 Q 80 20, 140 40 T 280 20" fill="transparent" stroke="#333A4A" strokeWidth="2" strokeDasharray="4 4" />
             </svg>
             
             {/* Warehouse */}
             <div className="absolute top-0 left-0 flex flex-col items-center">
               <svg className="w-10 h-10 text-[#3B71F3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
               </svg>
               <span className="text-xs text-gray-400 mt-2">Warehouse</span>
             </div>

             {/* In transit */}
             <div className="absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
               <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0" />
               </svg>
               <span className="text-xs text-gray-400 mt-2">In transit</span>
             </div>

             {/* Delivered */}
             <div className="absolute top-2 right-0 flex flex-col items-center">
               <svg className="w-10 h-10 text-[#3B71F3]" viewBox="0 0 24 24" fill="currentColor">
                 <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
               </svg>
               <span className="text-xs text-gray-400 mt-2">Delivered</span>
             </div>
           </div>
        </div>

        {/* Faded Boxes Graphics at bottom */}
        <div className="absolute bottom-24 left-12 opacity-30">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none" stroke="#333A4A" strokeWidth="2">
            <rect x="20" y="10" width="20" height="20" />
            <rect x="10" y="30" width="20" height="20" />
            <rect x="30" y="30" width="20" height="20" />
          </svg>
        </div>
        
        {/* Striped border at absolute bottom */}
        <div className="absolute bottom-0 w-full h-2 overflow-hidden flex">
          <div className="w-full h-full bg-[#181C25]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #3B71F3, #3B71F3 10px, transparent 10px, transparent 20px)' }}></div>
        </div>
      </div>

      {/* Right Column (Light Side) */}
      <div className="flex-1 bg-[#F9FAFB] flex flex-col justify-center items-center relative">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-50" style={{ backgroundImage: 'radial-gradient(#D1D5DB 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        <div className="w-full max-w-[360px] z-10 px-4">
          <h2 className="text-[34px] font-bold text-gray-900 tracking-tight">Sign in</h2>
          <p className="text-gray-500 text-sm mt-2 mb-10">Access your stock and delivery dashboard</p>

          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                placeholder="you@toolink.com"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-gray-600">Password</label>
                <a href="#" className="text-xs text-blue-600 hover:underline font-medium">Forgot password?</a>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm tracking-widest font-mono"
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-2.5 bg-[#3B71F3] hover:bg-blue-600 text-white rounded font-medium text-sm transition-colors mt-2 shadow-sm"
            >
              Sign in
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[13px] text-gray-500">
              New to Tool Link? <a href="#" className="font-semibold text-gray-900 underline decoration-gray-400 underline-offset-2">Request access</a>
            </p>
          </div>
        </div>

        <div className="absolute bottom-10 left-10 z-10">
          <p className="text-xs text-gray-400 font-medium">© 2026 Tool Link</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

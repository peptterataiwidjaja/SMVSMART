import React, { useState } from 'react';
import { AlertCircle, X, Eye, EyeOff } from 'lucide-react';
import { AuthUser } from '../types';
import { loginWithCredentials } from '../services/authService';
import { CompanyLogo } from './CompanyLogo';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  currentUser?: AuthUser;
  onLoginSuccess?: (user: AuthUser) => void;
  onSelectUser?: (user: AuthUser) => void;
  isFullScreen?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onSelectUser,
  isFullScreen = false
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const user = loginWithCredentials(username, password);
    if (user) {
      setUsername('');
      setPassword('');
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess(user);
      }
      if (typeof onSelectUser === 'function') {
        onSelectUser(user);
      }
      if (onClose) {
        onClose();
      }
    } else {
      setErrorMsg('User atau Password tidak sesuai.');
    }
  };

  return (
    <div
      className={
        isFullScreen
          ? 'min-h-screen w-full flex items-center justify-center bg-slate-50 p-4 font-[\'Plus_Jakarta_Sans\',sans-serif]'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-[\'Plus_Jakarta_Sans\',sans-serif]'
      }
    >
      <div className="relative w-full max-w-[360px] rounded-md bg-white shadow-md border border-slate-200/90 px-7 py-8 text-slate-900">
        {/* Tombol Tutup jika dibuka sebagai modal dari dalam aplikasi */}
        {!isFullScreen && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Logo Teratai Widjaja sesuai gambar referensi */}
        <div className="flex flex-col items-center justify-center pt-1 pb-5 border-b border-slate-100">
          <CompanyLogo variant="stacked" size="lg" showSubtitle={false} />
        </div>

        {/* Form Login: Hanya Bar User & Password */}
        <form onSubmit={handleSubmit} className="pt-6 space-y-4">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md flex items-center space-x-2 text-xs text-rose-700 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="login-user-input"
              className="block text-sm font-bold text-slate-900 mb-1.5"
            >
              User
            </label>
            <input
              id="login-user-input"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="User"
              autoComplete="username"
              required
              className="w-full px-3.5 py-2 text-sm text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#288390] focus:ring-2 focus:ring-[#288390]/20 placeholder:text-slate-400 transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="login-password-input"
              className="block text-sm font-bold text-slate-900 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Password"
                autoComplete="current-password"
                required
                className="w-full pl-3.5 pr-9 py-2 text-sm text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#288390] focus:ring-2 focus:ring-[#288390]/20 placeholder:text-slate-400 transition-all"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              id="btn-submit-login"
              type="submit"
              className="w-full py-2.5 px-4 bg-[#288390] hover:bg-[#216d78] active:bg-[#1b5a63] text-white text-sm font-medium rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              Log in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

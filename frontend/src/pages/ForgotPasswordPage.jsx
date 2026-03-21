import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore.js';

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuthStore();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      toast.success('Reset link sent!');
    } catch {
      toast.error('Failed to send reset email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md flex flex-col items-center"
      >
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-surface-container mb-3">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>key</span>
          </div>
          <h1 className="font-headline font-black text-3xl tracking-tighter">Reset password</h1>
          <p className="text-on-surface-variant text-sm mt-1">We'll send a reset link to your email.</p>
        </div>

        <div className="w-full bg-surface-container p-8 rounded-lg shadow-2xl">
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-secondary text-[28px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>mark_email_read</span>
              </div>
              <p className="font-semibold mb-1">Email sent!</p>
              <p className="text-on-surface-variant text-sm">Check <strong>{email}</strong> for the reset link.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Email</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2
                                   text-on-surface-variant group-focus-within:text-primary transition-colors text-[20px]">mail</span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-surface-container-highest rounded py-3.5 pl-12 pr-4
                               text-on-surface placeholder:text-outline outline-none text-sm" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-primary hover:bg-primary-container text-on-primary-container
                           font-headline font-extrabold py-3.5 rounded transition-all
                           active:scale-[0.98] text-sm disabled:opacity-60">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <Link to="/login"
          className="mt-6 flex items-center gap-2 text-on-surface-variant hover:text-on-surface text-sm transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to login
        </Link>
      </motion.div>
    </div>
  );
}

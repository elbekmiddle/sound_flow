/**
 * Modal — base modal with:
 *  - ESC key to close
 *  - click backdrop to close
 *  - body scroll lock while open
 *  - framer-motion enter/exit animation
 */
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Modal({ open, onClose, children, maxWidth = 380, title }) {
  // ESC key + body scroll lock
  useEffect(() => {
    if (!open) return;

    // Prevent body scroll
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    // ESC to close
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);

    return () => {
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            padding: '0 16px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth,
              background: 'var(--color-surface-container)',
              borderRadius: 16,
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
            }}
          >
            {title && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 20px 0',
              }}>
                <h3 style={{
                  fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: 18,
                  color: 'var(--color-on-surface)',
                }}>{title}</h3>
                <button onClick={onClose} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-on-surface-variant)', padding: 4,
                  display: 'flex', borderRadius: '50%', transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color='var(--color-on-surface)'}
                onMouseLeave={e => e.currentTarget.style.color='var(--color-on-surface-variant)'}
                >
                  ✕
                </button>
              </div>
            )}
            <div style={{ padding: 20 }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

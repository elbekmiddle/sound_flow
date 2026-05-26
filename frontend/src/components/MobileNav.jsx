import { NavLink } from 'react-router-dom';
import { Home, Search, Library, User } from 'lucide-react';

const TABS = [
  { to: '/',        Icon: Home,    label: 'Home'    },
  { to: '/search',  Icon: Search,  label: 'Search'  },
  { to: '/library', Icon: Library, label: 'Library' },
  { to: '/profile', Icon: User,    label: 'Profile' },
];

export default function MobileNav() {
  return (
    <nav className="mobile-nav" style={{
      display: 'none',
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: 'rgba(20,19,19,0.95)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(72,72,71,0.2)',
      padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
    }}>
      <div style={{ display:'flex', justifyContent:'space-around' }}>
        {TABS.map(({ to, Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            style={{ display:'flex', flexDirection:'column', alignItems:'center',
              gap:3, padding:'4px 16px', textDecoration:'none', transition:'color 0.15s' }}
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2}
                  color={isActive ? 'var(--color-primary)' : 'var(--color-on-surface-variant)'} />
                <span style={{ fontSize:10, fontWeight:isActive ? 700 : 400,
                  color: isActive ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

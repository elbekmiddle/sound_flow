import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/',         icon: 'home',          label: 'Home'    },
  { to: '/search',   icon: 'search',        label: 'Search'  },
  { to: '/library',  icon: 'library_music', label: 'Library' },
  { to: '/profile',  icon: 'person',        label: 'Profile' },
];

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-outline-variant/10 z-40">
      <div className="flex justify-around px-4 py-2">
        {TABS.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 px-3 transition-colors
               ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {tab.icon}
                </span>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

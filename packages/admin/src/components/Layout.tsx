import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/items', label: 'Items' },
  { to: '/containers', label: 'Containers' },
  { to: '/locations', label: 'Locations' },
  { to: '/floorplan', label: 'Floor Plan' },
  { to: '/categories', label: 'Categories' },
  { to: '/import', label: 'Import' },
  { to: '/export', label: 'Export' },
  { to: '/users', label: 'Users' },
  { to: '/activity', label: 'Activity' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="layout">
      {/* Mobile header — only visible on small screens */}
      <header className="mobile-header">
        <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? '\u2715' : '\u2630'}
        </button>
        <span className="mobile-header-title">Stash</span>
      </header>

      {/* Overlay to close sidebar on mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <h1>Stash</h1>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="user-name">{user?.name}</span>
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

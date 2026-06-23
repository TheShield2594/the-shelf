'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';

const navLinks = [
  { href: '/browse', label: 'Browse' },
  { href: '/trending', label: 'Trending' },
  { href: '/library', label: 'Library' },
  { href: '/scan', label: 'Scan' },
  { href: '/import', label: 'Import' },
];

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-gray-950/80 border-b border-stone-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-shelf-700 dark:text-shelf-500 group-hover:scale-105 transition-transform">
              <path d="M3 4h4a2 2 0 0 1 2 2v14a1 1 0 0 0-1-1H4a1 1 0 0 1-1-1V4z" fill="currentColor" opacity="0.8"/>
              <path d="M9 6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1V6z" fill="currentColor" opacity="0.6"/>
              <path d="M15 4h6a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-6V4z" fill="currentColor" opacity="0.4"/>
            </svg>
            <span className="text-xl font-bold font-serif text-shelf-800 dark:text-shelf-400">The Shelf</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-shelf-100 dark:bg-gray-800 text-shelf-800 dark:text-shelf-400'
                    : 'text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-gray-100 hover:bg-stone-100 dark:hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>

            {loading ? null : user ? (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/profile"
                  className="text-sm font-medium text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-gray-100 transition-colors"
                >
                  {user.username}
                </Link>
                <button onClick={handleLogout} className="btn-ghost text-sm">
                  Logout
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login" className="btn-ghost text-sm">Login</Link>
                <Link href="/register" className="btn-primary text-sm">Sign Up</Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-800"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              {menuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="md:hidden pb-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-shelf-100 dark:bg-gray-800 text-shelf-800 dark:text-shelf-400'
                    : 'text-stone-600 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-stone-200 dark:border-gray-800 mt-2 pt-2">
              {loading ? null : user ? (
                <div className="flex flex-col gap-1">
                  <Link href="/profile" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-stone-600 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-800">{user.username}</Link>
                  <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="px-3 py-2 rounded-lg text-sm font-medium text-left text-stone-600 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-800">Logout</button>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-stone-600 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-800">Login</Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-shelf-700 dark:text-shelf-400 hover:bg-shelf-50 dark:hover:bg-gray-800">Sign Up</Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

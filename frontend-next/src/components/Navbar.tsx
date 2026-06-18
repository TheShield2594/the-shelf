'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';

const navLinks = [
  { href: '/browse', label: 'Browse' },
  { href: '/library', label: 'Library', auth: true },
  { href: '/scan', label: 'Scan', auth: true },
  { href: '/import', label: 'Import', auth: true },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-shelf-700">
              <path d="M3 3h8v18H3z" fill="currentColor" opacity="0.8"/>
              <path d="M13 3h8v18h-8z" fill="currentColor" opacity="0.5"/>
              <path d="M2 21h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">The Shelf</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              if (link.auth && !user) return null;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-shelf-100 text-shelf-800 dark:bg-shelf-900/40 dark:text-shelf-300'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>

            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-shelf-600 text-white flex items-center justify-center text-sm font-medium">
                    {user.username[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{user.username}</span>
                </Link>
                <button onClick={logout} className="btn-ghost text-sm">Logout</button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login" className="btn-ghost text-sm">Login</Link>
                <Link href="/register" className="btn-primary text-sm">Sign Up</Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              aria-label="Menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen ? (
                  <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                ) : (
                  <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="md:hidden py-4 border-t border-stone-200 dark:border-stone-800 space-y-1">
            {navLinks.map((link) => {
              if (link.auth && !user) return null;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                    pathname === link.href
                      ? 'bg-shelf-100 text-shelf-800 dark:bg-shelf-900/40 dark:text-shelf-300'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {user ? (
              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-1">
                <Link href="/profile" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-stone-600 dark:text-stone-400">
                  Profile
                </Link>
                <button onClick={() => { logout(); setMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-stone-600 dark:text-stone-400">
                  Logout
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-1">
                <Link href="/login" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-stone-600 dark:text-stone-400">Login</Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-shelf-700 dark:text-shelf-400">Sign Up</Link>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}

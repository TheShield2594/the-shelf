import type { Metadata } from 'next';
import { Inter, Crimson_Text } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const crimson = Crimson_Text({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-crimson',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Shelf - A Better Way to Track Books',
  description:
    'Track, discover, and rate books with multi-dimensional ratings. A privacy-first alternative to Goodreads.',
  keywords: ['books', 'reading', 'book tracking', 'goodreads alternative', 'book ratings'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${crimson.variable}`}>
      <body className="font-sans">
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">📚</div>
                  <div>
                    <h1 className="text-2xl font-bold text-shelf-800 font-serif">
                      The Shelf
                    </h1>
                    <p className="text-xs text-gray-600">
                      Multi-dimensional book ratings
                    </p>
                  </div>
                </div>

                <nav className="flex items-center gap-6">
                  <a
                    href="/"
                    className="text-gray-700 hover:text-shelf-700 transition-colors font-medium"
                  >
                    Browse
                  </a>
                  <a
                    href="/about"
                    className="text-gray-700 hover:text-shelf-700 transition-colors font-medium"
                  >
                    About
                  </a>
                </nav>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1">{children}</main>

          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center text-sm text-gray-600">
                <p className="mb-2">
                  <strong>The Shelf</strong> - A privacy-first book platform
                </p>
                <p>
                  Built with multi-dimensional ratings for better book discovery
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

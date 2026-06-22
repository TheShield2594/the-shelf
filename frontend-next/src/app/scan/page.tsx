'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/ToastProvider';
import { BookCover } from '@/components/BookCover';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { BookSummary } from '@/types';

type ScanState = 'idle' | 'camera_scanning' | 'lookup_scanning' | 'found' | 'not_found' | 'error';

export default function ScanPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [isbn, setIsbn] = useState('');
  const [manualIsbn, setManualIsbn] = useState('');
  const [book, setBook] = useState<BookSummary | null>(null);
  const [bookSource, setBookSource] = useState('');
  const [adding, setAdding] = useState(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push('/login');
  }, [user, authLoading, router]);

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopScanner();
  }, []);

  if (authLoading || !user) return <LoadingSpinner />;

  const startScanner = async () => {
    setScanState('camera_scanning');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('barcode-reader', { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText: string) => {
          setIsbn(decodedText);
          scanner.stop();
          lookupIsbn(decodedText);
        },
        () => {}
      );
    } catch {
      setScanState('error');
    }
  };

  const lookupIsbn = async (isbnToLookup: string) => {
    setScanState('lookup_scanning');
    stopScanner();
    try {
      const result = await api.lookupISBN(isbnToLookup, true);
      setBook(result.book);
      setBookSource(result.source);
      setScanState('found');
    } catch {
      setScanState('not_found');
    }
  };

  const handleManualLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualIsbn) lookupIsbn(manualIsbn);
  };

  const handleAddToLibrary = async (status: string) => {
    if (!book?.id) return;
    setAdding(true);
    try {
      await api.addToLibrary(book.id, status);
      router.push('/library');
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleReset = () => {
    setScanState('idle');
    setBook(null);
    setIsbn('');
    setManualIsbn('');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-gray-100 mb-6">Scan Barcode</h1>

      {scanState === 'idle' && (
        <div className="card p-8 text-center">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 text-shelf-600 dark:text-shelf-500">
            <path d="M3 5h2v2H3V5zm4 0h14v2H7V5zM3 11h2v2H3v-2zm4 0h14v2H7v-2zM3 17h2v2H3v-2zm4 0h14v2H7v-2z" />
          </svg>
          <p className="text-stone-600 dark:text-gray-400 mb-6">Scan a book&apos;s barcode to instantly look it up and add it to your library.</p>
          <button onClick={startScanner} className="btn-primary px-6 py-3">Start Scanning</button>

          <div className="mt-8 pt-6 border-t border-stone-200 dark:border-gray-800">
            <p className="text-sm text-stone-500 dark:text-gray-500 mb-2">Or enter ISBN manually:</p>
            <form onSubmit={handleManualLookup} className="flex gap-2">
              <input
                type="text"
                value={manualIsbn}
                onChange={(e) => setManualIsbn(e.target.value)}
                placeholder="9780000000000"
                className="input"
              />
              <button type="submit" className="btn-secondary whitespace-nowrap">Look Up</button>
            </form>
          </div>
        </div>
      )}

      {(scanState === 'camera_scanning' || scanState === 'lookup_scanning') && (
        <div className="card p-4">
          {scanState === 'camera_scanning' ? (
            <>
              <div id="barcode-reader" className="w-full rounded-lg overflow-hidden mb-4" />
              <button onClick={() => { stopScanner(); handleReset(); }} className="btn-ghost w-full">Cancel</button>
            </>
          ) : (
            <LoadingSpinner label="Looking up book..." />
          )}
        </div>
      )}

      {scanState === 'found' && book && (
        <div className="card p-6 animate-slideUp">
          <div className="flex gap-6 mb-6">
            <BookCover coverUrl={book.cover_url} title={book.title} author={book.author} size="lg" />
            <div className="flex-1">
              <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-gray-100 mb-1">{book.title}</h2>
              <p className="text-stone-600 dark:text-gray-400 mb-2">by {book.author}</p>
              {book.isbn && <p className="text-xs text-stone-400 dark:text-gray-600 mb-2">ISBN: {book.isbn}</p>}
              {book.description && <p className="text-sm text-stone-500 dark:text-gray-400 line-clamp-3">{book.description}</p>}
              <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                {bookSource === 'database' ? 'Found on shelf' : 'Found on OpenLibrary'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleAddToLibrary('want_to_read')} disabled={adding} className="btn-secondary text-sm">Want to Read</button>
            <button onClick={() => handleAddToLibrary('currently_reading')} disabled={adding} className="btn-secondary text-sm">Currently Reading</button>
            <button onClick={() => handleAddToLibrary('finished')} disabled={adding} className="btn-primary text-sm">Finished</button>
            <button onClick={handleReset} className="btn-ghost text-sm ml-auto">Scan Another</button>
          </div>
        </div>
      )}

      {scanState === 'not_found' && (
        <div className="card p-8 text-center">
          <p className="text-stone-600 dark:text-gray-400 mb-4">No book found for ISBN: {isbn || manualIsbn}</p>
          <button onClick={handleReset} className="btn-primary">Try Again</button>
        </div>
      )}

      {scanState === 'error' && (
        <div className="card p-8 text-center">
          <p className="text-stone-600 dark:text-gray-400 mb-6">Could not access camera. You can enter the ISBN manually below.</p>
          <form onSubmit={handleManualLookup} className="flex gap-2 mb-4">
            <input
              type="text"
              value={manualIsbn}
              onChange={(e) => setManualIsbn(e.target.value)}
              placeholder="9780000000000"
              className="input"
              autoFocus
            />
            <button type="submit" className="btn-secondary whitespace-nowrap">Look Up</button>
          </form>
          <button onClick={handleReset} className="btn-ghost">Go Back</button>
        </div>
      )}
    </div>
  );
}

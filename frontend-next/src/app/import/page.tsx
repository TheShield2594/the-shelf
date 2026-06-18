'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { GoodreadsImportResult } from '@/types';

export default function ImportPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<GoodreadsImportResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push('/login');
  }, [user, authLoading, router]);

  if (authLoading || !user) return <LoadingSpinner />;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError('');
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError('');
    try {
      const res = await api.importGoodreads(file);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.csv')) {
      setFile(f);
      setError('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-gray-100 mb-2">Import from Goodreads</h1>
      <p className="text-stone-500 dark:text-gray-400 mb-6">
        Export your Goodreads library as a CSV file, then upload it here to import your books.
      </p>

      {/* Instructions */}
      <div className="card p-4 mb-6 text-sm text-stone-600 dark:text-gray-400">
        <p className="font-medium text-stone-700 dark:text-gray-300 mb-2">How to export from Goodreads:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Go to Goodreads → My Books</li>
          <li>Click "Import/Export" at the bottom left</li>
          <li>Click "Export Library"</li>
          <li>Wait for the CSV file to generate, then download it</li>
        </ol>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {result ? (
        <div className="card p-6">
          <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-gray-100 mb-4">Import Complete</h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{result.imported}</p>
              <p className="text-xs text-stone-500 dark:text-gray-400">Imported</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{result.skipped}</p>
              <p className="text-xs text-stone-500 dark:text-gray-400">Skipped</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{result.errors}</p>
              <p className="text-xs text-stone-500 dark:text-gray-400">Errors</p>
            </div>
          </div>
          {result.results.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-1 mb-4">
              {result.results.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-stone-100 dark:border-gray-800 last:border-0">
                  <span className="text-stone-600 dark:text-gray-400 truncate flex-1">{r.title}</span>
                  <span className={`text-xs ml-2 ${r.status === 'imported' ? 'text-emerald-500' : r.status === 'skipped' || r.status === 'already_in_library' ? 'text-amber-500' : 'text-red-500'}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => router.push('/library')} className="btn-primary text-sm">View Library</button>
            <button onClick={() => { setResult(null); setFile(null); }} className="btn-secondary text-sm">Import Another</button>
          </div>
        </div>
      ) : (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            className="card p-8 border-2 border-dashed border-stone-300 dark:border-gray-700 hover:border-shelf-500 dark:hover:border-shelf-600 cursor-pointer text-center transition-colors mb-4 focus:outline-none focus:ring-2 focus:ring-shelf-500"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-stone-400 dark:text-gray-600">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            {file ? (
              <p className="text-sm font-medium text-shelf-700 dark:text-shelf-500">{file.name}</p>
            ) : (
              <>
                <p className="text-sm text-stone-600 dark:text-gray-400 mb-1">Drop your CSV here or click to browse</p>
                <p className="text-xs text-stone-400 dark:text-gray-600">Goodreads CSV export file</p>
              </>
            )}
          </div>
          <button onClick={handleImport} disabled={!file || importing} className="btn-primary w-full">
            {importing ? 'Importing...' : 'Import Books'}
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSkillStore } from '@/stores/skill-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/navigation';
import { cn } from '@/lib/utils';

export default function ImportSkillPage() {
  const router = useRouter();
  const { fetchSkills, isLoading, setLoading } = useSkillStore();

  const [importResult, setImportResult] = useState<{ success: string[]; failed: { filename: string; error: string }[] } | null>(null);
  const [importZipBase64, setImportZipBase64] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const zipFileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setError('');
    setImportResult(null);

    if (!file.name.endsWith('.zip')) {
      setError('Unsupported file format. Please upload a ZIP file.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/skills', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setImportResult({ success: data.success || [], failed: data.failed || [] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read ZIP file');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleZipBase64Import = async () => {
    setError('');
    setImportResult(null);

    if (!importZipBase64.trim()) {
      setError('Please paste ZIP Base64 content');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: importZipBase64 }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setImportResult({ success: data.success || [], failed: data.failed || [] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse ZIP data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSkills = () => {
    fetchSkills();
    router.push('/skills');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/skills" className="text-sm text-muted-foreground hover:underline">
            ← Back to skills
          </Link>

          <h1 className="text-3xl font-bold mt-4 mb-8">Import Skills</h1>

          <Card>
            <CardHeader>
              <CardTitle>Import Skills</CardTitle>
              <CardDescription>
                Import skills from a ZIP file. Skills will be saved to ~/.skill-sync/skills
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 拖拽区域 */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isLoading && zipFileInputRef.current?.click()}
                className={cn(
                  'flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent/30'
                )}
              >
                <input
                  type="file"
                  accept=".zip"
                  ref={zipFileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {isLoading ? (
                  <svg className="w-8 h-8 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                )}
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {isLoading ? 'Importing...' : 'Drop ZIP file here or click to select'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Only .zip files are supported</p>
                </div>
              </div>

              {/* 高级选项：Base64 */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(v => !v)}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <svg className={cn('w-3 h-3 transition-transform', showAdvanced && 'rotate-90')} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Advanced: paste Base64
                </button>
                {showAdvanced && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      id="importZipBase64"
                      value={importZipBase64}
                      onChange={e => setImportZipBase64(e.target.value)}
                      placeholder="Paste ZIP file as Base64..."
                      className="min-h-[100px] font-mono text-sm"
                    />
                    <Button onClick={handleZipBase64Import} disabled={isLoading} variant="outline" size="sm">
                      {isLoading ? 'Importing...' : 'Import from Base64'}
                    </Button>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {importResult && (
                <div className="p-4 bg-muted rounded-md">
                  <h4 className="font-medium mb-2">Import Results</h4>
                  <p className="text-sm text-green-600">
                    Successfully imported: {importResult.success.length} skill(s)
                  </p>
                  {importResult.failed.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-destructive">
                        Failed to import: {importResult.failed.length} file(s)
                      </p>
                      <ul className="mt-1 text-xs text-muted-foreground">
                        {importResult.failed.filter(f => f.filename).map((f, i) => (
                          <li key={i}>{f.filename}: {f.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {importResult.success.length > 0 && (
                    <Button
                      className="mt-4"
                      onClick={handleViewSkills}
                    >
                      View Skills
                    </Button>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Link href="/skills">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

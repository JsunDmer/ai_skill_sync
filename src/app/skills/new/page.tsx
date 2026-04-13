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

export default function ImportSkillPage() {
  const router = useRouter();
  const { fetchSkills, isLoading, setLoading } = useSkillStore();
  
  const [importResult, setImportResult] = useState<{ success: string[]; failed: { filename: string; error: string }[] } | null>(null);
  const [importZipBase64, setImportZipBase64] = useState('');
  const [error, setError] = useState('');
  const zipFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setImportResult(null);

    if (!file.name.endsWith('.zip')) {
      setError('Unsupported file format. Please upload a ZIP file.');
      if (zipFileInputRef.current) {
        zipFileInputRef.current.value = '';
      }
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/skills', {
        method: 'POST',
        body: formData,
      });
      
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
              <div className="space-y-4">
                <h3 className="font-medium">Upload ZIP File</h3>
                <div className="space-y-2">
                  <Label>Select File</Label>
                  <Input
                    type="file"
                    accept=".zip"
                    ref={zipFileInputRef}
                    onChange={handleFileUpload}
                  />
                </div>

                <div className="text-center text-sm text-muted-foreground">OR</div>

                <div className="space-y-2">
                  <Label htmlFor="importZipBase64">Paste ZIP Base64</Label>
                  <Textarea
                    id="importZipBase64"
                    value={importZipBase64}
                    onChange={e => setImportZipBase64(e.target.value)}
                    placeholder="Paste ZIP file as Base64..."
                    className="min-h-[100px] font-mono text-sm"
                  />
                </div>

                <Button onClick={handleZipBase64Import} disabled={isLoading}>
                  {isLoading ? 'Importing...' : 'Import ZIP'}
                </Button>
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
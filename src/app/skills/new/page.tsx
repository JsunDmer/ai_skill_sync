'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSkillStore } from '@/stores/skill-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/navigation';
import { cn } from '@/lib/utils';

export default function ImportSkillPage() {
  const router = useRouter();
  const { fetchSkills, isLoading, setLoading, skills } = useSkillStore();

  const [importResult, setImportResult] = useState<{ success: string[]; failed: { filename: string; error: string }[] } | null>(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const zipFileInputRef = useRef<HTMLInputElement>(null);

  // 从已有技能提取所有 tags，用于快速选择
  const existingTags = Array.from(new Set(skills.flatMap(s => s.tags))).sort();

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
      if (selectedTag.trim()) {
        formData.append('tag', selectedTag.trim());
      }
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
                Import skills from a ZIP file. Supports single-skill ZIPs (skill-folder/SKILL.md) and multi-skill bundles. Same-name skills will be replaced.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Tag 选择区域 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Category Tag
                  <span className="text-muted-foreground font-normal ml-1">(optional — overrides ZIP path inference)</span>
                </label>
                <Input
                  value={selectedTag}
                  onChange={e => setSelectedTag(e.target.value)}
                  placeholder="e.g. saic, frontend, data..."
                  className="max-w-xs"
                />
                {existingTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {existingTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTag(tag === selectedTag ? '' : tag)}
                        className={cn(
                          'text-xs px-2.5 py-1 rounded-full border transition-colors',
                          tag === selectedTag
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-secondary text-secondary-foreground border-transparent hover:border-primary/40'
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 拖拽区域 */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                  isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                )}
                onClick={() => !isLoading && zipFileInputRef.current?.click()}
              >
                <input
                  ref={zipFileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {isLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-sm text-muted-foreground">Importing...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {isDragging ? 'Drop ZIP file here' : 'Click to upload or drag & drop'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ZIP files only · Single skill or multi-skill bundle
                    </p>
                  </div>
                )}
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* 导入结果 */}
              {importResult && (
                <div className="p-4 bg-muted rounded-md space-y-2">
                  <h4 className="font-medium mb-2">Import Results</h4>
                  <p className="text-sm text-green-600">
                    Successfully imported: {importResult.success.length} skill(s)
                    {importResult.success.length > 0 && (
                      <span className="text-muted-foreground ml-1">
                        ({importResult.success.join(', ')})
                      </span>
                    )}
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
                    <Button className="mt-4" onClick={handleViewSkills}>
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

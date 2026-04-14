'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSkillStore } from '@/stores/skill-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/navigation';
import { cn } from '@/lib/utils';

export default function ImportSkillPage() {
  const router = useRouter();
  const { fetchSkills, isLoading, setLoading, skills } = useSkillStore();

  const [importResult, setImportResult] = useState<{ success: string[]; failed: { filename: string; error: string }[] } | null>(null);
  const [importZipBase64, setImportZipBase64] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // 用户指定的 tag，留空则从 ZIP 路径推断
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
      // 如果用户选了 tag，附带传给后端
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
                onClick={() => zipFileInputRef.current?.click()}
              >
                <input
                  ref={zipFileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {isDragging ? 'Drop ZIP file here' : 'Click to upload or drag & drop'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ZIP files only
                  </p>
                </div>
              </div>

              {/* 高级选项：Base64 */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAdvanced ? '▼' : '▶'} Advanced: Import from Base64
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-3">
                    <Textarea
                      value={importZipBase64}
                      onChange={e => setImportZipBase64(e.target.value)}
                      placeholder="Paste ZIP file Base64 content here..."
                      className="font-mono text-xs min-h-[120px]"
                    />
                    <Button
                      onClick={handleZipBase64Import}
                      disabled={isLoading || !importZipBase64.trim()}
                      size="sm"
                    >
                      {isLoading ? 'Importing...' : 'Import from Base64'}
                    </Button>
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

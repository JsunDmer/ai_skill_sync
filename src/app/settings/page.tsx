'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSkillStore } from '@/stores/skill-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/navigation';
import { Platform } from '@/types/skill';

const PLATFORMS: Platform[] = ['opencode', 'claude', 'trace-cn', 'cursor'];

export default function SettingsPage() {
  const { config, setGitConfig, setSelectedPlatforms, isLoading, setLoading } = useSkillStore();
  
  const [repoUrl, setRepoUrl] = useState(config.git.repoUrl);
  const [token, setToken] = useState(config.git.token);
  const [branch, setBranch] = useState(config.git.branch);
  const [selectedPlatforms, setSelectedPlatformsState] = useState<Platform[]>(config.selectedPlatforms);

  const handleSave = async () => {
    setLoading(true);
    try {
      setGitConfig({ repoUrl, token, branch });
      setSelectedPlatforms(selectedPlatforms);
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatformsState(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Settings</h1>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Git Repository</CardTitle>
              <CardDescription>
                Configure the Git repository where skills are stored
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="repoUrl">Repository URL</Label>
                <Input
                  id="repoUrl"
                  value={repoUrl}
                  onChange={e => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/skills.git"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="token">Personal Access Token</Label>
                <Input
                  id="token"
                  type="password"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                />
                <p className="text-xs text-muted-foreground">
                  Token is stored locally in your browser
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  placeholder="main"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Platforms</CardTitle>
              <CardDescription>
                Select which platforms to support
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(platform => (
                  <Button
                    key={platform}
                    variant={selectedPlatforms.includes(platform) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => togglePlatform(platform)}
                  >
                    {platform}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Link href="/skills">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
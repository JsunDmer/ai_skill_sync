'use client';

import { useState, useMemo, memo, useEffect } from 'react';
import Link from 'next/link';
import { useSkillStore } from '@/stores/skill-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Navigation } from '@/components/navigation';
import { AgentIcon } from '@/components/agent-icon';
import { Skill, Platform } from '@/types/skill';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SyncResult {
  skill: string;
  platform: string;
  status: 'success' | 'error' | 'skipped';
  error?: string;
}

const SUPPORTED_PLATFORMS: Platform[] = ['opencode', 'claude', 'trace-cn', 'cursor'];

const PLATFORM_LABELS: Record<Platform, string> = {
  opencode: 'OpenCode',
  claude: 'Claude Code',
  'trace-cn': 'Trace CN',
  cursor: 'Cursor',
};

interface SyncedPlatformsState {
  [skillName: string]: Platform[];
}

interface SkillCardProps {
  skill: Skill;
  isSelected: boolean;
  onToggle: (name: string) => void;
  onDelete: (name: string) => void;
  syncedPlatforms: Platform[];
  loadingIcons: Set<Platform>;
  onIconClick: (platform: Platform, isSynced: boolean) => void;
}

const SkillCard = memo(function SkillCard({
  skill,
  isSelected,
  onToggle,
  onDelete,
  syncedPlatforms,
  loadingIcons,
  onIconClick,
}: SkillCardProps) {
  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div className="flex items-center gap-1">
          {SUPPORTED_PLATFORMS.map((platform) => (
            <AgentIcon
              key={platform}
              platform={platform}
              isSynced={syncedPlatforms.includes(platform)}
              isLoading={loadingIcons.has(platform)}
              onClick={() => onIconClick(platform, syncedPlatforms.includes(platform))}
            />
          ))}
        </div>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(skill.name)}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm(`Delete "${skill.name}"?`)) {
              onDelete(skill.content.filePath);
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </Button>
      </div>
      <Link href={`/skills/${encodeURIComponent(skill.name)}`}>
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-[180px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{skill.name}</CardTitle>
            <CardDescription className="line-clamp-2">{skill.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pt-0">
            <div className="flex flex-wrap gap-1">
              {skill.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-secondary rounded-full"
                >
                  {tag}
                </span>
              ))}
              {skill.tags.length > 3 && (
                <span className="text-xs px-2 py-0.5 text-muted-foreground">
                  +{skill.tags.length - 3}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
});

export default function SkillsPage() {
  const { skills, isLoading, error, fetchSkills, deleteSkill, syncToPlatforms, unsyncFromPlatforms, pushToGithub } = useSkillStore();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [pushStatus, setPushStatus] = useState<string>('');
  const [syncedPlatforms, setSyncedPlatforms] = useState<SyncedPlatformsState>({});
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showUnsyncModal, setShowUnsyncModal] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<Set<Platform>>(new Set(SUPPORTED_PLATFORMS));
  const [loadingIcons, setLoadingIcons] = useState<Record<string, Set<Platform>>>({});

  useEffect(() => {
    fetchSkills();
  }, []);

  useEffect(() => {
    const checkSyncedPlatforms = async () => {
      const synced: SyncedPlatformsState = {};
      for (const skill of skills) {
        try {
          const res = await fetch(`/api/sync?name=${encodeURIComponent(skill.name)}`);
          if (res.ok) {
            const data = await res.json();
            synced[skill.name] = data.links
              .filter((link: { platform: string; linked: boolean }) => link.linked)
              .map((link: { platform: string }) => link.platform as Platform);
          }
        } catch (e) {
          console.error(`Failed to check synced platforms for ${skill.name}:`, e);
        }
      }
      setSyncedPlatforms(synced);
    };

    if (skills.length > 0) {
      checkSyncedPlatforms();
    }
  }, [skills]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const skill of skills) {
      for (const tag of skill.tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return counts;
  }, [skills]);

  const uniqueTags = useMemo(() => {
    return Array.from(tagCounts.keys()).sort();
  }, [tagCounts]);

  const filteredSkills = useMemo(() => {
    if (activeTab === 'all') return skills;
    return skills.filter(skill => skill.tags.includes(activeTab));
  }, [skills, activeTab]);

  const isAllSelected = filteredSkills.length > 0 && selectedSkills.size === filteredSkills.length;

  const toggleSkillSelection = (skillName: string) => {
    setSelectedSkills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(skillName)) {
        newSet.delete(skillName);
      } else {
        newSet.add(skillName);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (isAllSelected) {
      setSelectedSkills(new Set());
    } else {
      setSelectedSkills(new Set(filteredSkills.map(s => s.name)));
    }
  };

  const handleIconClick = async (skillName: string, platform: Platform, isSynced: boolean) => {
    if (isSyncing) return;

    if (isSynced) {
      const confirmed = confirm(`Remove sync with ${platform}?`);
      if (!confirmed) return;

      setLoadingIcons(prev => ({
        ...prev,
        [skillName]: new Set([...(prev[skillName] || []), platform]),
      }));

      try {
        const result = await unsyncFromPlatforms([skillName], [platform]);
        const platformResults = result.results.filter((r: SyncResult) => r.platform !== 'local');
        const successCount = platformResults.filter((r: SyncResult) => r.status === 'success').length;
        const failedResults = platformResults.filter((r: SyncResult) => r.status === 'error');

        if (failedResults.length > 0) {
          alert(`Failed to unsync: ${failedResults[0].error || 'Unknown error'}`);
        } else if (successCount > 0) {
          setSyncedPlatforms(prev => ({
            ...prev,
            [skillName]: (prev[skillName] || []).filter(p => p !== platform),
          }));
        }
      } catch (e) {
        alert('Unsync failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
      } finally {
        setLoadingIcons(prev => {
          const next = { ...prev };
          next[skillName]?.delete(platform);
          if (next[skillName]?.size === 0) delete next[skillName];
          return next;
        });
      }
    } else {
      setLoadingIcons(prev => ({
        ...prev,
        [skillName]: new Set([...(prev[skillName] || []), platform]),
      }));

      try {
        const result = await syncToPlatforms([skillName], [platform]);
        const platformResults = result.results.filter((r: SyncResult) => r.platform !== 'local');
        const successCount = platformResults.filter((r: SyncResult) => r.status === 'success').length;

        if (successCount > 0) {
          setSyncedPlatforms(prev => ({
            ...prev,
            [skillName]: [...new Set([...(prev[skillName] || []), platform])],
          }));
        }
      } catch (e) {
        alert('Sync failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
      } finally {
        setLoadingIcons(prev => {
          const next = { ...prev };
          next[skillName]?.delete(platform);
          if (next[skillName]?.size === 0) delete next[skillName];
          return next;
        });
      }
    }
  };

  const openSyncModal = () => {
    if (selectedSkills.size === 0) return;
    setSelectedAgents(new Set(SUPPORTED_PLATFORMS));
    setShowSyncModal(true);
  };

  const openUnsyncModal = () => {
    if (selectedSkills.size === 0) return;

    // Only show agents that are synced for at least one selected skill
    const syncedAgents = new Set<Platform>();
    for (const skillName of Array.from(selectedSkills)) {
      const platforms = syncedPlatforms[skillName] || [];
      platforms.forEach(p => syncedAgents.add(p));
    }

    setSelectedAgents(syncedAgents);
    setShowUnsyncModal(true);
  };

  const handleSync = async () => {
    if (selectedSkills.size === 0 || selectedAgents.size === 0) return;
    setShowSyncModal(false);
    setIsSyncing(true);
    try {
      const selectedSkillsList = Array.from(selectedSkills);
      const agentsList = Array.from(selectedAgents);
      const result = await syncToPlatforms(selectedSkillsList, agentsList);

      // 排除后端附加的 platform:'local' 伪结果，只统计实际平台同步结果
      const platformResults = result.results.filter(r => r.platform !== 'local');
      const successCount = platformResults.filter(r => r.status === 'success').length;
      const failedResults = platformResults.filter(r => r.status === 'error');

      if (failedResults.length > 0) {
        const failedMsg = failedResults
          .map(r => `• ${r.skill} → ${r.platform}: ${r.error || 'Unknown error'}`)
          .join('\n');
        alert(`Synced ${successCount} skill(s) successfully.\n\nFailed (${failedResults.length}):\n${failedMsg}`);
      } else {
        alert(`Synced ${successCount} skill(s) to ${agentsList.join(', ')}`);
      }

      for (const skillName of selectedSkillsList) {
        const skillResults = result.results.filter(r => r.skill === skillName);
        const newlySynced = skillResults
          .filter(r => r.status === 'success' || r.status === 'skipped')
          .map(r => r.platform as Platform);
        setSyncedPlatforms(prev => ({
          ...prev,
          [skillName]: [...new Set([...(prev[skillName] || []), ...newlySynced])],
        }));
      }
    } catch (e) {
      alert('Sync failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setIsSyncing(false);
      setSelectedSkills(new Set());
    }
  };

  const handleUnsync = async () => {
    if (selectedSkills.size === 0 || selectedAgents.size === 0) return;
    setShowUnsyncModal(false);
    setIsSyncing(true);
    try {
      const selectedSkillsList = Array.from(selectedSkills);
      const agentsList = Array.from(selectedAgents);
      const result = await unsyncFromPlatforms(selectedSkillsList, agentsList);

      const platformResults = result.results.filter((r: SyncResult) => r.platform !== 'local');
      const successCount = platformResults.filter((r: SyncResult) => r.status === 'success').length;
      const failedResults = platformResults.filter((r: SyncResult) => r.status === 'error');

      if (failedResults.length > 0) {
        const failedMsg = failedResults
          .map((r: SyncResult) => `• ${r.skill} → ${r.platform}: ${r.error || 'Unknown error'}`)
          .join('\n');
        alert(`Unsynced ${successCount} skill(s) successfully.\n\nFailed (${failedResults.length}):\n${failedMsg}`);
      } else {
        alert(`Unsynced ${successCount} skill(s) from ${agentsList.join(', ')}`);
      }

      for (const skillName of selectedSkillsList) {
        const skillResults = result.results.filter((r: SyncResult) => r.skill === skillName);
        const removedPlatforms = skillResults
          .filter((r: SyncResult) => r.status === 'success')
          .map((r: SyncResult) => r.platform as Platform);
        setSyncedPlatforms(prev => ({
          ...prev,
          [skillName]: (prev[skillName] || []).filter(p => !removedPlatforms.includes(p)),
        }));
      }
    } catch (e) {
      alert('Unsync failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setIsSyncing(false);
      setSelectedSkills(new Set());
    }
  };

  const handlePushToGithub = async () => {
    if (!githubRepoUrl || !githubToken) {
      alert('Please enter GitHub repository URL and token');
      return;
    }

    setIsSyncing(true);
    setPushStatus('Pushing to GitHub...');
    try {
      const result = await pushToGithub({
        repoUrl: githubRepoUrl,
        token: githubToken,
        branch: githubBranch,
      });

      if (result.success) {
        alert('Successfully pushed to GitHub!');
        setShowGithubModal(false);
      } else {
        alert('Push failed: ' + (result.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Push failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setIsSyncing(false);
      setPushStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Skills</h1>
            <p className="text-muted-foreground mt-2">
              Stored in ~/.skill-sync/skills
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowGithubModal(true)}>
              Push to GitHub
            </Button>
            {selectedSkills.size > 0 && (
              <>
                <Button onClick={openSyncModal} disabled={isSyncing}>
                  {isSyncing ? 'Syncing...' : `Sync ${selectedSkills.size} to Agents`}
                </Button>
                <Button
                  onClick={openUnsyncModal}
                  disabled={isSyncing}
                  variant="outline"
                >
                  Unsync {selectedSkills.size} from Agents
                </Button>
              </>
            )}
            <Link href="/skills/new">
              <Button>Import Skills</Button>
            </Link>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-8">Loading...</div>
        )}

        {error && (
          <div className="text-center py-8 text-destructive">{error}</div>
        )}

        {!isLoading && skills.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No skills found</p>
            <Link href="/skills/new">
              <Button variant="outline">Import your first skill</Button>
            </Link>
          </div>
        )}

        {skills.length > 0 && (
          <div className="mb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All ({skills.length})</TabsTrigger>
                {uniqueTags.map(tag => (
                  <TabsTrigger key={tag} value={tag}>
                    {tag} ({tagCounts.get(tag) || 0})
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        {filteredSkills.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={selectAll}
            />
            <span className="text-sm text-muted-foreground">
              Select all ({selectedSkills.size} selected)
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map((skill) => (
            <SkillCard
              key={skill.name}
              skill={skill}
              isSelected={selectedSkills.has(skill.name)}
              onToggle={toggleSkillSelection}
              onDelete={deleteSkill}
              syncedPlatforms={syncedPlatforms[skill.name] || []}
              loadingIcons={loadingIcons[skill.name] || new Set()}
              onIconClick={(platform, isSynced) => handleIconClick(skill.name, platform, isSynced)}
            />
          ))}
        </div>
      </main>

      {showGithubModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg w-[400px] space-y-4">
            <h2 className="text-xl font-bold">Push to GitHub</h2>
            <div className="space-y-2">
              <Label>Repository URL</Label>
              <Input
                value={githubRepoUrl}
                onChange={(e) => setGithubRepoUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
              />
            </div>
            <div className="space-y-2">
              <Label>Personal Access Token</Label>
              <Input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxx..."
              />
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Input
                value={githubBranch}
                onChange={(e) => setGithubBranch(e.target.value)}
                placeholder="main"
              />
            </div>
            {pushStatus && (
              <p className="text-sm text-muted-foreground">{pushStatus}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowGithubModal(false)}>
                Cancel
              </Button>
              <Button onClick={handlePushToGithub} disabled={isSyncing}>
                {isSyncing ? 'Pushing...' : 'Push'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSyncModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg w-[360px] space-y-4">
            <h2 className="text-xl font-bold">选择同步目标</h2>
            <p className="text-sm text-muted-foreground">
              将 {selectedSkills.size} 个技能同步到以下 Agent：
            </p>
            <div className="space-y-3">
              {SUPPORTED_PLATFORMS.map((platform) => (
                  <div key={platform} className="flex items-center gap-3">
                    <Checkbox
                      id={`agent-${platform}`}
                      checked={selectedAgents.has(platform)}
                      onCheckedChange={(checked) => {
                        setSelectedAgents(prev => {
                          const next = new Set(prev);
                          if (checked) next.add(platform);
                          else next.delete(platform);
                          return next;
                        });
                      }}
                    />
                    <label htmlFor={`agent-${platform}`} className="text-sm font-medium cursor-pointer">
                      {PLATFORM_LABELS[platform]}
                    </label>
                  </div>
                ))}
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowSyncModal(false)}>
                取消
              </Button>
              <Button
                onClick={handleSync}
                disabled={selectedAgents.size === 0}
              >
                确认同步
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Unsync Modal */}
      {showUnsyncModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Select Agents to Unsync From</h3>
            <div className="space-y-3 mb-6">
              {SUPPORTED_PLATFORMS.map((platform) => (
                <div key={platform} className="flex items-center gap-3">
                  <Checkbox
                    id={`unsync-agent-${platform}`}
                    checked={selectedAgents.has(platform)}
                    onCheckedChange={(checked) => {
                      setSelectedAgents(prev => {
                        const next = new Set(prev);
                        if (checked) next.add(platform);
                        else next.delete(platform);
                        return next;
                      });
                    }}
                  />
                  <label htmlFor={`unsync-agent-${platform}`} className="text-sm font-medium cursor-pointer">
                    {PLATFORM_LABELS[platform]}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowUnsyncModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleUnsync} disabled={selectedAgents.size === 0}>
                Unsync
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSkillStore } from '@/stores/skill-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/navigation';

export default function SkillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { skills, deleteSkill } = useSkillStore();
  
  const skill = skills.find(s => s.name === decodeURIComponent(id));

  const handleDelete = async () => {
    if (!skill) return;
    if (confirm('Are you sure you want to delete this skill?')) {
      await deleteSkill(skill.name);
      router.push('/skills');
    }
  };

  if (!skill) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Skill not found</p>
            <Link href="/skills">
              <Button variant="outline">Back to skills</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/skills" className="text-sm text-muted-foreground hover:underline">
              ← Back to skills
            </Link>
            <h1 className="text-3xl font-bold mt-2">{skill.name}</h1>
            <p className="text-muted-foreground mt-2">{skill.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {skill.tags.map((tag) => (
            <span key={tag} className="text-sm px-3 py-1 bg-secondary rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <h2 className="text-xl font-semibold mb-4">Skill Content</h2>
        <Card className="mb-8">
          <CardContent className="pt-6">
            <pre className="text-sm bg-muted p-4 rounded-md overflow-auto whitespace-pre-wrap">
              {skill.content.content}
            </pre>
          </CardContent>
        </Card>

        <div className="mt-8 text-sm text-muted-foreground">
          <p>Created: {new Date(skill.createdAt).toLocaleString()}</p>
          <p>Updated: {new Date(skill.updatedAt).toLocaleString()}</p>
        </div>
      </main>
    </div>
  );
}
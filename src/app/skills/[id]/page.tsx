'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSkillStore } from '@/stores/skill-store';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/navigation';

export default function SkillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const { skills, deleteSkill } = useSkillStore();
  const fromTab = searchParams.get('from') || 'all';
  const backHref = fromTab === 'all' ? '/skills' : `/skills?tab=${encodeURIComponent(fromTab)}`;

  const skill = skills.find(s => s.name === decodeURIComponent(id));

  const handleDelete = async () => {
    if (!skill) return;
    if (confirm('Are you sure you want to delete this skill?')) {
      await deleteSkill(skill.content.filePath);
      router.push(backHref);
    }
  };

  if (!skill) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Skill not found</p>
            <Link href={backHref}>
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
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0">
            <Link href={backHref} className="text-sm text-muted-foreground hover:underline">
              ← Back to skills
            </Link>
            <h1 className="text-3xl font-bold mt-2">{skill.name}</h1>
            {skill.description && (
              <p className="text-muted-foreground mt-2">{skill.description}</p>
            )}
          </div>
          <div className="flex gap-2 ml-4 shrink-0">
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </div>

        {skill.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {skill.tags.map((tag) => (
              <span key={tag} className="text-sm px-3 py-1 bg-secondary rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Markdown 渲染 */}
        <div className="markdown-body space-y-4 text-sm leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-3">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xl font-semibold mt-5 mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-1">{children}</h3>,
              p: ({ children }) => <p className="mb-3 text-foreground/90">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 pl-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 pl-2">{children}</ol>,
              li: ({ children }) => <li className="text-foreground/90">{children}</li>,
              code: ({ className, children, ...props }) => {
                const isBlock = className?.includes('language-');
                return isBlock ? (
                  <code className={`block bg-muted px-4 py-3 rounded-md font-mono text-xs overflow-x-auto ${className}`} {...props}>
                    {children}
                  </code>
                ) : (
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <pre className="mb-4">{children}</pre>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground mb-3">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="border-border my-6" />,
              a: ({ href, children }) => (
                <a href={href} className="text-primary underline underline-offset-2 hover:opacity-80" target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm border-collapse">{children}</table>
                </div>
              ),
              th: ({ children }) => <th className="border border-border px-3 py-2 bg-muted font-semibold text-left">{children}</th>,
              td: ({ children }) => <td className="border border-border px-3 py-2">{children}</td>,
            }}
          >
            {skill.content.content}
          </ReactMarkdown>
        </div>

        <div className="mt-10 pt-6 border-t text-sm text-muted-foreground space-y-1">
          <p>Created: {new Date(skill.createdAt).toLocaleString()}</p>
          <p>Updated: {new Date(skill.updatedAt).toLocaleString()}</p>
        </div>
      </main>
    </div>
  );
}

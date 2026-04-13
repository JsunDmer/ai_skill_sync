import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Navigation() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/skills" className="text-xl font-bold">
          AI Skill Sync
        </Link>
        <nav className="flex gap-4">
          <Link href="/skills">
            <Button variant="ghost">Skills</Button>
          </Link>
          <Link href="/skills/new">
            <Button variant="ghost">Import</Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost">Settings</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}

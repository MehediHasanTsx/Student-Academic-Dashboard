'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SemesterSwitcher } from '@/components/shared/semester-switcher';
import {
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  BarChart3,
  DollarSign,
  Calendar,
  ClipboardList,
  GraduationCap,
  StickyNote,
  TrendingUp,
  Settings,
  FlaskConical,
} from 'lucide-react';

interface SidebarProps {
  onNavigate?: () => void;
}

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Academics',
    items: [
      { label: 'Subjects', href: '/subjects', icon: BookOpen },
      { label: 'Attendance', href: '/attendance', icon: CheckSquare },
      { label: 'GPA / CGPA', href: '/gpa', icon: BarChart3 },
      { label: 'Routine', href: '/routine', icon: Calendar },
    ],
  },
  {
    label: 'Tracking',
    items: [
      { label: 'Assignments', href: '/assignments', icon: ClipboardList },
      { label: 'Exams', href: '/exams', icon: GraduationCap },
      { label: 'Fees', href: '/fees', icon: DollarSign },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Notes', href: '/notes', icon: StickyNote },
      { label: 'Analytics', href: '/analytics', icon: TrendingUp },
      { label: 'Lab Projects', href: '/lab-projects', icon: FlaskConical },
    ],
  },
];

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center px-5">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          onClick={onNavigate}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-none tracking-tight text-sidebar-foreground">
              DCC
            </span>
            <span className="text-[0.65rem] text-muted-foreground leading-tight">
              CSE
            </span>
          </div>
        </Link>
      </div>

      <Separator />

      {/* Semester Switcher */}
      <div className="px-3 py-3">
        <SemesterSwitcher />
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-2">
        <nav>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-4">
              <p className="mb-1 px-3 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    item.href === '/'
                      ? pathname === '/'
                      : pathname.startsWith(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <Separator />

      {/* Settings */}
      <div className="p-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span>Settings</span>
        </Link>
      </div>

      {/* Developer Credit */}
      <div className="px-6 pb-3">
        <p className="text-[0.6rem] text-muted-foreground/60 text-center">
          Built by{' '}
          <a
            href="https://api.whatsapp.com/send/?phone=8801521743944&text&type=phone_number&app_absent=0"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
          >
            mehedihasantsx
          </a>
        </p>
      </div>
    </div>
  );
}

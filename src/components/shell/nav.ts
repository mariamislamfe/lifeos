import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  Compass,
  Flag,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  NotebookPen,
  Send,
  Settings,
  ShoppingBag,
  Sun,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "today" | "inbox" | "overdue" | "reminders";
}

export const NAV_MAIN: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: Sun, badge: "today" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
];

export const NAV_LIFE: NavItem[] = [
  { href: "/university", label: "University", icon: GraduationCap },
  { href: "/study", label: "Study", icon: BookOpen },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/applications", label: "Applications", icon: Send },
  { href: "/events", label: "Events", icon: Users },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/future", label: "Future", icon: Compass },
  { href: "/wishlist", label: "Wishlist", icon: ShoppingBag },
  { href: "/notes", label: "Notes", icon: NotebookPen, badge: "inbox" },
];

export const NAV_TRACK: NavItem[] = [
  { href: "/deadlines", label: "Deadlines", icon: Flag, badge: "overdue" },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/review", label: "Weekly review", icon: ClipboardCheck },
];

export const NAV_FOOTER: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export const ALL_NAV = [...NAV_MAIN, ...NAV_LIFE, ...NAV_TRACK, ...NAV_FOOTER];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

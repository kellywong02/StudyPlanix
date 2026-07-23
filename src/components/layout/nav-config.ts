import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  Clock,
  LayoutDashboard,
  NotebookText,
  Sparkles,
  Timer,
} from "lucide-react"

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/timetable", label: "Classes", icon: CalendarClock },
  { href: "/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/exams", label: "Exams", icon: GraduationCap },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/notes", label: "Notes", icon: NotebookText },
  { href: "/pomodoro", label: "Pomodoro", icon: Timer },
  { href: "/study-plan", label: "Study Plan", icon: Clock },
  { href: "/gpa-tracker", label: "GPA Tracker", icon: BarChart3 },
  { href: "/ai-assistant", label: "AI Assistant", icon: Sparkles },
] as const

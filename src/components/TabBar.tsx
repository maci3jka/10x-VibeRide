import { FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabBarProps {
  currentPath: string;
}

interface TabItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabItem[] = [
  {
    path: "/notes",
    label: "Notes",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    path: "/profile",
    label: "Profile",
    icon: <User className="h-5 w-5" />,
  },
];

/**
 * Bottom navigation bar for cross-view navigation
 * Shows active state based on current path
 */
export function TabBar({ currentPath }: TabBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      aria-label="Main navigation"
    >
      <div className="container mx-auto flex h-16 max-w-2xl items-center justify-around px-4">
        {tabs.map((tab) => {
          const isActive = currentPath === tab.path || currentPath.startsWith(tab.path + "/");
          return (
            <a
              key={tab.path}
              href={tab.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 text-sm font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

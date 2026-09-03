import Link from "next/link";
import { 
  LayoutDashboard, 
  GitMerge, 
  Box, 
  ShieldAlert, 
  FileJson, 
  Rocket, 
  FileBarChart,
  Settings,
  User
} from "lucide-react";

export function Sidebar() {
  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Scan Pipeline", href: "/pipeline", icon: GitMerge },
    { name: "Images", href: "/images", icon: Box },
    { name: "Vulnerabilities", href: "/vulnerabilities", icon: ShieldAlert },
    { name: "SBOM", href: "/sbom", icon: FileJson },
    { name: "Deployments", href: "/deployments", icon: Rocket },
    { name: "Reports", href: "/reports", icon: FileBarChart },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white/50 backdrop-blur-xl">
      <div className="flex h-16 items-center border-b px-6">
        <ShieldAlert className="mr-2 h-6 w-6 text-blue-600" />
        <span className="text-lg font-bold tracking-tight text-slate-900">
          Contisent
        </span>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-1 px-4">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t p-4 space-y-1">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <User className="h-4 w-4" />
          Profile
        </Link>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}

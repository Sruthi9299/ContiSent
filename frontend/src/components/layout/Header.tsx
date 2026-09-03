"use client";

import { useState } from "react";
import { Bell, Search, User, LogOut, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const notifications = [
  { id: 1, title: "New vulnerability found in container-app", time: "2 min ago", unread: true },
  { id: 2, title: "Security scan completed successfully", time: "1 hour ago", unread: false },
  { id: 3, title: "System update available", time: "2 hours ago", unread: false },
];

export function Header() {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(notifications.filter(n => n.unread).length);

  const markAllAsRead = () => {
    // In a real app, this would hit the backend: POST /notifications/mark-all-read
    setUnreadCount(0);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white/80 px-6 backdrop-blur-md">
      <div className="flex flex-1 items-center gap-4 md:w-1/3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            type="search"
            placeholder="Search resources..."
            className="w-full bg-slate-50 pl-9 border-slate-200 focus-visible:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="h-5 w-5 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-2 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white"></span>
              )}
            </Button>
          } />
          <DropdownMenuContent className="w-80" align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal border-b pb-2 flex justify-between items-center">
                <span className="font-semibold text-slate-900">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                    Mark all as read
                  </button>
                )}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup className="max-h-80 overflow-y-auto">
              {notifications.map((notification) => (
                <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                  <div className="flex items-center gap-2">
                    {notification.unread && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                    <span className={`text-sm ${notification.unread ? 'font-medium text-slate-900' : 'text-slate-700'}`}>{notification.title}</span>
                  </div>
                  <span className="text-xs text-slate-500 pl-4">{notification.time}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <Avatar className="h-8 w-8 cursor-pointer border border-slate-200 hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition-all">
                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
            </button>
          } />
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.username || "Guest User"}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || "guest@example.com"}
                </p>
              </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link href="/dashboard/profile">
                <DropdownMenuItem className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/dashboard/settings">
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

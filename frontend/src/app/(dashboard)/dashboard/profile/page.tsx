"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Mail, Shield, Camera, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between space-y-2 mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Profile Details</h2>
      </div>

      <div className="grid gap-6">
        <Card className="col-span-1 border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your basic account details and public profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative group">
                <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-background bg-muted flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground opacity-50" />
                  )}
                </div>
                <Label 
                  htmlFor="avatar-upload" 
                  className="absolute bottom-0 right-0 h-10 w-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 hover:scale-110 transition-all ring-4 ring-background"
                >
                  <Camera className="h-5 w-5" />
                </Label>
                <input 
                  type="file" 
                  id="avatar-upload" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                />
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="text-lg font-medium">Profile Picture</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Upload a new avatar to personalize your account. JPEGs and PNGs supported.
                </p>
                <div className="pt-2 flex justify-center sm:justify-start gap-2">
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('avatar-upload')?.click()}>
                    <Upload className="h-4 w-4 mr-2" /> Upload Image
                  </Button>
                  {avatarUrl && (
                    <Button variant="ghost" size="sm" onClick={() => setAvatarUrl(null)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-border/50 pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input id="name" disabled value={user?.username || ""} className="pl-10 bg-background/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input id="email" disabled value={user?.email || ""} className="pl-10 bg-background/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Assigned Role</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input id="role" disabled value={user?.role || ""} className="pl-10 capitalize bg-background/50 font-medium text-primary" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Contact an administrator if you need different permissions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

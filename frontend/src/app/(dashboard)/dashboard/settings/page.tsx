"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { Palette, Shield, Smartphone, History, Check } from "lucide-react";
import { useCustomization } from "@/context/CustomizationContext";
import { API_BASE_URL } from "@/lib/config";

interface LinkedDevice {
  id: number;
  token: string;
  created_at: string;
  expires_at: string;
  is_revoked: boolean;
  device_info: string;
  ip_address: string;
}

interface AuditLog {
  id: number;
  action: string;
  details: string;
  ip_address: string;
  timestamp: string;
}

export default function SettingsPage() {
  const { user, token: authToken } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Customization state
  const { fontSize, setFontSize, fontFamily, setFontFamily } = useCustomization();
  
  // Auth state
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [pwdError, setPwdError] = useState("");

  // Real data states
  const [linkedDevices, setLinkedDevices] = useState<LinkedDevice[]>([]);
  const [loginHistory, setLoginHistory] = useState<AuditLog[]>([]);

  useEffect(() => {
    setMounted(true);
    if (authToken) {
      fetchDevices();
      fetchHistory();
    }
  }, [authToken]);

  const fetchDevices = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/sessions`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        setLinkedDevices(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/audit-logs`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        setLoginHistory(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const revokeDevice = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/sessions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        setLinkedDevices((devices) => devices.filter(device => device.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const requestOtp = async () => {
    setIsRequestingOtp(true);
    setOtpError("");
    try {
      const res = await fetch(`${API_BASE_URL}/users/request-otp`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        setOtpRequested(true);
      } else {
        const data = await res.json();
        setOtpError(data.detail || "Failed to send OTP");
      }
    } catch (err) {
      setOtpError("Network error");
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    const form = e.currentTarget as HTMLFormElement;
    const otp = form.otp.value;
    const newPwd = form["new-pwd"].value;
    const confirmPwd = form["confirm-pwd"].value;

    if (newPwd !== confirmPwd) {
      setPwdError("Passwords do not match");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/change-password-otp`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}` 
        },
        body: JSON.stringify({ otp, new_password: newPwd })
      });
      if (res.ok) {
        setPasswordChanged(true);
        form.reset();
        setTimeout(() => {
          setPasswordChanged(false);
          setOtpRequested(false);
        }, 3000);
      } else {
        const data = await res.json();
        setPwdError(data.detail || "Failed to change password");
      }
    } catch (err) {
      setPwdError("Network error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between space-y-2 mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h2>
      </div>

      <Tabs orientation="vertical" defaultValue="customization" className="flex flex-col md:flex-row gap-8 items-start">
        <TabsList className="w-full md:w-64 flex flex-col items-stretch h-auto bg-transparent gap-2 p-0">
          <TabsTrigger value="customization" className="justify-start px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary dark:data-[state=active]:bg-primary/20">
            <Palette className="mr-3 h-4 w-4" /> Customization
          </TabsTrigger>
          <TabsTrigger value="authentication" className="justify-start px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary dark:data-[state=active]:bg-primary/20">
            <Shield className="mr-3 h-4 w-4" /> Authentication
          </TabsTrigger>
          <TabsTrigger value="devices" className="justify-start px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary dark:data-[state=active]:bg-primary/20">
            <Smartphone className="mr-3 h-4 w-4" /> Linked Devices
          </TabsTrigger>
          <TabsTrigger value="history" className="justify-start px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary dark:data-[state=active]:bg-primary/20">
            <History className="mr-3 h-4 w-4" /> Login History
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 w-full min-h-[400px]">
          {/* Customization Tab */}
          <TabsContent value="customization" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Theme Preferences</CardTitle>
                <CardDescription>Adjust the appearance of the application.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Color Mode</Label>
                  <div className="flex gap-4">
                    <Button 
                      variant={mounted && theme === "light" ? "default" : "outline"} 
                      onClick={() => setTheme("light")}
                    >
                      Light Mode
                    </Button>
                    <Button 
                      variant={mounted && theme === "dark" ? "default" : "outline"} 
                      onClick={() => setTheme("dark")}
                    >
                      Dark Mode
                    </Button>
                    <Button 
                      variant={mounted && theme === "system" ? "default" : "outline"} 
                      onClick={() => setTheme("system")}
                    >
                      System Default
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t">
                  <Label>Font Style</Label>
                  <div className="flex gap-4">
                    <Button variant={mounted && fontFamily === "sans" ? "default" : "outline"} onClick={() => setFontFamily("sans")} className="font-sans">Sans-serif</Button>
                    <Button variant={mounted && fontFamily === "serif" ? "default" : "outline"} onClick={() => setFontFamily("serif")} className="font-serif">Serif</Button>
                    <Button variant={mounted && fontFamily === "mono" ? "default" : "outline"} onClick={() => setFontFamily("mono")} className="font-mono">Monospace</Button>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <Label>Font Size</Label>
                  <div className="flex gap-4">
                    <Button variant={mounted && fontSize === "small" ? "default" : "outline"} onClick={() => setFontSize("small")} className="text-xs">Small</Button>
                    <Button variant={mounted && fontSize === "normal" ? "default" : "outline"} onClick={() => setFontSize("normal")} className="text-sm">Normal</Button>
                    <Button variant={mounted && fontSize === "large" ? "default" : "outline"} onClick={() => setFontSize("large")} className="text-lg">Large</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Authentication Tab */}
          <TabsContent value="authentication" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Verify your identity with an OTP to update your password.</CardDescription>
              </CardHeader>
              <CardContent>
                {!otpRequested ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      We will send a One-Time Password (OTP) to your registered email: <strong>{user?.email || "your email"}</strong>
                    </p>
                    {otpError && <p className="text-sm text-red-500">{otpError}</p>}
                    <Button onClick={requestOtp} disabled={isRequestingOtp}>
                      {isRequestingOtp ? "Sending..." : "Send OTP to Email"}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={changePassword} className="space-y-4">
                    {pwdError && <p className="text-sm text-red-500">{pwdError}</p>}
                    <div className="space-y-2">
                      <Label htmlFor="otp">Enter OTP</Label>
                      <Input id="otp" name="otp" placeholder="6-digit code" required maxLength={6} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-pwd">New Password</Label>
                      <Input id="new-pwd" name="new-pwd" type="password" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-pwd">Confirm New Password</Label>
                      <Input id="confirm-pwd" name="confirm-pwd" type="password" required />
                    </div>
                    <div className="pt-2">
                      <Button type="submit" disabled={isChangingPassword} className="w-full sm:w-auto">
                        {isChangingPassword ? "Updating..." : passwordChanged ? <><Check className="mr-2 h-4 w-4"/> Updated!</> : "Confirm Password Change"}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Linked Devices Tab */}
          <TabsContent value="devices" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Linked Devices ({linkedDevices.length})</CardTitle>
                <CardDescription>Manage the devices currently logged into your account.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {linkedDevices.length === 0 && (
                    <p className="text-slate-500 text-sm py-4">No active devices found.</p>
                  )}
                  {linkedDevices.map(device => {
                    // Check if this device token matches our current token prefix
                    const isActive = authToken && device.token && authToken.startsWith(device.token.replace("...", "")); 
                    return (
                    <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg dark:border-slate-800">
                      <div className="space-y-1">
                        <p className="font-medium flex items-center gap-2">
                          {device.device_info}
                          {isActive && <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">Current Device</span>}
                        </p>
                        <p className="text-sm text-slate-500">IP: {device.ip_address} • Created: {new Date(device.created_at).toLocaleString()}</p>
                      </div>
                      {!isActive && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                          onClick={() => revokeDevice(device.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  )})}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Login History</CardTitle>
                <CardDescription>Recent authentication attempts for your account.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Date & Time</th>
                        <th className="px-4 py-3 font-medium">IP Address</th>
                        <th className="px-4 py-3 font-medium">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800">
                      {loginHistory.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No login history found.</td>
                        </tr>
                      )}
                      {loginHistory.map(log => (
                        <tr key={log.id} className="bg-white dark:bg-transparent">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              log.action.includes("Success") || log.action === "login" 
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono text-xs">{log.ip_address}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}

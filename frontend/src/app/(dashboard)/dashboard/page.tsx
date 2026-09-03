"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ShieldCheck, Box, Activity, UploadCloud, ArrowRight, Download, Server, GitBranch } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/config";
import { Check } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { name: "Jan", critical: 40, high: 24, medium: 24 },
  { name: "Feb", critical: 30, high: 13, medium: 22 },
  { name: "Mar", critical: 20, high: 58, medium: 22 },
  { name: "Apr", critical: 27, high: 39, medium: 20 },
  { name: "May", critical: 18, high: 48, medium: 21 },
  { name: "Jun", critical: 23, high: 38, medium: 25 },
  { name: "Jul", critical: 34, high: 43, medium: 21 },
];

export default function DashboardPage() {
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleScanSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const repoUrl = formData.get("repo-url") as string;
    const imageTag = formData.get("image-tag") as string;
    
    let type = "url";
    let sourceUri = repoUrl;
    
    if (imageTag) {
      type = "image";
      sourceUri = imageTag;
    }
    
    if (!sourceUri) {
      sourceUri = "example/app"; // fallback
    }

    try {
      const res = await fetch(`${API_BASE_URL}/submissions/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ type, source_uri: sourceUri })
      });
      
      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const handleDownloadReport = async () => {
    if (!token) return;
    setIsDownloadingReport(true);
    
    try {
      // 1. Fetch all submissions to get the most recent one
      const res = await fetch(`${API_BASE_URL}/submissions/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch submissions");
      const submissions = await res.json();
      
      if (submissions.length === 0) {
        alert("No submissions found to generate a report.");
        setIsDownloadingReport(false);
        return;
      }
      
      // Get highest ID (most recent)
      const latestSub = submissions.reduce((prev: any, current: any) => (prev.id > current.id) ? prev : current);
      
      // 2. Fetch full details for the latest submission
      const detailRes = await fetch(`${API_BASE_URL}/submissions/${latestSub.id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!detailRes.ok) throw new Error("Failed to fetch submission details");
      const subDetails = await detailRes.json();
      
      // Import dynamically to avoid SSR issues if necessary, but we are in a use client file.
      const { generateProfessionalReport } = await import("@/lib/reportGenerator");
      
      // We pass the IDs for flowchart and chart elements to be captured
      await generateProfessionalReport(subDetails, "pipeline-flowchart-container", "vulnerability-pie-chart");
      
    } catch (err: any) {
      console.error(err);
      alert("Error generating report: " + (err.message || String(err)));
    } finally {
      setIsDownloadingReport(false);
    }
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between space-y-2 p-6 pb-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Overview
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor and manage your container security posture.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleDownloadReport} disabled={isDownloadingReport} variant="outline" className="shadow-sm hover:shadow transition-shadow">
            {isDownloadingReport ? <Activity className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} 
            {isDownloadingReport ? "Generating..." : "Download Report"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 px-6">
        {[
          { title: "Scanned Images", value: "1,284", icon: Box, color: "text-blue-500", desc: "+12% from last month" },
          { title: "Critical Vulns", value: "23", icon: ShieldAlert, color: "text-red-500", desc: "-4% from last week", valColor: "text-red-600" },
          { title: "Active Deployments", value: "342", icon: Activity, color: "text-blue-500", desc: "Across 3 clusters" },
          { title: "Policy Compliance", value: "98.2%", icon: ShieldCheck, color: "text-green-500", desc: "+2.1% from last month", valColor: "text-green-600" }
        ].map((stat, i) => (
          <Card key={i} className="group overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-primary/50 cursor-default">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-full bg-slate-100 dark:bg-slate-800/50 group-hover:scale-110 transition-transform ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.valColor || ''}`}>{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 px-6">
        <Card className="col-span-4 border-border/50 shadow-sm backdrop-blur-sm bg-card/50 transition-all hover:shadow-md hover:border-primary/20">
          <CardHeader>
            <CardTitle>Vulnerability Trends</CardTitle>
            <CardDescription>
              Vulnerabilities detected across all clusters over time.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-0 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area type="monotone" dataKey="high" stroke="#f59e0b" fillOpacity={1} fill="url(#colorHigh)" />
                <Area type="monotone" dataKey="critical" stroke="hsl(var(--destructive))" fillOpacity={1} fill="url(#colorCritical)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 border-border/50 shadow-sm backdrop-blur-sm bg-card/50 flex flex-col transition-all hover:shadow-md hover:border-primary/20">
          <CardHeader>
            <CardTitle>Submit Application</CardTitle>
            <CardDescription>
              Trigger a new security scan pipeline for an application.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <Dialog>
              <DialogTrigger className="w-full appearance-none bg-transparent border-0 p-0 m-0 outline-none text-left">
                <div className="group cursor-pointer flex flex-col items-center justify-center p-10 rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 hover:-translate-y-1 transition-all duration-300">
                  <div className="rounded-full bg-background shadow-sm p-4 mb-4 group-hover:scale-110 transition-transform group-hover:shadow-md ring-1 ring-border">
                    <UploadCloud className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground text-center group-hover:text-primary transition-colors">
                    Upload Source Code or Image
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-[220px] text-center">
                    Provide a repository URL or Docker image tag to begin a comprehensive scan.
                  </p>
                  <div className="mt-6 inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-md shadow-primary/20 group-hover:bg-primary/90 group-hover:shadow-lg transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                    Configure Scan <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </DialogTrigger>
              
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl">New Security Scan</DialogTitle>
                  <DialogDescription>
                    Configure the target application for the vulnerability scanner.
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleScanSubmit}>
                  <Tabs defaultValue="url" className="w-full mt-4">
                    <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/50 rounded-lg">
                      <TabsTrigger value="url" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <GitBranch className="h-4 w-4 mr-2" /> Web Link / Repo
                      </TabsTrigger>
                      <TabsTrigger value="image" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Server className="h-4 w-4 mr-2" /> Docker Image
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="url" className="space-y-4 pt-4 animate-in fade-in-50">
                      <div className="space-y-2">
                        <Label htmlFor="repo-url">Target URL (GitHub Repo or Deployed Link)</Label>
                        <Input id="repo-url" name="repo-url" placeholder="https://github.com/username/repo.git or https://myapp.com" className="bg-background/50" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="branch">Branch (Optional - for Git repos)</Label>
                        <Input id="branch" name="branch" placeholder="main" className="bg-background/50" />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="image" className="space-y-4 pt-4 animate-in fade-in-50">
                      <div className="space-y-2">
                        <Label htmlFor="image-tag">Docker Image Tag</Label>
                        <Input id="image-tag" name="image-tag" placeholder="nginx:latest" className="bg-background/50" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="registry">Container Registry (Optional)</Label>
                        <Input id="registry" name="registry" placeholder="docker.io" className="bg-background/50" />
                      </div>
                    </TabsContent>
                  </Tabs>
                  
                  <DialogFooter className="mt-8 border-t pt-4">
                    <Button type="submit" className="w-full sm:w-auto shadow-md transition-transform active:scale-95" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <div className="flex items-center"><Activity className="mr-2 h-4 w-4 animate-spin" /> Starting...</div>
                      ) : submitSuccess ? (
                        <div className="flex items-center text-green-100"><Check className="mr-2 h-4 w-4" /> Scan Initiated</div>
                      ) : (
                        "Start Security Scan"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

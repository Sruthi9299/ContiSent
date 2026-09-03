"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, ShieldAlert, FileText, CheckCircle, AlertTriangle, Lightbulb, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ReportsPage() {
  const { token } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSub, setSelectedSub] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const fetchSubmissions = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/submissions/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Sort by newest
        const sorted = data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setSubmissions(sorted);
        if (sorted.length > 0) {
          setSelectedSub(sorted[0].id.toString());
        }
      }
    } catch (err) {
      console.error("Failed to fetch submissions", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [token]);

  const currentSub = submissions.find(s => s.id.toString() === selectedSub);

  const handleExportPDF = async () => {
    if (!token || !currentSub) return;
    setIsExporting(true);
    
    try {
      const detailRes = await fetch(`${API_BASE_URL}/submissions/${currentSub.id}`, {
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
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between space-y-2 px-6 pt-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Security Reports
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            View detailed findings, stage status, and remediation steps.
          </p>
        </div>
        <Button onClick={handleExportPDF} disabled={isExporting || !currentSub} variant="outline" className="shadow-sm">
          <Download className={`mr-2 h-4 w-4 ${isExporting ? 'animate-bounce' : ''}`} /> {isExporting ? "Exporting..." : "Export PDF"}
        </Button>
      </div>

      <div className="px-6 pb-6 space-y-6">
        <Card className="border-border/50 shadow-sm backdrop-blur-sm bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Select Scan Target</CardTitle>
              <CardDescription>Choose a scan to view its full report.</CardDescription>
            </div>
            {submissions.length > 0 && (
              <Select value={selectedSub} onValueChange={(val) => setSelectedSub(val || "")}>
                <SelectTrigger className="w-[400px]">
                  <SelectValue placeholder="Select a scan..." />
                </SelectTrigger>
                <SelectContent>
                  {submissions.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id.toString()}>
                      {sub.source_uri} ({sub.status}) - {new Date(sub.created_at).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardHeader>
        </Card>

        {!currentSub && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground bg-card/50 rounded-lg border border-border/50">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p>No reports available.</p>
            <p className="text-sm">Initiate a scan to generate reports.</p>
          </div>
        )}

        {currentSub && currentSub.status.toLowerCase() !== "failed" && (
          <div className="space-y-6">
            <Card className="border-green-500/50 bg-green-500/5 shadow-sm">
              <CardHeader>
                 <div className="flex items-center gap-2 text-green-600">
                    <ShieldCheck className="h-6 w-6" />
                    <CardTitle>Scan Completed Successfully</CardTitle>
                 </div>
                 <CardDescription className="text-green-600/80">All pipeline stages finished without internal errors.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                      <div className="text-sm font-medium text-slate-500 mb-1">Critical</div>
                      <div className="text-2xl font-bold text-red-500">{currentSub.scan_result?.critical_count || 0}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                      <div className="text-sm font-medium text-slate-500 mb-1">High</div>
                      <div className="text-2xl font-bold text-orange-500">{currentSub.scan_result?.high_count || 0}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                      <div className="text-sm font-medium text-slate-500 mb-1">Medium</div>
                      <div className="text-2xl font-bold text-yellow-500">{currentSub.scan_result?.medium_count || 0}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                      <div className="text-sm font-medium text-slate-500 mb-1">Low</div>
                      <div className="text-2xl font-bold text-blue-500">{currentSub.scan_result?.low_count || 0}</div>
                    </div>
                 </div>

                 <div className="bg-white p-6 rounded-lg border border-slate-200 mt-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-slate-800">
                      <Lightbulb className="h-5 w-5 text-yellow-500" /> Suggested Improvements
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                        <span className="text-sm text-slate-600">Update base image to the latest alpine version to resolve high-severity CVEs.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                        <span className="text-sm text-slate-600">Consider enabling non-root users in your Dockerfile to improve runtime security.</span>
                      </li>
                    </ul>
                 </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentSub && currentSub.status.toLowerCase() === "failed" && (
          <div className="space-y-6">
            <Card className="border-red-500/50 bg-red-500/5 shadow-sm">
              <CardHeader>
                 <div className="flex items-center gap-2 text-red-600">
                    <ShieldAlert className="h-6 w-6" />
                    <CardTitle>Scan Failed</CardTitle>
                 </div>
                 <CardDescription className="text-red-600/80">The pipeline encountered an error and could not complete all stages.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 
                 <div className="bg-white p-4 rounded-lg border border-red-200 border-l-4 border-l-red-500">
                    <h3 className="font-semibold text-red-700 flex items-center gap-2 mb-2">
                       <AlertTriangle className="h-4 w-4" /> Failure Stage: Source Acquisition / Scanner
                    </h3>
                    <p className="text-sm text-slate-600 font-mono bg-slate-50 p-3 rounded mt-2 border border-slate-200">
                      [ERROR] Could not analyze the target: {currentSub.source_uri} <br/>
                      [WARN] The scanner could not reach the target, or the target rejected the connection. If scanning a website, ensure it allows automated requests. If scanning a Git Repo or Docker Image, ensure it is public and valid.
                    </p>
                 </div>

                 <div className="bg-white p-6 rounded-lg border border-slate-200">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-slate-800">
                      <Lightbulb className="h-5 w-5 text-yellow-500" /> Remediation Steps
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                        <span className="text-sm text-slate-600">If you are scanning a URL, ensure it points to a public Git repository, not a regular website.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                        <span className="text-sm text-slate-600">If you are scanning a Docker Image, verify that the image tag exists on Docker Hub (e.g. 'nginx:latest').</span>
                      </li>
                    </ul>
                 </div>
                 
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

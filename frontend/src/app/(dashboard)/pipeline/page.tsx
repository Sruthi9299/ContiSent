"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/config";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Shield, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { DetailedWorkflow } from "@/components/pipeline/DetailedWorkflow";
import React from "react";

export default function PipelinePage() {
  const { token } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const fetchSubmissions = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/submissions/`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Sort by newest first
        const sortedData = data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setSubmissions(sortedData);
      }
    } catch (err) {
      console.error("Failed to fetch submissions", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchSubmissions, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case "failed":
      case "quarantined":
        return <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20"><AlertTriangle className="w-3 h-3 mr-1" /> {status}</Badge>;
      case "scanning":
      case "building":
      case "policy_evaluation":
      case "deploying":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 animate-pulse"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> {status}</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-400 border-slate-700"><Clock className="w-3 h-3 mr-1" /> {status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between space-y-2 px-6 pt-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Scan Pipeline
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor the real-time status of your security scans.
          </p>
        </div>
        <Button onClick={fetchSubmissions} variant="outline" size="sm" className="shadow-sm bg-card hover:bg-muted" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> 
          Refresh
        </Button>
      </div>

      <div className="px-6 pb-6">
        <Card className="border-border/50 shadow-sm backdrop-blur-sm bg-card/50">
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
            <CardDescription>A list of recent targets submitted for vulnerability scanning.</CardDescription>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p>No scans have been initiated yet.</p>
                <p className="text-sm">Trigger a scan from the Dashboard to see it here.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Target</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Vulnerabilities</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <React.Fragment key={sub.id}>
                      <TableRow className="border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => toggleRow(sub.id)}>
                        <TableCell className="font-medium truncate max-w-[250px]" title={sub.source_uri}>
                          <div className="flex items-center gap-2">
                             {expandedRows.has(sub.id) ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                             {sub.source_uri}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{sub.type}</TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(sub.created_at.endsWith('Z') ? sub.created_at : `${sub.created_at}Z`).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="text-right">
                          {sub.scan_result ? (
                            <div className="flex items-center justify-end gap-2 text-xs font-medium">
                              {sub.scan_result.critical_count > 0 && <span className="text-red-500">{sub.scan_result.critical_count} C</span>}
                              {sub.scan_result.high_count > 0 && <span className="text-orange-500">{sub.scan_result.high_count} H</span>}
                              {sub.scan_result.critical_count === 0 && sub.scan_result.high_count === 0 && (
                                  <span className="text-green-500"><CheckCircle className="w-3 h-3 inline mr-1" /> Clean</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(sub.id) && (
                        <TableRow className="border-border/50 bg-slate-50/30 hover:bg-slate-50/30">
                           <TableCell colSpan={5} className="p-0">
                              <DetailedWorkflow 
                                status={sub.status} 
                                isDast={sub.scan_result?.full_json?.ArtifactType === "website" || (sub.type === "url" && !sub.source_uri.includes(".git") && !sub.source_uri.includes("github.com") && !sub.scan_result)}
                              />
                           </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

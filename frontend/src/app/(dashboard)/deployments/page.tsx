"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/config";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink, Box, Server, CheckCircle, AlertTriangle } from "lucide-react";
import React from "react";

export default function DeploymentsPage() {
  const { token } = useAuth();
  const [deployments, setDeployments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDeployments = async () => {
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
        // Filter submissions that have a deployment
        const deployedSubmissions = data.filter((sub: any) => sub.deployment != null);
        // Sort by newest first
        const sortedData = deployedSubmissions.sort((a: any, b: any) => new Date(b.deployment.timestamp).getTime() - new Date(a.deployment.timestamp).getTime());
        setDeployments(sortedData);
      }
    } catch (err) {
      console.error("Failed to fetch deployments", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchDeployments, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "succeeded":
      case "running":
        return <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20"><CheckCircle className="w-3 h-3 mr-1" /> Running</Badge>;
      case "failed":
      case "blocked":
        return <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20"><AlertTriangle className="w-3 h-3 mr-1" /> {status}</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-400 border-slate-700">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between space-y-2 px-6 pt-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Deployments
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your actively running containerized applications.
          </p>
        </div>
        <Button onClick={fetchDeployments} variant="outline" size="sm" className="shadow-sm bg-card hover:bg-muted" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> 
          Refresh
        </Button>
      </div>

      <div className="px-6 pb-6">
        <Card className="border-border/50 shadow-sm backdrop-blur-sm bg-card/50">
          <CardHeader>
            <CardTitle>Active Environments</CardTitle>
            <CardDescription>Applications that have passed security policies and are deployed to the cluster.</CardDescription>
          </CardHeader>
          <CardContent>
            {deployments.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Box className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p>No active deployments found.</p>
                <p className="text-sm">Submit an image for scanning to deploy it.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Target</TableHead>
                    <TableHead>Cluster</TableHead>
                    <TableHead>Namespace</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Deployed At</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deployments.map((sub) => (
                    <TableRow key={sub.deployment.id || sub.id} className="border-border/50 hover:bg-muted/30">
                      <TableCell className="font-medium truncate max-w-[250px]" title={sub.source_uri}>
                        {sub.source_uri}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4" />
                          {sub.deployment.cluster}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{sub.deployment.namespace}</TableCell>
                      <TableCell>{getStatusBadge(sub.deployment.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(sub.deployment.timestamp.endsWith('Z') ? sub.deployment.timestamp : `${sub.deployment.timestamp}Z`).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-right">
                        {sub.deployment.access_url ? (
                           <Button 
                              variant="default" 
                              size="sm" 
                              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                              onClick={() => window.open(sub.deployment.access_url, '_blank')}
                           >
                             <ExternalLink className="w-4 h-4 mr-2" />
                             Open App
                           </Button>
                        ) : (
                           <span className="text-muted-foreground text-xs italic">URL Unavailable</span>
                        )}
                      </TableCell>
                    </TableRow>
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

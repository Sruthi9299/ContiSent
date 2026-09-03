"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/config";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldAlert, AlertTriangle, AlertCircle, Info } from "lucide-react";

export default function VulnerabilitiesPage() {
  const { token } = useAuth();
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVulnerabilities = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vulnerabilities`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setVulnerabilities(data);
      }
    } catch (err) {
      console.error("Failed to fetch vulnerabilities", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVulnerabilities();
  }, [token]);

  const getSeverityBadge = (severity: string) => {
    switch (severity.toUpperCase()) {
      case "CRITICAL":
        return <Badge variant="destructive" className="bg-red-600 hover:bg-red-700 text-white"><ShieldAlert className="w-3 h-3 mr-1" /> CRITICAL</Badge>;
      case "HIGH":
        return <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600 text-white"><AlertTriangle className="w-3 h-3 mr-1" /> HIGH</Badge>;
      case "MEDIUM":
        return <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white"><AlertCircle className="w-3 h-3 mr-1" /> MEDIUM</Badge>;
      case "LOW":
        return <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white"><Info className="w-3 h-3 mr-1" /> LOW</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-400 border-slate-700">{severity}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between space-y-2 px-6 pt-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Vulnerabilities
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Review and remediate security vulnerabilities found across all scanned targets.
          </p>
        </div>
        <Button onClick={fetchVulnerabilities} variant="outline" size="sm" className="shadow-sm bg-card hover:bg-muted" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> 
          Refresh
        </Button>
      </div>

      <div className="px-6 pb-6">
        <Card className="border-border/50 shadow-sm backdrop-blur-sm bg-card/50">
          <CardHeader>
            <CardTitle>Detected Vulnerabilities</CardTitle>
            <CardDescription>Aggregated list of vulnerabilities sorted by severity.</CardDescription>
          </CardHeader>
          <CardContent>
            {vulnerabilities.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <ShieldAlert className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p>No vulnerabilities found.</p>
                <p className="text-sm">Great job! Your applications are currently secure.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Severity</TableHead>
                    <TableHead>Vulnerability ID</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Remediation Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vulnerabilities.map((vuln, index) => (
                    <TableRow key={`${vuln.id}-${index}`} className="border-border/50 hover:bg-muted/30 group">
                      <TableCell>{getSeverityBadge(vuln.severity)}</TableCell>
                      <TableCell className="font-medium text-primary">
                        {vuln.id}
                        {vuln.title && <div className="text-xs text-muted-foreground font-normal truncate max-w-[200px] mt-1" title={vuln.title}>{vuln.title}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs">{vuln.pkg_name}</div>
                        <div className="text-xs text-muted-foreground mt-1">v{vuln.installed_version}</div>
                      </TableCell>
                      <TableCell className="text-sm truncate max-w-[200px]" title={vuln.target}>
                        {vuln.target}
                      </TableCell>
                      <TableCell>
                        {vuln.fixed_version ? (
                          <div className="flex flex-col space-y-1">
                            <Badge variant="outline" className="w-fit border-green-500/30 text-green-500 bg-green-500/5 mb-1">
                              Fix Available
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Upgrade <strong className="text-primary">{vuln.pkg_name}</strong> from version {vuln.installed_version} to <strong className="text-green-500">{vuln.fixed_version}</strong>.
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col space-y-1">
                            <Badge variant="outline" className="w-fit border-slate-500/30 text-slate-500 bg-slate-500/5 mb-1">
                              No Fix Available
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Wait for maintainers to release a patch, or use an alternative package.
                            </span>
                          </div>
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

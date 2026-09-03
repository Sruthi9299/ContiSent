"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/config";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileJson, Package, Shield, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SbomPage() {
  const { token } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSub, setSelectedSub] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubmissions = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/submissions/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const completed = data.filter((s: any) => s.status.toLowerCase() === 'completed');
        setSubmissions(completed);
        if (completed.length > 0) {
          setSelectedSub(completed[0].id.toString());
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

  // Extract or simulate packages
  const getPackages = () => {
    if (!selectedSub) return [];
    const sub = submissions.find(s => s.id.toString() === selectedSub);
    if (!sub) return [];
    
    // In a real app, this would come from sub.scan_result.full_json or a dedicated SBOM endpoint
    // We simulate it here based on the submission ID for demo purposes
    return [
      { id: 1, name: "alpine-baselayout", version: "3.2.0-r16", type: "apk", license: "GPL-2.0" },
      { id: 2, name: "busybox", version: "1.33.1-r6", type: "apk", license: "GPL-2.0" },
      { id: 3, name: "libcrypto1.1", version: "1.1.1l-r0", type: "apk", license: "OpenSSL" },
      { id: 4, name: "zlib", version: "1.2.11-r3", type: "apk", license: "Zlib" },
      { id: 5, name: "npm", version: "8.1.2", type: "npm", license: "Artistic-2.0" },
      { id: 6, name: "express", version: "4.17.1", type: "npm", license: "MIT" },
      { id: 7, name: "react", version: "18.2.0", type: "npm", license: "MIT" },
    ];
  };

  const packages = getPackages();
  const currentSub = submissions.find(s => s.id.toString() === selectedSub);

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between space-y-2 px-6 pt-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Software Bill of Materials (SBOM)
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Explore the software inventory, dependencies, and licenses of your applications.
          </p>
        </div>
        <Button variant="outline" className="shadow-sm">
          <Download className="mr-2 h-4 w-4" /> Export JSON
        </Button>
      </div>

      <div className="px-6 pb-6 space-y-6">
        <Card className="border-border/50 shadow-sm backdrop-blur-sm bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Select Target</CardTitle>
              <CardDescription>Choose a successfully scanned target to view its SBOM.</CardDescription>
            </div>
            {submissions.length > 0 && (
              <Select value={selectedSub} onValueChange={(val) => setSelectedSub(val || "")}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a scan..." />
                </SelectTrigger>
                <SelectContent>
                  {submissions.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id.toString()}>
                      {sub.source_uri} ({new Date(sub.created_at).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardHeader>
        </Card>

        <Card className="border-border/50 shadow-sm backdrop-blur-sm bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              Discovered Packages
            </CardTitle>
            {currentSub && (
               <CardDescription>Packages found in {currentSub.source_uri}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {submissions.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <FileJson className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p>No successful scans available.</p>
                <p className="text-sm">Complete a scan first to generate an SBOM.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Package Name</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Ecosystem</TableHead>
                    <TableHead>License</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id} className="border-border/50 hover:bg-muted/30">
                      <TableCell className="font-medium text-slate-700">{pkg.name}</TableCell>
                      <TableCell className="text-slate-500 font-mono text-sm">{pkg.version}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-800">
                          {pkg.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-500">{pkg.license}</TableCell>
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

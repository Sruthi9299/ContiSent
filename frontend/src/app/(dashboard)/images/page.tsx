"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/config";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Box } from "lucide-react";

export default function ImagesPage() {
  const { token } = useAuth();
  const [images, setImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchImages = async () => {
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
        
        // Group by source_uri (image name) to get unique images and their latest scan
        const uniqueImagesMap = new Map();
        
        data.forEach((sub: any) => {
          if (sub.type === "image") {
            const existing = uniqueImagesMap.get(sub.source_uri);
            if (!existing || new Date(sub.created_at) > new Date(existing.created_at)) {
              uniqueImagesMap.set(sub.source_uri, sub);
            }
          }
        });
        
        setImages(Array.from(uniqueImagesMap.values()));
      }
    } catch (err) {
      console.error("Failed to fetch images", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [token]);

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between space-y-2 px-6 pt-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Container Images
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            View all scanned container images and their latest security posture.
          </p>
        </div>
      </div>

      <div className="px-6 pb-6">
        <Card className="border-border/50 shadow-sm backdrop-blur-sm bg-card/50">
          <CardHeader>
            <CardTitle>Scanned Images Inventory</CardTitle>
            <CardDescription>A list of unique container images that have been analyzed.</CardDescription>
          </CardHeader>
          <CardContent>
            {images.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Box className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p>No images have been scanned yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Image Name / URI</TableHead>
                    <TableHead>Latest Scan Status</TableHead>
                    <TableHead>Last Scanned</TableHead>
                    <TableHead className="text-right">Vulnerabilities (Latest)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {images.map((img) => (
                    <TableRow key={img.id} className="border-border/50 hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                           <Box className="h-4 w-4 text-blue-500" />
                           {img.source_uri}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-slate-500">{img.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(img.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-right">
                        {img.scan_result ? (
                          <div className="flex items-center justify-end gap-2 text-xs font-medium">
                            {img.scan_result.critical_count > 0 && <span className="text-red-500">{img.scan_result.critical_count} C</span>}
                            {img.scan_result.high_count > 0 && <span className="text-orange-500">{img.scan_result.high_count} H</span>}
                            {img.scan_result.medium_count > 0 && <span className="text-yellow-500">{img.scan_result.medium_count} M</span>}
                            {img.scan_result.critical_count === 0 && img.scan_result.high_count === 0 && img.scan_result.medium_count === 0 && (
                                <span className="text-green-500"><CheckCircle className="w-3 h-3 inline mr-1" /> Clean</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
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

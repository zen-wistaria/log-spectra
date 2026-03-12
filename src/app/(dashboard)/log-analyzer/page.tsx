"use client";

import {
  AlertTriangle,
  FileText,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ── Types ─────────────────────────────────────────────────────

interface AnalysisResult {
  ip: string;
  request_count: number;
  error_count: number;
  request_per_second: number;
  unique_endpoint_ratio: number;
  risk_score: number;
  risk_category: "HIGH" | "MEDIUM" | "LOW";
  risk_reasons: string[];
}

// ── Helpers ───────────────────────────────────────────────────

function getRiskIcon(category: string) {
  switch (category) {
    case "HIGH":
      return <ShieldAlert className="size-4" />;
    case "MEDIUM":
      return <AlertTriangle className="size-4" />;
    default:
      return <ShieldCheck className="size-4" />;
  }
}

function getRiskBadgeVariant(category: string) {
  switch (category) {
    case "HIGH":
      return "destructive" as const;
    case "MEDIUM":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

function getRiskRowClass(category: string) {
  switch (category) {
    case "HIGH":
      return "bg-red-500/10 hover:bg-red-500/15 dark:bg-red-500/10 dark:hover:bg-red-500/20";
    case "MEDIUM":
      return "bg-yellow-500/10 hover:bg-yellow-500/15 dark:bg-yellow-500/10 dark:hover:bg-yellow-500/20";
    default:
      return "bg-green-500/5 hover:bg-green-500/10 dark:bg-green-500/5 dark:hover:bg-green-500/10";
  }
}

// ── Component ─────────────────────────────────────────────────

export default function ManualAnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const ext = selectedFile.name.toLowerCase();
    if (!ext.endsWith(".log") && !ext.endsWith(".txt")) {
      toast.error("Invalid file type. Please upload a .log or .txt file.");
      return;
    }

    setFile(selectedFile);
    setResults(null);
  };

  const handleClearFile = () => {
    setFile(null);
    setResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first.");
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/analyze-log", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Analysis failed");
        return;
      }

      setResults(data.results);
      toast.success(
        `Analysis complete — ${data.results.length} IP(s) analyzed`,
      );
    } catch {
      toast.error("Failed to connect to analysis service");
    } finally {
      setIsLoading(false);
    }
  };

  const highCount =
    results?.filter((r) => r.risk_category === "HIGH").length ?? 0;
  const mediumCount =
    results?.filter((r) => r.risk_category === "MEDIUM").length ?? 0;
  const lowCount =
    results?.filter((r) => r.risk_category === "LOW").length ?? 0;

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Log Analyzer</h2>
        <p className="text-muted-foreground">
          Upload a web server access log file to analyze IP behavior and detect
          anomalies.
        </p>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            Upload Log File
          </CardTitle>
          <CardDescription>
            Supported formats: .log, .txt (Nginx access log format). Maximum
            file size: 50MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <input
                ref={fileInputRef}
                id="log-file-input"
                type="file"
                accept=".log,.txt"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  file:cursor-pointer cursor-pointer"
                disabled={isLoading}
              />
            </div>

            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="size-4" />
                <span className="max-w-[200px] truncate">{file.name}</span>
                <span>({(file.size / 1024).toFixed(1)} KB)</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={handleClearFile}
                  disabled={isLoading}
                >
                  <X className="size-3" />
                </Button>
              </div>
            )}

            <Button
              id="upload-button"
              onClick={handleUpload}
              disabled={!file || isLoading}
              className="min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Shield className="size-4 mr-2" />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {results && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total IPs</CardDescription>
              <CardTitle className="text-3xl">{results.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-red-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <ShieldAlert className="size-3.5 text-red-500" />
                High Risk
              </CardDescription>
              <CardTitle className="text-3xl text-red-500">
                {highCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-yellow-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <AlertTriangle className="size-3.5 text-yellow-500" />
                Medium Risk
              </CardDescription>
              <CardTitle className="text-3xl text-yellow-500">
                {mediumCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-green-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-green-500" />
                Low Risk
              </CardDescription>
              <CardTitle className="text-3xl text-green-500">
                {lowCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Results Table */}
      {results && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              IP addresses sorted by risk score (highest first)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead className="text-right">Request Count</TableHead>
                    <TableHead className="text-right">Error Count</TableHead>
                    <TableHead className="text-right">Requests/sec</TableHead>
                    <TableHead className="text-right">Endpoint Ratio</TableHead>
                    <TableHead className="text-right">Risk Score</TableHead>
                    <TableHead>Risk Category</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Risk Reasons
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row) => {
                    const low = row.risk_category.toLowerCase() === "low";
                    const medium = row.risk_category.toLowerCase() === "medium";
                    const high = row.risk_category.toLowerCase() === "high";
                    return (
                      <TableRow
                        key={row.ip}
                        className={getRiskRowClass(row.risk_category)}
                      >
                        <TableCell className="text-xs font-mono font-medium">
                          <Badge
                            variant={
                              low
                                ? "green-subtle"
                                : medium
                                  ? "yellow-subtle"
                                  : high
                                    ? "red-subtle"
                                    : "gray-subtle"
                            }
                          >
                            <div className="font-mono">{row.ip}</div>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {row.request_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {row.error_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {row.request_per_second}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {row.unique_endpoint_ratio}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          <Badge
                            variant={
                              low
                                ? "green-subtle"
                                : medium
                                  ? "yellow-subtle"
                                  : high
                                    ? "red-subtle"
                                    : "gray-subtle"
                            }
                          >
                            <div className="text-xs">{row.risk_score}%</div>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge
                            variant={
                              low
                                ? "green-subtle"
                                : medium
                                  ? "yellow-subtle"
                                  : high
                                    ? "red-subtle"
                                    : "gray-subtle"
                            }
                            className="gap-1"
                          >
                            {low ? (
                              <ShieldCheck className="text-green-500" />
                            ) : medium ? (
                              <AlertTriangle className="text-yellow-500" />
                            ) : high ? (
                              <ShieldAlert className="text-red-500" />
                            ) : (
                              ""
                            )}
                            <div className="text-[10px]">
                              {row.risk_category}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs hidden lg:table-cell text-muted-foreground">
                          {row.risk_reasons?.join(", ")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty results */}
      {results && results.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Shield className="size-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No results found</p>
            <p className="text-sm">
              The uploaded file did not contain any analyzable log entries.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

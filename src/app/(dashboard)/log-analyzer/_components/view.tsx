"use client";

import { useForm } from "@tanstack/react-form";
import {
  AlertTriangle,
  DatabaseSearch,
  FileText,
  Loader2,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  error_rate: number;
  avg_response_size: number;
  response_size_std: number;
  avg_url_length: number;
  request_per_second: number;
  unique_endpoint_ratio: number;
  anomaly_score: number;
  model_risk_score: number;
  behavior_risk_score: number;
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
      return "red-subtle" as const;
    case "MEDIUM":
      return "yellow-subtle" as const;
    default:
      return "green-subtle" as const;
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

// ── Constants ──────────────────────────────────────────────────

const MAX_STORED_IPS = 500;

// ── Helper ─────────────────────────────────────────────────────

/** Sort descending by risk_score, keep top N */
function trimResultsForStorage(results: AnalysisResult[]): AnalysisResult[] {
  return [...results]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, MAX_STORED_IPS);
}

// ── Component ─────────────────────────────────────────────────

export default function LogAnalyzerView() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Isolation Forest parameters
  // const [nEstimators, setNEstimators] = useState(200);
  // const [contamination, setContamination] = useState(0.02);

  const form = useForm({
    defaultValues: {
      n_estimators: 200,
      contamination: 0.02,
    },
  });

  // Restore results from sessionStorage on mount (survives back navigation)
  useEffect(() => {
    const stored = sessionStorage.getItem("log-analyzer-results");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AnalysisResult[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setResults(parsed);
        }
      } catch {
        // ignore corrupt data
      }
    }
  }, []);

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
    sessionStorage.removeItem("log-analyzer-results");
    sessionStorage.removeItem("log-analyzer-selected-ip");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first.");
      return;
    }

    const values = form.state.values;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("n_estimators", String(values.n_estimators));
    formData.append("contamination", String(values.contamination));

    setIsLoading(true);
    setResults(null);

    try {
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
      sessionStorage.setItem(
        "log-analyzer-results",
        JSON.stringify(trimResultsForStorage(data.results)),
      );
      toast.success(
        `Analysis complete — ${data.results.length} IP(s) analyzed`,
      );
    } catch {
      toast.error("Failed to connect to analysis service");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowClick = (row: AnalysisResult) => {
    // Store all results so the detail page can reference them without DB
    sessionStorage.setItem(
      "log-analyzer-results",
      JSON.stringify(trimResultsForStorage(results ?? [])),
    );
    sessionStorage.setItem("log-analyzer-selected-ip", row.ip);
    router.push(`/log-analyzer/${row.ip}`);
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

            <form.Subscribe
              selector={(state) => ({
                isSubmitting: state.isSubmitting,
                isValid: state.isValid,
              })}
            >
              {({ isSubmitting, isValid }) => (
                <Button
                  id="upload-button"
                  onClick={handleUpload}
                  disabled={!isValid || isSubmitting || !file}
                  className="min-w-[140px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <DatabaseSearch className="size-4 mr-2" />
                      Analyze
                    </>
                  )}
                </Button>
              )}
            </form.Subscribe>
          </div>

          {/* Isolation Forest Parameters */}
          <Separator className="my-4" />
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Isolation Forest Parameters
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <form.Field
              name="n_estimators"
              validators={{
                onChange: ({ value }) => {
                  if (value < 100) return "Minimum value is 100";
                  if (value > 300) return "Maximum value is 300";
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label>N Estimators</Label>

                  <Input
                    type="number"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    disabled={isLoading}
                  />

                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-red-500">
                      {field.state.meta.errors[0]}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Number of trees in the forest (100–300)
                  </p>
                </div>
              )}
            </form.Field>
            <form.Field
              name="contamination"
              validators={{
                onChange: ({ value }) => {
                  if (value < 0.01) return "Minimum value is 0.01";
                  if (value > 0.5) return "Maximum value is 0.5";
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label>Contamination</Label>

                  <Input
                    type="number"
                    step="0.001"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    disabled={isLoading}
                  />

                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-red-500">
                      {field.state.meta.errors[0]}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Expected proportion of anomalies (0.01–0.5)
                  </p>
                </div>
              )}
            </form.Field>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {results && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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
                    <TableHead className="text-right">Model Score</TableHead>
                    <TableHead className="text-right">Behavior Score</TableHead>
                    <TableHead className="text-right">Risk Score</TableHead>
                    <TableHead>Risk Category</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Risk Reasons
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row) => (
                    <TableRow
                      key={row.ip}
                      className={`${getRiskRowClass(row.risk_category)} cursor-pointer`}
                      onClick={() => handleRowClick(row)}
                    >
                      <TableCell className="text-xs font-mono font-medium">
                        <Badge variant={getRiskBadgeVariant(row.risk_category)}>
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
                      <TableCell className="text-xs text-right font-mono">
                        {row.model_risk_score}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {row.behavior_risk_score}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold">
                        <Badge variant={getRiskBadgeVariant(row.risk_category)}>
                          <div className="text-xs">{row.risk_score}%</div>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={getRiskBadgeVariant(row.risk_category)}>
                          {getRiskIcon(row.risk_category)}
                          <div className="text-[10px]">{row.risk_category}</div>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs hidden lg:table-cell text-muted-foreground">
                        {row.risk_reasons?.join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
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

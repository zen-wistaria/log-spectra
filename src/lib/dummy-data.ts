// ── Dummy Data for UI Preview ────────────────────────────────

export interface LogEntry {
  id: string;
  timestamp: string;
  agent_id: string;
  hostname: string;
  client_ip: string;
  method: string;
  endpoint: string;
  status_code: number;
  bytes: number;
  anomaly_score: number;
  is_suspicious: boolean;
}

export interface AgentEntry {
  id: string;
  agent_id: string;
  hostname: string;
  server_ip: string;
  last_seen: string;
  total_logs: number;
  status: "online" | "offline";
  os: string;
}

export interface SuspiciousIP {
  ip_address: string;
  total_requests: number;
  anomaly_score: number;
  last_seen: string;
}

export interface AgentReport {
  agent_id: string;
  hostname: string;
  ip_server: string;
  total_logs: number;
  anomalies_detected: number;
  created_at: string;
}

// ── Logs ────────────────────────────────────────────────────

export const dummyLogs: LogEntry[] = [
  {
    id: "log_1",
    timestamp: "2026-03-03T10:21:00Z",
    agent_id: "agent-01",
    hostname: "web-server-1",
    client_ip: "103.21.244.10",
    method: "GET",
    endpoint: "/wp-login.php",
    status_code: 404,
    bytes: 512,
    anomaly_score: 0.92,
    is_suspicious: true,
  },
  {
    id: "log_2",
    timestamp: "2026-03-03T10:21:05Z",
    agent_id: "agent-01",
    hostname: "web-server-1",
    client_ip: "103.21.244.10",
    method: "POST",
    endpoint: "/wp-login.php",
    status_code: 403,
    bytes: 256,
    anomaly_score: 0.95,
    is_suspicious: true,
  },
  {
    id: "log_3",
    timestamp: "2026-03-03T10:22:10Z",
    agent_id: "agent-02",
    hostname: "api-gateway-1",
    client_ip: "192.168.1.50",
    method: "GET",
    endpoint: "/api/users",
    status_code: 200,
    bytes: 4096,
    anomaly_score: 0.12,
    is_suspicious: false,
  },
  {
    id: "log_4",
    timestamp: "2026-03-03T10:23:00Z",
    agent_id: "agent-01",
    hostname: "web-server-1",
    client_ip: "185.16.39.146",
    method: "GET",
    endpoint: "/admin/config",
    status_code: 403,
    bytes: 128,
    anomaly_score: 0.88,
    is_suspicious: true,
  },
  {
    id: "log_5",
    timestamp: "2026-03-03T10:24:00Z",
    agent_id: "agent-03",
    hostname: "db-proxy-1",
    client_ip: "10.0.0.15",
    method: "POST",
    endpoint: "/api/query",
    status_code: 200,
    bytes: 8192,
    anomaly_score: 0.05,
    is_suspicious: false,
  },
  {
    id: "log_6",
    timestamp: "2026-03-03T10:25:30Z",
    agent_id: "agent-02",
    hostname: "api-gateway-1",
    client_ip: "45.33.32.156",
    method: "GET",
    endpoint: "/api/v2/export",
    status_code: 200,
    bytes: 65536,
    anomaly_score: 0.73,
    is_suspicious: true,
  },
  {
    id: "log_7",
    timestamp: "2026-03-03T10:26:00Z",
    agent_id: "agent-01",
    hostname: "web-server-1",
    client_ip: "198.51.100.23",
    method: "GET",
    endpoint: "/phpmyadmin",
    status_code: 404,
    bytes: 320,
    anomaly_score: 0.91,
    is_suspicious: true,
  },
  {
    id: "log_8",
    timestamp: "2026-03-03T10:27:00Z",
    agent_id: "agent-04",
    hostname: "cdn-edge-1",
    client_ip: "172.16.0.100",
    method: "GET",
    endpoint: "/assets/main.css",
    status_code: 200,
    bytes: 24576,
    anomaly_score: 0.02,
    is_suspicious: false,
  },
  {
    id: "log_9",
    timestamp: "2026-03-03T10:28:15Z",
    agent_id: "agent-02",
    hostname: "api-gateway-1",
    client_ip: "203.0.113.42",
    method: "DELETE",
    endpoint: "/api/users/all",
    status_code: 405,
    bytes: 64,
    anomaly_score: 0.85,
    is_suspicious: true,
  },
  {
    id: "log_10",
    timestamp: "2026-03-03T10:29:00Z",
    agent_id: "agent-01",
    hostname: "web-server-1",
    client_ip: "10.51.51.42",
    method: "GET",
    endpoint: "/panel/dashboard",
    status_code: 200,
    bytes: 62941,
    anomaly_score: 0.08,
    is_suspicious: false,
  },
  {
    id: "log_11",
    timestamp: "2026-03-03T10:30:00Z",
    agent_id: "agent-03",
    hostname: "db-proxy-1",
    client_ip: "91.189.88.152",
    method: "POST",
    endpoint: "/api/login",
    status_code: 401,
    bytes: 128,
    anomaly_score: 0.78,
    is_suspicious: true,
  },
  {
    id: "log_12",
    timestamp: "2026-03-03T10:31:00Z",
    agent_id: "agent-05",
    hostname: "mail-server-1",
    client_ip: "77.88.55.60",
    method: "POST",
    endpoint: "/smtp/relay",
    status_code: 550,
    bytes: 64,
    anomaly_score: 0.82,
    is_suspicious: true,
  },
  {
    id: "log_13",
    timestamp: "2026-03-03T10:32:00Z",
    agent_id: "agent-04",
    hostname: "cdn-edge-1",
    client_ip: "192.168.1.50",
    method: "GET",
    endpoint: "/assets/logo.png",
    status_code: 200,
    bytes: 15360,
    anomaly_score: 0.03,
    is_suspicious: false,
  },
  {
    id: "log_14",
    timestamp: "2026-03-03T10:33:00Z",
    agent_id: "agent-01",
    hostname: "web-server-1",
    client_ip: "103.21.244.10",
    method: "GET",
    endpoint: "/.env",
    status_code: 404,
    bytes: 128,
    anomaly_score: 0.97,
    is_suspicious: true,
  },
  {
    id: "log_15",
    timestamp: "2026-03-03T10:34:00Z",
    agent_id: "agent-02",
    hostname: "api-gateway-1",
    client_ip: "10.0.0.22",
    method: "GET",
    endpoint: "/api/health",
    status_code: 200,
    bytes: 32,
    anomaly_score: 0.01,
    is_suspicious: false,
  },
  {
    id: "log_16",
    timestamp: "2026-03-03T10:35:00Z",
    agent_id: "agent-03",
    hostname: "db-proxy-1",
    client_ip: "185.16.39.146",
    method: "POST",
    endpoint: "/api/dump",
    status_code: 403,
    bytes: 64,
    anomaly_score: 0.89,
    is_suspicious: true,
  },
  {
    id: "log_17",
    timestamp: "2026-03-03T10:36:00Z",
    agent_id: "agent-05",
    hostname: "mail-server-1",
    client_ip: "172.16.0.100",
    method: "GET",
    endpoint: "/webmail",
    status_code: 200,
    bytes: 32768,
    anomaly_score: 0.06,
    is_suspicious: false,
  },
  {
    id: "log_18",
    timestamp: "2026-03-03T10:37:00Z",
    agent_id: "agent-01",
    hostname: "web-server-1",
    client_ip: "198.51.100.23",
    method: "POST",
    endpoint: "/xmlrpc.php",
    status_code: 404,
    bytes: 256,
    anomaly_score: 0.94,
    is_suspicious: true,
  },
  {
    id: "log_19",
    timestamp: "2026-03-03T10:38:00Z",
    agent_id: "agent-04",
    hostname: "cdn-edge-1",
    client_ip: "10.0.0.15",
    method: "GET",
    endpoint: "/assets/bundle.js",
    status_code: 200,
    bytes: 131072,
    anomaly_score: 0.04,
    is_suspicious: false,
  },
  {
    id: "log_20",
    timestamp: "2026-03-03T10:39:00Z",
    agent_id: "agent-02",
    hostname: "api-gateway-1",
    client_ip: "45.33.32.156",
    method: "PUT",
    endpoint: "/api/v2/config",
    status_code: 403,
    bytes: 64,
    anomaly_score: 0.76,
    is_suspicious: true,
  },
];

// ── Top 10 Suspicious IPs ───────────────────────────────────

export const dummySuspiciousIPs: SuspiciousIP[] = [
  {
    ip_address: "103.21.244.10",
    total_requests: 1847,
    anomaly_score: 0.97,
    last_seen: "2026-03-03T10:33:00Z",
  },
  {
    ip_address: "198.51.100.23",
    total_requests: 923,
    anomaly_score: 0.94,
    last_seen: "2026-03-03T10:37:00Z",
  },
  {
    ip_address: "185.16.39.146",
    total_requests: 756,
    anomaly_score: 0.89,
    last_seen: "2026-03-03T10:35:00Z",
  },
  {
    ip_address: "203.0.113.42",
    total_requests: 512,
    anomaly_score: 0.85,
    last_seen: "2026-03-03T10:28:15Z",
  },
  {
    ip_address: "77.88.55.60",
    total_requests: 438,
    anomaly_score: 0.82,
    last_seen: "2026-03-03T10:31:00Z",
  },
  {
    ip_address: "91.189.88.152",
    total_requests: 321,
    anomaly_score: 0.78,
    last_seen: "2026-03-03T10:30:00Z",
  },
  {
    ip_address: "45.33.32.156",
    total_requests: 289,
    anomaly_score: 0.76,
    last_seen: "2026-03-03T10:39:00Z",
  },
  {
    ip_address: "162.158.78.92",
    total_requests: 198,
    anomaly_score: 0.71,
    last_seen: "2026-03-03T10:20:00Z",
  },
  {
    ip_address: "104.16.85.20",
    total_requests: 167,
    anomaly_score: 0.65,
    last_seen: "2026-03-03T10:15:00Z",
  },
  {
    ip_address: "23.227.38.65",
    total_requests: 142,
    anomaly_score: 0.58,
    last_seen: "2026-03-03T10:10:00Z",
  },
];

// ── Agents ──────────────────────────────────────────────────

export const dummyAgents: AgentEntry[] = [
  {
    id: "cm_abc1",
    agent_id: "agent-01",
    hostname: "web-server-1",
    server_ip: "10.51.51.42",
    last_seen: "2026-03-03T10:39:00Z",
    total_logs: 45230,
    status: "online",
    os: "Ubuntu 22.04",
  },
  {
    id: "cm_abc2",
    agent_id: "agent-02",
    hostname: "api-gateway-1",
    server_ip: "10.51.51.43",
    last_seen: "2026-03-03T10:39:00Z",
    total_logs: 32150,
    status: "online",
    os: "Debian 12",
  },
  {
    id: "cm_abc3",
    agent_id: "agent-03",
    hostname: "db-proxy-1",
    server_ip: "10.51.51.44",
    last_seen: "2026-03-03T10:38:00Z",
    total_logs: 18920,
    status: "online",
    os: "Ubuntu 24.04",
  },
  {
    id: "cm_abc4",
    agent_id: "agent-04",
    hostname: "cdn-edge-1",
    server_ip: "10.51.51.45",
    last_seen: "2026-03-03T09:15:00Z",
    total_logs: 67400,
    status: "offline",
    os: "Alpine 3.19",
  },
  {
    id: "cm_abc5",
    agent_id: "agent-05",
    hostname: "mail-server-1",
    server_ip: "10.51.51.46",
    last_seen: "2026-03-03T10:37:00Z",
    total_logs: 12340,
    status: "online",
    os: "Ubuntu 22.04",
  },
];

// ── Agent Reports ───────────────────────────────────────────

export const dummyAgentReports: AgentReport[] = [
  {
    agent_id: "agent-01",
    hostname: "web-server-1",
    ip_server: "10.51.51.42",
    total_logs: 1240,
    anomalies_detected: 47,
    created_at: "2026-03-03T10:35:00Z",
  },
  {
    agent_id: "agent-02",
    hostname: "api-gateway-1",
    ip_server: "10.51.51.43",
    total_logs: 890,
    anomalies_detected: 23,
    created_at: "2026-03-03T10:35:00Z",
  },
  {
    agent_id: "agent-03",
    hostname: "db-proxy-1",
    ip_server: "10.51.51.44",
    total_logs: 560,
    anomalies_detected: 12,
    created_at: "2026-03-03T10:35:00Z",
  },
  {
    agent_id: "agent-05",
    hostname: "mail-server-1",
    ip_server: "10.51.51.46",
    total_logs: 320,
    anomalies_detected: 8,
    created_at: "2026-03-03T10:35:00Z",
  },
  {
    agent_id: "agent-01",
    hostname: "web-server-1",
    ip_server: "10.51.51.42",
    total_logs: 1100,
    anomalies_detected: 38,
    created_at: "2026-03-03T10:30:00Z",
  },
  {
    agent_id: "agent-04",
    hostname: "cdn-edge-1",
    ip_server: "10.51.51.45",
    total_logs: 2340,
    anomalies_detected: 5,
    created_at: "2026-03-03T09:15:00Z",
  },
  {
    agent_id: "agent-02",
    hostname: "api-gateway-1",
    ip_server: "10.51.51.43",
    total_logs: 780,
    anomalies_detected: 19,
    created_at: "2026-03-03T10:30:00Z",
  },
  {
    agent_id: "agent-03",
    hostname: "db-proxy-1",
    ip_server: "10.51.51.44",
    total_logs: 490,
    anomalies_detected: 9,
    created_at: "2026-03-03T10:30:00Z",
  },
  {
    agent_id: "agent-01",
    hostname: "web-server-1",
    ip_server: "10.51.51.42",
    total_logs: 980,
    anomalies_detected: 31,
    created_at: "2026-03-03T10:25:00Z",
  },
  {
    agent_id: "agent-05",
    hostname: "mail-server-1",
    ip_server: "10.51.51.46",
    total_logs: 210,
    anomalies_detected: 4,
    created_at: "2026-03-03T10:25:00Z",
  },
];

// ── Helpers ─────────────────────────────────────────────────

export function getAnomalyColor(score: number): string {
  if (score >= 0.7) return "text-red-500";
  if (score >= 0.3) return "text-yellow-500";
  return "text-green-500";
}

export function getAnomalyBgColor(score: number): string {
  if (score >= 0.7) return "bg-red-500/10 text-red-500";
  if (score >= 0.3) return "bg-yellow-500/10 text-yellow-500";
  return "bg-green-500/10 text-green-500";
}

export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return dateStr;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

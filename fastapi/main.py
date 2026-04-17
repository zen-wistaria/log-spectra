"""
FastAPI service for manual log file analysis.
Accepts an uploaded nginx access log file, parses it, extracts IP behavior
features, runs Isolation Forest anomaly detection, and returns risk scores.
"""

import logging
import os
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

from log_parser import parse_log_content
from analyzer import feature_engineering, detect_anomalies
from risk_scoring import calculate_risk

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)
# load_dotenv()

# ── Logging ──────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── App ──────────────────────────────────────────────────────

app = FastAPI(
    title="Log Anomaly Analyzer",
    description="Analyze nginx access logs for suspicious IP behavior",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Constants ────────────────────────────────────────────────

MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", 50)) * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = {".log", ".txt"}

# ── Endpoint ─────────────────────────────────────────────────


@app.post("/analyze-log")
async def analyze_log(
    file: UploadFile = File(...),
    n_estimators: int = Form(200),
    contamination: float = Form(0.02),
):
    """
    Analyze an uploaded nginx access log file.

    - Validates file extension and size
    - Parses log lines
    - Extracts per-IP features
    - Runs Isolation Forest anomaly detection
    - Returns risk-scored results
    """

    # 1. Validate file extension
    filename = file.filename or ""
    if not any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # 2. Read file content with size limit
    content_bytes = await file.read()
    if len(content_bytes) > MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {MAX_UPLOAD_SIZE_MB // (1024 * 1024)}MB",
        )

    try:
        content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="File encoding not supported. Please upload a UTF-8 text file.",
        )

    logger.info("Received file: %s (%d bytes)", filename, len(content_bytes))

    # 3. Parse log entries
    entries = parse_log_content(content)
    if not entries:
        raise HTTPException(
            status_code=422,
            detail="No valid log entries found in the uploaded file.",
        )

    logger.info("Parsed %d log entries", len(entries))

    # 4. Feature engineering
    features = feature_engineering(entries)
    if features.empty:
        raise HTTPException(
            status_code=422,
            detail="Could not extract features from log entries.",
        )

    # 5. Anomaly detection
    results = detect_anomalies(
        features,
        n_estimators=n_estimators,
        contamination=contamination,
    )

    # 6. Risk scoring
    scored = calculate_risk(results)

    # 7. Build response
    output = []
    for _, row in scored.iterrows():
        output.append(
            {
                "ip": row["ip"],
                "request_count": int(row["request_count"]),
                "error_count": int(row["error_count"]),
                "error_rate": round(float(row["error_rate"]), 4),
                "avg_response_size": round(float(row["avg_response_size"]), 2),
                "response_size_std": round(float(row["response_size_std"]), 2),
                "avg_url_length": round(float(row["avg_url_length"]), 2),
                "request_per_second": round(float(row["request_per_second"]), 2),
                "unique_endpoint_ratio": round(float(row["unique_endpoint_ratio"]), 4),
                "anomaly_score": round(float(row["anomaly_score"]), 4),
                "model_risk_score": round(float(row["model_risk_score"]), 2),
                "behavior_risk_score": int(row["behavior_risk_score"]),
                "risk_score": round(float(row["risk_score"]), 2),
                "risk_category": row["risk_category"],
                "risk_reasons": row["risk_reasons"],
            }
        )

    # Sort by risk_score descending
    output.sort(key=lambda x: x["risk_score"], reverse=True)

    logger.info("Analysis complete: %d IPs scored", len(output))

    return {"results": output}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}

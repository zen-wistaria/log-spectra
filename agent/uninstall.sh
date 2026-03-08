#!/bin/bash
# ============================================
# Log Anomaly Detection Agent — Uninstaller
# For Ubuntu/Debian Linux
# ============================================

set -e

AGENT_DIR="/opt/log-anomaly-agent"
SERVICE_NAME="log-anomaly-agent"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "============================================"
echo " Log Anomaly Detection Agent Uninstaller"
echo "============================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: Please run this script as root (sudo)"
    exit 1
fi

# 1. Stop and disable the service (if it exists)
echo "[1/3] Stopping and disabling service..."
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    systemctl stop "$SERVICE_NAME"
    echo "  ✓ Service stopped"
else
    echo "  ℹ Service is not running, skipping stop"
fi

if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
    systemctl disable "$SERVICE_NAME"
    echo "  ✓ Service disabled"
else
    echo "  ℹ Service is not enabled, skipping disable"
fi

# 2. Remove systemd service file
echo "[2/3] Removing systemd service file..."
if [ -f "$SERVICE_FILE" ]; then
    rm -f "$SERVICE_FILE"
    systemctl daemon-reload
    echo "  ✓ Service file removed and daemon reloaded"
else
    echo "  ℹ Service file not found, skipping"
fi

# 3. Remove agent directory
echo "[3/3] Removing agent files..."
if [ -d "$AGENT_DIR" ]; then
    rm -rf "$AGENT_DIR"
    echo "  ✓ Agent directory $AGENT_DIR removed"
else
    echo "  ℹ Agent directory not found, skipping"
fi

echo ""
echo "============================================"
echo " Uninstallation complete!"
echo " The log-anomaly-agent has been fully removed."
echo "============================================"

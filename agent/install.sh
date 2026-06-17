#!/bin/bash
# ============================================
# Log Anomaly Detection Agent — Installer
# For Ubuntu/Debian Linux
# ============================================

set -e

AGENT_DIR="/opt/log-spectra-agent"
VENV_DIR="$AGENT_DIR/venv"
SERVICE_NAME="log-spectra-agent"
CURRENT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "============================================"
echo " Log Spectra Agent Installer"
echo "============================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: Please run this script as root (sudo)"
    exit 1
fi

# 1. Install system dependencies
echo "[1/5] Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq python3 python3-pip python3-venv > /dev/null 2>&1
echo "  ✓ Python3, pip, venv installed"

# 2. Create agent directory
echo "[2/5] Setting up agent directory..."
mkdir -p "$AGENT_DIR"
cp "$CURRENT_DIR/agent.py" "$AGENT_DIR/"
cp "$CURRENT_DIR/config.py" "$AGENT_DIR/"
cp "$CURRENT_DIR/log_reader.py" "$AGENT_DIR/"
cp "$CURRENT_DIR/log_accumulator.py" "$AGENT_DIR/"
cp "$CURRENT_DIR/analyzer.py" "$AGENT_DIR/"
cp "$CURRENT_DIR/risk_scoring.py" "$AGENT_DIR/"
cp "$CURRENT_DIR/requirements.txt" "$AGENT_DIR/"
cp "$CURRENT_DIR/system_info.py" "$AGENT_DIR/"

# Copy config if not already present (don't overwrite existing config)
if [ ! -f "$AGENT_DIR/config.yaml" ]; then
    cp "$CURRENT_DIR/config.yaml" "$AGENT_DIR/"
    echo "  ✓ Default config.yaml copied"
else
    echo "  ℹ config.yaml already exists, skipping (won't overwrite)"
fi
echo "  ✓ Agent files copied to $AGENT_DIR"

# 3. Create virtual environment and install dependencies
echo "[3/5] Creating virtual environment and installing dependencies..."
python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install --quiet --upgrade pip
"$VENV_DIR/bin/pip" install --quiet -r "$AGENT_DIR/requirements.txt"
echo "  ✓ Virtual environment created and dependencies installed"

# 4. Create systemd service
echo "[4/5] Creating systemd service..."
cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=Log Anomaly Detection Agent
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=$AGENT_DIR
ExecStart=$VENV_DIR/bin/python $AGENT_DIR/agent.py --config $AGENT_DIR/config.yaml
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Environment variables (optional overrides)
# Environment=AGENT_LOG_PATH=/var/log/nginx/access.log
# Environment=AGENT_SERVER_URL=https://domain.com
# Environment=AGENT_SERVER_ID=server-01

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
echo "  ✓ Systemd service created"

# 5. Instructions
echo "[5/5] Installation complete!"
echo ""
echo "============================================"
echo " Post-Installation Steps"
echo "============================================"
echo ""
echo "1. Edit the config file:"
echo "   nano $AGENT_DIR/config.yaml"
echo ""
echo "2. Start the agent:"
echo "   sudo systemctl start $SERVICE_NAME"
echo ""
echo "3. Enable auto-start on boot:"
echo "   sudo systemctl enable $SERVICE_NAME"
echo ""
echo "4. Check status:"
echo "   sudo systemctl status $SERVICE_NAME"
echo ""
echo "5. View logs:"
echo "   sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "============================================"

"""
System information collector for the log anomaly detection agent.
Collects machine_id, OS details, hostname, and public IP address.
"""

import os
import socket
import logging
import platform


logger = logging.getLogger(__name__)

AGENT_VERSION = "1.0.0"


def get_machine_id() -> str:
    """
    Get a stable unique machine identifier.

    Priority:
    1. /etc/machine-id  (Linux systemd)
    2. /var/lib/dbus/machine-id  (older Linux)
    3. Windows MachineGuid from registry
    4. Fallback: hostname-based hex string
    """
    # Linux: /etc/machine-id
    for path in ("/etc/machine-id", "/var/lib/dbus/machine-id"):
        try:
            if os.path.exists(path):
                with open(path, "r") as f:
                    mid = f.read().strip()
                if mid:
                    return mid
        except Exception:
            pass

    # Windows: registry MachineGuid
    try:
        import winreg
        key = winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE,
            r"SOFTWARE\Microsoft\Cryptography",
        )
        guid, _ = winreg.QueryValueEx(key, "MachineGuid")
        winreg.CloseKey(key)
        if guid:
            return guid.replace("-", "")
    except Exception:
        pass

    # Fallback: hash of hostname
    import hashlib
    return hashlib.md5(socket.gethostname().encode()).hexdigest()


def get_os_info() -> str:
    """
    Return a human-readable OS string, e.g. 'Linux Ubuntu 22.04' or 'Windows 11'.
    """
    system = platform.system()

    if system == "Linux":
        # Try /etc/os-release for distro name + version
        try:
            info = {}
            with open("/etc/os-release", "r") as f:
                for line in f:
                    line = line.strip()
                    if "=" in line:
                        k, v = line.split("=", 1)
                        info[k] = v.strip('"')
            name = info.get("NAME", "Linux")
            version = info.get("VERSION_ID", "")
            return f"Linux {name} {version}".strip()
        except Exception:
            return f"Linux {platform.release()}"

    if system == "Windows":
        return f"Windows {platform.release()} {platform.version()}"

    if system == "Darwin":
        return f"macOS {platform.mac_ver()[0]}"

    return f"{system} {platform.release()}"


def get_hostname() -> str:
    """Return the machine's hostname."""
    return socket.gethostname()


def get_outbound_ip() -> str:
    """
    Return the local interface IP address that the OS uses for outbound traffic.

    The trick: create a UDP socket and "connect" it to an external address
    (8.8.8.8:80).  No data is sent — this just forces the OS to select the
    appropriate route and bind a source address.  Reading getsockname()
    then reveals the local IP of the outbound interface, which is:
    - the real LAN/WAN-facing NIC (e.g. eth0, wlan0, enp3s0)
    - NOT a loopback address (127.x.x.x)
    - NOT a virtual/bridge adapter used only for VMs/containers (provided
      the default route points to the physical NIC, which is the common case)

    Falls back to 'unknown' if routing information is unavailable.
    """
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            # No data is actually sent; connect() merely selects the route.
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            logger.debug("Outbound interface IP: %s", ip)
            return ip
    except Exception as exc:
        logger.warning("Could not determine outbound IP: %s", exc)
        return "unknown"


def collect_system_info() -> dict:
    """
    Collect all system information fields needed for the payload.

    Returns a dict with keys:
        version, machine_id, os, hostname, ip_address
    """
    machine_id = get_machine_id()
    os_info = get_os_info()
    hostname = get_hostname()
    ip_address = get_outbound_ip()

    logger.info(
        "System info — version: %s | machine_id: %s | os: %s | hostname: %s | ip: %s",
        AGENT_VERSION, machine_id, os_info, hostname, ip_address,
    )

    return {
        "version": AGENT_VERSION,
        "machine_id": machine_id,
        "os": os_info,
        "hostname": hostname,
        "ip_address": ip_address,
    }

# Running Non-Headless Tests in Docker (Windows)

> [!IMPORTANT]
> **Recommended Approach:**
> - **Docker/CI**: Use `HEADLESS_TEST=true` (default in `.env`)
> - **Local Development**: Run natively with `HEADLESS_TEST=false`
> 
> This provides the best developer experience without X11 complexity.

## Quick Start (Recommended)

**For Development with Visible Browser:**
```powershell
# Run locally (not in Docker)
dotnet run --project src/LoadRunner/LoadRunner.csproj
```

**For Docker/Load Testing:**
```powershell
# Use headless mode (already set in .env)
docker run --rm -it --env-file .env -v ${PWD}:/app loadtest:dev dotnet run --project src/LoadRunner
```

---

## Alternative: Non-Headless in Docker (Advanced)

If you absolutely need to see the browser while running in Docker, here are the options:

### Option 1: Use Headless Mode (Recommended for Docker)

For Docker environments, headless mode is recommended:

```env
HEADLESS_TEST=true
USERS=1
```

This is the default and works seamlessly in containers.

## Option 2: X11 Forwarding (WSL Required)

If you need to see the browser, use X11 forwarding via WSL:

### Setup (One-time)

1. **Install VcXsrv** (Windows X Server):
   - Download from: https://sourceforge.net/projects/vcxsrv/
   - Run XLaunch with settings: Multiple windows, Display 0, No access control

2. **Get Windows IP** (in PowerShell):
   ```powershell
   ipconfig
   # Note your local IP (e.g., 192.168.1.100)
   ```

### Running with X11

```bash
# Set DISPLAY to point to your Windows X server
docker run --rm -it \
  -e DISPLAY=<YOUR_WINDOWS_IP>:0.0 \
  -e HEADLESS_TEST=false \
  -e USERS=1 \
  -v ${PWD}:/app \
  loadtest:dev \
  dotnet run --project src/LoadRunner
```

## Option 3: Docker Desktop with X11 (Linux Containers on Windows)

If using Docker Desktop:

```bash
docker run --rm -it \
  -e DISPLAY=host.docker.internal:0.0 \
  -e HEADLESS_TEST=false \
  -e USERS=1 \
  -v ${PWD}:/app \
  loadtest:dev \
  dotnet run --project src/LoadRunner
```

## Option 4: VNC (Alternative)

Use a VNC-based container if you need remote desktop access to the browser.

## Recommended Workflow

**Development/Validation:**
- Use local .NET installation (not Docker) with `HEADLESS_TEST=false`
- Run: `dotnet run --project src/LoadRunner/LoadRunner.csproj`

**Load Testing:**
- Use Docker with `HEADLESS_TEST=true`
- Deploy containers to cloud or Kubernetes

## Current Container Status

**Your dev container is not running yet** because the build failed. Once the build completes successfully:

```bash
# Start dev container interactively
docker run --rm -it \
  --env-file .env \
  -v ${PWD}:/app \
  loadtest:dev \
  bash

# Inside container, run your tests
dotnet run --project src/LoadRunner
```

# Flower Garden — ProDesk Server Deployment Guide

Complete setup for deploying `auckland.garden` to the ProDesk server with auto-deploy.

---

## Step 1: Clone the repo

```bash
cd /opt
sudo git clone https://github.com/Tauriqbarron/flower-garden-project.git
cd flower-garden-project
```

---

## Step 2: Create the `.env` file

```bash
sudo bash -c 'printf "DOMAIN_NAME=auckland.garden\n" > .env'
```

---

## Step 3: Make deploy script executable

```bash
sudo chmod +x scripts/deploy.sh
```

---

## Step 4: Build and start all containers

```bash
sudo docker compose -f docker-compose.prod.yml up -d --build
```

This starts 3 containers:
- `flower-garden-backend-1` — FastAPI on internal port 8000
- `flower-garden-frontend-1` — Next.js on internal port 3000
- `flower-garden-nginx-1` — Nginx reverse proxy on 127.0.0.1:8080

---

## Step 5: Verify the deployment

```bash
# Health check
curl http://localhost:8080/health
# Expected: {"status":"ok"}

# API check
curl -s http://localhost:8080/api/flowers/ | head -c 200
# Expected: JSON array of flower data

# Container status
sudo docker compose -f /opt/flower-garden-project/docker-compose.prod.yml ps
# Expected: all 3 services show "Up"

# Port check — confirm no conflicts with ParishHub
sudo docker ps --format 'table {{.Names}}\t{{.Ports}}'
# Flower project should show 127.0.0.1:8080->80
# ParishHub should show 127.0.0.1:80->80 (if running)
```

If any of these fail, check logs:
```bash
sudo docker compose -f /opt/flower-garden-project/docker-compose.prod.yml logs --tail=50
```

---

## Step 6: Install the GitHub Actions self-hosted runner

A dedicated runner for the flower garden project, installed separately from the ParishHub runner.

```bash
# Create runner directory
sudo mkdir -p /opt/actions-runner-flower
cd /opt/actions-runner-flower

# Download the latest runner
curl -o actions-runner-linux-x64-2.321.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-x64-2.321.0.tar.gz

# Extract
sudo tar xzf ./actions-runner-linux-x64-2.321.0.tar.gz

# Set ownership (use same user as ParishHub runner, or root)
sudo chown -R root:root /opt/actions-runner-flower
```

**Get a registration token from GitHub:**

Open this URL in a browser (you must be logged into GitHub):
```
https://github.com/Tauriqbarron/flower-garden-project/settings/actions/runners/new
```

GitHub will show a page with:
- A registration token (looks like `AXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)
- A `./config.sh` command

**Register the runner:**

```bash
cd /opt/actions-runner-flower
sudo ./config.sh --url https://github.com/Tauriqbarron/flower-garden-project --token <PASTE_TOKEN_HERE> --name prodesk-flower --unattended
```

**Install as a systemd service:**

```bash
cd /opt/actions-runner-flower
sudo ./svc.sh install
sudo ./svc.sh start
```

**Verify the runner is online:**

```bash
sudo ./svc.sh status
# Should show "active (running)"

# Also check on GitHub:
# https://github.com/Tauriqbarron/flower-garden-project/settings/actions/runners
# The runner "prodesk-flower" should show a green "Idle" status
```

---

## Step 7: Configure Namecheap DNS

In your Namecheap dashboard for `auckland.garden`:

1. Go to **Domain List** → `auckland.garden` → **Manage**
2. Go to **Nameservers** tab
3. Change to **Custom DNS** and enter your Cloudflare nameservers:
   ```
   ada.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
   (Use the actual nameservers from your Cloudflare account — they're shown when you add the domain to Cloudflare)

4. Save and wait for propagation (can take up to 24h, usually < 1 hour)

---

## Step 8: Configure Cloudflare Tunnel

In the Cloudflare dashboard:

1. Go to **Zero Trust** → **Networks** → **Tunnels**
2. Select your existing tunnel (the one ParishHub uses)
3. Add a new **Public Hostname**:
   - **Subdomain:** (leave empty — it's the root domain)
   - **Domain:** `auckland.garden`
   - **Service Type:** `HTTP`
   - **URL:** `localhost:8080`
4. Save

If you don't have a Cloudflare tunnel yet, create one:
1. **Zero Trust** → **Networks** → **Tunnels** → **Create a tunnel**
2. Name it `prodesk`
3. Install the `cloudflared` connector on the ProDesk (follow Cloudflare's instructions)
4. Add the public hostname `auckland.garden` → `http://localhost:8080`

---

## Step 9: Final verification

After DNS propagates and Cloudflare is configured:

```bash
# From any machine
curl https://auckland.garden/health
# Expected: {"status":"ok"}

curl https://auckland.garden/api/flowers/ | head -c 200
# Expected: JSON flower data
```

Open https://auckland.garden in a browser — should show the Flower Garden planner.

---

## Auto-deploy workflow

Once the runner is set up, deploys happen automatically:

1. Push to `main` on GitHub
2. GitHub Actions triggers the `deploy.yml` workflow
3. The self-hosted runner on ProDesk executes `scripts/deploy.sh`
4. The script pulls latest code, rebuilds Docker images, restarts containers, and runs health checks

To deploy manually at any time:
```bash
cd /opt/flower-garden-project
sudo bash scripts/deploy.sh
```

---

## Useful commands

```bash
# View container logs
sudo docker compose -f /opt/flower-garden-project/docker-compose.prod.yml logs -f

# Restart all flower project containers
sudo docker compose -f /opt/flower-garden-project/docker-compose.prod.yml restart

# Rebuild after code changes (manual, no runner)
cd /opt/flower-garden-project && sudo bash scripts/deploy.sh

# Check runner status
sudo systemctl status actions.runner.Tauriqbarron-flower-garden-project.prodesk-flower.service

# Stop/start runner
sudo /opt/actions-runner-flower/svc.sh stop
sudo /opt/actions-runner-flower/svc.sh start
```

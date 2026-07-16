# Linala Production Deployment & Update Guide

> [!IMPORTANT]
> **Local Build Required**: Always compile the project locally (`npm run build`) before synchronizing and deploying. The production server has limited memory and its build step is disabled in `deploy.sh` to prevent server resource exhaustion.

---

## 🛠️ System Overview

*   **Production Server IP:** `64.227.158.41`
*   **Project Path on Server:** `/var/www/wa.linalapro.com`
*   **PM2 Process Name:** `whatsway` (port `8003`)
*   **Active Proxy Configuration:** Apache proxying `/socket.io/` and HTTP traffic to Nginx, which proxies to Node.js on port `8003`.

---
## 🚀 Step 1: Build Locally

To keep the server memory footprint low and avoid build disruptions, we compile and bundle the React + Vite frontend and the Express backend locally:

```bash
# Build the application on your local machine
npm run build
```

---

## 📦 Step 2: Synchronize Code Safely (Zero-Overwrite Sync)

To transfer local code updates and the compiled `dist/` build directory to the server without overwriting user-uploaded media files or environment settings, execute `rsync` from your local machine using the command below.

```bash
# Sync files to the server using the designated deploy SSH key
rsync -avz \
  --exclude 'node_modules/' \
  --exclude '.env' \
  --exclude 'uploads/' \
  --exclude '.git/' \
  --exclude '.DS_Store' \
  -e "ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_rsa_deploy" \
  ./ root@64.227.158.41:/var/www/wa.linalapro.com/
```

### ⚠️ Why this is safe:
*   `--exclude '.env'`: Protects the production environment variables (database connection string, API keys, webhook secrets).
*   `--exclude 'uploads/'`: Crucial to prevent deleting or overwriting any user-uploaded media, documents, or campaign assets.
*   `--exclude 'node_modules/'`: Prevents transferring local Node modules; the server will compile dependencies matching its own environment.

---

## 🔧 Step 3: Run Remote Deploy Script (Isolated Deployment)

Once the local build files are synced, connect to the server via SSH to install packages and restart only the target PM2 application.

```bash
# Execute deploy.sh remotely using your deploy key
ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_rsa_deploy root@64.227.158.41 "cd /var/www/wa.linalapro.com && ./deploy.sh"
```

### 📋 What [deploy.sh](file:///Users/awadnejil/Desktop/wa.linala/code/deploy.sh) does:
1.  **Memory Management:** Checks the server RAM and automatically enables a 2GB swap space if RAM is low.
2.  **Dependencies Install:** Runs `npm install --production=false` to get dependencies without altering production modules.
3.  **App Build (Skipped):** Since we build locally, it skips running `npm run build` on the server.
4.  **No Aggressive Migration:** Does NOT run `db:push --force` by default to prevent Drizzle ORM from dropping tables. Schema sync updates should be generated via safe migrations.
5.  **Isolated PM2 Restart:** Restarts *only* the `whatsway` PM2 process:
    ```bash
    pm2 restart whatsway
    ```
    *This guarantees no other Node.js applications or virtual hosts running on the server are affected.*

---

## 🔍 Step 3: Verification & Diagnostics

Use the following commands to check application logs and process status on the server:

*   **View Real-time App Logs:**
    ```bash
    ssh -i ~/.ssh/id_rsa_deploy root@64.227.158.41 "tail -n 50 /var/www/wa.linalapro.com/logs/pm2-out-46.log"
    ```
*   **View Error Logs:**
    ```bash
    ssh -i ~/.ssh/id_rsa_deploy root@64.227.158.41 "tail -n 50 /var/www/wa.linalapro.com/logs/pm2-error-46.log"
    ```
*   **Check PM2 Application Status:**
    ```bash
    ssh -i ~/.ssh/id_rsa_deploy root@64.227.158.41 "pm2 status"
    ```

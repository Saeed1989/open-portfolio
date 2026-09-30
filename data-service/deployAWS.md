# Deploying the NestJS API to AWS EC2

Live at **https://api.openfolio.site**

Stack: **EC2 (Ubuntu) → Nginx (reverse proxy + HTTPS) → PM2 → NestJS**, domain DNS on **GoDaddy**, SSL from **Let's Encrypt (certbot)**.

```
Client ──HTTPS:443──▶ Nginx ──HTTP──▶ 127.0.0.1:3000 (NestJS via PM2)
```

---

## 1. Launch the EC2 instance

AWS Console → **EC2 → Launch instance**

| Setting | Value |
|---|---|
| AMI | Ubuntu Server (LTS) |
| Instance type | t3.small (t3.micro works with swap) |
| Key pair | Create/download `mykey.pem` |

**Security group – inbound rules**

| Type | Port | Source |
|---|---|---|
| SSH | 22 | My IP |
| HTTP | 80 | 0.0.0.0/0 |
| HTTPS | 443 | 0.0.0.0/0 |

> Port 3000 is **not** opened — Nginx proxies to it internally.

**Elastic IP** (so the IP never changes): EC2 → **Elastic IPs → Allocate → Actions → Associate** with the instance.

---

## 2. Connect via SSH (Windows PowerShell / CMD)

```powershell
ssh -i C:\Users\saeed\Downloads\mykey.pem ubuntu@<ELASTIC_IP>
```

If Windows complains the key permissions are too open:

```powershell
icacls mykey.pem /inheritance:r
icacls mykey.pem /grant:r "$($env:USERNAME):R"
```

---

## 3. Prepare the server

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx

# Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install --lts

# Process manager
npm install -g pm2
```

Optional – 1 GB swap (prevents out-of-memory during build on small instances):

```bash
sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 4. Get the code

Find the repo URL locally (in the project folder):

```bash
git remote -v
```

For a private repo, add a deploy key on the server:

```bash
ssh-keygen -t ed25519 -C "ec2-deploy"
cat ~/.ssh/id_ed25519.pub
```

Copy the output → GitHub repo → **Settings → Deploy keys → Add deploy key**.

Clone, configure, build:

```bash
git clone git@github.com:<user>/<repo>.git app
cd app
npm ci
nano .env          # PORT=3000, DATABASE_URL, JWT_SECRET, ...
npm run build
```

---

## 5. Run the app with PM2

```bash
pm2 start dist/main.js --name nest-app
pm2 save
pm2 startup        # run the command it prints → auto-start on reboot
```

Check it:

```bash
pm2 status
pm2 logs nest-app
curl -i http://localhost:3000
```

---

## 6. Configure Nginx as a reverse proxy

Config file: **`/etc/nginx/sites-available/nest-app`**

```bash
sudo nano /etc/nginx/sites-available/nest-app
```

```nginx
server {
    listen 80;
    server_name api.openfolio.site;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable it and disable the default site:

```bash
sudo ln -sf /etc/nginx/sites-available/nest-app /etc/nginx/sites-enabled/nest-app
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

> `/etc/nginx/nginx.conf` is the global config — it loads site files via
> `include /etc/nginx/sites-enabled/*;`. It doesn't need editing for this setup.

---

## 7. Point the domain (GoDaddy DNS)

GoDaddy → **My Products → Domains → openfolio.site → DNS → Add New Record**

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `api` | `<ELASTIC_IP>` | 600 seconds |

Verify (from local machine):

```bash
nslookup api.openfolio.site
```

Should return the Elastic IP.

---

## 8. Enable HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.openfolio.site
```

- Enter email, accept terms.
- Choose **redirect** HTTP → HTTPS.
- Certbot edits `/etc/nginx/sites-available/nest-app` to add the SSL config.

Test auto-renewal:

```bash
sudo certbot renew --dry-run
```

---

## 9. Verify

```bash
curl -i https://api.openfolio.site
```

Expected (no route at `/`, so 404 from Nest = proxy works):

```
HTTP/1.1 404 Not Found
X-Powered-By: Express
{"message":"Cannot GET /","error":"Not Found","statusCode":404}
```

HTTP should redirect to HTTPS:

```bash
curl -I http://api.openfolio.site      # expect 301
```

---

## Redeploying updates

```bash
ssh -i mykey.pem ubuntu@<ELASTIC_IP>
cd ~/app
git pull
npm ci
npm run build
pm2 restart nest-app
```

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| **"Welcome to nginx!"** page | Default site handling the request. `sudo rm /etc/nginx/sites-enabled/default`, check `server_name` in `nest-app`, re-run `sudo certbot --nginx -d api.openfolio.site` → *reinstall existing certificate*, reload Nginx. |
| **502 Bad Gateway** | App not running or wrong port. `pm2 status`, `pm2 logs nest-app`, `curl localhost:3000`. |
| **Request times out** | Security group missing port 80/443, or `sudo ufw status` blocking (`sudo ufw allow 'Nginx Full'`). |
| **SSH timeout** | Your IP changed — update the SSH rule to *My IP*. |
| **Certbot fails** | DNS not pointing to Elastic IP yet, or port 80 closed. |
| **CORS error in browser** | Add frontend origin: `app.enableCors({ origin: ['https://your-frontend'] })`. |
| **413 Request Entity Too Large** | Add `client_max_body_size 20M;` in the `http {}` block of `/etc/nginx/nginx.conf`. |

**Useful commands**

```bash
pm2 logs nest-app                        # app logs
sudo tail -f /var/log/nginx/access.log   # incoming requests
sudo tail -f /var/log/nginx/error.log    # nginx errors
sudo nginx -T                            # full effective nginx config
```
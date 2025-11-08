# 🏥 Incubator Monitoring System - Docker Edition

Complete containerized deployment solution for NICU Incubator Monitoring System with ThingsBoard integration.

## 🚀 Quick Start (5 minutes)

```powershell
# 1. Setup environment
Copy-Item .env.example .env
notepad .env  # Edit with your values

# 2. Start everything
.\quick-start.ps1

# 3. Access dashboard
start http://localhost:3001
```

That's it! 🎉

---

## 📦 What's Included

### Services

- **React Dashboard** - Modern web interface (Port 3001)
- **Admin Backend** - User management API (Port 5056)
- **Parent Backend** - Parent engagement API (Port 5000)
- **Tailscale** - Secure VPN connectivity to Pi devices
- **Watchtower** - Automatic container updates

### Features

- ✅ One-command deployment
- ✅ Automatic HTTPS (on GCP)
- ✅ Health checks & auto-restart
- ✅ Secure Pi connectivity via Tailscale
- ✅ Ready for Google Cloud Platform
- ✅ Complete monitoring & logging
- ✅ Production-ready configuration

---

## 📚 Documentation

| Document                                                 | Description                                    |
| -------------------------------------------------------- | ---------------------------------------------- |
| [DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md) | Complete deployment guide with troubleshooting |
| [SETUP_SUMMARY.md](SETUP_SUMMARY.md)                     | Architecture overview and commands reference   |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)       | Step-by-step deployment checklist              |

---

## 🎯 Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) (Windows/Mac)
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (for GCP deployment)
- Tailscale account (for Pi connectivity)

---

## 🛠️ Setup Steps

### 1. Configure Environment

```powershell
# Copy template
Copy-Item .env.example .env

# Edit with your values
notepad .env
```

**Required values:**

```bash
PI_HOST=100.89.162.22           # Your Pi Tailscale IP
THINGSBOARD_HOST=100.89.162.23  # ThingsBoard Tailscale IP
JWT_SECRET=generate-random-32+   # openssl rand -base64 32
```

### 2. Local Development

```powershell
# Build images
.\scripts\build.ps1

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Test services
.\test-setup.ps1
```

**Access services:**

- Dashboard: http://localhost:3001
- Admin API: http://localhost:5056
- Parent API: http://localhost:5000

### 3. Deploy to GCP

```powershell
# Login to GCP
gcloud auth login
gcloud config set project your-project-id

# Build & push images
.\scripts\build.ps1
.\scripts\push-to-gcr.ps1

# Deploy to Cloud Run
.\scripts\deploy-gcp.ps1
```

---

## 🏗️ Architecture

```
Internet
   │
   ├──> React Dashboard (Nginx)
   │         │
   │         ├──> Admin Backend (Node.js)
   │         └──> Parent Backend (Node.js)
   │
   └──> Tailscale VPN
            │
            ├──> Raspberry Pi (100.89.162.22)
            │      ├─ LCD Reader (9001)
            │      ├─ Camera (8888)
            │      └─ Cry Detector (8889)
            │
            └──> ThingsBoard (100.89.162.23:9090)
```

---

## 📝 Common Commands

### Development

```powershell
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart service
docker-compose restart admin-backend

# View logs
docker-compose logs -f admin-backend

# Rebuild
docker-compose up -d --build
```

### Production (GCP)

```powershell
# View logs
gcloud run services logs read incubator-dashboard

# Update service
gcloud run services update incubator-dashboard --memory 1Gi

# Get service URL
gcloud run services describe incubator-dashboard --format="value(status.url)"
```

---

## 🧪 Testing

```powershell
# Test local setup
.\test-setup.ps1

# Manual health checks
curl http://localhost:3001/health
curl http://localhost:5056/api/auth/health
curl http://localhost:5000/api/health
```

---

## 🔒 Security

- ✅ No hardcoded credentials
- ✅ JWT authentication for admin access
- ✅ Environment variables for secrets
- ✅ Container isolation
- ✅ Tailscale VPN for Pi access
- ✅ HTTPS on Cloud Run (automatic)

**Important:** Never commit `.env` file to Git!

---

## 📊 Monitoring

### Local Logs

```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f admin-backend

# Last 100 lines
docker-compose logs --tail=100
```

### GCP Logs

```powershell
# Real-time logs
gcloud run services logs tail incubator-dashboard

# Recent logs
gcloud run services logs read incubator-dashboard --limit=50
```

---

## 🐛 Troubleshooting

### Services won't start

```powershell
# Check Docker is running
docker info

# Rebuild and start
docker-compose up -d --build

# Check logs
docker-compose logs
```

### Can't connect to Pi

```powershell
# Check Tailscale
docker-compose ps tailscale
docker-compose logs tailscale

# Test connectivity
ping 100.89.162.22
curl http://100.89.162.22:9001/status
```

### GCP deployment fails

```powershell
# Check authentication
gcloud auth list
gcloud auth login

# Verify project
gcloud config list

# Check image exists
gcloud container images list
```

See [DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md) for more troubleshooting tips.

---

## 💰 Costs

### Local Development

- **Free** (uses your computer resources)

### GCP Cloud Run

- **Free tier:** First 2M requests/month
- **Low traffic:** ~$5-10/month
- **Medium traffic:** ~$20-30/month

**Optimize costs:**

- Set min instances to 0
- Use appropriate memory limits
- Enable auto-scaling

---

## 🔄 Updates

### Update Services

```powershell
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build
```

### Auto-updates (Watchtower)

Watchtower automatically updates containers:

- Checks for new images every 5 minutes
- Updates containers automatically
- Cleans up old images

---

## 📞 Support

**Issues?**

1. Check logs: `docker-compose logs -f`
2. Review [DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)
3. Run tests: `.\test-setup.ps1`
4. Check [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

**Resources:**

- Docker Docs: https://docs.docker.com
- GCP Cloud Run: https://cloud.google.com/run/docs
- Tailscale: https://tailscale.com/kb

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🎉 Ready to Deploy!

Your system is now fully dockerized and production-ready.

**Next steps:**

1. ✅ Test locally: `.\quick-start.ps1`
2. ⏭️ Deploy to GCP: `.\scripts\deploy-gcp.ps1`
3. ⏭️ Configure monitoring
4. ⏭️ Set up custom domain (optional)

Need help? Check the [DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md) for detailed instructions.

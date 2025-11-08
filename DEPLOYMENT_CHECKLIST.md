# 🎯 Docker Deployment Checklist

Use this checklist to ensure a smooth deployment process.

## ✅ Pre-Deployment Checklist

### Environment Setup

- [ ] Copy `.env.example` to `.env`
- [ ] Update `PI_HOST` with Tailscale IP (100.89.162.22)
- [ ] Update `THINGSBOARD_HOST` with Tailscale IP (100.89.162.23)
- [ ] Generate secure `JWT_SECRET` (`openssl rand -base64 32`)
- [ ] Set `GCP_PROJECT_ID` (if deploying to GCP)
- [ ] Set `GCP_REGION` (e.g., us-central1)
- [ ] Get `TAILSCALE_AUTH_KEY` from Tailscale admin console

### Local Testing

- [ ] Docker Desktop is installed and running
- [ ] Docker Compose is available
- [ ] All services build successfully (`.\scripts\build.ps1`)
- [ ] All services start successfully (`docker-compose up -d`)
- [ ] Dashboard accessible at http://localhost:3001
- [ ] Admin backend responds at http://localhost:5056/api/auth/health
- [ ] Parent backend responds at http://localhost:5000/api/health
- [ ] Can login to admin dashboard
- [ ] Pi device connectivity works (via Tailscale)
- [ ] ThingsBoard data is received

### Code Review

- [ ] No hardcoded credentials in code
- [ ] All secrets in `.env` file
- [ ] `.env` is in `.gitignore`
- [ ] Docker images are optimized (multi-stage builds)
- [ ] Health checks are configured
- [ ] CORS settings are correct

---

## ☁️ GCP Deployment Checklist

### GCP Setup

- [ ] GCP account created with billing enabled
- [ ] `gcloud` CLI installed and authenticated
- [ ] GCP project created
- [ ] Required APIs enabled:
  - [ ] Cloud Run API
  - [ ] Container Registry API
  - [ ] Cloud Build API
- [ ] Default region set (`gcloud config set run/region us-central1`)

### Image Build & Push

- [ ] Images built with GCR tags (`.\scripts\build.ps1`)
- [ ] Docker authenticated with GCP (`gcloud auth configure-docker`)
- [ ] Images pushed to GCR (`.\scripts\push-to-gcr.ps1`)
- [ ] Images visible in GCR console

### Deployment

- [ ] Services deployed to Cloud Run (`.\scripts\deploy-gcp.ps1`)
- [ ] All services show as "healthy" in Cloud Run console
- [ ] Service URLs obtained and documented
- [ ] Backend URLs updated in React app environment
- [ ] React dashboard rebuilt and redeployed with new URLs

### Post-Deployment Verification

- [ ] Dashboard accessible via Cloud Run URL
- [ ] Admin login works
- [ ] Can create/manage admin accounts
- [ ] Parent backend API responds
- [ ] ThingsBoard integration works
- [ ] Pi device connectivity works (check Tailscale)
- [ ] All dashboard features functional

---

## 🔐 Tailscale Setup Checklist

### Raspberry Pi (Already Done)

- [x] Tailscale installed
- [x] Connected to Tailscale network
- [x] IP: 100.89.162.22
- [x] All services accessible via Tailscale

### ThingsBoard Server

- [x] Tailscale installed (if needed)
- [x] IP: 100.89.162.23
- [x] Port 9090 accessible

### GCP (Optional - for direct access)

- [ ] Create Compute Engine VM for Tailscale gateway
- [ ] Install Tailscale on VM
- [ ] Connect to same Tailscale network
- [ ] Advertise routes to Pi network
- [ ] Verify connectivity to Pi devices

---

## 🔒 Security Checklist

### Credentials & Secrets

- [ ] All secrets in `.env` file, not in code
- [ ] `.env` file not committed to Git
- [ ] JWT_SECRET is strong random string (32+ characters)
- [ ] Admin default password changed
- [ ] ThingsBoard access tokens secured
- [ ] GCP service account keys secured (if used)

### Network Security

- [ ] CORS properly configured (not using `*` in production)
- [ ] Tailscale authentication enabled
- [ ] Only required ports exposed
- [ ] No direct internet access to Pi services
- [ ] HTTPS enabled (Cloud Run provides this automatically)

### Container Security

- [ ] Running as non-root user where possible
- [ ] Only necessary files copied to containers
- [ ] Using official base images (node:18-alpine, nginx:alpine)
- [ ] Container health checks configured
- [ ] Resource limits set

---

## 📊 Monitoring Checklist

### Logging

- [ ] Cloud Run logs accessible
- [ ] Log retention configured
- [ ] Error logs reviewed
- [ ] No sensitive data in logs

### Performance

- [ ] Response times acceptable
- [ ] No memory leaks
- [ ] CPU usage reasonable
- [ ] Cold start times acceptable

### Alerts (Optional)

- [ ] Cloud Monitoring configured
- [ ] Alerts set for service failures
- [ ] Alerts set for high error rates
- [ ] Notification channels configured

---

## 🔄 CI/CD Checklist (Optional)

### GitHub Actions

- [ ] Workflow file created (`.github/workflows/deploy.yml`)
- [ ] GCP service account created for CI/CD
- [ ] Service account key stored in GitHub secrets
- [ ] Automatic deployment on push to main branch
- [ ] Manual approval required for production

---

## 📝 Documentation Checklist

### For Team

- [ ] Deployment guide shared with team
- [ ] Service URLs documented
- [ ] Access credentials documented (securely)
- [ ] Troubleshooting guide available
- [ ] Architecture diagram created

### For Users

- [ ] User manual updated with new URLs
- [ ] Login instructions provided
- [ ] Feature documentation updated
- [ ] Support contact information provided

---

## 🧪 Testing Checklist

### Functional Testing

- [ ] Admin login/logout works
- [ ] Admin user management works
- [ ] Parent access queue works
- [ ] Dashboard displays real-time data
- [ ] All API endpoints respond correctly
- [ ] ThingsBoard data updates in real-time

### Performance Testing

- [ ] Page load times < 3 seconds
- [ ] API response times < 1 second
- [ ] Dashboard updates smoothly
- [ ] No memory leaks during extended use

### Security Testing

- [ ] Cannot access admin without authentication
- [ ] JWT tokens expire correctly
- [ ] CORS prevents unauthorized access
- [ ] SQL injection not possible
- [ ] XSS not possible

---

## 🚨 Rollback Plan

### If Deployment Fails

1. [ ] Check Cloud Run logs for errors
2. [ ] Verify environment variables are set
3. [ ] Test connectivity to Pi devices
4. [ ] Rollback to previous version if needed:
   ```bash
   gcloud run services update-traffic incubator-dashboard \
     --to-revisions=REVISION_NAME=100
   ```

### Backup Strategy

- [ ] Database backup before deployment
- [ ] Configuration files backed up
- [ ] Previous Docker images retained
- [ ] Rollback procedure documented and tested

---

## ✅ Go-Live Checklist

### Final Verification

- [ ] All items above completed
- [ ] Team notified of deployment
- [ ] Users notified of new URLs (if changed)
- [ ] Support team ready
- [ ] Monitoring in place
- [ ] Backup verified

### Communication

- [ ] Stakeholders notified
- [ ] Documentation updated
- [ ] Training provided (if needed)
- [ ] Support contact shared

---

## 📅 Post-Deployment Tasks

### Week 1

- [ ] Monitor logs daily
- [ ] Review performance metrics
- [ ] Collect user feedback
- [ ] Fix any critical issues

### Month 1

- [ ] Review resource usage
- [ ] Optimize costs if needed
- [ ] Update documentation based on learnings
- [ ] Plan improvements

### Ongoing

- [ ] Regular security updates
- [ ] Performance optimization
- [ ] Feature enhancements
- [ ] Cost optimization

---

## 🎉 Deployment Complete!

Congratulations! Your Incubator Monitoring System is now running in production.

**Remember to:**

- Keep `.env` files secure
- Monitor logs regularly
- Update dependencies periodically
- Backup data regularly
- Review costs monthly

**Support:**

- Technical issues: Check logs first
- Deployment issues: Review this checklist
- Emergency: Contact system administrator

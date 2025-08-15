# Docker Hub Setup Guide - Production Licensed n8n

This guide walks you through connecting your Docker Hub account to automatically upload the production-licensed n8n image.

## 🔐 Step 1: Create Docker Hub Access Token

1. **Login to Docker Hub**: https://hub.docker.com
2. **Go to Account Settings**:
   - Click your profile picture (top right)
   - Select "Account Settings"
3. **Navigate to Security**:
   - Click "Security" in the left sidebar
4. **Create New Access Token**:
   - Click "New Access Token"
   - **Token Description**: `n8n-production-licensed-ci`
   - **Access Permissions**: `Read & Write`
   - Click "Generate"
5. **Copy the Token** (save it securely - you can't view it again)

## 🔧 Step 2: Configure GitHub Secrets

1. **Go to Your GitHub Repository**:
   - Navigate to: https://github.com/juanfelipesantamaria2901/n8n
2. **Access Repository Settings**:
   - Click "Settings" tab
   - Go to "Secrets and variables" → "Actions"
3. **Add Required Secrets**:

### Secret 1: DOCKERHUB_USERNAME
```
Name: DOCKERHUB_USERNAME
Value: juanfelipesantamaria2901
```

### Secret 2: DOCKERHUB_TOKEN
```
Name: DOCKERHUB_TOKEN
Value: [Your Docker Hub Access Token from Step 1]
```

### Secret 3: DOCKER_USERNAME (for other workflows)
```
Name: DOCKER_USERNAME
Value: juanfelipesantamaria2901
```

### Secret 4: DOCKER_PASSWORD (for other workflows)
```
Name: DOCKER_PASSWORD
Value: [Your Docker Hub Access Token from Step 1]
```

## ✅ Step 3: Verify Setup

### Test the Configuration:
1. **Make a small change** to your repository
2. **Push to main branch**:
   ```bash
   git add .
   git commit -m "test: verify Docker Hub integration"
   git push origin main
   ```

3. **Check GitHub Actions**:
   - Go to "Actions" tab in your repository
   - Look for "Docker Production Licensed Build" workflow
   - Verify it completes successfully

4. **Check Docker Hub**:
   - Visit: https://hub.docker.com/r/juanfelipesantamaria2901/n8n
   - You should see new images being pushed

## 📋 Step 4: Troubleshooting

### Common Issues:

1. **Authentication Failed**:
   - Verify token permissions (Read & Write)
   - Check token hasn't expired
   - Ensure username is correct

2. **Repository Not Found**:
   - Create repository: `juanfelipesantamaria2901/n8n` on Docker Hub
   - Set repository to public

3. **Build Fails**:
   - Check GitHub Actions logs
   - Verify all secrets are properly configured
   - Ensure Dockerfile.production-licensed exists

### Manual Test:
```bash
# Test Docker Hub login locally
docker login -u juanfelipesantamaria2901
# Enter your access token when prompted

# Test pulling your image
docker pull juanfelipesantamaria2901/n8n:production-licensed
```

## 🚀 Next Steps

Once configured, your production-licensed n8n image will automatically:
- Build on every push to main branch
- Push to Docker Hub as `juanfelipesantamaria2901/n8n:production-licensed`
- Create version tags for releases
- Support both AMD64 and ARM64 architectures

## 📞 Support

If you encounter issues:
1. Check GitHub Actions logs for detailed error messages
2. Verify Docker Hub repository settings
3. Ensure all secrets are correctly configured
4. Test authentication locally with Docker CLI
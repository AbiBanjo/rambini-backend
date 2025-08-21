# Rambini Backend Deployment Guide

## Issues Fixed

### 1. Port Binding Issue
- **Problem**: Service wasn't binding to the correct port and interface
- **Solution**: Updated `main.ts` to bind to `0.0.0.0:3500` for Render deployment

### 2. Memory Usage Issue
- **Problem**: Build process was consuming too much memory (>512MB)
- **Solution**: 
  - Implemented multi-stage Docker build
  - Added `.dockerignore` to reduce build context
  - Optimized dependency installation

### 3. Development Mode in Production
- **Problem**: Using `start:dev` in production Docker container
- **Solution**: Changed to `start:prod` for production builds

## Files Modified

1. **Dockerfile** - Multi-stage build, production optimizations
2. **src/main.ts** - Port binding fix for Render
3. **.dockerignore** - Reduced build context
4. **env.example** - Added PORT variable
5. **render.yaml** - Render deployment configuration

## Deployment Steps

### 1. Environment Variables
Set these environment variables in your Render dashboard:
- `NODE_ENV=production`
- `PORT=3500`
- Database credentials
- Redis credentials
- JWT secret
- AWS S3 credentials

### 2. Deploy to Render
1. Push your code to GitHub
2. Connect your repository to Render
3. Use the `render.yaml` configuration
4. Set environment variables
5. Deploy

### 3. Health Check
The service includes a health check endpoint at `/api/v1/health` for Render monitoring.

## Build Optimization

The new Dockerfile uses:
- Multi-stage build to reduce final image size
- Production-only dependencies in final image
- Non-root user for security
- Alpine Linux for smaller base image

## Port Configuration

- **Development**: Port 3000 (localhost)
- **Production**: Port 3500 (0.0.0.0)
- **Render**: Automatically uses PORT environment variable

## Troubleshooting

If you still encounter issues:
1. Check Render logs for specific error messages
2. Verify all environment variables are set
3. Ensure database and Redis are accessible from Render
4. Check if the health check endpoint is responding 
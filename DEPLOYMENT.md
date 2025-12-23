# Deploying to Vercel

This guide walks you through deploying the Wind Tunnel Aerodynamics Tester to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally
   ```bash
   npm install -g vercel
   ```
3. **MongoDB Atlas**: Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

## MongoDB Atlas Setup

1. Create a new cluster (free M0 tier is sufficient)
2. Create a database user with read/write permissions
3. Whitelist all IP addresses (0.0.0.0/0) under Network Access
4. Get your connection string - it should look like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority
   ```

## Local Testing with Vercel Dev

Before deploying, test locally:

```bash
cd C:\Users\clutc\.gemini\antigravity\scratch\wind-tunnel-aero-tester\client
vercel dev
```

This will:
- Start the Vite dev server for the client
- Run serverless functions locally
- Simulate the production environment

Test the application at the provided localhost URL.

## Deployment Steps

### 1. Initial Deployment

**IMPORTANT**: Deploy from the `client` directory, not the root!

```bash
# Navigate to the client directory
cd C:\Users\clutc\.gemini\antigravity\scratch\wind-tunnel-aero-tester\client

# Login to Vercel (first time only)
vercel login

# Deploy to preview environment
vercel

# Or deploy directly to production
vercel --prod
```

### 2. Configure Environment Variables

After the first deployment, set environment variables:

**Option A: Via Vercel Dashboard**
1. Go to your project dashboard on Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variable:
   - **Name**: `MONGODB_URI`
   - **Value**: Your MongoDB Atlas connection string
   - **Environment**: Production, Preview, and Development (check all)

**Option B: Via CLI**
```bash
vercel env add MONGODB_URI
```
Then paste your MongoDB connection string when prompted.

### 3. Redeploy

After adding environment variables, redeploy:

```bash
vercel --prod
```

## Project Structure

```
wind-tunnel-aero-tester/
├── api/                      # Serverless functions (deployed to Vercel)
│   ├── simulate.js          # Physics simulation endpoint
│   ├── save-test.js         # Save simulation results
│   └── tests.js             # Get simulation history
├── client/                   # Vite React app
│   ├── src/
│   ├── dist/                # Build output (auto-generated)
│   └── package.json
├── server/                   # Original Express server (for reference)
│   └── src/
│       ├── physics/         # Shared physics engine
│       └── models/          # Shared MongoDB models
├── vercel.json              # Vercel configuration
└── package.json
```

## API Endpoints

After deployment, your API will be available at:

- `https://your-app.vercel.app/api/simulate` - Physics simulation
- `https://your-app.vercel.app/api/save-test` - Save results
- `https://your-app.vercel.app/api/tests` - Get history

## Build Configuration

### Client Build

The client is built using Vite's static build:
- **Build Command**: `npm run build` (in `client/` directory)
- **Output Directory**: `client/dist`
- **Framework**: Vite + React

### API Functions

Serverless functions are automatically discovered from the `api/` directory.

## Troubleshooting

### Build Failures

**Issue**: Client build fails
```bash
# Locally test the build
cd client
npm run build
```

**Issue**: Serverless functions fail
- Check that all dependencies are in `package.json`
- Verify `MONGODB_URI` is set correctly
- Check function logs in Vercel dashboard

### MongoDB Connection Errors

- Verify your MongoDB Atlas connection string
- Ensure IP whitelist includes 0.0.0.0/0
- Check database user permissions

### CORS Errors

All API functions include CORS headers. If you still face issues:
- Check browser console for specific errors
- Verify the API endpoint URL is correct

### Local Development

For local development without Vercel:

**Terminal 1** (Backend):
```bash
cd server
npm start
```

**Terminal 2** (Frontend):
```bash
cd client
npm run dev
```

The Vite proxy will forward `/api/*` requests to `http://localhost:5000`.

## Updating Your Deployment

To deploy updates:

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

Vercel will automatically:
1. Build the client application
2. Deploy serverless functions
3. Update routing configuration

## Custom Domain (Optional)

To add a custom domain:

1. Go to **Project Settings** → **Domains**
2. Add your domain
3. Update DNS records as instructed

## Monitoring

- **Logs**: View function logs in Vercel dashboard under "Logs"
- **Analytics**: Enable analytics in project settings
- **Performance**: Monitor Core Web Vitals in the dashboard

## Cost

Vercel's free tier (Hobby) includes:
- 100 GB bandwidth
- Unlimited serverless function executions (with fair use limits)
- Automatic SSL
- Preview deployments

This should be more than sufficient for a wind tunnel simulation app.

---

## Quick Reference

```bash
# Navigate to client directory
cd C:\Users\clutc\.gemini\antigravity\scratch\wind-tunnel-aero-tester\client

# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Set environment variable
vercel env add MONGODB_URI

# Local development
vercel dev
```

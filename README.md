# Wind Tunnel Aerodynamics Tester

A full-stack aerodynamic simulation application for visualizing and analyzing airflow around custom shapes.

## Features

- **Interactive Canvas**: Draw custom shapes or use presets (airfoil, rectangle, circle, triangle)
- **Real-time Physics Simulation**: Uses advanced aerodynamic calculations with Reynolds number effects
- **Flow Visualization**: View particle flow in different modes (velocity, pressure, streamlines)
- **Comprehensive Results**: Track drag, lift, coefficients, and vortex shedding
- **Simulation History**: Save and retrieve test results

## Tech Stack

- **Frontend**: React + Vite, Fabric.js for canvas, Chart.js for visualization
- **Backend**: Express API with physics engine (converted to Vercel serverless functions)
- **Database**: MongoDB (via MongoDB Atlas)
- **Deployment**: Vercel

## Local Development

### Prerequisites

- Node.js 16+ and npm
- MongoDB (local or Atlas connection string)

### Setup

1. **Clone and install dependencies**:
   ```bash
   cd wind-tunnel-aero-tester
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

2. **Set up environment variables**:
   Create `server/.env`:
   ```
   MONGODB_URI=mongodb://127.0.0.1:27017/wind-tunnel
   PORT=5000
   ```

3. **Run the application**:
   
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

4. Open `http://localhost:5173` in your browser

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Vercel deployment instructions.

**Quick Deploy**:
```bash
npm install -g vercel
vercel --prod
```

Don't forget to set `MONGODB_URI` environment variable in Vercel dashboard!

## Project Structure

```
├── api/                 # Vercel serverless functions
│   ├── simulate.js     # Physics calculations
│   ├── save-test.js    # Save simulation results  
│   └── tests.js        # Retrieve history
├── client/             # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
├── server/             # Original Express server
│   ├── src/
│   │   ├── physics/    # Shared physics engine
│   │   ├── models/     # MongoDB schemas
│   │   └── routes/     # API routes
│   └── package.json
├── vercel.json         # Vercel config
└── DEPLOYMENT.md       # Deployment guide
```

## License

MIT

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

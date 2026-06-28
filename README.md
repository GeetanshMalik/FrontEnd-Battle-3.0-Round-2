# RPA Enterprise Monitor

A high-density React dashboard for Frontend Battle Round 2, built to monitor a 50,000-row robotic process automation telemetry dataset in real time.

## Overview

RPA Enterprise Monitor is a Vite + React control-room interface for streaming automation project data. It renders live KPIs, worker-powered filtering and sorting, a virtualized telemetry grid, rolling business-value charts, snapshot export, diagnostics, and paused-state analytics without blocking the main UI thread.

## Features

- Live telemetry stream from the provided automation projects dataset
- KPI strip for processed rows, deployed robots, and cumulative savings
- Web Worker backed search, filter, sort, and CSV snapshot export
- Virtualized high-density grid for 50,000 project rows
- Pause/resume pipeline controls with buffered queue visibility
- Project inspector drawer for paused-row deep dives
- Rolling business value chart and executive analytics workspace
- Recent activity feed with auto-refresh controls
- Performance diagnostics panel with stress, FPS, memory, and worker recovery checks
- Fixed diagnostics footer with stream, worker, FPS, heap, and throughput status

## Tech Stack

- React 18
- Vite
- Chart.js
- CSS modules by feature area
- Web Workers for heavy grid/export computation

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```text
src/
  components/        React UI panels and dashboard controls
  engine/            Stream, state, event, worker, and metrics orchestration
  selectors/         Derived data selectors for filters and KPIs
  styles/            Feature-specific CSS
  utils/             Formatting, test, and recovery helpers
  workers/           Background compute worker
public/              Static dataset and stream script
```

## Notes

The app expects `automation_projects.csv` and `dataStream.js` to be available from the public path. The production build is generated with Vite and outputs to `dist/`.

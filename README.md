# Simple Time Tracker

A web application to easily track your time, visualize your day, and get weekly analytics.

## Features

1.  **One-click timer**: Start tracking instantly.
2.  **Visual timeline**: Easily spot and fill gaps in your day.
3.  **Weekly analytics dashboard**: Shows time spent by project.
4.  **Simple form**: Quickly add forgotten entries retroactively.

## Setup Instructions

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run Locally

```bash
export FLASK_APP=app.py
flask run --port 8000
```

### Run with Docker

```bash
docker build -t simple-time-tracker .
docker run -p 8000:8000 simple-time-tracker
```

## API Endpoints

-   `/health`: Health check endpoint.
-   `/`: Main application endpoint (serves `index.html`).
-   `/api/start_timer`: Start a new time entry.
-   `/api/stop_timer`: Stop the current time entry.
-   `/api/add_entry`: Add a retroactive time entry.
-   `/api/timeline`: Get visual timeline data.
-   `/api/analytics`: Get weekly analytics data.

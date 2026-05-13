# Group Order Coordinator

A full stack realtime web app that eliminates the chaos of coordinating group food orders. Users create a shared room, everyone adds their items in real time, and the app automatically consolidates the order and splits the bill.

## Features

- Create and join rooms via a shared room ID
- Realtime order updates across all connected clients via WebSockets
- Tip splitting with proportional per-person breakdown
- Even split or pay-what-you-ordered bill summary
- Close and delete rooms
- Edit and delete individual orders

## Tech Stack

**Frontend:** React, React Router, Axios, Vite

**Backend:** FastAPI, SQLModel, SQLite, WebSockets

**Deployment:** Docker


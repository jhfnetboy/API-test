# Jimeng API Demo

A Vite + React application to test the Volcengine Jimeng (Instant Dream) Text-to-Image API.

## Prerequisites

1.  **Volcengine Account**: A generic Volcengine account with access to the Visual/CV service.
2.  **API Credentials**: You need an Access Key ID (AK) and Secret Access Key (SK).
    - Get them here: [Volcengine Access Keys](https://console.volcengine.com/iam/keymanage/)

## Configuration

Update the root `.env` file (`/Users/jason/Dev/crypto-projects/API-test/.env`) with your keys:

```env
JIMENG_ACCESS_KEY=your_ak_here
JIMENG_SECRET_KEY=your_sk_here
```
> **Note**: The API requires a V4 Signature, which needs both AK and SK. If you only have an "API Key", please check if it maps to these or create new Access Keys.

## Running the Project

### One-Click Start (Recommended)
You can start both the backend and frontend simultaneously using the provided script in the root directory:

```bash
./start.sh
```

### Manual Start

#### 1. Start the Backend Proxy
The backend handles the API signature to avoid exposing keys in the browser.

```bash
cd jimeng-demo/server
node index.js
```
*Server runs on port 3001.*

#### 2. Start the Frontend
```bash
cd jimeng-demo
pnpm dev
```
*Frontend runs on http://localhost:5173 (usually).*

## Features
- **Text-to-Image**: Enter a prompt and generate.
- **Image-to-Image**: Provide an optional Reference Image URL.
- **Polling**: Automatically checks task status until completion.

# Student Investment Game

A real-time web application where students can submit companies and allocate virtual investment funds ($200,000) to their peers' projects.

## Features

- **Round 1 - Submission Phase**: Students submit company names and descriptions (optional)
- **Round 2 - Voting Phase**: Students allocate $200K investment budget across companies
- **Live Leaderboard**: Real-time updates showing total fundraising per company
- **Restrictions**: Users cannot invest in their own company
- **Admin Controls**: Instructor can control game phases and reset

## Local Development

### Prerequisites
- Node.js 18 or higher
- npm

### Installation

1. Navigate to the project directory:
```bash
cd investment-game
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser to `http://localhost:8080`

## Deployment to IBM Cloud Code Engine

### Prerequisites
- IBM Cloud account
- IBM Cloud CLI installed
- Docker installed (for building container)
- Code Engine plugin installed

### Step 1: Install IBM Cloud CLI and Plugins

```bash
# Install IBM Cloud CLI (if not already installed)
# macOS/Linux:
curl -fsSL https://clis.cloud.ibm.com/install/linux | sh

# Install Code Engine plugin
ibmcloud plugin install code-engine
```

### Step 2: Login to IBM Cloud

```bash
ibmcloud login
```

### Step 3: Target a Resource Group and Region

```bash
# List available resource groups
ibmcloud resource groups

# Target a resource group (replace with your group name)
ibmcloud target -g Default

# Set region (e.g., us-south, us-east, eu-gb)
ibmcloud target -r us-south
```

### Step 4: Create a Code Engine Project

```bash
# Create a new project
ibmcloud ce project create --name investment-game-project

# Select the project
ibmcloud ce project select --name investment-game-project
```

### Step 5: Build and Deploy the Application

```bash
# Navigate to the app directory
cd investment-game

# Build and deploy in one command
ibmcloud ce application create \
  --name investment-game \
  --build-source . \
  --strategy dockerfile \
  --port 8080 \
  --min-scale 1 \
  --max-scale 3 \
  --cpu 0.25 \
  --memory 0.5G
```

### Step 6: Get the Application URL

```bash
# Get application details including URL
ibmcloud ce application get --name investment-game
```

The output will show the application URL (e.g., `https://investment-game.xxx.us-south.codeengine.appdomain.cloud`)

## Alternative: Deploy Using Container Registry

If you prefer to build the container locally and push to IBM Container Registry:

### Step 1: Build Docker Image Locally

```bash
# Login to IBM Container Registry
ibmcloud cr login

# Create a namespace (if you don't have one)
ibmcloud cr namespace-add investment-game-ns

# Build and tag the image
docker build -t us.icr.io/investment-game-ns/investment-game:latest .

# Push to registry
docker push us.icr.io/investment-game-ns/investment-game:latest
```

### Step 2: Deploy from Registry

```bash
# Create application from registry image
ibmcloud ce application create \
  --name investment-game \
  --image us.icr.io/investment-game-ns/investment-game:latest \
  --registry-secret icr-secret \
  --port 8080 \
  --min-scale 1 \
  --max-scale 3 \
  --cpu 0.25 \
  --memory 0.5G
```

## Managing the Application

### View Application Status
```bash
ibmcloud ce application get --name investment-game
```

### View Logs
```bash
ibmcloud ce application logs --name investment-game
```

### Update Application
```bash
ibmcloud ce application update --name investment-game --build-source .
```

### Delete Application
```bash
ibmcloud ce application delete --name investment-game
```

### Delete Project
```bash
ibmcloud ce project delete --name investment-game-project
```

## Usage Instructions

### For Instructors:
1. Share the application URL with students
2. Use the "Game Controls" section to manage phases:
   - **Start Submission**: Allow students to submit companies
   - **Start Voting**: Begin the investment phase
   - **Show Results**: Display final leaderboard
   - **Reset Game**: Clear all data and start over

### For Students:
1. **Submission Phase**: 
   - Enter your name (required)
   - Optionally submit a company with description
   - Or just participate as an investor

2. **Voting Phase**:
   - View all submitted companies
   - Allocate your $200K budget across companies
   - Cannot invest in your own company
   - Watch the live leaderboard update

3. **Results Phase**:
   - View final rankings
   - See total investment each company received

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Real-time**: Socket.io
- **Deployment**: IBM Cloud Code Engine
- **Container**: Docker

## Notes

- The application uses in-memory storage, so data resets when the server restarts
- WebSocket connections enable real-time updates across all connected users
- The app is designed for classroom use with 10-50 students
- For production use with persistence, consider adding a database

## Support

For issues or questions, please contact your instructor or IT support.
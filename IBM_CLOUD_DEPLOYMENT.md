# IBM Cloud Code Engine Deployment Guide

## Prerequisites

1. **IBM Cloud Account**: Sign up at https://cloud.ibm.com
2. **IBM Cloud CLI**: Install from https://cloud.ibm.com/docs/cli
3. **Code Engine Plugin**: Install with `ibmcloud plugin install code-engine`
4. **Docker**: Ensure Docker is installed and running

## Deployment Steps

### Step 1: Login to IBM Cloud

```bash
ibmcloud login
```

If you have SSO:
```bash
ibmcloud login --sso
```

### Step 2: Target Your Resource Group

```bash
ibmcloud target -g Default
```

### Step 3: Create a Code Engine Project

```bash
ibmcloud ce project create --name angel-investor-game
```

Or select an existing project:
```bash
ibmcloud ce project select --name angel-investor-game
```

### Step 4: Build and Deploy the Application

#### Option A: Deploy from Local Source (Recommended)

Navigate to the investment-game directory and run:

```bash
cd investment-game

# Build and deploy in one command
ibmcloud ce application create \
  --name angel-investor-game \
  --build-source . \
  --strategy dockerfile \
  --port 3000 \
  --min-scale 1 \
  --max-scale 3 \
  --cpu 0.5 \
  --memory 1G \
  --env PORT=3000
```

#### Option B: Build Container Image First, Then Deploy

```bash
# Build the container image
ibmcloud ce build create \
  --name angel-investor-build \
  --source . \
  --strategy dockerfile \
  --size medium

# Run the build
ibmcloud ce buildrun submit --build angel-investor-build

# Wait for build to complete, then deploy
ibmcloud ce application create \
  --name angel-investor-game \
  --image <your-registry-url>/angel-investor-game:latest \
  --port 3000 \
  --min-scale 1 \
  --max-scale 3 \
  --cpu 0.5 \
  --memory 1G \
  --env PORT=3000
```

### Step 5: Get Your Application URL

```bash
ibmcloud ce application get --name angel-investor-game
```

Look for the URL in the output (e.g., `https://angel-investor-game.xxx.us-south.codeengine.appdomain.cloud`)

## Configuration Options

### Scaling Configuration

Adjust based on expected number of students:

```bash
# For small classes (< 30 students)
--min-scale 1 --max-scale 2 --cpu 0.5 --memory 1G

# For medium classes (30-100 students)
--min-scale 1 --max-scale 5 --cpu 1 --memory 2G

# For large classes (> 100 students)
--min-scale 2 --max-scale 10 --cpu 2 --memory 4G
```

### Update Existing Application

```bash
ibmcloud ce application update \
  --name angel-investor-game \
  --min-scale 2 \
  --max-scale 5 \
  --cpu 1 \
  --memory 2G
```

## Monitoring and Management

### View Application Logs

```bash
ibmcloud ce application logs --name angel-investor-game
```

### View Application Status

```bash
ibmcloud ce application get --name angel-investor-game
```

### List All Applications

```bash
ibmcloud ce application list
```

### Delete Application

```bash
ibmcloud ce application delete --name angel-investor-game
```

## Troubleshooting

### Application Not Starting

1. Check logs:
   ```bash
   ibmcloud ce application logs --name angel-investor-game --tail 100
   ```

2. Verify the port configuration matches (3000)

3. Check build logs if using build-source:
   ```bash
   ibmcloud ce buildrun logs --name angel-investor-build-run-xxxxx
   ```

### WebSocket Connection Issues

Code Engine supports WebSocket connections by default. If you experience issues:

1. Ensure your application is listening on the correct port (3000)
2. Check that the PORT environment variable is set correctly
3. Verify min-scale is at least 1 to keep the app running

### File Upload Issues

The application uses in-memory storage for uploads. For production:

1. Consider using IBM Cloud Object Storage for persistent file storage
2. Or use a database to store company data instead of file uploads

## Cost Optimization

Code Engine pricing is based on:
- vCPU-seconds
- GB-seconds of memory
- Number of requests

To optimize costs:

1. Set `--min-scale 0` if the app doesn't need to be always running (adds cold start time)
2. Use smaller CPU/memory allocations for small classes
3. Set appropriate `--max-scale` to prevent unexpected scaling

## Security Considerations

1. **HTTPS**: Code Engine provides HTTPS by default
2. **Authentication**: Consider adding authentication for instructor access
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Input Validation**: The app includes basic validation, but review for production use

## Next Steps

1. Share the application URL with students
2. Test with a small group first
3. Monitor performance during actual use
4. Adjust scaling parameters based on actual load

## Support

- IBM Cloud Code Engine Docs: https://cloud.ibm.com/docs/codeengine
- IBM Cloud Support: https://cloud.ibm.com/unifiedsupport/supportcenter
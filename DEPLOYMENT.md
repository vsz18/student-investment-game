# Deployment Guide

## Deploy to Render.com (Recommended - Free & Easy)

Render.com provides free hosting for Node.js applications with WebSocket support, perfect for this real-time investment game.

### Step 1: Create a Render Account
1. Go to [render.com](https://render.com)
2. Sign up for a free account (you can use your GitHub account)

### Step 2: Deploy from GitHub
1. Click "New +" button in the top right
2. Select "Web Service"
3. Connect your GitHub account if not already connected
4. Select the `student-investment-game` repository
5. Configure the service:
   - **Name**: `student-investment-game` (or any name you prefer)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Select "Free"
6. Click "Create Web Service"

### Step 3: Wait for Deployment
- Render will automatically build and deploy your app
- This usually takes 2-3 minutes
- You'll get a URL like: `https://student-investment-game.onrender.com`

### Step 4: Share with Students
Once deployed, share the URL with your students. They can access:
- **Students**: Click "Student" role and enter their name
- **Instructor**: Click "Instructor" role and enter password: `zongzi`

## Important Notes

### Free Tier Limitations
- Render's free tier spins down after 15 minutes of inactivity
- First request after inactivity may take 30-60 seconds to wake up
- Sufficient for classroom use with active students

### Instructor Password
The default instructor password is: **zongzi**

To change it, update line 15 in `server.js`:
```javascript
const INSTRUCTOR_PASSWORD = 'your-new-password';
```

Then commit and push the changes:
```bash
git add server.js
git commit -m "Update instructor password"
git push
```

Render will automatically redeploy with the new password.

## Alternative: Deploy to Railway.app

Railway is another excellent free option:

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `student-investment-game`
5. Railway will auto-detect Node.js and deploy
6. Click "Generate Domain" to get your public URL

## Alternative: Deploy to Heroku

If you have a Heroku account:

```bash
# Install Heroku CLI if not already installed
# brew install heroku/brew/heroku  # macOS
# Or download from https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login

# Create a new Heroku app
heroku create student-investment-game

# Push to Heroku
git push heroku main

# Open the app
heroku open
```

## Troubleshooting

### App won't start
- Check Render logs for errors
- Ensure all dependencies are in `package.json`
- Verify `PORT` environment variable is being used

### WebSocket connection fails
- Ensure the deployment platform supports WebSockets
- Check that the client is connecting to the correct URL
- Verify no firewall is blocking WebSocket connections

### Students can't connect
- Verify the URL is accessible from their network
- Check if school firewall blocks the hosting platform
- Try accessing from a different network to isolate the issue

## Support

For issues or questions:
1. Check the Render/Railway logs for error messages
2. Verify the app works locally first: `npm start`
3. Ensure all files are committed and pushed to GitHub
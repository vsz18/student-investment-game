# 🚀 Deploy to Render - Step-by-Step Guide

## Prerequisites
- ✅ Code is committed and pushed to GitHub: `https://github.com/vsz18/student-investment-game`
- ✅ Render account (free tier available at https://render.com)

## Deployment Steps

### 1. Create New Web Service on Render

1. Go to https://dashboard.render.com
2. Click **"New +"** button in the top right
3. Select **"Web Service"**

### 2. Connect Your GitHub Repository

1. Click **"Connect account"** if you haven't connected GitHub yet
2. Search for: `student-investment-game`
3. Click **"Connect"** next to your repository

### 3. Configure Your Web Service

Fill in the following settings:

**Basic Settings:**
- **Name**: `student-investment-game` (or any name you prefer)
- **Region**: Choose closest to your location
- **Branch**: `main`
- **Root Directory**: `investment-game` ⚠️ **IMPORTANT**
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Instance Type:**
- Select **"Free"** (or paid tier for better performance)

**Environment Variables:**
Click **"Add Environment Variable"** and add:
- **Key**: `NODE_ENV`
- **Value**: `production`

### 4. Deploy!

1. Click **"Create Web Service"** at the bottom
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Start your server
   - Provide you with a public URL

### 5. Monitor Deployment

- Watch the **Logs** tab for deployment progress
- Look for: `Server running on port XXXX`
- Once you see "Live" status, your app is ready!

### 6. Access Your App

Your app will be available at:
```
https://student-investment-game.onrender.com
```
(or whatever name you chose)

## 🎮 Using Your Deployed App

### For Instructors:
1. Visit your Render URL
2. Enter your name
3. Select "Instructor" role
4. Upload your Excel file with companies
5. Start the voting phase
6. Share the URL with students

### For Students:
1. Visit the same Render URL
2. Enter their name
3. Select "Student" role
4. Wait for instructor to start voting
5. Invest their $200,000!

## 📊 Important Notes

### Free Tier Limitations:
- ⚠️ **Spins down after 15 minutes of inactivity**
- First request after spin-down takes ~30 seconds to wake up
- 750 hours/month free (enough for most classroom use)

### For Production Use:
Consider upgrading to a paid tier ($7/month) for:
- ✅ Always-on service (no spin-down)
- ✅ Faster performance
- ✅ More memory and CPU

## 🔄 Updating Your App

When you make changes:

1. Commit and push to GitHub:
   ```bash
   cd investment-game
   git add -A
   git commit -m "Your update message"
   git push personal main
   ```

2. Render will **automatically redeploy** (if auto-deploy is enabled)
   - Or click **"Manual Deploy"** → **"Deploy latest commit"** in Render dashboard

## 🐛 Troubleshooting

### App won't start?
- Check **Logs** tab in Render dashboard
- Verify **Root Directory** is set to `investment-game`
- Ensure **Start Command** is `npm start`

### Can't connect to app?
- Wait 30 seconds if it's been inactive (free tier spin-down)
- Check if deployment shows "Live" status
- Try accessing in incognito/private browser window

### WebSocket issues?
- Render supports WebSockets by default
- Ensure you're using `https://` (not `http://`)
- Check browser console for connection errors

## 📱 Sharing with Students

Share this URL with your students:
```
https://your-app-name.onrender.com
```

**Pro tip**: Create a short link using bit.ly or similar for easier sharing!

## 🎓 Classroom Tips

1. **Before Class:**
   - Test the app yourself
   - Prepare your Excel file with companies
   - Share the URL with students in advance

2. **During Class:**
   - Have students join as you start
   - Monitor the "Active Students" section
   - Use the "Reset Game" button between rounds if needed

3. **After Class:**
   - Export results as PDF for records
   - App will spin down automatically (free tier)
   - Data is cleared on reset - no persistence between sessions

## 🆘 Need Help?

- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com
- Check the app logs in Render dashboard for errors

---

**Your app is now live and ready for students! 🎉**
# FOE2026 Angel Investor Game 🎯💰

An interactive web application where students simulate angel investing by allocating a $200,000 budget across startup companies. Perfect for entrepreneurship classes and business education.

## 🌟 Features

### For Instructors
- **Easy Setup**: Upload companies via Excel/CSV file
- **Game Control**: Manage game phases (waiting → voting → results)
- **Real-time Monitoring**: See live investment activity
- **Results Dashboard**: View ranked companies by total funding
- **Student Comments**: Read student feedback on each company

### For Students
- **$200,000 Budget**: Virtual investment money to allocate
- **Company Research**: Review company descriptions before investing
- **Investment Portfolio**: Track all investments in one place
- **Add Comments**: Share thoughts about companies
- **Real-time Updates**: See the budget decrease as you invest
- **Self-Investment Prevention**: Can't invest in your own company

### Technical Features
- **Real-time Sync**: WebSocket-based live updates
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern UI**: Sleek dark theme with neon green accents
- **Multi-user Support**: Handles multiple students simultaneously
- **No Database Required**: In-memory storage for simplicity

## 🚀 Quick Start

### Local Development

1. **Install Dependencies**
```bash
cd investment-game
npm install
```

2. **Start the Server**
```bash
npm start
```

3. **Open in Browser**
```
http://localhost:3000
```

### Using Docker

```bash
docker build -t angel-investor-game .
docker run -p 3000:3000 angel-investor-game
```

## ☁️ Deploy to IBM Cloud Code Engine

### Option 1: Automated Deployment (Recommended)

```bash
cd investment-game
./deploy-to-ibm-cloud.sh
```

The script will:
- Check prerequisites
- Login to IBM Cloud
- Create/select a Code Engine project
- Let you choose deployment size
- Deploy the application
- Provide the public URL

### Option 2: Manual Deployment

See [IBM_CLOUD_DEPLOYMENT.md](IBM_CLOUD_DEPLOYMENT.md) for detailed manual deployment instructions.

### Prerequisites for IBM Cloud Deployment

1. **IBM Cloud Account**: Sign up at https://cloud.ibm.com
2. **IBM Cloud CLI**: Install from https://cloud.ibm.com/docs/cli
3. **Code Engine Plugin**: 
   ```bash
   ibmcloud plugin install code-engine
   ```

### Deployment Sizes

Choose based on your class size:

| Class Size | CPU | Memory | Min Scale | Max Scale |
|------------|-----|--------|-----------|-----------|
| Small (< 30) | 0.5 | 1GB | 1 | 2 |
| Medium (30-100) | 1 | 2GB | 1 | 5 |
| Large (> 100) | 2 | 4GB | 2 | 10 |

## 📖 How to Use

### For Instructors

1. **Access the App**: Open the deployed URL
2. **Select Instructor Mode**: Click the "INSTRUCTOR" button
3. **Upload Companies**: 
   - Prepare an Excel file with columns: `Company Name`, `Description`
   - Click "Upload Companies" and select your file
   - Sample file provided: `sample-companies.csv`
4. **Start Voting**: Click "Start Voting Phase" when ready
5. **View Results**: Click "Show Results" to see the rankings
6. **Reset Game**: Click "Reset Game" to start over

### For Students

1. **Access the App**: Open the same URL as instructor
2. **Select Student Mode**: Click the "STUDENT" button
3. **Enter Your Name**: Type your name and click Continue
4. **Wait for Game Start**: Instructor will upload companies and start voting
5. **Review Companies**: Read descriptions carefully
6. **Make Investments**:
   - Enter amount in the investment field
   - Click "INVEST" button
   - Watch your budget decrease
   - Track investments in "My Investments" section
7. **Add Comments** (Optional): Share your thoughts about companies
8. **View Results**: See final rankings when instructor shows results

## 📊 Creating Your Companies File

### Excel/CSV Format

Create a file with these columns:

| Company Name | Description |
|--------------|-------------|
| TechStart AI | AI-powered platform for small business automation |
| GreenEnergy | Renewable energy consulting and installation services |
| HealthTrack | Wearable health monitoring device for seniors |

### Tips for Good Company Descriptions

- Keep descriptions concise (1-2 sentences)
- Include the problem being solved
- Mention the target market
- Make them realistic and engaging

### Sample File

A sample file is included: `sample-companies.csv`

You can also generate a sample Excel file:
```bash
node create-sample-excel.js
```

## 🎮 Game Flow

```
1. SETUP PHASE
   └─ Instructor uploads companies
   
2. WAITING PHASE
   └─ Students see "Waiting for instructor..."
   
3. VOTING PHASE
   ├─ Students allocate their $200,000
   ├─ Real-time investment tracking
   └─ Comments and feedback
   
4. RESULTS PHASE
   ├─ Ranked list of companies
   ├─ Total funding per company
   └─ Student comments visible
```

## 🛠️ Technical Stack

- **Backend**: Node.js, Express.js
- **Real-time**: Socket.IO (WebSockets)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **File Upload**: Multer
- **Excel Parsing**: XLSX
- **Containerization**: Docker
- **Deployment**: IBM Cloud Code Engine

## 📁 Project Structure

```
investment-game/
├── server.js                      # Main server file
├── package.json                   # Dependencies
├── Dockerfile                     # Container configuration
├── deploy-to-ibm-cloud.sh        # Automated deployment script
├── IBM_CLOUD_DEPLOYMENT.md       # Detailed deployment guide
├── public/                        # Frontend files
│   ├── index.html                # Main HTML
│   ├── app.js                    # Client-side JavaScript
│   └── styles.css                # Styling
├── uploads/                       # Temporary file storage
├── sample-companies.csv          # Sample data
└── create-sample-excel.js        # Sample file generator
```

## 🔧 Configuration

### Environment Variables

- `PORT`: Server port (default: 3000)

### Customization

Edit these files to customize:
- `public/styles.css`: Change colors, fonts, layout
- `server.js`: Modify game logic, budget amount
- `public/app.js`: Adjust client-side behavior

## 🐛 Troubleshooting

### Local Development Issues

**Port already in use:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Dependencies not installing:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Deployment Issues

**Build fails:**
- Check Dockerfile syntax
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility

**WebSocket connection fails:**
- Ensure min-scale is at least 1
- Check that PORT environment variable is set
- Verify firewall/security group settings

**File upload not working:**
- Check file size limits
- Verify Excel file format
- Ensure uploads directory exists

## 📈 Scaling Considerations

### For Large Classes (100+ students)

1. **Increase Resources**:
   ```bash
   ibmcloud ce application update \
     --name angel-investor-game \
     --cpu 2 \
     --memory 4G \
     --max-scale 10
   ```

2. **Monitor Performance**:
   ```bash
   ibmcloud ce application logs --name angel-investor-game
   ```

3. **Consider Database**: For persistent storage, integrate a database

## 🔒 Security Notes

- HTTPS is enabled by default on IBM Cloud Code Engine
- No authentication is implemented (suitable for classroom use)
- File uploads are validated for type and size
- Input sanitization is implemented for user data

## 💡 Tips for Best Results

1. **Test First**: Run a practice round with a small group
2. **Clear Instructions**: Explain the rules before starting
3. **Time Limit**: Set a time limit for the voting phase
4. **Diverse Companies**: Include various industries and stages
5. **Debrief**: Discuss investment decisions after results

## 📝 License

This project is open source and available for educational use.

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review IBM Cloud Code Engine documentation
3. Contact your system administrator

## 🎓 Educational Use

This application is designed for:
- Entrepreneurship courses
- Business strategy classes
- Innovation workshops
- Startup competitions
- Investment education

## 🔄 Updates and Maintenance

To update the deployed application:
```bash
cd investment-game
./deploy-to-ibm-cloud.sh
```

The script will detect the existing deployment and update it.

---

**Built for FOE2026** | Made with ❤️ for education
# 🎯 Student Investment Game

An interactive web application where students simulate angel investing by allocating a $200,000 budget across startup companies. Perfect for entrepreneurship classes, business courses, or pitch competitions.

## 🎮 How It Works

### For Instructors
1. Access the instructor dashboard with password: `zongzi`
2. Upload a list of companies via Excel/CSV or enter them manually
3. Control game phases (submission, voting, results)
4. View real-time investment results and rankings

### For Students
1. **Round 1 (Optional)**: Submit your own company with name and description
2. **Round 2**: Invest your $200,000 budget across all companies
   - Allocate funds in any amount to any company
   - Cannot invest in your own company
   - Watch your remaining budget decrease as you invest
3. **Results**: See the final rankings based on total investments received

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open browser to http://localhost:3000
```

### Deploy to Production

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions to:
- **Render.com** (Recommended - Free)
- **Railway.app** (Alternative - Free)
- **Heroku** (Alternative)

## 📋 Features

- **Real-time Updates**: All students see live investment totals using WebSocket
- **Dual Roles**: Separate interfaces for instructors and students
- **Excel Upload**: Instructors can bulk upload companies from Excel/CSV
- **Password Protection**: Instructor dashboard requires authentication
- **Mobile Responsive**: Works on phones, tablets, and desktops
- **No Database Required**: All data stored in memory (resets on restart)

## 🎨 Screenshots

### Role Selection
Students and instructors choose their role at the start.

### Student View
- See all companies with descriptions
- Allocate investment budget
- Track remaining funds
- View real-time rankings

### Instructor Dashboard
- Upload companies via Excel
- Control game phases
- View investment results
- See detailed analytics

## 📊 Excel Upload Format

Create an Excel file with these columns:

| Company Name | Description |
|--------------|-------------|
| TechStart Inc | AI-powered productivity tools |
| GreenEnergy Co | Sustainable energy solutions |
| HealthTrack | Fitness and wellness app |

See `sample-companies.xlsx` for an example.

## 🔧 Configuration

### Change Instructor Password

Edit `server.js` line 15:
```javascript
const INSTRUCTOR_PASSWORD = 'your-new-password';
```

### Adjust Investment Budget

Edit `public/app.js` line 3:
```javascript
const INITIAL_BUDGET = 200000; // Change to any amount
```

### Modify Port

```bash
PORT=8080 npm start
```

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Real-time**: Socket.IO (WebSocket)
- **File Upload**: Multer, XLSX
- **Containerization**: Docker

## 📦 Project Structure

```
investment-game/
├── public/
│   ├── index.html      # Main HTML file
│   ├── styles.css      # Styling
│   └── app.js          # Client-side JavaScript
├── uploads/            # Temporary file uploads
├── server.js           # Express server & Socket.IO
├── package.json        # Dependencies
├── Dockerfile          # Docker configuration
├── render.yaml         # Render.com config
└── README.md           # This file
```

## 🎓 Educational Use Cases

- **Entrepreneurship Classes**: Students pitch and vote on business ideas
- **Business Competitions**: Evaluate startup pitches with peer voting
- **Innovation Workshops**: Crowdsource feedback on project concepts
- **Team Building**: Collaborative decision-making exercises

## 🔒 Security Notes

- Instructor password is stored in plain text (suitable for classroom use)
- For production use, consider implementing proper authentication
- Data is stored in memory and resets when server restarts
- No persistent database means no data retention between sessions

## 🤝 Contributing

This is an educational project. Feel free to fork and modify for your needs!

## 📝 License

MIT License - Free to use for educational purposes

## 🆘 Support

For deployment help, see [DEPLOYMENT.md](DEPLOYMENT.md)

For issues or questions, check the troubleshooting section in the deployment guide.

---

**Made for educators and students** 🎓
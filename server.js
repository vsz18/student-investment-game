const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const multer = require('multer');
const xlsx = require('xlsx');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 8080;

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      return cb(new Error('Only Excel files are allowed'));
    }
    cb(null, true);
  }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Game state
let gameState = {
  phase: 'setup', // 'setup', 'voting', 'results'
  companies: [], // { id, name, description, totalInvestment }
  users: {}, // { socketId: { userId, userName, role, investments: {}, remainingBudget } }
  instructorId: null,
  INITIAL_BUDGET: 200000
};

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Excel upload endpoint
app.post('/api/upload-companies', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    // Clear existing companies
    gameState.companies = [];

    // Process each row
    data.forEach((row, index) => {
      const companyName = row['Company Name'] || row['company name'] || row['name'] || row['Name'];
      const description = row['Description'] || row['description'] || '';

      if (companyName) {
        gameState.companies.push({
          id: uuidv4(),
          name: companyName.toString().trim(),
          description: description.toString().trim(),
          totalInvestment: 0
        });
      }
    });

    // Broadcast updated companies to all clients
    io.emit('companiesUpdated', gameState.companies);

    res.json({ 
      success: true, 
      message: `Successfully loaded ${gameState.companies.length} companies`,
      companies: gameState.companies 
    });
  } catch (error) {
    console.error('Error processing Excel file:', error);
    res.status(500).json({ error: 'Failed to process Excel file: ' + error.message });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  // Handle role selection
  socket.on('selectRole', (data) => {
    const { role, userName } = data;
    
    // Check if instructor role is already taken
    if (role === 'instructor' && gameState.instructorId && gameState.instructorId !== socket.id) {
      socket.emit('roleError', { message: 'Instructor role is already taken' });
      return;
    }

    // Initialize user
    const userId = uuidv4();
    gameState.users[socket.id] = {
      userId,
      userName: userName || 'Anonymous',
      role: role,
      investments: {},
      remainingBudget: gameState.INITIAL_BUDGET
    };

    if (role === 'instructor') {
      gameState.instructorId = socket.id;
    }

    // Send current game state to user
    socket.emit('roleAccepted', {
      role: role,
      phase: gameState.phase,
      companies: gameState.companies,
      user: gameState.users[socket.id],
      initialBudget: gameState.INITIAL_BUDGET
    });

    console.log(`User ${userName} joined as ${role}`);
  });

  // Handle phase change (instructor only)
  socket.on('changePhase', (newPhase) => {
    if (gameState.users[socket.id]?.role !== 'instructor') {
      socket.emit('error', { message: 'Only instructor can change phases' });
      return;
    }

    gameState.phase = newPhase;
    
    // Broadcast phase change to all users
    io.emit('phaseChanged', { phase: newPhase });
    
    console.log(`Phase changed to: ${newPhase}`);
  });

  // Handle investment
  socket.on('invest', (data) => {
    const user = gameState.users[socket.id];
    
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    if (user.role !== 'student') {
      socket.emit('error', { message: 'Only students can invest' });
      return;
    }

    if (gameState.phase !== 'voting') {
      socket.emit('error', { message: 'Voting is not currently active' });
      return;
    }

    const { companyId, amount } = data;
    const company = gameState.companies.find(c => c.id === companyId);

    if (!company) {
      socket.emit('error', { message: 'Company not found' });
      return;
    }

    if (amount <= 0 || amount > user.remainingBudget) {
      socket.emit('error', { message: 'Invalid investment amount' });
      return;
    }

    // Update user's investment
    if (!user.investments[companyId]) {
      user.investments[companyId] = 0;
    }
    user.investments[companyId] += amount;
    user.remainingBudget -= amount;

    // Update company's total investment
    company.totalInvestment += amount;

    // Send confirmation to user
    socket.emit('investmentSuccess', {
      companyId,
      amount,
      remainingBudget: user.remainingBudget
    });

    // Broadcast updated leaderboard to all users
    const leaderboard = gameState.companies
      .map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        totalInvestment: c.totalInvestment
      }))
      .sort((a, b) => b.totalInvestment - a.totalInvestment);

    io.emit('leaderboardUpdate', leaderboard);

    console.log(`${user.userName} invested $${amount} in ${company.name}`);
  });

  // Handle reset game (instructor only)
  socket.on('resetGame', () => {
    if (gameState.users[socket.id]?.role !== 'instructor') {
      socket.emit('error', { message: 'Only instructor can reset the game' });
      return;
    }

    // Reset all user investments and budgets
    Object.values(gameState.users).forEach(user => {
      if (user.role === 'student') {
        user.investments = {};
        user.remainingBudget = gameState.INITIAL_BUDGET;
      }
    });

    // Reset company investments
    gameState.companies.forEach(company => {
      company.totalInvestment = 0;
    });

    // Reset phase
    gameState.phase = 'setup';

    // Broadcast reset to all users
    io.emit('gameReset', {
      phase: gameState.phase,
      companies: gameState.companies,
      initialBudget: gameState.INITIAL_BUDGET
    });

    console.log('Game reset by instructor');
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (gameState.instructorId === socket.id) {
      gameState.instructorId = null;
      console.log('Instructor disconnected');
    }
    
    delete gameState.users[socket.id];
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Made with Bob

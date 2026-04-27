const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const multer = require('multer');
const xlsx = require('xlsx');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  // Optimize for classroom with many users from same IP
  pingTimeout: 60000, // 60 seconds before considering connection dead
  pingInterval: 25000, // Check connection health every 25 seconds
  upgradeTimeout: 30000, // 30 seconds to complete WebSocket upgrade
  maxHttpBufferSize: 1e6, // 1MB max message size
  transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
  cors: {
    origin: "*", // Allow all origins (adjust for production)
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8080;

// Configuration for 100 user capacity
const MAX_CONNECTIONS = 100;
const RATE_LIMIT_WINDOW = 500; // 0.5 seconds (faster for more users)
const LEADERBOARD_UPDATE_INTERVAL = 1000; // 1 second (faster updates)

// Connection tracking
let activeConnections = 0;
const connectionsPerIP = new Map(); // Track connections per IP for monitoring

// Rate limiting storage
const rateLimits = new Map(); // socketId -> { investments: timestamp[], comments: timestamp[] }

// Debounced leaderboard update
let leaderboardUpdateTimer = null;
let pendingLeaderboardUpdate = false;

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
  companies: [], // { id, name, description, totalInvestment, comments: [] }
  users: {}, // { socketId: { userId, userName, role, investments: {}, remainingBudget } }
  instructorId: null,
  instructorSessionId: null, // Unique session ID for instructor
  INITIAL_BUDGET: 200000
};

// Store instructor session data for recovery
let instructorSession = {
  sessionId: null,
  lastActive: null,
  companies: [],
  phase: 'setup'
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
          totalInvestment: 0,
          comments: []
        });
      }
    });

    // Save to instructor session
    if (instructorSession.sessionId) {
      instructorSession.companies = gameState.companies;
      instructorSession.lastActive = Date.now();
    }

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

// Excel export endpoint (instructor only)
app.get('/api/export-excel', (req, res) => {
  try {
    const students = Object.values(gameState.users).filter(u => u.role === 'student');
    
    // Create data array for Excel
    const excelData = [];
    
    // Add header row
    excelData.push(['Student Name', 'Company Name', 'Investment Amount', 'Comment']);
    
    // Add data rows for each student's investments
    students.forEach(student => {
      const investments = Object.entries(student.investments);
      
      if (investments.length === 0) {
        // Student made no investments
        excelData.push([student.userName, 'No investments', 0, '']);
      } else {
        investments.forEach(([companyId, amount]) => {
          const company = gameState.companies.find(c => c.id === companyId);
          if (company) {
            // Find student's comment for this company
            const commentObj = company.comments.find(c => c.userId === student.userId);
            const comment = commentObj ? commentObj.comment : '';
            
            excelData.push([
              student.userName,
              company.name,
              amount,
              comment
            ]);
          }
        });
      }
    });
    
    // Create workbook and worksheet
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet(excelData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Student Name
      { wch: 30 }, // Company Name
      { wch: 18 }, // Investment Amount
      { wch: 50 }  // Comment
    ];
    
    // Add worksheet to workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Investment Report');
    
    // Generate Excel file buffer
    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=investment-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    // Send the Excel file
    res.send(excelBuffer);
    
  } catch (error) {
    console.error('Error generating Excel:', error);
    res.status(500).json({ error: 'Failed to generate Excel: ' + error.message });
  }
});

// Helper function to check rate limit
function checkRateLimit(socketId, action) {
  if (!rateLimits.has(socketId)) {
    rateLimits.set(socketId, { investments: [], comments: [] });
  }
  
  const limits = rateLimits.get(socketId);
  const now = Date.now();
  
  // Clean old timestamps (older than rate limit window)
  limits[action] = limits[action].filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  // Check if rate limit exceeded (max 2 actions per 0.5 seconds)
  if (limits[action].length >= 2) {
    return false;
  }
  
  // Add current timestamp
  limits[action].push(now);
  return true;
}

// Debounced leaderboard update function
function scheduleLeaderboardUpdate() {
  if (leaderboardUpdateTimer) {
    return; // Update already scheduled
  }
  
  leaderboardUpdateTimer = setTimeout(() => {
    if (gameState.instructorId) {
      const leaderboard = gameState.companies
        .map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          totalInvestment: c.totalInvestment,
          comments: c.comments
        }))
        .sort((a, b) => b.totalInvestment - a.totalInvestment);
      
      io.to(gameState.instructorId).emit('leaderboardUpdate', leaderboard);
    }
    
    leaderboardUpdateTimer = null;
  }, LEADERBOARD_UPDATE_INTERVAL);
}

// Socket.io connection handling
io.on('connection', (socket) => {
  // Get client IP address (handles proxies)
  const clientIP = socket.handshake.headers['x-forwarded-for']?.split(',')[0].trim() ||
                   socket.handshake.headers['x-real-ip'] ||
                   socket.handshake.address;
  
  // Check connection limit
  if (activeConnections >= MAX_CONNECTIONS) {
    console.log(`Connection rejected - max capacity reached: ${socket.id} from IP ${clientIP}`);
    socket.emit('connectionError', {
      message: `Server is at maximum capacity (${MAX_CONNECTIONS} users). Please try again later.`
    });
    socket.disconnect(true);
    return;
  }
  
  activeConnections++;
  
  // Track connections per IP (for monitoring only, not blocking)
  if (!connectionsPerIP.has(clientIP)) {
    connectionsPerIP.set(clientIP, new Set());
  }
  connectionsPerIP.get(clientIP).add(socket.id);
  
  const ipConnectionCount = connectionsPerIP.get(clientIP).size;
  console.log(`New user connected: ${socket.id} from IP ${clientIP} (${ipConnectionCount} from this IP, ${activeConnections}/${MAX_CONNECTIONS} total)`);

  // Handle role selection
  socket.on('selectRole', (data) => {
    const { role, userName, sessionId } = data;
    
    // Check if instructor role is already taken by a DIFFERENT active session
    if (role === 'instructor') {
      if (gameState.instructorId && gameState.instructorId !== socket.id) {
        // Check if the existing instructor is still connected
        const existingInstructor = io.sockets.sockets.get(gameState.instructorId);
        if (existingInstructor && existingInstructor.connected) {
          socket.emit('roleError', {
            message: 'Instructor role is already taken by an active session. Please wait for them to disconnect or use the same session.'
          });
          return;
        } else {
          // Previous instructor disconnected without cleanup, allow takeover
          console.log('Previous instructor session was stale, allowing new instructor');
          gameState.instructorId = null;
        }
      }
      
      // Check for session recovery
      if (sessionId && instructorSession.sessionId === sessionId) {
        // Restore previous session
        console.log('Restoring instructor session:', sessionId);
        gameState.companies = instructorSession.companies;
        gameState.phase = instructorSession.phase;
      } else {
        // New instructor session
        const newSessionId = uuidv4();
        gameState.instructorSessionId = newSessionId;
        instructorSession.sessionId = newSessionId;
        instructorSession.companies = gameState.companies;
        instructorSession.phase = gameState.phase;
        instructorSession.lastActive = Date.now();
      }
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
      initialBudget: gameState.INITIAL_BUDGET,
      sessionId: role === 'instructor' ? gameState.instructorSessionId : undefined
    });

    // Send active students list to instructor
    if (role === 'instructor') {
      const activeStudents = Object.values(gameState.users)
        .filter(u => u.role === 'student')
        .map(u => ({
          userName: u.userName,
          remainingBudget: u.remainingBudget,
          totalInvested: Object.values(u.investments).reduce((sum, amt) => sum + amt, 0)
        }));
      socket.emit('activeStudentsUpdate', activeStudents);
      
      // Send current leaderboard immediately
      const leaderboard = gameState.companies
        .map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          totalInvestment: c.totalInvestment,
          comments: c.comments
        }))
        .sort((a, b) => b.totalInvestment - a.totalInvestment);
      socket.emit('leaderboardUpdate', leaderboard);
    }

    // Notify instructor of new student
    if (role === 'student' && gameState.instructorId) {
      const activeStudents = Object.values(gameState.users)
        .filter(u => u.role === 'student')
        .map(u => ({
          userName: u.userName,
          remainingBudget: u.remainingBudget,
          totalInvested: Object.values(u.investments).reduce((sum, amt) => sum + amt, 0)
        }));
      io.to(gameState.instructorId).emit('activeStudentsUpdate', activeStudents);
    }

    console.log(`User ${userName} joined as ${role}`);
  });

  // Handle phase change (instructor only)
  socket.on('changePhase', (newPhase) => {
    if (gameState.users[socket.id]?.role !== 'instructor') {
      socket.emit('error', { message: 'Only instructor can change phases' });
      return;
    }

    gameState.phase = newPhase;
    
    // Save to instructor session
    if (instructorSession.sessionId) {
      instructorSession.phase = newPhase;
      instructorSession.lastActive = Date.now();
    }
    
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
    
    // Rate limiting check
    if (!checkRateLimit(socket.id, 'investments')) {
      socket.emit('error', { message: 'Please wait a moment before making another investment' });
      return;
    }

    const { companyId, amount } = data;
    const company = gameState.companies.find(c => c.id === companyId);

    if (!company) {
      socket.emit('error', { message: 'Company not found' });
      return;
    }

    // Calculate previous investment in this company
    const previousInvestment = user.investments[companyId] || 0;
    
    // Calculate available budget including the previous investment (which will be returned)
    const availableBudget = user.remainingBudget + previousInvestment;

    if (amount < 0) {
      socket.emit('error', { message: 'Investment amount cannot be negative' });
      return;
    }

    // Allow amount to be 0 to remove investment
    if (amount === 0) {
      // Remove the investment entirely
      delete user.investments[companyId];
      user.remainingBudget += previousInvestment;
      company.totalInvestment -= previousInvestment;
    } else {
      // Normal investment update
      if (amount > availableBudget) {
        socket.emit('error', { message: `Insufficient budget. You have $${availableBudget.toLocaleString()} available (including your previous investment of $${previousInvestment.toLocaleString()})` });
        return;
      }
      
      // Update user's investment
      user.investments[companyId] = amount;
      const difference = amount - previousInvestment;
      user.remainingBudget -= difference;
      
      // Update company's total investment
      company.totalInvestment += difference;
    }

    // Send confirmation to user with updated personal portfolio
    const personalPortfolio = Object.entries(user.investments)
      .map(([cId, amt]) => {
        const comp = gameState.companies.find(c => c.id === cId);
        return comp ? {
          id: cId,
          name: comp.name,
          amount: amt,
          comment: comp.comments.find(c => c.userId === user.userId)?.comment || ''
        } : null;
      })
      .filter(Boolean);

    socket.emit('investmentSuccess', {
      companyId,
      amount,
      remainingBudget: user.remainingBudget,
      personalPortfolio
    });

    // Schedule debounced leaderboard update instead of immediate broadcast
    scheduleLeaderboardUpdate();

    // Update active students list for instructor
    if (gameState.instructorId) {
      const activeStudents = Object.values(gameState.users)
        .filter(u => u.role === 'student')
        .map(u => ({
          userName: u.userName,
          remainingBudget: u.remainingBudget,
          totalInvested: Object.values(u.investments).reduce((sum, amt) => sum + amt, 0)
        }));
      io.to(gameState.instructorId).emit('activeStudentsUpdate', activeStudents);
    }

    console.log(`${user.userName} invested $${amount} in ${company.name}`);
  });

  // Handle adding/updating comment
  socket.on('addComment', (data) => {
    const user = gameState.users[socket.id];
    
    if (!user || user.role !== 'student') {
      socket.emit('error', { message: 'Only students can add comments' });
      return;
    }
    
    // Rate limiting check
    if (!checkRateLimit(socket.id, 'comments')) {
      socket.emit('error', { message: 'Please wait a moment before adding another comment' });
      return;
    }

    const { companyId, comment } = data;
    const company = gameState.companies.find(c => c.id === companyId);

    if (!company) {
      socket.emit('error', { message: 'Company not found' });
      return;
    }

    // Remove existing comment from this user if any
    company.comments = company.comments.filter(c => c.userId !== user.userId);

    // Add new comment if not empty
    if (comment && comment.trim()) {
      const investmentAmount = user.investments[companyId] || 0;
      company.comments.push({
        userId: user.userId,
        userName: user.userName,
        comment: comment.trim(),
        investmentAmount,
        timestamp: new Date().toISOString()
      });
    }

    // Send confirmation to student
    socket.emit('commentSuccess', { companyId, comment });

    // Schedule debounced leaderboard update
    scheduleLeaderboardUpdate();

    console.log(`${user.userName} commented on ${company.name}`);
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

    // Clear all companies (removes uploaded Excel data)
    gameState.companies = [];

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
    activeConnections--;
    
    // Get client IP for cleanup
    const clientIP = socket.handshake.headers['x-forwarded-for']?.split(',')[0].trim() ||
                     socket.handshake.headers['x-real-ip'] ||
                     socket.handshake.address;
    
    // Clean up IP tracking
    if (connectionsPerIP.has(clientIP)) {
      connectionsPerIP.get(clientIP).delete(socket.id);
      if (connectionsPerIP.get(clientIP).size === 0) {
        connectionsPerIP.delete(clientIP);
      }
    }
    
    const ipConnectionCount = connectionsPerIP.get(clientIP)?.size || 0;
    console.log(`User disconnected: ${socket.id} from IP ${clientIP} (${ipConnectionCount} remaining from this IP, ${activeConnections}/${MAX_CONNECTIONS} total)`);
    
    const user = gameState.users[socket.id];
    const wasStudent = user?.role === 'student';
    const wasInstructor = gameState.instructorId === socket.id;
    
    if (wasInstructor) {
      // Don't clear instructorId immediately - allow for reconnection
      console.log('Instructor disconnected - session preserved for reconnection');
      // Set a timeout to clear the instructor after 5 minutes of inactivity
      setTimeout(() => {
        if (gameState.instructorId === socket.id) {
          gameState.instructorId = null;
          console.log('Instructor session expired');
        }
      }, 300000); // 5 minutes
    }
    
    // Clean up rate limit data
    rateLimits.delete(socket.id);
    
    delete gameState.users[socket.id];

    // Update active students list for instructor if a student disconnected
    if (wasStudent && gameState.instructorId) {
      const activeStudents = Object.values(gameState.users)
        .filter(u => u.role === 'student')
        .map(u => ({
          userName: u.userName,
          remainingBudget: u.remainingBudget,
          totalInvested: Object.values(u.investments).reduce((sum, amt) => sum + amt, 0)
        }));
      io.to(gameState.instructorId).emit('activeStudentsUpdate', activeStudents);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Made with Bob

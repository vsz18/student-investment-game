const socket = io();

let currentRole = null;
let currentUser = null;
let companies = [];
let currentPhase = 'setup';
let instructorSessionId = null; // Store instructor session ID for recovery

// Automatic reconnection with exponential backoff
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000; // 1 second

// Heartbeat monitoring
let lastPongTime = Date.now();
let heartbeatInterval = null;
let heartbeatWarningShown = false;

// Check for previous session on page load
window.addEventListener('DOMContentLoaded', () => {
    // Detect incognito/private browsing mode
    detectIncognitoMode();
    
    // Check for instructor session
    const storedInstructorSessionId = localStorage.getItem('instructorSessionId');
    if (storedInstructorSessionId) {
        // Show option to continue as instructor
        showContinueAsOption('instructor', 'Instructor');
        return;
    }
    
    // Check for student session
    const lastStudentName = localStorage.getItem('lastStudentName');
    const lastStudentId = localStorage.getItem('lastStudentId');
    if (lastStudentName && lastStudentId) {
        // Show option to continue as student
        showContinueAsOption('student', lastStudentName);
        return;
    }
});

// Detect incognito/private browsing mode
function detectIncognitoMode() {
    // Test if localStorage persists
    const testKey = '__incognito_test__';
    try {
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        
        // Additional check: try to detect private mode in different browsers
        if (window.indexedDB) {
            // Try to open a database - fails in some incognito modes
            const db = indexedDB.open('test');
            db.onerror = () => {
                showIncognitoWarning();
            };
        }
        
        // Safari private mode detection
        try {
            window.openDatabase(null, null, null, null);
        } catch (e) {
            showIncognitoWarning();
        }
    } catch (e) {
        // localStorage not available - likely incognito
        showIncognitoWarning();
    }
}

// Show incognito mode warning banner
function showIncognitoWarning() {
    const warningBanner = document.createElement('div');
    warningBanner.id = 'incognitoWarning';
    warningBanner.className = 'incognito-warning';
    warningBanner.innerHTML = `
        <div class="warning-content">
            <span class="warning-icon">⚠️</span>
            <div class="warning-text">
                <strong>Incognito/Private Mode Detected</strong>
                <p>Your session will not be saved. Please use a regular browser window to preserve your investments across page refreshes.</p>
            </div>
            <button onclick="dismissIncognitoWarning()" class="warning-dismiss">×</button>
        </div>
    `;
    document.body.insertBefore(warningBanner, document.body.firstChild);
}

// Dismiss incognito warning
function dismissIncognitoWarning() {
    const warning = document.getElementById('incognitoWarning');
    if (warning) {
        warning.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => warning.remove(), 300);
    }
}

// Show "Continue as..." option on role selection screen
function showContinueAsOption(role, userName) {
    const roleSelection = document.getElementById('roleSelection');
    const existingContinue = document.getElementById('continueAsOption');
    
    // Remove existing continue option if any
    if (existingContinue) {
        existingContinue.remove();
    }
    
    // Create continue option
    const continueDiv = document.createElement('div');
    continueDiv.id = 'continueAsOption';
    continueDiv.className = 'continue-as-option';
    continueDiv.innerHTML = `
        <div class="continue-as-card">
            <h3>Welcome back!</h3>
            <button onclick="continueAsPrevious()" class="btn-continue">
                Continue as ${userName}
            </button>
            <button onclick="startNewSession()" class="btn-new-session">
                Start New Session
            </button>
        </div>
    `;
    
    // Insert at the top of role selection
    const title = roleSelection.querySelector('h1');
    title.after(continueDiv);
}

// Continue as previous user
function continueAsPrevious() {
    const storedInstructorSessionId = localStorage.getItem('instructorSessionId');
    if (storedInstructorSessionId) {
        currentRole = 'instructor';
        socket.emit('selectRole', {
            role: 'instructor',
            userName: 'Instructor',
            sessionId: storedInstructorSessionId
        });
        showScreen('nameInput'); // Show loading state
        return;
    }
    
    const lastStudentName = localStorage.getItem('lastStudentName');
    const lastStudentId = localStorage.getItem('lastStudentId');
    if (lastStudentName && lastStudentId) {
        currentRole = 'student';
        socket.emit('selectRole', {
            role: 'student',
            userName: lastStudentName,
            studentId: lastStudentId
        });
        showScreen('nameInput'); // Show loading state
        return;
    }
}

// Start a new session (clear previous session)
function startNewSession() {
    localStorage.removeItem('instructorSessionId');
    localStorage.removeItem('lastStudentName');
    localStorage.removeItem('lastStudentId');
    localStorage.removeItem('studentSession');
    
    // Remove continue option and show normal role selection
    const continueOption = document.getElementById('continueAsOption');
    if (continueOption) {
        continueOption.remove();
    }
}

// Role Selection
function selectRole(role) {
    currentRole = role;
    
    // Update the name input screen based on role
    const nameInputScreen = document.getElementById('nameInput');
    const subtitle = nameInputScreen.querySelector('.subtitle');
    const input = document.getElementById('userName');
    
    if (role === 'instructor') {
        subtitle.textContent = 'Please enter the instructor password';
        input.type = 'password';
        input.placeholder = 'Enter password';
    } else {
        subtitle.textContent = 'Please enter your name';
        input.type = 'text';
        input.placeholder = 'Enter your name';
    }
    
    showScreen('nameInput');
}

function submitName() {
    if (currentRole === 'instructor') {
        // Instructor needs password
        const password = document.getElementById('userName').value.trim();
        
        if (!password) {
            showNotification('Please enter the password', 'error');
            return;
        }
        
        if (password !== 'zongzi') {
            showNotification('Incorrect password', 'error');
            return;
        }
        
        // Check for existing session ID in localStorage
        const storedSessionId = localStorage.getItem('instructorSessionId');
        
        // Password correct, use "Instructor" as the name
        socket.emit('selectRole', {
            role: currentRole,
            userName: 'Instructor',
            sessionId: storedSessionId
        });
    } else {
        // Student enters their name
        const userName = document.getElementById('userName').value.trim();
        
        if (!userName) {
            showNotification('Please enter your name', 'error');
            return;
        }

        // Normalize name to title case (first letter uppercase, rest lowercase)
        const normalizedName = userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();
        
        // Generate unique student ID based on normalized name + timestamp
        // This ensures each login session gets a unique ID, preventing profile mixing
        const studentId = 'student_' + normalizedName.toLowerCase() + '_' + Date.now();
        
        // Store for auto-login on refresh
        localStorage.setItem('lastStudentName', normalizedName);
        localStorage.setItem('lastStudentId', studentId);

        socket.emit('selectRole', {
            role: currentRole,
            userName: normalizedName,
            studentId: studentId
        });
    }
}

// Screen Management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Notifications
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Instructor Functions
function changePhase(phase) {
    socket.emit('changePhase', phase);
}

function resetGame() {
    if (confirm('Are you sure you want to reset the game? This will clear all investments.')) {
        socket.emit('resetGame');
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.innerHTML = '<p>Uploading...</p>';

    fetch('/api/upload-companies', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            statusDiv.innerHTML = `<p class="success">✓ ${data.message}</p>`;
            showNotification(data.message, 'success');
            displayCompanies(data.companies);
        } else {
            statusDiv.innerHTML = `<p class="error">✗ ${data.error}</p>`;
            showNotification(data.error, 'error');
        }
    })
    .catch(error => {
        statusDiv.innerHTML = `<p class="error">✗ Upload failed: ${error.message}</p>`;
        showNotification('Upload failed', 'error');
    });
}

function displayCompanies(companiesList) {
    const container = document.getElementById('companiesList');
    
    if (companiesList.length === 0) {
        container.innerHTML = '<p class="empty-state">No companies uploaded yet</p>';
        return;
    }

    container.innerHTML = companiesList.map(company => `
        <div class="company-item">
            <h3>${company.name}</h3>
            <p>${company.description}</p>
        </div>
    `).join('');
}

// Student Functions
function invest(companyId) {
    const input = document.getElementById(`amount-${companyId}`);
    const amount = parseInt(input.value) || 0;

    if (amount < 0) {
        showNotification('Investment amount cannot be negative', 'error');
        return;
    }

    if (amount > currentUser.remainingBudget + (currentUser.investments[companyId] || 0)) {
        showNotification('Insufficient budget', 'error');
        return;
    }

    socket.emit('invest', { companyId, amount });
}

function removeInvestment(companyId) {
    if (confirm('Are you sure you want to remove this investment?')) {
        socket.emit('invest', { companyId, amount: 0 });
    }
}

function addComment(companyId) {
    const textarea = document.getElementById(`comment-${companyId}`);
    const comment = textarea.value.trim();

    socket.emit('addComment', { companyId, comment });
}

function displayCompaniesForVoting(companiesList) {
    const container = document.getElementById('companiesGrid');
    
    if (companiesList.length === 0) {
        container.innerHTML = '<p class="empty-state">No companies available yet</p>';
        return;
    }

    container.innerHTML = companiesList.map(company => {
        const currentInvestment = currentUser.investments[company.id] || 0;
        const existingComment = company.comments?.find(c => c.userId === currentUser.userId)?.comment || '';
        
        return `
            <div class="company-card">
                <h3>${company.name}</h3>
                <p>${company.description}</p>
                <div class="investment-controls">
                    <div class="investment-input-group">
                        <span class="currency-symbol">$</span>
                        <input
                            type="number"
                            id="amount-${company.id}"
                            placeholder="0"
                            value="${currentInvestment || ''}"
                            min="0"
                            step="1000"
                            class="investment-input"
                        >
                    </div>
                    <button onclick="invest('${company.id}')" class="btn-invest">
                        ${currentInvestment > 0 ? '✓ Update Investment' : '💰 Invest'}
                    </button>
                </div>
                <div class="comment-section">
                    <textarea
                        id="comment-${company.id}"
                        placeholder="Share your thoughts about this company (optional)..."
                        rows="2"
                        class="comment-textarea"
                    >${existingComment}</textarea>
                    <button onclick="addComment('${company.id}')" class="btn-comment">
                        ${existingComment ? '✓ Update Comment' : '💬 Add Comment'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updatePersonalPortfolio(portfolio) {
    const container = document.getElementById('personalPortfolio');
    
    if (!portfolio || portfolio.length === 0) {
        container.innerHTML = '<p class="empty-state">No investments yet</p>';
        return;
    }

    const totalInvested = portfolio.reduce((sum, item) => sum + item.amount, 0);

    container.innerHTML = `
        <div class="portfolio-summary">
            <div class="portfolio-stat">
                <span class="stat-label">Total Invested</span>
                <span class="stat-value">$${totalInvested.toLocaleString()}</span>
            </div>
            <div class="portfolio-stat">
                <span class="stat-label">Remaining Budget</span>
                <span class="stat-value">$${currentUser.remainingBudget.toLocaleString()}</span>
            </div>
        </div>
        <div class="portfolio-items">
            ${portfolio.map(item => `
                <div class="portfolio-item">
                    <div class="portfolio-company">
                        <h4>${item.name}</h4>
                        ${item.comment ? `<p class="portfolio-comment">"${item.comment}"</p>` : ''}
                    </div>
                    <div class="portfolio-actions">
                        <div class="portfolio-amount">$${item.amount.toLocaleString()}</div>
                        <button onclick="removeInvestment('${item.id}')" class="btn-remove" title="Remove investment">
                            🗑️
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function updateBudgetDisplay(budget) {
    const budgetElement = document.getElementById('studentBudget');
    if (budgetElement) {
        budgetElement.textContent = `$${budget.toLocaleString()}`;
    }
}

function updateLeaderboard(leaderboard) {
    const instructorBoard = document.getElementById('instructorLeaderboard');
    
    if (!instructorBoard) return;
    
    const html = leaderboard.length === 0
        ? '<p class="empty-state">No investments yet</p>'
        : leaderboard.map((company, index) => {
            const rankClass = index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : '';
            const commentsHtml = company.comments && company.comments.length > 0
                ? `<div class="company-comments">
                    <button class="comments-toggle" onclick="toggleComments('${company.id}')">
                        <span class="toggle-icon" id="toggle-${company.id}">▶</span>
                        Comments (${company.comments.length})
                    </button>
                    <div class="comments-list" id="comments-${company.id}" style="display: none;">
                        ${company.comments.map(c => `
                            <div class="comment-item">
                                <p class="comment-text">"${c.comment}"</p>
                            </div>
                        `).join('')}
                    </div>
                   </div>`
                : '';
            
            return `
                <div class="leaderboard-item">
                    <div class="rank ${rankClass}">#${index + 1}</div>
                    <div class="company-info">
                        <h3>${company.name}</h3>
                        <p>${company.description}</p>
                        ${commentsHtml}
                    </div>
                    <div class="investment-amount">$${company.totalInvestment.toLocaleString()}</div>
                </div>
            `;
        }).join('');

    instructorBoard.innerHTML = html;
}

function toggleComments(companyId) {
    const commentsList = document.getElementById(`comments-${companyId}`);
    const toggleIcon = document.getElementById(`toggle-${companyId}`);
    
    if (commentsList.style.display === 'none') {
        commentsList.style.display = 'block';
        toggleIcon.textContent = '▼';
    } else {
        commentsList.style.display = 'none';
        toggleIcon.textContent = '▶';
    }
}

function exportExcel() {
    fetch('/api/export-excel')
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `investment-report-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showNotification('Excel report downloaded!', 'success');
        })
        .catch(error => {
            console.error('Export error:', error);
            showNotification('Failed to export report', 'error');
        });
}

function updateActiveStudents(students) {
    const container = document.getElementById('activeStudentsList');
    
    if (!container) return;
    
    // Update connection status count
    const studentsCount = document.getElementById('studentsCount');
    if (studentsCount) {
        studentsCount.textContent = students.length;
    }
    
    if (students.length === 0) {
        container.innerHTML = '<p class="empty-state">No students connected yet</p>';
        return;
    }

    const totalInvested = students.reduce((sum, s) => sum + (s.totalInvested || 0), 0);

    container.innerHTML = `
        <div class="students-count">
            <div>Total Students: ${students.length}</div>
            <div style="font-size: 0.9em; color: #666;">Total Invested: $${totalInvested.toLocaleString()}</div>
        </div>
        <div class="students-grid">
            ${students.map(student => `
                <div class="student-item">
                    <div class="student-name">👨‍🎓 ${student.userName}</div>
                    <div class="student-budget">
                        <span class="budget-label">Invested:</span>
                        <span class="budget-value" style="color: #4CAF50;">$${(student.totalInvested || 0).toLocaleString()}</span>
                    </div>
                    <div class="student-budget">
                        <span class="budget-label">Remaining:</span>
                        <span class="budget-value">$${student.remainingBudget.toLocaleString()}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function updatePhaseDisplay(phase) {
    currentPhase = phase;
    
    const phaseElement = document.getElementById('currentPhase');
    if (phaseElement) {
        phaseElement.textContent = phase.charAt(0).toUpperCase() + phase.slice(1);
    }

    // Update instructor view based on phase
    if (currentRole === 'instructor') {
        const activeStudentsCard = document.getElementById('activeStudentsCard');
        const exportSection = document.getElementById('exportSection');
        
        if (phase === 'results') {
            // Hide active students in results view
            if (activeStudentsCard) activeStudentsCard.style.display = 'none';
            // Show Excel export section
            if (exportSection) exportSection.style.display = 'block';
        } else {
            // Show active students in other phases
            if (activeStudentsCard) activeStudentsCard.style.display = 'block';
            // Hide Excel export section
            if (exportSection) exportSection.style.display = 'none';
        }
    }

    // Update student view based on phase
    if (currentRole === 'student') {
        const waitingMessage = document.getElementById('waitingMessage');
        const votingInterface = document.getElementById('votingInterface');

        if (phase === 'voting') {
            waitingMessage.style.display = 'none';
            votingInterface.style.display = 'block';
            displayCompaniesForVoting(companies);
        } else {
            waitingMessage.style.display = 'block';
            votingInterface.style.display = 'none';
        }
    }
}

// Student session persistence
function saveStudentSession() {
    if (currentRole !== 'student') return;
    
    const sessionData = {
        userName: currentUser.userName,
        investments: currentUser.investments,
        remainingBudget: currentUser.remainingBudget,
        timestamp: Date.now()
    };
    
    localStorage.setItem('studentSession', JSON.stringify(sessionData));
}

function loadStudentSession() {
    const saved = localStorage.getItem('studentSession');
    if (!saved) return null;
    
    try {
        const sessionData = JSON.parse(saved);
        
        // Check if session is less than 4 hours old
        const age = Date.now() - sessionData.timestamp;
        if (age > 14400000) { // 4 hours
            localStorage.removeItem('studentSession');
            return null;
        }
        
        return sessionData;
    } catch (e) {
        console.error('Error loading student session:', e);
        localStorage.removeItem('studentSession');
        return null;
    }
}

// Socket Event Handlers
socket.on('roleAccepted', (data) => {
    currentUser = data.user;
    companies = data.companies;
    currentPhase = data.phase;

    if (data.role === 'instructor') {
        // Store session ID for recovery
        if (data.sessionId) {
            instructorSessionId = data.sessionId;
            localStorage.setItem('instructorSessionId', data.sessionId);
        }
        
        showScreen('instructorScreen');
        document.getElementById('instructorName').textContent = `👨‍🏫 ${currentUser.userName}`;
        updatePhaseDisplay(data.phase);
        displayCompanies(companies);
        
        // Show recovery message if this was a session recovery
        const storedSessionId = localStorage.getItem('instructorSessionId');
        if (storedSessionId === data.sessionId && companies.length > 0) {
            showNotification('Session recovered! Your previous data has been restored.', 'success');
        } else {
            showNotification(`Welcome, ${currentUser.userName}!`, 'success');
        }
    } else {
        // Try to restore previous student session
        const savedSession = loadStudentSession();
        if (savedSession && savedSession.userName === currentUser.userName) {
            // Restore investments from localStorage
            currentUser.investments = savedSession.investments;
            currentUser.remainingBudget = savedSession.remainingBudget;
            
            // Re-sync with server
            Object.entries(savedSession.investments).forEach(([companyId, amount]) => {
                socket.emit('invest', { companyId, amount });
            });
            
            showNotification('Previous session restored!', 'success');
        }
        
        showScreen('studentScreen');
        document.getElementById('studentName').textContent = `👨‍🎓 ${currentUser.userName}`;
        updateBudgetDisplay(currentUser.remainingBudget);
        updatePhaseDisplay(data.phase);
        
        if (!savedSession) {
            showNotification(`Welcome, ${currentUser.userName}!`, 'success');
        }
    }
});

socket.on('roleError', (data) => {
    // If this was an auto-login attempt for instructor, silently clear session and show role selection
    if (currentRole === 'instructor' && localStorage.getItem('instructorSessionId')) {
        localStorage.removeItem('instructorSessionId');
        currentRole = null;
        showScreen('roleSelection');
        return;
    }
    
    // For manual login attempts, show the error
    showNotification(data.message, 'error');
    showScreen('roleSelection');
});

socket.on('companiesUpdated', (updatedCompanies) => {
    companies = updatedCompanies;
    
    if (currentRole === 'instructor') {
        displayCompanies(companies);
    } else if (currentRole === 'student' && currentPhase === 'voting') {
        displayCompaniesForVoting(companies);
    }
});

socket.on('phaseChanged', (data) => {
    updatePhaseDisplay(data.phase);
    
    let message = '';
    switch(data.phase) {
        case 'setup':
            message = 'Game reset to setup phase';
            break;
        case 'voting':
            message = 'Voting has started!';
            break;
        case 'results':
            message = 'Voting ended - viewing results';
            break;
    }
    
    showNotification(message, 'success');
});

socket.on('investmentSuccess', (data) => {
    currentUser.remainingBudget = data.remainingBudget;
    currentUser.investments[data.companyId] = data.amount;
    updateBudgetDisplay(currentUser.remainingBudget);
    updatePersonalPortfolio(data.personalPortfolio);
    showNotification(`Investment updated to $${data.amount.toLocaleString()}!`, 'success');
    
    // Save student session to localStorage
    saveStudentSession();
});

socket.on('commentSuccess', (data) => {
    showNotification('Comment saved!', 'success');
});

socket.on('activeStudentsUpdate', (students) => {
    updateActiveStudents(students);
});

socket.on('leaderboardUpdate', (leaderboard) => {
    updateLeaderboard(leaderboard);
});

socket.on('gameReset', (data) => {
    currentPhase = data.phase;
    companies = data.companies;
    
    if (currentRole === 'student') {
        currentUser.remainingBudget = data.initialBudget;
        currentUser.investments = {};
        updateBudgetDisplay(currentUser.remainingBudget);
        updatePhaseDisplay(data.phase);
    } else if (currentRole === 'instructor') {
        updatePhaseDisplay(data.phase);
        displayCompanies(companies);
    }
    
    updateLeaderboard([]);
    updatePersonalPortfolio([]);
    showNotification('Game has been reset', 'success');
});

socket.on('error', (data) => {
    showNotification(data.message, 'error');
});

socket.on('forceDisconnect', (data) => {
    // Show message to student
    alert(data.message);
    // Clear local session data
    if (currentRole === 'student') {
        localStorage.removeItem('studentSession');
    }
    // Redirect to role selection
    showScreen('roleSelection');
    currentRole = null;
    currentUser = null;
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    showNotification('Connection lost. Attempting to reconnect...', 'error');
    updateConnectionStatus(false);
    
    // Stop heartbeat monitoring
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
    
    // Only auto-reconnect for certain disconnect reasons
    if (reason === 'io server disconnect') {
        // Server initiated disconnect - don't auto-reconnect
        showNotification('Disconnected by server. Please refresh the page.', 'error');
        return;
    }
    
    // Start reconnection attempts
    attemptReconnect();
});

socket.on('connect', () => {
    console.log('Connected to server');
    reconnectAttempts = 0; // Reset counter on successful connection
    updateConnectionStatus(true);
    
    // Re-authenticate if we had a role
    if (currentRole && currentUser) {
        console.log('Re-authenticating after reconnection');
        socket.emit('selectRole', {
            role: currentRole,
            userName: currentUser.userName,
            sessionId: currentRole === 'instructor' ? instructorSessionId : undefined
        });
    }
    
    // Start heartbeat monitoring
    lastPongTime = Date.now();
    startHeartbeatMonitoring();
});

// Automatic reconnection function
function attemptReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        showNotification('Unable to reconnect. Please refresh the page.', 'error');
        return;
    }
    
    reconnectAttempts++;
    const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts), 30000); // Max 30 seconds
    
    console.log(`Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
    showNotification(`Reconnecting... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`, 'warning');
    
    setTimeout(() => {
        if (!socket.connected) {
            socket.connect();
        }
    }, delay);
}

// Heartbeat monitoring
function startHeartbeatMonitoring() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    heartbeatInterval = setInterval(() => {
        const timeSinceLastPong = Date.now() - lastPongTime;
        const WARNING_THRESHOLD = 60000; // 1 minute
        const CRITICAL_THRESHOLD = 120000; // 2 minutes
        
        if (timeSinceLastPong > CRITICAL_THRESHOLD) {
            if (!heartbeatWarningShown) {
                showNotification('Connection unstable. Please check your internet.', 'error');
                heartbeatWarningShown = true;
            }
        } else if (timeSinceLastPong > WARNING_THRESHOLD) {
            if (!heartbeatWarningShown) {
                showNotification('Connection may be slow. Monitoring...', 'warning');
                heartbeatWarningShown = true;
            }
        } else {
            heartbeatWarningShown = false;
        }
    }, 30000); // Check every 30 seconds
}

// Track pong responses
socket.on('pong', () => {
    lastPongTime = Date.now();
});

// Connection status monitoring (instructor only)
function updateConnectionStatus(isConnected) {
    if (currentRole !== 'instructor') return;
    
    const instructorStatus = document.getElementById('instructorStatus');
    const lastPingTime = document.getElementById('lastPingTime');
    
    if (!instructorStatus) return;
    
    if (isConnected) {
        instructorStatus.innerHTML = '<span class="status-dot connected"></span> Connected';
        const now = new Date();
        lastPingTime.textContent = now.toLocaleTimeString();
    } else {
        instructorStatus.innerHTML = '<span class="status-dot disconnected"></span> Disconnected';
    }
}

// Update connection status periodically
setInterval(() => {
    if (currentRole === 'instructor' && socket.connected) {
        const lastPingTime = document.getElementById('lastPingTime');
        if (lastPingTime) {
            const now = new Date();
            lastPingTime.textContent = now.toLocaleTimeString();
        }
    }
}, 5000); // Update every 5 seconds

// Made with Bob

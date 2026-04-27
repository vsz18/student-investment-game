const socket = io();

let currentRole = null;
let currentUser = null;
let companies = [];
let currentPhase = 'setup';
let instructorSessionId = null; // Store instructor session ID for recovery

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

        socket.emit('selectRole', { role: currentRole, userName: userName });
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
        showScreen('studentScreen');
        document.getElementById('studentName').textContent = `👨‍🎓 ${currentUser.userName}`;
        updateBudgetDisplay(currentUser.remainingBudget);
        updatePhaseDisplay(data.phase);
        showNotification(`Welcome, ${currentUser.userName}!`, 'success');
    }
});

socket.on('roleError', (data) => {
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

socket.on('disconnect', () => {
    showNotification('Disconnected from server', 'error');
    updateConnectionStatus(false);
});

socket.on('connect', () => {
    console.log('Connected to server');
    updateConnectionStatus(true);
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

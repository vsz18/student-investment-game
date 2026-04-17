const socket = io();

let currentRole = null;
let currentUser = null;
let companies = [];
let currentPhase = 'setup';

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
        
        // Password correct, use "Instructor" as the name
        socket.emit('selectRole', { role: currentRole, userName: 'Instructor' });
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
    const amount = parseInt(input.value);

    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
    }

    if (amount > currentUser.remainingBudget) {
        showNotification('Insufficient budget', 'error');
        return;
    }

    socket.emit('invest', { companyId, amount });
    input.value = '';
}

function displayCompaniesForVoting(companiesList) {
    const container = document.getElementById('companiesGrid');
    
    if (companiesList.length === 0) {
        container.innerHTML = '<p class="empty-state">No companies available yet</p>';
        return;
    }

    container.innerHTML = companiesList.map(company => `
        <div class="company-card">
            <h3>${company.name}</h3>
            <p>${company.description}</p>
            <div class="investment-controls">
                <input 
                    type="number" 
                    id="amount-${company.id}" 
                    placeholder="Amount"
                    min="0"
                    step="1000"
                >
                <button onclick="invest('${company.id}')">Invest</button>
            </div>
        </div>
    `).join('');
}

function updateBudgetDisplay(budget) {
    const budgetElement = document.getElementById('studentBudget');
    if (budgetElement) {
        budgetElement.textContent = `$${budget.toLocaleString()}`;
    }
}

function updateLeaderboard(leaderboard) {
    const instructorBoard = document.getElementById('instructorLeaderboard');
    const studentBoard = document.getElementById('studentLeaderboard');
    
    const html = leaderboard.length === 0 
        ? '<p class="empty-state">No investments yet</p>'
        : leaderboard.map((company, index) => {
            const rankClass = index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : '';
            return `
                <div class="leaderboard-item">
                    <div class="rank ${rankClass}">#${index + 1}</div>
                    <div class="company-info">
                        <h3>${company.name}</h3>
                        <p>${company.description}</p>
                    </div>
                    <div class="investment-amount">$${company.totalInvestment.toLocaleString()}</div>
                </div>
            `;
        }).join('');

    if (instructorBoard) instructorBoard.innerHTML = html;
    if (studentBoard) studentBoard.innerHTML = html;
}

function updatePhaseDisplay(phase) {
    currentPhase = phase;
    
    const phaseElement = document.getElementById('currentPhase');
    if (phaseElement) {
        phaseElement.textContent = phase.charAt(0).toUpperCase() + phase.slice(1);
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
        showScreen('instructorScreen');
        document.getElementById('instructorName').textContent = `👨‍🏫 ${currentUser.userName}`;
        updatePhaseDisplay(data.phase);
        displayCompanies(companies);
    } else {
        showScreen('studentScreen');
        document.getElementById('studentName').textContent = `👨‍🎓 ${currentUser.userName}`;
        updateBudgetDisplay(currentUser.remainingBudget);
        updatePhaseDisplay(data.phase);
    }

    showNotification(`Welcome, ${currentUser.userName}!`, 'success');
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
    updateBudgetDisplay(currentUser.remainingBudget);
    showNotification(`Investment of $${data.amount.toLocaleString()} successful!`, 'success');
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
    showNotification('Game has been reset', 'success');
});

socket.on('error', (data) => {
    showNotification(data.message, 'error');
});

socket.on('disconnect', () => {
    showNotification('Disconnected from server', 'error');
});

socket.on('connect', () => {
    console.log('Connected to server');
});

// Made with Bob

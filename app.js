/**
 * Club Hub - Main Application JavaScript
 * Modern Club Management System with Database Integration
 */

// Configuration
const API_BASE = 'api/';
const CLUB_ID = 1; // Current club ID - would be dynamic in production

// Application State
const appState = {
    currentView: 'dashboard',
    currentUser: null,
    currentClub: null,
    theme: localStorage.getItem('theme') || 'light'
};

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Set theme
    document.documentElement.setAttribute('data-theme', appState.theme);
    updateThemeIcon();
    
    // Setup navigation
    setupNavigation();
    
    // Load initial data
    await loadDashboard();
}

// ============================================================================
// Navigation
// ============================================================================

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const view = this.getAttribute('data-view');
            navigateTo(view);
        });
    });
}

function navigateTo(view) {
    // Hide all views
    document.querySelectorAll('.view-content').forEach(v => {
        v.classList.add('hidden');
    });

    // Show selected view
    const viewElement = document.getElementById(view + '-view');
    if (viewElement) {
        viewElement.classList.remove('hidden');
    }

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.nav-item[data-view="${view}"]`)?.classList.add('active');

    // Load view data
    loadViewData(view);
    
    appState.currentView = view;
}

async function loadViewData(view) {
    switch(view) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'announcements':
            await loadAnnouncements();
            break;
        case 'events':
            await loadEvents();
            break;
        case 'members':
            await loadMembers();
            break;
        case 'signin':
            await loadSignIn();
            break;
        case 'attendance':
            await loadAttendance();
            break;
        case 'chat':
            await loadChat();
            break;
        case 'club-settings':
            await loadClubSettings();
            break;
        case 'theme':
            await loadThemeSettings();
            break;
    }
}

// ============================================================================
// Dashboard
// ============================================================================

async function loadDashboard() {
    try {
        // Load stats
        const stats = await fetchAPI('stats.php', { club_id: CLUB_ID });
        
        if (stats.success) {
            document.getElementById('totalMembers').textContent = stats.data.total_members || 0;
            document.getElementById('upcomingEvents').textContent = stats.data.upcoming_events || 0;
            document.getElementById('attendanceRate').textContent = (stats.data.attendance_rate || 0) + '%';
            document.getElementById('messagesToday').textContent = stats.data.messages_today || 0;
        }
        
        // Load recent announcements
        const announcements = await fetchAPI('announcements.php', { 
            club_id: CLUB_ID, 
            limit: 3 
        });
        
        displayDashboardAnnouncements(announcements.data || []);
        
        // Load upcoming events
        const events = await fetchAPI('events.php', { 
            club_id: CLUB_ID, 
            limit: 3,
            upcoming: true
        });
        
        displayDashboardEvents(events.data || []);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function displayDashboardAnnouncements(announcements) {
    const container = document.getElementById('dashboardAnnouncements');
    
    if (announcements.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-bullhorn"></i><p>No announcements yet.</p></div>';
        return;
    }
    
    container.innerHTML = announcements.map(a => `
        <div class="announcement-item">
            <div class="announcement-header">
                <div class="announcement-title">${escapeHtml(a.title)}</div>
                ${a.priority !== 'normal' ? `<div class="announcement-priority ${a.priority}">${a.priority}</div>` : ''}
            </div>
            <div class="announcement-content">${escapeHtml(a.content)}</div>
            <div class="announcement-time"><i class="fas fa-clock"></i> ${formatTimeAgo(a.created_at)}</div>
        </div>
    `).join('');
}

function displayDashboardEvents(events) {
    const container = document.getElementById('dashboardEvents');
    
    if (events.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-alt"></i><p>No upcoming events.</p></div>';
        return;
    }
    
    container.innerHTML = events.map(e => `
        <div class="announcement-item">
            <div class="announcement-header">
                <div class="announcement-title">${escapeHtml(e.title)}</div>
                <div class="announcement-priority" style="background: var(--accent);">${formatDate(e.event_date)}</div>
            </div>
            <div class="announcement-content">${escapeHtml(e.description || '')}</div>
            <div class="announcement-time"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(e.location || 'TBA')}</div>
        </div>
    `).join('');
}

// ============================================================================
// Announcements
// ============================================================================

async function loadAnnouncements() {
    const view = document.getElementById('announcements-view');
    
    view.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Announcements</h1>
                <p class="page-subtitle">Stay updated with club news and important information</p>
            </div>
            <button class="btn btn-primary" onclick="showCreateAnnouncementModal()">
                <i class="fas fa-plus"></i>
                New Announcement
            </button>
        </div>
        <div id="announcementsContent"></div>
    `;
    
    try {
        const result = await fetchAPI('announcements.php', { club_id: CLUB_ID });
        displayAnnouncements(result.data || []);
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

function displayAnnouncements(announcements) {
    const container = document.getElementById('announcementsContent');
    
    if (announcements.length === 0) {
        container.innerHTML = '<div class="card"><div class="empty-state"><i class="fas fa-bullhorn"></i><p>No announcements yet. Create one to get started!</p></div></div>';
        return;
    }
    
    container.innerHTML = announcements.map(a => `
        <div class="announcement-item">
            <div class="announcement-header">
                <div class="announcement-title">${escapeHtml(a.title)}</div>
                ${a.priority !== 'normal' ? `<div class="announcement-priority ${a.priority}">${a.priority}</div>` : ''}
            </div>
            <div class="announcement-content">${escapeHtml(a.content)}</div>
            <div class="announcement-time"><i class="fas fa-clock"></i> ${formatTimeAgo(a.created_at)}</div>
        </div>
    `).join('');
}

// ============================================================================
// Events
// ============================================================================

async function loadEvents() {
    const view = document.getElementById('events-view');
    
    view.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Events</h1>
                <p class="page-subtitle">Manage and track all club events</p>
            </div>
            <button class="btn btn-primary" onclick="showCreateEventModal()">
                <i class="fas fa-plus"></i>
                Create Event
            </button>
        </div>
        <div class="stats-grid" id="eventsGrid"></div>
    `;
    
    try {
        const result = await fetchAPI('events.php', { club_id: CLUB_ID });
        displayEvents(result.data || []);
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

function displayEvents(events) {
    const container = document.getElementById('eventsGrid');
    
    if (events.length === 0) {
        container.innerHTML = '<div class="card" style="grid-column: 1 / -1;"><div class="empty-state"><i class="fas fa-calendar-alt"></i><p>No events yet. Create your first event!</p></div></div>';
        return;
    }
    
    container.innerHTML = events.map(e => `
        <div class="card">
            <div style="display: inline-block; background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; padding: 0.5rem 1rem; border-radius: var(--radius-md); font-size: 0.75rem; font-weight: 600; margin-bottom: 1rem;">
                ${formatDate(e.event_date)}
            </div>
            <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">${escapeHtml(e.title)}</h3>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1rem;">${escapeHtml(e.description || '')}</p>
            <div style="font-size: 0.8125rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-map-marker-alt"></i>
                ${escapeHtml(e.location || 'TBA')}
            </div>
        </div>
    `).join('');
}

// ============================================================================
// Members
// ============================================================================

async function loadMembers() {
    const view = document.getElementById('members-view');
    
    view.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Members</h1>
                <p class="page-subtitle">Manage your club members and their information</p>
            </div>
            <button class="btn btn-primary" onclick="showAddMemberModal()">
                <i class="fas fa-user-plus"></i>
                Add Member
            </button>
        </div>
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Club Members</h2>
            </div>
            <div id="membersTable"></div>
        </div>
    `;
    
    try {
        const result = await fetchAPI('members.php', { club_id: CLUB_ID });
        displayMembers(result.data || []);
    } catch (error) {
        console.error('Error loading members:', error);
    }
}

function displayMembers(members) {
    const container = document.getElementById('membersTable');
    
    if (members.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No members yet.</p></div>';
        return;
    }
    
    container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="border-bottom: 1px solid var(--border);">
                    <th style="padding: 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Member</th>
                    <th style="padding: 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Email</th>
                    <th style="padding: 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Role</th>
                    <th style="padding: 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Joined</th>
                    <th style="padding: 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Status</th>
                </tr>
            </thead>
            <tbody>
                ${members.map(m => `
                    <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background=''">
                        <td style="padding: 1rem;">
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.875rem;">
                                    ${getInitials(m.first_name, m.last_name)}
                                </div>
                                <span style="font-weight: 600;">${escapeHtml(m.first_name)} ${escapeHtml(m.last_name)}</span>
                            </div>
                        </td>
                        <td style="padding: 1rem;">${escapeHtml(m.email)}</td>
                        <td style="padding: 1rem;">
                            <span style="background: ${getRoleBadgeColor(m.role)}; color: white; padding: 0.25rem 0.75rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">
                                ${m.role}
                            </span>
                        </td>
                        <td style="padding: 1rem;">${formatDate(m.joined_at)}</td>
                        <td style="padding: 1rem;">
                            <span style="color: ${m.status === 'active' ? 'var(--success)' : 'var(--text-secondary)'};">●</span> ${m.status}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ============================================================================
// Sign-In
// ============================================================================

async function loadSignIn() {
    const view = document.getElementById('signin-view');
    
    view.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Club Sign-In</h1>
                <p class="page-subtitle">Record your attendance for today's meeting - <span id="currentDateTime"></span></p>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;">
            <div class="card">
                <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">Sign In for Today</h2>
                <div id="signinMessage"></div>
                
                <form id="signinForm">
                    <div id="step1">
                        <div style="margin-bottom: 1.5rem;">
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">
                                Student ID <span style="color: var(--danger);">*</span>
                            </label>
                            <input 
                                type="text" 
                                id="studentId"
                                style="width: 100%; padding: 0.875rem 1rem; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 0.875rem; color: var(--text-primary); text-align: center; font-weight: 600; letter-spacing: 2px;"
                                placeholder="Scan or type your ID"
                                autocomplete="off"
                            />
                        </div>
                        <button type="button" class="btn btn-primary" onclick="lookupStudent()">
                            Continue <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                    
                    <div id="step2" class="hidden">
                        <div style="margin-bottom: 1.5rem;">
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">
                                First Name <span style="color: var(--danger);">*</span>
                            </label>
                            <input type="text" id="firstName" style="width: 100%; padding: 0.875rem 1rem; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 0.875rem; color: var(--text-primary);" />
                        </div>
                        
                        <div style="margin-bottom: 1.5rem;">
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">
                                Last Name <span style="color: var(--danger);">*</span>
                            </label>
                            <input type="text" id="lastName" style="width: 100%; padding: 0.875rem 1rem; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 0.875rem; color: var(--text-primary);" />
                        </div>
                        
                        <div style="margin-bottom: 1.5rem;">
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">
                                Grade Level (Optional)
                            </label>
                            <select id="gradeLevel" style="width: 100%; padding: 0.875rem 1rem; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 0.875rem; color: var(--text-primary);">
                                <option value="">Select grade level</option>
                                <option value="9">9th Grade</option>
                                <option value="10">10th Grade</option>
                                <option value="11">11th Grade</option>
                                <option value="12">12th Grade</option>
                            </select>
                        </div>
                        
                        <div style="display: flex; gap: 0.75rem;">
                            <button type="submit" class="btn btn-primary" style="flex: 1;">
                                <i class="fas fa-check"></i> Sign In Now
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="resetSignin()">
                                <i class="fas fa-undo"></i> Reset
                            </button>
                        </div>
                    </div>
                </form>
            </div>
            
            <div>
                <div class="stat-card" style="margin-bottom: 1.5rem;">
                    <div class="stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="todaySignins">0</div>
                        <div class="stat-label">Signed In Today</div>
                    </div>
                </div>
                
                <div class="card">
                    <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem;">Recent Sign-Ins</h3>
                    <div id="recentSignins"></div>
                </div>
            </div>
        </div>
    `;
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    await loadTodaySignins();
    
    // Setup form handler
    document.getElementById('signinForm').addEventListener('submit', handleSignIn);
}

async function loadTodaySignins() {
    try {
        const result = await fetchAPI('signin.php', { 
            club_id: CLUB_ID,
            action: 'today'
        });
        
        if (result.success) {
            document.getElementById('todaySignins').textContent = result.data.count || 0;
            displayRecentSignins(result.data.recent || []);
        }
    } catch (error) {
        console.error('Error loading sign-ins:', error);
    }
}

function displayRecentSignins(signins) {
    const container = document.getElementById('recentSignins');
    
    if (signins.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding: 1.5rem;"><i class="fas fa-clipboard-check"></i><p>No sign-ins yet today</p></div>';
        return;
    }
    
    container.innerHTML = signins.map(s => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--bg-tertiary); border-radius: var(--radius-md); margin-bottom: 0.5rem;">
            <div style="font-weight: 600;">${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">${formatTime(s.sign_in_time)}</div>
        </div>
    `).join('');
}

async function lookupStudent() {
    const studentId = document.getElementById('studentId').value.trim();
    if (!studentId) {
        showMessage('error', 'Please enter a student ID', 'signinMessage');
        return;
    }
    
    try {
        const result = await fetchAPI('signin.php', { 
            action: 'lookup',
            club_id: CLUB_ID,
            student_id: studentId
        });
        
        if (result.data.already_signed_in) {
            showMessage('error', 'You have already signed in today!', 'signinMessage');
            return;
        }
        
        if (result.data.found) {
            document.getElementById('firstName').value = result.data.student.first_name;
            document.getElementById('lastName').value = result.data.student.last_name;
            document.getElementById('gradeLevel').value = result.data.student.grade_level || '';
            showMessage('success', `Welcome back, ${result.data.student.first_name}!`, 'signinMessage');
        } else {
            document.getElementById('firstName').value = '';
            document.getElementById('lastName').value = '';
            document.getElementById('gradeLevel').value = '';
            showMessage('info', 'New student! Please enter your information.', 'signinMessage');
        }
        
        document.getElementById('step1').classList.add('hidden');
        document.getElementById('step2').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error looking up student:', error);
        showMessage('error', 'Error looking up student. Please try again.', 'signinMessage');
    }
}

async function handleSignIn(e) {
    e.preventDefault();
    
    const data = {
        action: 'signin',
        club_id: CLUB_ID,
        student_id: document.getElementById('studentId').value,
        first_name: document.getElementById('firstName').value,
        last_name: document.getElementById('lastName').value,
        grade_level: document.getElementById('gradeLevel').value
    };
    
    try {
        const result = await fetchAPI('signin.php', data, 'POST');
        
        if (result.success) {
            showMessage('success', `${data.first_name}, you're signed in!`, 'signinMessage');
            resetSignin();
            await loadTodaySignins();
            
            setTimeout(() => {
                document.getElementById('signinMessage').innerHTML = '';
            }, 5000);
        } else {
            showMessage('error', result.message || 'Sign-in failed', 'signinMessage');
        }
    } catch (error) {
        console.error('Error signing in:', error);
        showMessage('error', 'Error signing in. Please try again.', 'signinMessage');
    }
}

function resetSignin() {
    document.getElementById('step1').classList.remove('hidden');
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('signinForm').reset();
    document.getElementById('studentId').focus();
}

// ============================================================================
// Attendance
// ============================================================================

async function loadAttendance() {
    const view = document.getElementById('attendance-view');
    
    view.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Attendance</h1>
                <p class="page-subtitle">Track and manage member attendance</p>
            </div>
        </div>
        <div class="card">
            <div id="attendanceContent"></div>
        </div>
    `;
    
    try {
        const result = await fetchAPI('attendance.php', { club_id: CLUB_ID });
        displayAttendance(result.data || {});
    } catch (error) {
        console.error('Error loading attendance:', error);
    }
}

function displayAttendance(data) {
    const container = document.getElementById('attendanceContent');
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-chart-bar"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${data.average_attendance || 0}%</div>
                    <div class="stat-label">Average Attendance</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon accent">
                    <i class="fas fa-users-line"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${data.present_today || 0}</div>
                    <div class="stat-label">Present Today</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon success">
                    <i class="fas fa-calendar-days"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${data.meetings_this_month || 0}</div>
                    <div class="stat-label">Meetings This Month</div>
                </div>
            </div>
        </div>
    `;
}

// ============================================================================
// Chat (Placeholder)
// ============================================================================

async function loadChat() {
    const view = document.getElementById('chat-view');
    view.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Chat</h1>
                <p class="page-subtitle">Connect with your club members in real-time</p>
            </div>
        </div>
        <div class="card">
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <p>Chat feature coming soon!</p>
            </div>
        </div>
    `;
}

// ============================================================================
// Settings
// ============================================================================

async function loadClubSettings() {
    const view = document.getElementById('club-settings-view');
    view.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Club Settings</h1>
                <p class="page-subtitle">Manage your club's information and preferences</p>
            </div>
        </div>
        <div class="card">
            <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1.5rem;">General Settings</h2>
            <form id="clubSettingsForm">
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Club Name</label>
                    <input type="text" value="Drama Club" style="width: 100%; padding: 0.875rem 1rem; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 0.875rem; color: var(--text-primary);" />
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Description</label>
                    <textarea style="width: 100%; padding: 0.875rem 1rem; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 0.875rem; color: var(--text-primary); min-height: 120px; resize: vertical;">A creative space for students passionate about theater and performance arts.</textarea>
                </div>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Save Changes
                </button>
            </form>
        </div>
    `;
}

async function loadThemeSettings() {
    const view = document.getElementById('theme-view');
    view.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Theme & Branding</h1>
                <p class="page-subtitle">Customize your club's look and feel</p>
            </div>
        </div>
        <div class="card">
            <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1.5rem;">Color Scheme</h2>
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Primary Color</label>
                <input type="color" value="#3b82f6" onchange="updateThemeColor('primary', this.value)" style="width: 100px; height: 40px; padding: 0; border: 1px solid var(--border); border-radius: var(--radius-md); cursor: pointer;" />
            </div>
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Secondary Color</label>
                <input type="color" value="#8b5cf6" onchange="updateThemeColor('secondary', this.value)" style="width: 100px; height: 40px; padding: 0; border: 1px solid var(--border); border-radius: var(--radius-md); cursor: pointer;" />
            </div>
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Accent Color</label>
                <input type="color" value="#f59e0b" onchange="updateThemeColor('accent', this.value)" style="width: 100px; height: 40px; padding: 0; border: 1px solid var(--border); border-radius: var(--radius-md); cursor: pointer;" />
            </div>
        </div>
    `;
}

function updateThemeColor(type, color) {
    document.documentElement.style.setProperty(`--${type}`, color);
    localStorage.setItem(`theme-${type}`, color);
}

// ============================================================================
// Utility Functions
// ============================================================================

async function fetchAPI(endpoint, data = {}, method = 'GET') {
    try {
        const url = API_BASE + endpoint;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (method === 'GET') {
            const params = new URLSearchParams(data);
            const response = await fetch(url + '?' + params, options);
            return await response.json();
        } else {
            options.body = JSON.stringify(data);
            const response = await fetch(url, options);
            return await response.json();
        }
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    return Math.floor(seconds / 86400) + ' days ago';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });
}

function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    };
    const el = document.getElementById('currentDateTime');
    if (el) {
        el.textContent = now.toLocaleDateString('en-US', options);
    }
}

function getInitials(firstName, lastName) {
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
}

function getRoleBadgeColor(role) {
    const colors = {
        'owner': 'var(--primary)',
        'admin': 'var(--secondary)',
        'member': 'var(--text-secondary)'
    };
    return colors[role] || colors.member;
}

function showMessage(type, message, containerId) {
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'info': 'fa-info-circle'
    };
    
    const colors = {
        'success': 'var(--success)',
        'error': 'var(--danger)',
        'info': 'var(--primary)'
    };
    
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div style="padding: 1rem; background: ${colors[type]}15; border: 1px solid ${colors[type]}; border-radius: var(--radius-md); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.75rem; color: ${colors[type]};">
                <i class="fas ${icons[type]}"></i>
                <span>${message}</span>
            </div>
        `;
    }
}

// ============================================================================
// Theme Toggle
// ============================================================================

function toggleTheme() {
    const currentTheme = appState.theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    appState.theme = newTheme;
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.className = appState.theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// ============================================================================
// UI Functions
// ============================================================================

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('mobile-open');
}

function openClubSwitcher() {
    alert('Club switcher coming soon!');
}

function openUserMenu() {
    alert('User menu coming soon!');
}

function showNotifications() {
    alert('Notifications coming soon!');
}

// Modal placeholders
function showCreateAnnouncementModal() {
    alert('Create announcement modal coming soon!');
}

function showCreateEventModal() {
    alert('Create event modal coming soon!');
}

function showAddMemberModal() {
    alert('Add member modal coming soon!');
}

<?php
/**
 * Authentication API
 * Handles user registration, login, logout, and session management
 */

require_once '../database/db.php';
session_start();
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_REQUEST['action'] ?? '';

// ============================================================================
// REGISTER
// ============================================================================
if ($action === 'register' && $method === 'POST') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate input
        if (empty($data['email']) || empty($data['password']) || empty($data['first_name']) || empty($data['last_name'])) {
            jsonResponse(false, null, 'All fields are required');
        }
        
        if (!isValidEmail($data['email'])) {
            jsonResponse(false, null, 'Invalid email address');
        }
        
        if (strlen($data['password']) < 8) {
            jsonResponse(false, null, 'Password must be at least 8 characters');
        }
        
        // Check if email already exists
        $existing = dbQueryOne("SELECT id FROM users WHERE email = ?", [$data['email']]);
        if ($existing) {
            jsonResponse(false, null, 'Email already registered');
        }
        
        // Create user
        $sql = "INSERT INTO users (email, password_hash, first_name, last_name, email_verified) 
                VALUES (?, ?, ?, ?, TRUE)";
        $userId = dbExecute($sql, [
            sanitizeInput($data['email']),
            hashPassword($data['password']),
            sanitizeInput($data['first_name']),
            sanitizeInput($data['last_name'])
        ]);
        
        if (!$userId) {
            jsonResponse(false, null, 'Registration failed');
        }
        
        // Create default user preferences
        $sql = "INSERT INTO user_preferences (user_id) VALUES (?)";
        dbExecute($sql, [$userId]);
        
        // Log user in
        $_SESSION['user_id'] = $userId;
        $_SESSION['email'] = $data['email'];
        $_SESSION['first_name'] = $data['first_name'];
        $_SESSION['last_name'] = $data['last_name'];
        $_SESSION['is_system_owner'] = false;
        
        // Update last login
        dbExecute("UPDATE users SET last_login = NOW() WHERE id = ?", [$userId]);
        
        jsonResponse(true, [
            'user_id' => $userId,
            'email' => $data['email'],
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'is_system_owner' => false
        ], 'Registration successful');
        
    } catch (Exception $e) {
        error_log('Registration error: ' . $e->getMessage());
        jsonResponse(false, null, 'Registration failed');
    }
}

// ============================================================================
// LOGIN
// ============================================================================
if ($action === 'login' && $method === 'POST') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['email']) || empty($data['password'])) {
            jsonResponse(false, null, 'Email and password are required');
        }
        
        // Get user
        $sql = "SELECT id, email, password_hash, first_name, last_name, is_system_owner, is_active 
                FROM users WHERE email = ?";
        $user = dbQueryOne($sql, [$data['email']]);
        
        if (!$user) {
            jsonResponse(false, null, 'Invalid email or password');
        }
        
        if (!$user['is_active']) {
            jsonResponse(false, null, 'Account is deactivated');
        }
        
        // Verify password
        if (!verifyPassword($data['password'], $user['password_hash'])) {
            jsonResponse(false, null, 'Invalid email or password');
        }
        
        // Set session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['first_name'] = $user['first_name'];
        $_SESSION['last_name'] = $user['last_name'];
        $_SESSION['is_system_owner'] = (bool)$user['is_system_owner'];
        
        // Update last login
        dbExecute("UPDATE users SET last_login = NOW() WHERE id = ?", [$user['id']]);
        
        jsonResponse(true, [
            'user_id' => $user['id'],
            'email' => $user['email'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'is_system_owner' => (bool)$user['is_system_owner']
        ], 'Login successful');
        
    } catch (Exception $e) {
        error_log('Login error: ' . $e->getMessage());
        jsonResponse(false, null, 'Login failed');
    }
}

// ============================================================================
// LOGOUT
// ============================================================================
if ($action === 'logout' && $method === 'POST') {
    session_destroy();
    jsonResponse(true, null, 'Logged out successfully');
}

// ============================================================================
// CHECK SESSION
// ============================================================================
if ($action === 'check' && $method === 'GET') {
    if (isLoggedIn()) {
        $user = getCurrentUser();
        if ($user) {
            jsonResponse(true, [
                'user_id' => $user['id'],
                'email' => $user['email'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'is_system_owner' => isset($_SESSION['is_system_owner']) ? $_SESSION['is_system_owner'] : false
            ]);
        }
    }
    jsonResponse(false, null, 'Not logged in');
}

// ============================================================================
// GET USER CLUBS
// ============================================================================
if ($action === 'my-clubs' && $method === 'GET') {
    if (!isLoggedIn()) {
        jsonResponse(false, null, 'Login required');
    }
    
    try {
        $sql = "SELECT c.*, cm.is_president, cr.role_name
                FROM clubs c
                JOIN club_members cm ON c.id = cm.club_id
                JOIN club_roles cr ON cm.role_id = cr.id
                WHERE cm.user_id = ? AND cm.status = 'active' AND c.is_active = TRUE
                ORDER BY cm.is_president DESC, c.name ASC";
        
        $clubs = dbQuery($sql, [getCurrentUserId()]);
        jsonResponse(true, $clubs);
        
    } catch (Exception $e) {
        error_log('Get clubs error: ' . $e->getMessage());
        jsonResponse(false, null, 'Error fetching clubs');
    }
}

// Invalid action
jsonResponse(false, null, 'Invalid action');

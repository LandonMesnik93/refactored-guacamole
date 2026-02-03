<?php
/**
 * Database Configuration and Connection Handler
 * Club Hub Management System
 */

// Database credentials - UPDATE THESE WITH YOUR DATABASE INFO
define('DB_HOST', 'localhost');
define('DB_NAME', 'club_hub');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

/**
 * Get database connection using PDO
 * @return PDO Database connection object
 */
function getDBConnection() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET
            ];
            
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            die("Database connection failed. Please check your configuration.");
        }
    }
    
    return $pdo;
}

/**
 * Execute a query and return results
 * @param string $sql SQL query
 * @param array $params Query parameters
 * @return array Query results
 */
function dbQuery($sql, $params = []) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    } catch (PDOException $e) {
        error_log("Query error: " . $e->getMessage());
        return [];
    }
}

/**
 * Execute an insert/update/delete query
 * @param string $sql SQL query
 * @param array $params Query parameters
 * @return int Last insert ID or affected rows
 */
function dbExecute($sql, $params = []) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $pdo->lastInsertId() ?: $stmt->rowCount();
    } catch (PDOException $e) {
        error_log("Execute error: " . $e->getMessage());
        return 0;
    }
}

/**
 * Get single row from query
 * @param string $sql SQL query
 * @param array $params Query parameters
 * @return array|false Single row or false
 */
function dbQueryOne($sql, $params = []) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch();
    } catch (PDOException $e) {
        error_log("Query error: " . $e->getMessage());
        return false;
    }
}

/**
 * Start a database transaction
 */
function dbBeginTransaction() {
    return getDBConnection()->beginTransaction();
}

/**
 * Commit a database transaction
 */
function dbCommit() {
    return getDBConnection()->commit();
}

/**
 * Rollback a database transaction
 */
function dbRollback() {
    return getDBConnection()->rollBack();
}

/**
 * Sanitize user input
 * @param string $input User input
 * @return string Sanitized input
 */
function sanitizeInput($input) {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

/**
 * Validate email address
 * @param string $email Email to validate
 * @return bool True if valid
 */
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Hash password
 * @param string $password Plain text password
 * @return string Hashed password
 */
function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

/**
 * Verify password
 * @param string $password Plain text password
 * @param string $hash Hashed password
 * @return bool True if password matches
 */
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * Generate CSRF token
 * @return string CSRF token
 */
function generateCSRFToken() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Verify CSRF token
 * @param string $token Token to verify
 * @return bool True if valid
 */
function verifyCSRFToken($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Get user's IP address
 * @return string IP address
 */
function getUserIP() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        return $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        return $_SERVER['HTTP_X_FORWARDED_FOR'];
    } else {
        return $_SERVER['REMOTE_ADDR'];
    }
}

/**
 * Check if user is logged in
 * @return bool True if logged in
 */
function isLoggedIn() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

/**
 * Get current user ID
 * @return int|null User ID or null
 */
function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}

/**
 * Get current user data
 * @return array|false User data or false
 */
function getCurrentUser() {
    if (!isLoggedIn()) {
        return false;
    }
    
    $sql = "SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = ? AND is_active = 1";
    return dbQueryOne($sql, [$_SESSION['user_id']]);
}

/**
 * Require login - redirect if not logged in
 * @param string $redirect Redirect URL
 */
function requireLogin($redirect = 'login.php') {
    if (!isLoggedIn()) {
        header("Location: $redirect");
        exit;
    }
}

/**
 * JSON response helper
 * @param bool $success Success status
 * @param mixed $data Response data
 * @param string $message Response message
 */
function jsonResponse($success, $data = null, $message = '') {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ]);
    exit;
}

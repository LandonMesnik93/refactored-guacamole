<?php
require_once '../database/db.php';
session_start();
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$club_id = $_REQUEST['club_id'] ?? null;

if (!$club_id) jsonResponse(false, null, 'Club ID required');

try {
    if ($method === 'GET') {
        $limit = $_GET['limit'] ?? 50;
        
        $sql = "SELECT a.*, u.first_name, u.last_name 
                FROM announcements a 
                LEFT JOIN users u ON a.user_id = u.id 
                WHERE a.club_id = ?
                ORDER BY a.is_pinned DESC, a.created_at DESC LIMIT ?";
        
        $announcements = dbQuery($sql, [$club_id, (int)$limit]);
        jsonResponse(true, $announcements);
    }
    
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isLoggedIn()) jsonResponse(false, null, 'Login required');
        
        $sql = "INSERT INTO announcements (club_id, user_id, title, content, priority) 
                VALUES (?, ?, ?, ?, ?)";
        $id = dbExecute($sql, [
            $club_id, getCurrentUserId(), 
            sanitizeInput($data['title']), 
            sanitizeInput($data['content']),
            $data['priority'] ?? 'normal'
        ]);
        
        jsonResponse(!!$id, ['id' => $id], $id ? 'Announcement created' : 'Failed');
    }
} catch (Exception $e) {
    error_log('Announcements API Error: ' . $e->getMessage());
    jsonResponse(false, null, 'Error processing request');
}

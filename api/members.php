<?php
require_once '../database/db.php';
session_start();
header('Content-Type: application/json');

$club_id = $_GET['club_id'] ?? null;
if (!$club_id) jsonResponse(false, null, 'Club ID required');

try {
    $sql = "SELECT cm.*, u.email, u.first_name, u.last_name, cr.role_name
            FROM club_members cm 
            JOIN users u ON cm.user_id = u.id 
            JOIN club_roles cr ON cm.role_id = cr.id
            WHERE cm.club_id = ? AND cm.status = 'active'
            ORDER BY cm.is_president DESC, u.last_name ASC";
    
    $members = dbQuery($sql, [$club_id]);
    jsonResponse(true, $members);
} catch (Exception $e) {
    error_log('Members API Error: ' . $e->getMessage());
    jsonResponse(false, null, 'Error fetching members');
}

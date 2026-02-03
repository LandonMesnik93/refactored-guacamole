<?php
require_once '../database/db.php';
session_start();
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_REQUEST['action'] ?? '';

function checkPermission($clubId, $userId, $permissionKey) {
    $sql = "SELECT rp.permission_value FROM club_members cm
            JOIN role_permissions rp ON cm.role_id = rp.role_id
            WHERE cm.club_id = ? AND cm.user_id = ? AND cm.status = 'active' AND rp.permission_key = ?";
    $result = dbQueryOne($sql, [$clubId, $userId, $permissionKey]);
    return $result && $result['permission_value'];
}

// GET ALL ROLES FOR A CLUB
if ($action === 'list' && $method === 'GET') {
    if (!isLoggedIn()) jsonResponse(false, null, 'Login required');
    
    $clubId = $_GET['club_id'] ?? null;
    if (!$clubId) jsonResponse(false, null, 'Club ID required');
    
    try {
        $sql = "SELECT r.*, (SELECT COUNT(*) FROM club_members WHERE role_id = r.id AND status = 'active') as member_count
                FROM club_roles r WHERE r.club_id = ? ORDER BY r.is_system_role DESC, r.role_name ASC";
        $roles = dbQuery($sql, [$clubId]);
        
        foreach ($roles as &$role) {
            $sql = "SELECT permission_key, permission_value FROM role_permissions WHERE role_id = ?";
            $permissions = dbQuery($sql, [$role['id']]);
            $role['permissions'] = [];
            foreach ($permissions as $perm) {
                $role['permissions'][$perm['permission_key']] = (bool)$perm['permission_value'];
            }
        }
        jsonResponse(true, $roles);
    } catch (Exception $e) {
        error_log('Get roles error: ' . $e->getMessage());
        jsonResponse(false, null, 'Error fetching roles');
    }
}

// CREATE NEW ROLE
if ($action === 'create' && $method === 'POST') {
    if (!isLoggedIn()) jsonResponse(false, null, 'Login required');
    
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $clubId = $data['club_id'] ?? null;
        if (!$clubId) jsonResponse(false, null, 'Club ID required');
        if (!checkPermission($clubId, getCurrentUserId(), 'create_roles')) {
            jsonResponse(false, null, 'Permission denied');
        }
        if (empty($data['role_name'])) jsonResponse(false, null, 'Role name required');
        
        $existing = dbQueryOne("SELECT id FROM club_roles WHERE club_id = ? AND role_name = ?", [$clubId, $data['role_name']]);
        if ($existing) jsonResponse(false, null, 'Role name already exists');
        
        dbBeginTransaction();
        try {
            $sql = "INSERT INTO club_roles (club_id, role_name, role_description, is_system_role) VALUES (?, ?, ?, FALSE)";
            $roleId = dbExecute($sql, [$clubId, sanitizeInput($data['role_name']), sanitizeInput($data['role_description'] ?? '')]);
            if (!$roleId) throw new Exception('Failed to create role');
            
            $allPermissions = ['view_announcements', 'create_announcements', 'edit_announcements', 'delete_announcements',
                'view_events', 'create_events', 'edit_events', 'delete_events', 'view_members', 'manage_members', 'remove_members',
                'view_attendance', 'export_attendance', 'view_stats', 'modify_club_settings', 'create_roles', 'assign_roles', 'manage_roles', 'access_chat'];
            
            $permissions = $data['permissions'] ?? [];
            foreach ($allPermissions as $perm) {
                $value = isset($permissions[$perm]) && $permissions[$perm] ? 'TRUE' : 'FALSE';
                dbExecute("INSERT INTO role_permissions (role_id, permission_key, permission_value) VALUES (?, ?, $value)", [$roleId, $perm]);
            }
            dbCommit();
            jsonResponse(true, ['role_id' => $roleId], 'Role created successfully');
        } catch (Exception $e) {
            dbRollback();
            throw $e;
        }
    } catch (Exception $e) {
        error_log('Create role error: ' . $e->getMessage());
        jsonResponse(false, null, 'Error creating role');
    }
}

// UPDATE ROLE
if ($action === 'update' && $method === 'POST') {
    if (!isLoggedIn()) jsonResponse(false, null, 'Login required');
    
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $roleId = $data['role_id'] ?? null;
        if (!$roleId) jsonResponse(false, null, 'Role ID required');
        
        $role = dbQueryOne("SELECT club_id FROM club_roles WHERE id = ?", [$roleId]);
        if (!$role) jsonResponse(false, null, 'Role not found');
        if (!checkPermission($role['club_id'], getCurrentUserId(), 'manage_roles')) {
            jsonResponse(false, null, 'Permission denied');
        }
        
        dbBeginTransaction();
        try {
            if (isset($data['role_name']) || isset($data['role_description'])) {
                $updates = [];
                $params = [];
                if (isset($data['role_name'])) {
                    $updates[] = "role_name = ?";
                    $params[] = sanitizeInput($data['role_name']);
                }
                if (isset($data['role_description'])) {
                    $updates[] = "role_description = ?";
                    $params[] = sanitizeInput($data['role_description']);
                }
                $sql = "UPDATE club_roles SET " . implode(', ', $updates) . " WHERE id = ?";
                $params[] = $roleId;
                dbExecute($sql, $params);
            }
            
            if (isset($data['permissions'])) {
                foreach ($data['permissions'] as $key => $value) {
                    $val = $value ? 'TRUE' : 'FALSE';
                    dbExecute("UPDATE role_permissions SET permission_value = $val WHERE role_id = ? AND permission_key = ?", [$roleId, $key]);
                }
            }
            dbCommit();
            jsonResponse(true, null, 'Role updated successfully');
        } catch (Exception $e) {
            dbRollback();
            throw $e;
        }
    } catch (Exception $e) {
        error_log('Update role error: ' . $e->getMessage());
        jsonResponse(false, null, 'Error updating role');
    }
}

// DELETE ROLE
if ($action === 'delete' && $method === 'POST') {
    if (!isLoggedIn()) jsonResponse(false, null, 'Login required');
    
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $roleId = $data['role_id'] ?? null;
        if (!$roleId) jsonResponse(false, null, 'Role ID required');
        
        $role = dbQueryOne("SELECT club_id, is_system_role FROM club_roles WHERE id = ?", [$roleId]);
        if (!$role) jsonResponse(false, null, 'Role not found');
        if ($role['is_system_role']) jsonResponse(false, null, 'Cannot delete system roles');
        if (!checkPermission($role['club_id'], getCurrentUserId(), 'manage_roles')) {
            jsonResponse(false, null, 'Permission denied');
        }
        
        $memberCount = dbQueryOne("SELECT COUNT(*) as count FROM club_members WHERE role_id = ? AND status = 'active'", [$roleId]);
        if ($memberCount && $memberCount['count'] > 0) {
            jsonResponse(false, null, 'Cannot delete role with active members. Reassign members first.');
        }
        
        dbExecute("DELETE FROM club_roles WHERE id = ?", [$roleId]);
        jsonResponse(true, null, 'Role deleted successfully');
    } catch (Exception $e) {
        error_log('Delete role error: ' . $e->getMessage());
        jsonResponse(false, null, 'Error deleting role');
    }
}

// ASSIGN ROLE TO MEMBER
if ($action === 'assign' && $method === 'POST') {
    if (!isLoggedIn()) jsonResponse(false, null, 'Login required');
    
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $clubId = $data['club_id'] ?? null;
        $userId = $data['user_id'] ?? null;
        $roleId = $data['role_id'] ?? null;
        if (!$clubId || !$userId || !$roleId) jsonResponse(false, null, 'Club ID, User ID, and Role ID required');
        
        if (!checkPermission($clubId, getCurrentUserId(), 'assign_roles')) {
            jsonResponse(false, null, 'Permission denied');
        }
        
        $role = dbQueryOne("SELECT id FROM club_roles WHERE id = ? AND club_id = ?", [$roleId, $clubId]);
        if (!$role) jsonResponse(false, null, 'Invalid role for this club');
        
        $member = dbQueryOne("SELECT id FROM club_members WHERE club_id = ? AND user_id = ? AND status = 'active'", [$clubId, $userId]);
        if (!$member) jsonResponse(false, null, 'User is not a member of this club');
        
        dbExecute("UPDATE club_members SET role_id = ? WHERE club_id = ? AND user_id = ?", [$roleId, $clubId, $userId]);
        jsonResponse(true, null, 'Role assigned successfully');
    } catch (Exception $e) {
        error_log('Assign role error: ' . $e->getMessage());
        jsonResponse(false, null, 'Error assigning role');
    }
}

// GET ROLE PREVIEW
if ($action === 'preview' && $method === 'GET') {
    if (!isLoggedIn()) jsonResponse(false, null, 'Login required');
    
    $roleId = $_GET['role_id'] ?? null;
    if (!$roleId) jsonResponse(false, null, 'Role ID required');
    
    try {
        $sql = "SELECT permission_key, permission_value FROM role_permissions WHERE role_id = ?";
        $permissions = dbQuery($sql, [$roleId]);
        $perms = [];
        foreach ($permissions as $perm) {
            $perms[$perm['permission_key']] = (bool)$perm['permission_value'];
        }
        
        $preview = ['navigation' => [], 'features' => []];
        $preview['navigation'][] = ['name' => 'Dashboard', 'visible' => true];
        if ($perms['view_announcements'] ?? false) $preview['navigation'][] = ['name' => 'Announcements', 'visible' => true];
        if ($perms['view_events'] ?? false) $preview['navigation'][] = ['name' => 'Events', 'visible' => true];
        if ($perms['view_members'] ?? false) $preview['navigation'][] = ['name' => 'Members', 'visible' => true];
        $preview['navigation'][] = ['name' => 'Sign-In', 'visible' => true];
        if ($perms['view_attendance'] ?? false) $preview['navigation'][] = ['name' => 'Attendance', 'visible' => true];
        if ($perms['access_chat'] ?? false) $preview['navigation'][] = ['name' => 'Chat', 'visible' => true];
        $preview['navigation'][] = ['name' => 'Personal Settings', 'visible' => true];
        if ($perms['modify_club_settings'] ?? false) $preview['navigation'][] = ['name' => 'Club Settings', 'visible' => true];
        
        if ($perms['create_announcements'] ?? false) $preview['features'][] = 'Can create announcements';
        if ($perms['edit_announcements'] ?? false) $preview['features'][] = 'Can edit announcements';
        if ($perms['delete_announcements'] ?? false) $preview['features'][] = 'Can delete announcements';
        if ($perms['create_events'] ?? false) $preview['features'][] = 'Can create events';
        if ($perms['edit_events'] ?? false) $preview['features'][] = 'Can edit events';
        if ($perms['delete_events'] ?? false) $preview['features'][] = 'Can delete events';
        if ($perms['manage_members'] ?? false) $preview['features'][] = 'Can approve/manage members';
        if ($perms['remove_members'] ?? false) $preview['features'][] = 'Can remove members';
        if ($perms['export_attendance'] ?? false) $preview['features'][] = 'Can export attendance data';
        if ($perms['view_stats'] ?? false) $preview['features'][] = 'Can view club statistics';
        if ($perms['create_roles'] ?? false) $preview['features'][] = 'Can create new roles';
        if ($perms['assign_roles'] ?? false) $preview['features'][] = 'Can assign roles to members';
        if ($perms['manage_roles'] ?? false) $preview['features'][] = 'Can edit/delete roles';
        
        jsonResponse(true, $preview);
    } catch (Exception $e) {
        error_log('Role preview error: ' . $e->getMessage());
        jsonResponse(false, null, 'Error generating preview');
    }
}

// SET PRESIDENT
if ($action === 'set-president' && $method === 'POST') {
    if (!isLoggedIn()) jsonResponse(false, null, 'Login required');
    
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $clubId = $data['club_id'] ?? null;
        $userId = $data['user_id'] ?? null;
        if (!$clubId || !$userId) jsonResponse(false, null, 'Club ID and User ID required');
        
        $isPresident = dbQueryOne("SELECT id FROM club_members WHERE club_id = ? AND user_id = ? AND is_president = TRUE AND status = 'active'", 
            [$clubId, getCurrentUserId()]);
        $isSystemOwner = isset($_SESSION['is_system_owner']) && $_SESSION['is_system_owner'];
        
        if (!$isPresident && !$isSystemOwner) jsonResponse(false, null, 'Permission denied');
        
        dbBeginTransaction();
        try {
            dbExecute("UPDATE club_members SET is_president = FALSE WHERE club_id = ?", [$clubId]);
            dbExecute("UPDATE club_members SET is_president = TRUE WHERE club_id = ? AND user_id = ?", [$clubId, $userId]);
            dbExecute("UPDATE clubs SET current_president_id = ? WHERE id = ?", [$userId, $clubId]);
            dbCommit();
            jsonResponse(true, null, 'President updated successfully');
        } catch (Exception $e) {
            dbRollback();
            throw $e;
        }
    } catch (Exception $e) {
        error_log('Set president error: ' . $e->getMessage());
        jsonResponse(false, null, 'Error setting president');
    }
}

// CHECK PERMISSION
if ($action === 'check-permission' && $method === 'GET') {
    if (!isLoggedIn()) jsonResponse(false, null, 'Login required');
    
    $clubId = $_GET['club_id'] ?? null;
    $permission = $_GET['permission'] ?? null;
    if (!$clubId || !$permission) jsonResponse(false, null, 'Club ID and permission required');
    
    $hasPermission = checkPermission($clubId, getCurrentUserId(), $permission);
    jsonResponse(true, ['has_permission' => $hasPermission]);
}

jsonResponse(false, null, 'Invalid action');

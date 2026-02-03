-- ============================================================================
-- Club Hub Database Schema
-- Complete database structure for club management system
-- ============================================================================

-- Drop existing tables (in reverse order of dependencies)
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_room_members;
DROP TABLE IF EXISTS chat_rate_limits;
DROP TABLE IF EXISTS chat_rooms;
DROP TABLE IF EXISTS club_attendance;
DROP TABLE IF EXISTS event_attendees;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS club_members;
DROP TABLE IF EXISTS clubs;
DROP TABLE IF EXISTS users;

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- CLUBS TABLE
-- ============================================================================
CREATE TABLE clubs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    banner_url VARCHAR(500),
    theme_primary_color VARCHAR(7) DEFAULT '#00d9ff',
    theme_secondary_color VARCHAR(7) DEFAULT '#ff006e',
    theme_accent_color VARCHAR(7) DEFAULT '#ffbe0b',
    owner_id INT NOT NULL,
    meeting_schedule VARCHAR(255),
    require_approval BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_owner (owner_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- CLUB MEMBERS TABLE
-- ============================================================================
CREATE TABLE club_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    club_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('owner', 'admin', 'member') DEFAULT 'member',
    status ENUM('active', 'pending', 'inactive') DEFAULT 'pending',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP NULL,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_club_member (club_id, user_id),
    INDEX idx_club (club_id),
    INDEX idx_user (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ANNOUNCEMENTS TABLE
-- ============================================================================
CREATE TABLE announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    club_id INT NOT NULL,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority ENUM('normal', 'high', 'urgent') DEFAULT 'normal',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_club (club_id),
    INDEX idx_priority (priority),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    club_id INT NOT NULL,
    created_by INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATETIME NOT NULL,
    location VARCHAR(255),
    max_attendees INT NULL,
    require_rsvp BOOLEAN DEFAULT FALSE,
    is_cancelled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_club (club_id),
    INDEX idx_event_date (event_date),
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- EVENT ATTENDEES TABLE
-- ============================================================================
CREATE TABLE event_attendees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM('going', 'maybe', 'not_going') DEFAULT 'going',
    rsvp_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checked_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMP NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_attendee (event_id, user_id),
    INDEX idx_event (event_id),
    INDEX idx_user (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- CLUB ATTENDANCE TABLE (Daily Sign-in)
-- ============================================================================
CREATE TABLE club_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    club_id INT NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    grade_level ENUM('9', '10', '11', '12') NULL,
    sign_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NULL,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    INDEX idx_club (club_id),
    INDEX idx_student (student_id),
    INDEX idx_sign_in_date (sign_in_time),
    INDEX idx_student_date (student_id, sign_in_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- CHAT ROOMS TABLE
-- ============================================================================
CREATE TABLE chat_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    club_id INT NOT NULL,
    room_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by INT NOT NULL,
    is_general BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_club (club_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- CHAT ROOM MEMBERS TABLE
-- ============================================================================
CREATE TABLE chat_room_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_room_member (room_id, user_id),
    INDEX idx_room (room_id),
    INDEX idx_user (user_id),
    INDEX idx_last_seen (last_seen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- CHAT MESSAGES TABLE
-- ============================================================================
CREATE TABLE chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    user_id INT NULL,
    username VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    message_hash VARCHAR(32) NULL,
    is_system_message BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_room (room_id),
    INDEX idx_user (user_id),
    INDEX idx_created (created_at),
    INDEX idx_hash (message_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- CHAT RATE LIMITS TABLE
-- ============================================================================
CREATE TABLE chat_rate_limits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    ip_address VARCHAR(45) NULL,
    action_type VARCHAR(50) NOT NULL,
    action_count INT DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_action (user_id, action_type),
    INDEX idx_ip_action (ip_address, action_type),
    INDEX idx_window (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Sample user (password: 'password123' - hashed with bcrypt)
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('admin@clubhub.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', 'admin'),
('john.doe@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Doe', 'user'),
('jane.smith@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane', 'Smith', 'user');

-- Sample clubs
INSERT INTO clubs (name, description, owner_id, meeting_schedule) VALUES
('Drama Club', 'A creative space for students passionate about theater and performance arts.', 1, 'Tuesdays and Thursdays at 3:30 PM'),
('Robotics Club', 'Build, program, and compete with robots.', 1, 'Mondays and Wednesdays at 4:00 PM');

-- Sample club members
INSERT INTO club_members (club_id, user_id, role, status) VALUES
(1, 1, 'owner', 'active'),
(1, 2, 'member', 'active'),
(1, 3, 'admin', 'active'),
(2, 1, 'owner', 'active');

-- Sample chat rooms
INSERT INTO chat_rooms (club_id, room_name, description, created_by, is_general) VALUES
(1, 'General', 'Main chat room for everyone', 1, TRUE),
(1, 'Rehearsal Planning', 'Discuss rehearsal schedules and scenes', 1, FALSE);

-- Sample announcements
INSERT INTO announcements (club_id, user_id, title, content, priority) VALUES
(1, 1, 'Welcome to Drama Club!', 'We are excited to have you join us this semester. Check the schedule for upcoming rehearsals.', 'normal'),
(1, 1, 'Rehearsal This Friday', 'Don''t forget we have rehearsal this Friday at 3:30 PM in the auditorium. Please be on time!', 'high');

-- Sample events
INSERT INTO events (club_id, created_by, title, description, event_date, location) VALUES
(1, 1, 'Spring Play Performance', 'Our annual spring play performance. Invite your friends and family!', DATE_ADD(NOW(), INTERVAL 30 DAY), 'School Auditorium'),
(1, 1, 'Technical Rehearsal', 'Full technical rehearsal with lights, sound, and costumes.', DATE_ADD(NOW(), INTERVAL 7 DAY), 'Auditorium');

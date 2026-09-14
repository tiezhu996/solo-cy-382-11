CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(120) UNIQUE NOT NULL,
  nickname VARCHAR(80) NOT NULL,
  bio TEXT,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trips (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  owner_id BIGINT NOT NULL,
  destination VARCHAR(120) NOT NULL,
  depart_date DATE NOT NULL,
  days INT NOT NULL,
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  transport VARCHAR(40),
  companion_count INT,
  gender_preference VARCHAR(40),
  status VARCHAR(30) DEFAULT 'OPEN'
);

CREATE TABLE IF NOT EXISTS trip_days (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  trip_id BIGINT NOT NULL,
  day_no INT NOT NULL,
  title VARCHAR(160),
  lodging VARCHAR(160),
  transport_plan VARCHAR(160)
);

CREATE TABLE IF NOT EXISTS budgets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  trip_id BIGINT NOT NULL,
  category VARCHAR(40) NOT NULL,
  planned DECIMAL(10,2) NOT NULL,
  spent DECIMAL(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS diary_entries (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  trip_id BIGINT NOT NULL,
  title VARCHAR(160) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 行程成员关系：仅成员可参与该行程共同支出
CREATE TABLE IF NOT EXISTS trip_members (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  trip_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_trip_member (trip_id, user_id),
  KEY idx_trip_members_user (user_id)
);

-- 行程共同支出
CREATE TABLE IF NOT EXISTS expenses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  trip_id BIGINT NOT NULL,
  payer_id BIGINT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_expenses_trip (trip_id)
);

-- 支出分摊明细
CREATE TABLE IF NOT EXISTS expense_shares (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  expense_id BIGINT NOT NULL,
  trip_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  share_amount DECIMAL(10,2) NOT NULL,
  KEY idx_expense_shares_expense (expense_id),
  KEY idx_expense_shares_trip_user (trip_id, user_id)
);

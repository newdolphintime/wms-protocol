-- Migration script to apply liquidity rule changes
-- This script applies the changes defined in the new schema.sql to the existing database

-- 1. Add columns to funds table if they don't exist
-- Note: MySQL 5.7+ supports IF NOT EXISTS in ALTER TABLE but standard syntax is tricky.
-- We'll use a procedure or just simple ALTERs that might fail if column exists (we'll ignore specific errors in execution or assume clean slate if possible, but safe ALTERs are better)

DROP PROCEDURE IF EXISTS upgrade_funds_table;

DELIMITER $$
CREATE PROCEDURE upgrade_funds_table()
BEGIN
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funds' AND COLUMN_NAME = 'liquidity_rule_type') THEN
        ALTER TABLE funds ADD COLUMN liquidity_rule_type ENUM('DAILY', 'MONTHLY', 'FIXED_TERM', 'CUSTOM') DEFAULT 'DAILY' COMMENT 'Liquidity Rule Type';
        ALTER TABLE funds ADD INDEX idx_liquidity_type (liquidity_rule_type);
    END IF;

    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funds' AND COLUMN_NAME = 'settlement_days') THEN
        ALTER TABLE funds ADD COLUMN settlement_days INT DEFAULT 1 COMMENT 'Settlement Days (T+N)';
    END IF;

    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funds' AND COLUMN_NAME = 'open_day') THEN
        ALTER TABLE funds ADD COLUMN open_day INT NULL COMMENT 'Open Day (1-31) for MONTHLY type';
    END IF;

    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funds' AND COLUMN_NAME = 'has_lockup') THEN
        ALTER TABLE funds ADD COLUMN has_lockup BOOLEAN DEFAULT FALSE COMMENT 'Whether lockup period exists';
    END IF;

    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funds' AND COLUMN_NAME = 'lockup_days') THEN
        ALTER TABLE funds ADD COLUMN lockup_days INT NULL COMMENT 'Lockup days from purchase';
    END IF;

    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funds' AND COLUMN_NAME = 'maturity_date') THEN
        ALTER TABLE funds ADD COLUMN maturity_date DATE NULL COMMENT 'Maturity Date for FIXED_TERM';
    END IF;

    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funds' AND COLUMN_NAME = 'liquidity_notes') THEN
        ALTER TABLE funds ADD COLUMN liquidity_notes TEXT NULL COMMENT 'Additional notes for liquidity';
    END IF;

    -- New columns found in 2026-01-12 update
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funds' AND COLUMN_NAME = 'manager') THEN
        ALTER TABLE funds ADD COLUMN manager VARCHAR(50) COMMENT 'Fund Manager Name';
    END IF;
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funds' AND COLUMN_NAME = 'day_change') THEN
        ALTER TABLE funds ADD COLUMN day_change DECIMAL(5, 2) COMMENT 'Daily Change Percentage';
    END IF;
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funds' AND COLUMN_NAME = 'ytd_return') THEN
        ALTER TABLE funds ADD COLUMN ytd_return DECIMAL(5, 2) COMMENT 'Year-to-Date Return Percentage';
    END IF;
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funds' AND COLUMN_NAME = 'risk_level') THEN
        ALTER TABLE funds ADD COLUMN risk_level INT COMMENT 'Risk Rating (1-5)';
    END IF;
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funds' AND COLUMN_NAME = 'inception_date') THEN
        ALTER TABLE funds ADD COLUMN inception_date DATE COMMENT 'Fund Inception Date';
    END IF;
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funds' AND COLUMN_NAME = 'description') THEN
        ALTER TABLE funds ADD COLUMN description TEXT COMMENT 'Fund Description and Investment Scope';
    END IF;
END $$
DELIMITER ;

CALL upgrade_funds_table();
DROP PROCEDURE upgrade_funds_table;

-- 2. Create external_products table
CREATE TABLE IF NOT EXISTS external_products (
    id VARCHAR(36) PRIMARY KEY COMMENT 'Product Unique Identifier',
    product_code VARCHAR(50) COMMENT 'Product Code',
    product_name VARCHAR(200) NOT NULL COMMENT 'Product Name',
    product_type VARCHAR(50) NOT NULL COMMENT 'Product Type (Trust, PE, etc.)',
    issuer VARCHAR(200) COMMENT 'Issuer Name',
    latest_nav DECIMAL(10, 4) COMMENT 'Latest NAV',
    nav_date DATE COMMENT 'NAV Date',
    status ENUM('募集中', '运行中', '已到期', '已清算', '暂停交易') DEFAULT '运行中' COMMENT 'Product Status',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Active Status',
    
    liquidity_rule_type ENUM('DAILY', 'MONTHLY', 'FIXED_TERM', 'CUSTOM') DEFAULT 'MONTHLY' COMMENT 'Liquidity Rule Type',
    settlement_days INT DEFAULT 10 COMMENT 'Settlement Days (T+N)',
    open_day INT NULL COMMENT 'Open Day (1-31)',
    has_lockup BOOLEAN DEFAULT FALSE COMMENT 'Whether lockup period exists',
    lockup_days INT NULL COMMENT 'Lockup days',
    maturity_date DATE NULL COMMENT 'Maturity Date',
    liquidity_notes TEXT NULL COMMENT 'Liquidity Notes',
    advanced_config JSON NULL COMMENT 'Advanced Configuration (JSON)',

    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_type (product_type),
    INDEX idx_status (status)
) COMMENT='External Product Library' DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Update holdings table
DROP PROCEDURE IF EXISTS upgrade_holdings_table;

DELIMITER $$
CREATE PROCEDURE upgrade_holdings_table()
BEGIN
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'holdings' AND COLUMN_NAME = 'external_product_id') THEN
        ALTER TABLE holdings ADD COLUMN external_product_id VARCHAR(36) NULL COMMENT 'Reference to external_products table';
        ALTER TABLE holdings ADD CONSTRAINT fk_holdings_ext_prod FOREIGN KEY (external_product_id) REFERENCES external_products(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'holdings' AND COLUMN_NAME = 'purchase_date') THEN
        ALTER TABLE holdings ADD COLUMN purchase_date DATE NULL COMMENT 'Purchase Date for Lockup Calculation';
    END IF;
END $$
DELIMITER ;

CALL upgrade_holdings_table();
DROP PROCEDURE upgrade_holdings_table;

-- 4. Upgrade accounts table
DROP PROCEDURE IF EXISTS upgrade_accounts_table;
DELIMITER $$
CREATE PROCEDURE upgrade_accounts_table()
BEGIN
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'description') THEN
        ALTER TABLE accounts ADD COLUMN description VARCHAR(255);
    END IF;
    -- Check if 'name' exists if it wasn't in original schema (assuming it might be new or checking just in case)
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'name') THEN
        ALTER TABLE accounts ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT 'New Account';
    END IF;
END $$
DELIMITER ;
CALL upgrade_accounts_table();
DROP PROCEDURE upgrade_accounts_table;

-- 5. Create recurring_rules and cash_flows if not exist
CREATE TABLE IF NOT EXISTS recurring_rules (
    id VARCHAR(50) PRIMARY KEY,
    frequency VARCHAR(20) NOT NULL COMMENT 'Enum: MONTHLY, QUARTERLY, YEARLY',
    count INT NOT NULL COMMENT 'Number of occurrences',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cash_flows (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description VARCHAR(255),
    type VARCHAR(10) NOT NULL COMMENT 'INFLOW or OUTFLOW',
    recurring_rule_id VARCHAR(50) NULL,
    related_holding_key VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recurring_rule_id) REFERENCES recurring_rules(id) ON DELETE SET NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Set Default Values for Funds (Optional, ensuring consistent state)
UPDATE funds SET liquidity_rule_type = 'DAILY' WHERE liquidity_rule_type IS NULL;

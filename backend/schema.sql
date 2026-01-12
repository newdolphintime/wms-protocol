
CREATE TABLE IF NOT EXISTS funds (
    id VARCHAR(36) PRIMARY KEY COMMENT 'Fund Unique Identifier',
    code VARCHAR(10) NOT NULL COMMENT 'Fund Code (e.g., 510300)',
    name VARCHAR(100) NOT NULL COMMENT 'Fund Name',
    manager VARCHAR(50) COMMENT 'Fund Manager Name',
    type VARCHAR(20) NOT NULL COMMENT 'Fund Type (e.g. Broad Market, Sector)',
    nav DECIMAL(10, 4) COMMENT 'Latest Net Asset Value',
    day_change DECIMAL(5, 2) COMMENT 'Daily Change Percentage',
    ytd_return DECIMAL(5, 2) COMMENT 'Year-to-Date Return Percentage',
    risk_level INT COMMENT 'Risk Rating (1-5)',
    inception_date DATE COMMENT 'Fund Inception Date',
    description TEXT COMMENT 'Fund Description and Investment Scope',
    
    -- Liquidity Rules (Product Attributes)
    liquidity_rule_type ENUM('DAILY', 'MONTHLY', 'FIXED_TERM', 'CUSTOM') DEFAULT 'DAILY' COMMENT 'Liquidity Rule Type',
    settlement_days INT DEFAULT 1 COMMENT 'Settlement Days (T+N)',
    open_day INT NULL COMMENT 'Open Day (1-31) for MONTHLY type',
    has_lockup BOOLEAN DEFAULT FALSE COMMENT 'Whether lockup period exists',
    lockup_days INT NULL COMMENT 'Lockup days from purchase',
    maturity_date DATE NULL COMMENT 'Maturity Date for FIXED_TERM',
    liquidity_notes TEXT NULL COMMENT 'Additional notes for liquidity',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record Creation Timestamp',
    INDEX idx_liquidity_type (liquidity_rule_type)
) COMMENT='Fund Basic Information Table' DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fund_nav_history (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Auto-increment Primary Key',
    fund_id VARCHAR(36) NOT NULL COMMENT 'Foreign Key to funds table',
    date DATE NOT NULL COMMENT 'NAV Date',
    nav DECIMAL(10, 4) COMMENT 'Net Asset Value for the date',
    change_percent DECIMAL(5, 2) COMMENT 'Daily Change Percentage vs previous day',
    is_patched BOOLEAN DEFAULT FALSE COMMENT 'Whether the NAV is patched/simulated',
    patch_fund_id VARCHAR(36) COMMENT 'Source Fund ID used for patching',
    INDEX idx_fund_date (fund_id, date),
    FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE CASCADE
) COMMENT='Historical NAV Data Table' DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fund_patch_rules (
    id VARCHAR(255) PRIMARY KEY COMMENT 'Rule Unique Identifier',
    target_fund_id VARCHAR(36) NOT NULL COMMENT 'Target Fund ID',
    proxy_fund_id VARCHAR(36) NOT NULL COMMENT 'Proxy Fund ID',
    start_date DATE NOT NULL COMMENT 'Patch Start Date',
    end_date DATE NOT NULL COMMENT 'Patch End Date',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation Time',
    FOREIGN KEY (target_fund_id) REFERENCES funds(id) ON DELETE CASCADE,
    FOREIGN KEY (proxy_fund_id) REFERENCES funds(id) ON DELETE CASCADE
) COMMENT='Fund NAV Patching Rules' DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID',
    name VARCHAR(100) NOT NULL COMMENT 'Client Name',
    phone VARCHAR(20) DEFAULT NULL COMMENT 'Phone Number',
    gender ENUM('M', 'F') DEFAULT 'M' COMMENT 'Gender',
    status ENUM('ACTIVE', 'POTENTIAL', 'INACTIVE', 'VIP') DEFAULT 'POTENTIAL' COMMENT 'Client Status',
    risk_level VARCHAR(50) DEFAULT 'C1-保守型' COMMENT 'Risk Tolerance Level',
    last_contact_date DATE DEFAULT NULL COMMENT 'Last Contact Date',
    tags JSON DEFAULT NULL COMMENT 'Client Tags (JSON)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID',
    client_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL COMMENT 'Enum: PERSONAL, FAMILY_TRUST',
    description VARCHAR(255),
    cash_balance DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    
    -- Liquidity Rules
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
) COMMENT='External Product Library' DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS holdings (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID',
    account_id VARCHAR(36) NOT NULL,
    
    -- Link to internal Funds table (Nullable)
    fund_id VARCHAR(36) NULL COMMENT 'If set, refers to system funds',
    
    -- Link to External Products (Nullable)
    external_product_id VARCHAR(36) NULL COMMENT 'Reference to external_products table',

    -- Position Data
    shares DECIMAL(15, 2) NOT NULL DEFAULT 0,
    avg_cost DECIMAL(10, 4) DEFAULT 0,
    purchase_date DATE NULL COMMENT 'Purchase Date for Lockup Calculation',
    
    -- Extensible Logic
    redemption_config JSON COMMENT 'Stores RedemptionRule overrides',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE SET NULL,
    FOREIGN KEY (external_product_id) REFERENCES external_products(id) ON DELETE SET NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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



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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record Creation Timestamp'
) COMMENT='Fund Basic Information Table';

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
) COMMENT='Historical NAV Data Table';

CREATE TABLE IF NOT EXISTS fund_patch_rules (
    id VARCHAR(255) PRIMARY KEY COMMENT 'Rule Unique Identifier',
    target_fund_id VARCHAR(36) NOT NULL COMMENT 'Target Fund ID',
    proxy_fund_id VARCHAR(36) NOT NULL COMMENT 'Proxy Fund ID',
    start_date DATE NOT NULL COMMENT 'Patch Start Date',
    end_date DATE NOT NULL COMMENT 'Patch End Date',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation Time',
    FOREIGN KEY (target_fund_id) REFERENCES funds(id) ON DELETE CASCADE,
    FOREIGN KEY (proxy_fund_id) REFERENCES funds(id) ON DELETE CASCADE
) COMMENT='Fund NAV Patching Rules';

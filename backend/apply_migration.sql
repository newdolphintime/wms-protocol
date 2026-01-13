-- Migration to add currency column to accounts table
-- Run this if you are upgrading from v20260112 and want to keep data

DELIMITER //

CREATE PROCEDURE UpgradeDatabase()
BEGIN
    -- Check and add 'currency' to 'accounts'
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'accounts' 
        AND COLUMN_NAME = 'currency'
    ) THEN
        ALTER TABLE accounts ADD COLUMN currency VARCHAR(10) DEFAULT 'CNY' COMMENT 'Account Currency' AFTER type;
    END IF;

END //

DELIMITER ;

CALL UpgradeDatabase();
DROP PROCEDURE UpgradeDatabase();

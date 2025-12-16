-- Adjust host ('%') and passwords as needed before running

-- Create users
CREATE USER IF NOT EXISTS 'aips-readonly'@'%'
  IDENTIFIED BY 'StrongReadonlyPwd1!';

CREATE USER IF NOT EXISTS 'aips-readwrite'@'%'
  IDENTIFIED BY 'StrongReadwritePwd2!';

CREATE USER IF NOT EXISTS 'aips-admin'@'%'
  IDENTIFIED BY 'StrongAdminPwd3!';

-- Grant privileges on database aiprivatesearch

-- Read-only: can only read data
GRANT SELECT
ON `aiprivatesearch`.*
TO 'aips-readonly'@'%';

-- Read/write: can read and modify data, but not change schema
GRANT SELECT, INSERT, UPDATE, DELETE
ON `aiprivatesearch`.*
TO 'aips-readwrite'@'%';

GRANT CREATE TEMPORARY TABLES
ON `aiprivatesearch`.*
TO 'aips-readwrite'@'%';

-- Admin: full control on this database
GRANT ALL PRIVILEGES
ON `aiprivatesearch`.*
TO 'aips-admin'@'%';

-- Apply changes
FLUSH PRIVILEGES;

-- (Optional) Show resulting grants
SHOW GRANTS FOR 'aips-readonly'@'%';
SHOW GRANTS FOR 'aips-readwrite'@'%';
SHOW GRANTS FOR 'aips-admin'@'%';

-- Run manually in MySQL only when you are ready to set up THIS learning app.
-- This file is documentation, not an automatic application startup script.
CREATE DATABASE cutroom_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create a separate local account using your own generated password:
-- CREATE USER 'cutroom_learning'@'localhost' IDENTIFIED BY '<your-generated-password>';
-- GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
--     ON cutroom_learning.* TO 'cutroom_learning'@'localhost';
--
-- CREATE/ALTER/INDEX are needed because ddl-auto=update creates the two tables.
-- For a real deployment, use versioned migrations and a narrower runtime account.
-- Never point this app at SkillSphere's database or use a MySQL root login.

# Admin Accounts - Customer Manager

## Default Admin Accounts

Two admin accounts are automatically created when the database is initialized:

### Account 1: Development Admin
- **Email:** `adm-custmgr@a.com`
- **Password:** `123`
- **Role:** admin
- **Purpose:** Development and testing

### Account 2: Production Admin
- **Email:** `custmgr-adm@c.com`
- **Password:** `123`
- **Role:** admin
- **Purpose:** Production access to custmgr.aiprivatesearch.com

## Login URLs

### Development (macOS)
- **URL:** http://localhost:56303
- **Use:** Either admin account

### Production (Ubuntu)
- **URL:** https://custmgr.aiprivatesearch.com
- **Use:** `custmgr-adm@c.com` / `123`

## Changing Default Password

### Method 1: Environment Variable (Recommended)

Set in your `.env` file:
```bash
ADMIN_DEFAULT_PASSWORD=your-secure-password
```

Then restart the server. New admin accounts will use this password.

### Method 2: Database Update

```sql
-- Connect to MySQL
mysql -u root -p

USE aiprivatesearchcustmgr;

-- Update password (SHA-256 hash of new password)
UPDATE users 
SET password_hash = SHA2('your-new-password', 256) 
WHERE email = 'custmgr-adm@c.com';
```

### Method 3: Via Application (Future)

Admin dashboard will include password change functionality.

## Security Recommendations

### For Production

1. **Change default password immediately:**
   ```sql
   UPDATE users 
   SET password_hash = SHA2('strong-random-password', 256) 
   WHERE email = 'custmgr-adm@c.com';
   ```

2. **Use strong passwords:**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Use a password manager

3. **Limit admin access:**
   - Only create admin accounts for trusted personnel
   - Use manager role for limited access (future feature)

4. **Monitor login attempts:**
   - Check logs regularly
   - Implement 2FA (future enhancement)

## Account Management

### Create New Admin Account

```sql
INSERT INTO users (email, password_hash, first_name, last_name, role) 
VALUES (
  'new-admin@example.com',
  SHA2('secure-password', 256),
  'First',
  'Last',
  'admin'
);
```

### Create Manager Account

```sql
INSERT INTO users (email, password_hash, first_name, last_name, role) 
VALUES (
  'manager@example.com',
  SHA2('secure-password', 256),
  'Manager',
  'Name',
  'manager'
);
```

### Disable Account

```sql
UPDATE users 
SET status = 'suspended' 
WHERE email = 'user@example.com';
```

### Delete Account

```sql
DELETE FROM users WHERE email = 'user@example.com';
```

## Roles

### Admin Role
- Full access to all features
- Can manage users, licenses, devices
- Can view analytics and reports
- Can modify system settings

### Manager Role (Future)
- Limited access
- Can view licenses and devices
- Cannot modify system settings
- Cannot manage other users

## Troubleshooting

### Cannot Login

1. **Check account exists:**
   ```sql
   SELECT email, role, status FROM users WHERE email = 'custmgr-adm@c.com';
   ```

2. **Verify password hash:**
   ```sql
   SELECT password_hash FROM users WHERE email = 'custmgr-adm@c.com';
   -- Should be: a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3 (for '123')
   ```

3. **Check account status:**
   ```sql
   UPDATE users SET status = 'active' WHERE email = 'custmgr-adm@c.com';
   ```

### Reset Admin Password

```sql
-- Reset to default '123'
UPDATE users 
SET password_hash = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3' 
WHERE email = 'custmgr-adm@c.com';
```

### Recreate Admin Accounts

```bash
# Drop and recreate database
mysql -u root -p

DROP DATABASE aiprivatesearchcustmgr;
CREATE DATABASE aiprivatesearchcustmgr;

# Restart server to reinitialize
pm2 restart aipscust-s56304
```

## Session Management

### View Active Sessions

```sql
SELECT 
  s.session_token,
  u.email,
  s.expires_at,
  s.ip_address,
  s.created_at
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.expires_at > NOW()
ORDER BY s.created_at DESC;
```

### Revoke All Sessions for User

```sql
DELETE FROM sessions WHERE user_id = (
  SELECT id FROM users WHERE email = 'custmgr-adm@c.com'
);
```

### Clear Expired Sessions

```sql
DELETE FROM sessions WHERE expires_at < NOW();
```

## Best Practices

1. **Never share admin credentials**
2. **Use unique passwords for each environment**
3. **Rotate passwords regularly**
4. **Monitor login activity**
5. **Use HTTPS in production**
6. **Enable rate limiting**
7. **Keep audit logs**
8. **Implement 2FA when available**

## Future Enhancements

- [ ] Password reset via email
- [ ] Two-factor authentication (2FA)
- [ ] Password complexity requirements
- [ ] Account lockout after failed attempts
- [ ] Audit log for admin actions
- [ ] Role-based permissions system
- [ ] SSO integration

---

**Last Updated:** Version 1.22  
**Status:** Production Ready

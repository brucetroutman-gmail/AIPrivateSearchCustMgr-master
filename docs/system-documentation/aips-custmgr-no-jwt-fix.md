CustMgr Device-Based Licensing Implementation Guide
Step 1: Database Schema Updates
Add Device Management Tables
-- Create devices table
CREATE TABLE devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    device_uuid VARCHAR(64) NOT NULL UNIQUE,
    device_name VARCHAR(255),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status ENUM('active', 'inactive') DEFAULT 'active',
    INDEX idx_customer_id (customer_id),
    INDEX idx_device_uuid (device_uuid),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Update customers table if needed (ensure it has tier column)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tier INT DEFAULT 1;


Copy
sql
Step 2: Add New API Endpoints
Create /api/licensing/validate-device endpoint
// POST /api/licensing/validate-device
app.post('/api/licensing/validate-device', async (req, res) => {
  try {
    const { email, deviceUuid, deviceName } = req.body;
    
    // Find customer by email
    const customer = await db.query('SELECT * FROM customers WHERE email = ?', [email]);
    if (!customer.length) {
      return res.json({ valid: false, reason: 'Customer not found' });
    }
    
    // Check if device is registered
    const device = await db.query(
      'SELECT * FROM devices WHERE customer_id = ? AND device_uuid = ? AND status = "active"',
      [customer[0].id, deviceUuid]
    );
    
    if (!device.length) {
      return res.json({ valid: false, reason: 'Device not registered' });
    }
    
    // Update last seen
    await db.query('UPDATE devices SET last_seen = NOW() WHERE id = ?', [device[0].id]);
    
    res.json({
      valid: true,
      customer: {
        email: customer[0].email,
        tier: customer[0].tier || 1
      },
      device: {
        uuid: deviceUuid,
        name: device[0].device_name
      }
    });
  } catch (error) {
    res.status(500).json({ valid: false, reason: 'Server error' });
  }
});


Copy
javascript
Create /api/licensing/register-device endpoint
// POST /api/licensing/register-device
app.post('/api/licensing/register-device', async (req, res) => {
  try {
    const { email, deviceUuid, deviceName } = req.body;
    
    // Find or create customer
    let customer = await db.query('SELECT * FROM customers WHERE email = ?', [email]);
    if (!customer.length) {
      // Create new customer with default tier
      await db.query('INSERT INTO customers (email, tier, created_at) VALUES (?, 1, NOW())', [email]);
      customer = await db.query('SELECT * FROM customers WHERE email = ?', [email]);
    }
    
    // Check if device already registered
    const existingDevice = await db.query(
      'SELECT * FROM devices WHERE customer_id = ? AND device_uuid = ?',
      [customer[0].id, deviceUuid]
    );
    
    if (existingDevice.length) {
      // Update existing device
      await db.query(
        'UPDATE devices SET device_name = ?, last_seen = NOW(), status = "active" WHERE id = ?',
        [deviceName, existingDevice[0].id]
      );
    } else {
      // Register new device
      await db.query(
        'INSERT INTO devices (customer_id, device_uuid, device_name, registered_at) VALUES (?, ?, ?, NOW())',
        [customer[0].id, deviceUuid, deviceName]
      );
    }
    
    res.json({
      success: true,
      customer: {
        email: customer[0].email,
        tier: customer[0].tier || 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});


Copy
javascript
Step 3: Update Existing Endpoints (Optional)
Modify existing /api/licensing/activate to support device registration
// Update existing activate endpoint to also register device
app.post('/api/licensing/activate', async (req, res) => {
  // ... existing JWT logic ...
  
  // Also register device if deviceUuid provided
  if (req.body.deviceUuid && req.body.deviceName) {
    try {
      await registerDeviceForCustomer(customer[0].id, req.body.deviceUuid, req.body.deviceName);
    } catch (error) {
      console.warn('Device registration failed during activation:', error);
    }
  }
  
  // ... rest of existing logic ...
});


Copy
Step 4: Test the Implementation
Test Device Registration
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/register-device \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bruce.troutman@gmail.com",
    "deviceUuid": "test-device-uuid-123",
    "deviceName": "MacBook Pro 2019"
  }'

Copy
bash
Test Device Validation
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/validate-device \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bruce.troutman@gmail.com",
    "deviceUuid": "test-device-uuid-123",
    "deviceName": "MacBook Pro 2019"
  }'

Copy
Step 5: Deploy and Test with AIPS
Deploy CustMgr changes

Test AIPS activation flow:

Clear localStorage

Go to http://localhost:56305

Click "Get Started"

Enter email: bruce.troutman@gmail.com

Should register device and show menu

Expected Results
✅ No JWT token expiration issues

✅ Device registration works seamlessly

✅ Multiple devices per customer supported

✅ Simple validation without token complexity

This eliminates the JWT expiration problem completely by using device registration status instead of tokens.




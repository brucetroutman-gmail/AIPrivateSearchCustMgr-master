# AI Private Search Customer Manager v1.62

A comprehensive customer and license management system for AI Private Search, handling user registrations, subscriptions, payments, and device-based licensing.

## Features

- **User Management**: Customer registration and account management
- **License Management**: Subscription tiers (Standard, Premium, Professional)
- **Device Licensing**: Device registration and validation (no JWT)
- **Payment Processing**: PayPal integration (in progress)
- **Analytics**: Usage statistics and reporting
- **System Settings**: Configurable settings via settings.json
- **Security**: Rate limiting, input validation, and secure authentication

## Architecture

```
aiprivatesearchcustmgr/
├── client/c01_client-first-app/     # Frontend application
│   ├── config/settings.json         # Configurable system settings
│   ├── index.html                   # Admin dashboard
│   ├── analytics.html               # Analytics dashboard
│   ├── settings.html                # System settings editor
│   ├── styles.css                   # Application styles
│   └── ...                          # Additional client files
├── server/s01_server-first-app/     # Backend API server
│   ├── server.mjs                   # Main server file
│   ├── routes/                      # API route handlers
│   ├── middleware/                  # Custom middleware
│   └── lib/                         # Business logic
│       ├── settings-loader.mjs      # Settings validation and loader
│       ├── tier-helpers.mjs         # Device limit helpers
│       ├── auth/                    # Authentication
│       ├── customers/               # Customer management
│       ├── email/                   # Email service
│       └── notifications/           # Trial notifications
└── package.json                     # Project configuration
```

## Quick Start

### Prerequisites
- Node.js 18+ 
- MySQL database
- PayPal account (for payments)

### Installation

1. **Clone and setup**:
```bash
cd /Users/Shared/AIPrivateSearch/repo/aiprivatesearchcustmgr
npm run install-all
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Setup database**:
```bash
# Create MySQL database and run migrations
# (Database setup scripts will be added)
```

4. **Start development server**:
```bash
npm run dev
```

5. **Access application**:
- App + API: http://localhost:56304 (Express serves both static files and API)
- Login with default admin accounts:
  - `adm-custmgr@a.com` / password: `123`
  - `custmgr-adm@c.com` / password: `123`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login (admin/manager)
- `POST /api/auth/logout` - User logout
- `POST /api/customers/login` - Customer login
- `POST /api/customers/register` - Customer registration
- `POST /api/customers/verify-email` - Email verification

### Customer Management
- `GET /api/customers` - List all customers (admin)
- `GET /api/customers/:id` - Get customer details
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Deactivate customer

### Device Licensing
- `POST /api/licensing/register-device` - Register a device
- `POST /api/licensing/validate-device` - Validate a registered device
- `POST /api/licensing/check-limits` - Check device limits for a tier
- `DELETE /api/devices/:id` - Remove a device

### Analytics & Settings
- `GET /api/analytics` - Usage statistics and reporting
- `GET /api/settings` - Get system settings
- `PUT /api/settings` - Update system settings

## Database Schema

### Customers Table
Holds both customer account info and license data (1:1 relationship, no separate licenses table).
```sql
CREATE TABLE customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  tier ENUM('standard', 'premium', 'professional') DEFAULT 'standard',
  license_status ENUM('trial', 'active', 'expired', 'cancelled') DEFAULT 'trial',
  trial_started_at TIMESTAMP,
  expires_at TIMESTAMP,
  grace_period_ends TIMESTAMP,
  customer_ipaddr VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Devices Table
```sql
CREATE TABLE devices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  device_uuid VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  pc_code VARCHAR(255),
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

### Admin Users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager') NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Features

- **Rate Limiting**: Prevents abuse and brute force attacks
- **Input Validation**: Validates all user inputs
- **Session Authentication**: Secure session-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet Security**: Security headers and protections

## Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm run lint` - Run ESLint
- `npm run security-check` - Run security audit

### Amazon Q Release Command
For developers using Amazon Q Developer, use the **"release"** command to streamline version management:

**Minor Version Bump:**
```
release
```

**Major Version Bump:**
```
release 19
```

This command:
1. **Minor bump** (`release`): Increments version by 0.01 (e.g., 18.03 → 18.04)
2. **Major bump** (`release N`): Sets version to N.00 (e.g., `release 19` → 19.00)
3. Updates version in README.md and both package.json files
6. **Checks Git security hooks**: Verifies pre-commit hooks are installed for ESLint/security validation
7. **Organizes ToDo.md**: Updates completed items and moves completed tasks out of pending section
8. Generates commit message in format: `vX.XX: [description of changes]`
9. **Note**: Does not automatically commit - you must manually commit the changes

**Setup in new chat sessions:**
```
I have a 'release' command that bumps version by 0.01, or 'release N' for major version N.00
```

### Default Admin Accounts

Two admin accounts are automatically created on first run:
- **adm-custmgr@a.com** (password: 123)
- **custmgr-adm@c.com** (password: 123)

To change the default password, set `ADMIN_DEFAULT_PASSWORD` in your `.env` file.

### Environment Variables
See `.env.example` for all required environment variables.

## License

Creative Commons Attribution-NonCommercial-NoDerivatives (CC BY-NC-ND)

## Support

For support and questions, contact: support@aiprivatesearch.com

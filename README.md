# AI Private Search Customer Manager v1.30

A comprehensive customer and license management system for AI Private Search, handling user registrations, subscriptions, payments, and token generation.

## Features

- **User Management**: Customer registration and account management
- **License Management**: Subscription tiers (Standard, Premium, Professional)
- **Payment Processing**: Stripe integration for secure payments
- **Token Generation**: JWT-based authentication tokens
- **Analytics**: Usage statistics and reporting
- **Security**: Rate limiting, input validation, and secure authentication

## Architecture

```
aiprivatesearchcustmgr/
├── client/c01_client-first-app/     # Frontend application
│   ├── index.html                   # Main dashboard
│   ├── styles.css                   # Application styles
│   └── ...                          # Additional client files
├── server/s01_server-first-app/     # Backend API server
│   ├── server.mjs                   # Main server file
│   ├── routes/                      # API route handlers
│   ├── middleware/                  # Custom middleware
│   ├── models/                      # Database models
│   └── utils/                       # Utility functions
└── package.json                     # Project configuration
```

## Quick Start

### Prerequisites
- Node.js 18+ 
- MySQL database
- Stripe account (for payments)

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
- Frontend: http://localhost:56303
- API: http://localhost:56304
- Login with default admin accounts:
  - `adm-custmgr@a.com` / password: `123`
  - `custmgr-adm@c.com` / password: `123`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Token refresh

### License Management
- `GET /api/licenses` - List user licenses
- `POST /api/licenses` - Create new license
- `PUT /api/licenses/:id` - Update license
- `DELETE /api/licenses/:id` - Revoke license

### Payment Processing
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/webhook` - Stripe webhook handler
- `GET /api/payments/history` - Payment history

### Token Management
- `POST /api/tokens/generate` - Generate access token
- `POST /api/tokens/validate` - Validate token
- `POST /api/tokens/revoke` - Revoke token

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active'
);
```

### Licenses Table
```sql
CREATE TABLE licenses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  tier ENUM('standard', 'premium', 'professional') NOT NULL,
  status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### PC Registrations Table
```sql
CREATE TABLE pc_registrations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  pc_code VARCHAR(255) NOT NULL,
  device_info JSON,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Security Features

- **Rate Limiting**: Prevents abuse and brute force attacks
- **Input Validation**: Validates all user inputs
- **JWT Authentication**: Secure token-based authentication
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

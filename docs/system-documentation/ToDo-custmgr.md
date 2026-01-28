## Pending Tasks
018. Test enhanced JWT tokens and device limit enforcement on Ubuntu server
019. Create admin dashboard for device management
020. check conatcts pages etc for auth.
021. Add edit/delete device functionality to customer-edit page
022. create payment process using paypal.
023. Chech search on customer-management page

### Customer Authentication System
025. Extend custmgr auth system to handle customer role login
026. Add customer role to existing user management (admin/manager/customer)
027. Create customer portal dashboard (my-account.html) for customers
028. Admin can manage customer accounts (activate/deactivate/reset password)
029. Customer sessions use same system but longer timeout (30 min vs 5 min)
031. Customer login redirects to my-account.html, admin login to index.html
032. Update user-management.html to handle both admin and customer login
033. Add customer account management to admin interface
034. Implement role-based redirects after login
035. Use new mysql account  aips-readwrite


### Phase 1: Trial & Registration Fixes (v1.29-1.30)
[All tasks complete]

### Phase 1 Testing (v1.30)
Test on macOS localhost before Ubuntu deployment:

T1. Customer Registration Flow
  - Register new customer with all fields
  - Verify email with 6-digit code
  - Check license created with status='trial', tier=1
  - Verify
   trial_started_at timestamp set
  - Confirm 60-day expiration date
  - Verify welcome email received with license key and download link

T2. Download Link Verification
  - Check download button on verification success screen
  - Verify download link in welcome email
  - Test download URL: http://localhost:56303/downloads/load-AIPrivateSearch-1108.command
  - Confirm file downloads successfully

T3. Database Schema Validation
  - Verify customers table has all fields (email, phone, city, state, postal_code, customer_code, email_verified)
  - Verify licenses table has trial fields (status='trial', trial_started_at, grace_period_ends)
  - Check payments table exists with PayPal fields
  - Verify devices table has license_id foreign key

T4. Email Templates
  - Test verification code email format
  - Test welcome email with license info and download link
  - Verify trial expiration date displayed correctly
  - Check all links work (download, upgrade)

T5. Trial Expiration Warnings (Manual Test)
  - Manually set license expires_at to 7 days from now
  - Run trial check: node -e "import('./lib/notifications/trialNotificationService.mjs').then(m => new m.TrialNotificationService().checkExpiringTrials())"
  - Verify 7-day warning email received
  - Repeat for 3-day and 1-day warnings

T6. Grace Period Handling (Manual Test)
  - Manually set license expires_at to yesterday
  - Run expired check: node -e "import('./lib/notifications/trialNotificationService.mjs').then(m => new m.TrialNotificationService().handleExpiredTrials())"
  - Verify status changed to 'expired'
  - Verify grace_period_ends set to 7 days from now
  - Verify grace period email received

T7. Duplicate Registration Prevention
  - Try registering same email twice
  - Verify error message returned
  - Confirm no duplicate customer created

T8. Verification Code Expiry
  - Register customer
  - Wait 16 minutes (code expires in 15 min)
  - Try to verify with expired code
  - Verify error message returned

T9. Invalid Verification Code
  - Register customer
  - Try verifying with wrong code
  - Verify error message returned
  - Confirm license not created

T10. Production Deployment Test (Ubuntu)
  - Copy installer to Ubuntu: /webs/AIPrivateSearch/repo/aiprivatesearchcustmgr/client/c01_client-first-app/downloads/
  - Test registration flow on https://custmgr.aiprivatesearch.com/customer-registration.html
  - Verify download URL: https://custmgr.aiprivatesearch.com/downloads/load-AIPrivateSearch-1108.command
  - Confirm all emails sent successfully
  - Check trial notification job scheduled in PM2 logs

### Unified Authentication Tests
T11. Single Database Verification
  - Verify aiprivatesearch database contains users, customers, sessions tables  --done
  - Check admin accounts exist: adm-custmgr@a.com, custmgr-adm@c.com  --done
  - Verify customers table has password_hash, role, active fields  --done
  - Confirm sessions table has user_type field (admin/customer) --done

T12. Admin Login Test
  - Login with adm-custmgr@a.com / 123 at /user-management.html  --done
  - Verify redirects to /index.html (admin dashboard)  --done
  - Check session timeout is 5 minutes  --done
  - Verify admin can access user management functions  --done

T13. Customer Registration with Password
  - Register new customer with password at /customer-registration.html
  - Test password validation (8+ chars, upper, lower, number)
  - Verify password confirmation matching
  - Check customer created with role='customer' in database
  - Verify customer receives license key and welcome email

T14. Customer Login and Self-Management
  - Login with registered customer credentials at /user-management.html
  - Verify customer login works with unified auth system
  - Check session timeout is 30 minutes (longer than admin)
  - Test customer can view own profile: GET /api/customers/:id
  - Test customer can update own profile: PUT /api/customers/:id
  - Verify customer cannot access other customers' data
  - Confirm customer cannot access admin functions

T15. Admin Customer Management
  - Login as admin (adm-custmgr@a.com / 123)
  - Test admin can view all customers: GET /api/customers
  - Test admin can view any customer: GET /api/customers/:id
  - Test admin can update any customer: PUT /api/customers/:id
  - Test admin can deactivate customer: DELETE /api/customers/:id
  - Verify admin can change customer active status
  - Test admin can reset customer passwords

T16. Role-Based Access Control
  - Test customer cannot access GET /api/customers (403 error)
  - Test customer cannot deactivate other customers (403 error)
  - Test customer cannot update other customers (403 error)
  - Verify manager role has same customer access as admin
  - Test session validation for both admin and customer types

T17. Password Reset and Security
  - Test forgot password at /user-management.html
  - Verify reset email sent with token
  - Test reset-password.html page with token
  - Confirm password reset and login with new password
  - Test password complexity validation on reset
  - Verify old sessions invalidated after password change







=====================================================

## v1.47 Release (Current)
170. Added customer_ipaddr field to capture IP address during registration --done
171. Updated customerManager to accept and store ipAddress parameter --done
172. Updated customers route to capture req.ip and pass to registration --done
173. Added readonly IP address field to customer-edit page after postal code --done
174. Fixed password validation regex in my-account.html (\\d to \d) --done

## v1.46 Release
166. Fixed customer PUT endpoint to build dynamic UPDATE query with only provided fields --done
167. Fixed devices query to use device_uuid instead of device_id column --done
168. Fixed devices query to use last_seen for both last_activity and created_at --done
169. Added error logging to devices endpoint for better debugging --done

## v1.45 Release
160. Added Manage Devices section to my-account.html with device listing and deletion --done
161. Created devices.mjs route with DELETE endpoint for device removal --done
162. Added Change Tier and Payment History buttons to my-account.html --done
163. Created change-tier.html page with radio buttons for tier selection --done
164. Created payment-confirm.html page with OK button to complete tier change --done
165. Updated auth.js to include change-tier.html and payment-confirm.html as public pages --done

## v1.44 Release
155. Replaced token-based password reset with 6-digit code system (15 min expiry) --done
156. Removed old forgot-password endpoint from auth.mjs route --done
157. Updated user-management.html to redirect to reset-password.html page --done
158. Fixed form validation errors by removing required attribute from hidden fields --done
159. Added sendPasswordResetCode email method with 6-digit code display --done

## v1.43 Release
152. Fixed customerManager to use shared connection pool instead of separate connections --done
153. Eliminated localhost database fallback - now uses only remote database from .env-custmgr --done
154. Updated password reset flow to work consistently across local and production environments --done

## v1.42 Release
147. Fixed email normalization issue - removed normalizeEmail() to preserve Gmail dots --done
148. Added device-based licensing endpoints (register-device, validate-device) --done
149. Implemented JWT-free device registration and validation system --done
150. Fixed bruce.troutman@gmail.com vs brucetroutman@gmail.com email mismatch --done
151. Created device registration without token expiration issues --done

## v1.41 Release
146. Cleared all existing customer and device data for clean relicensing --done

## v1.34 Release
135. Merged license fields into customers table for simplified 1:1 relationship --done
136. Updated customer-management page to display integrated license information --done
137. Added license management capabilities to customer-edit page for admin/manager roles --done
138. Updated API endpoints to work with integrated schema (customers with license fields) --done
139. Fixed my-account.html to work with integrated license endpoint --done
140. Replaced License Management with Device Management on index page dashboard --done
141. Completed database migration on Ubuntu server (licenses table removed) --done

## v1.33 Release
131. Fixed database hardcoding in userManager.mjs - removed 8 hardcoded changeUser() calls --done
132. Fixed database hardcoding in customerManager.mjs - uses process.env.DB_DATABASE --done
133. Fixed database hardcoding in trialNotificationService.mjs - uses process.env.DB_DATABASE --done
134. Updated all database services to properly load .env-custmgr from multiple locations --done

## v1.32 Release
125. Created customer-edit page with dark mode styling and form validation --done
126. Added customer management interface with search/filter functionality --done
127. Implemented sessionStorage fallback for customer ID parameter passing --done
128. Fixed session timeout configuration to read from app.json (300 seconds) --done
129. Removed debugging code from customer management pages --done
130. Fixed authentication flow to properly redirect to login page when not authenticated --done

## v1.31 Release
121. Fixed database connection hardcoded reference to use environment variable --done
122. Updated authMiddleware to use UnifiedUserManager instead of old UserManager --done
123. Added role-based access control for admin pages (index.html) --done
124. Completed T11 and T12 unified authentication tests --done

## v1.30 Release
098. Created downloads directory for AIPS installer files --done
099. Copied installer to custmgr client downloads folder --done
100. Added download button to verification success screen --done
101. Created sendWelcomeEmail method with license info and download link --done
102. Integrated welcome email into verification flow --done
103. Created TrialNotificationService for expiration warnings --done
104. Added sendTrialExpirationEmail for 7/3/1 day warnings --done
105. Added sendGracePeriodEmail for expired trials --done
106. Implemented grace period handling (7 days after expiry) --done
107. Scheduled trial checks to run daily at midnight --done
108. Created Phase 1 test plan with 10 comprehensive test cases --done
109. Added password_hash, role, active, reset_token fields to customers table --done
110. Updated customer registration form with password fields and validation --done
111. Added password validation (8+ chars, upper, lower, number) --done
112. Created forgot password functionality with email reset --done
113. Added password reset email templates --done
114. Created reset-password.html page --done
115. Added customer login validation method --done
116. Consolidated to single aiprivatesearch database --done
117. Created unified users and sessions tables --done
118. Updated all database connections to use aiprivatesearch --done
119. Created UnifiedUserManager for admin and customer auth --done
120. Updated auth routes to use unified authentication --done
023. Add password_hash and role fields to customers table in aiprivatesearch DB --done
024. Update customer registration to include password creation --done
030. Update welcome email to include custmgr login instructions --done

## v1.29 Release
091. Created optimal database schema for customer lifecycle management --done
092. Updated licensing-db.mjs with trial support and proper table structure --done
093. Added customers table with email verification fields --done
094. Added licenses table with trial status and grace period support --done
095. Added payments table for PayPal transaction tracking --done
096. Created comprehensive Phase 1 test plan with 10 test cases --done
097. Documented optimal schema in docs/database/optimal-schema.sql --done
1.1. Update database schema for trial support (customers, licenses, payments tables) --done
1.3. Set license status to 'trial' instead of 'active' for new registrations --done
1.4. Add trial_started_at timestamp to licenses --done
1.5. Define AIPS installer download URL in .env-custmgr --done
1.6. Add download link to verification success screen --done
1.7. Include download link in welcome email --done
1.8. Send welcome email after successful verification with trial info --done
1.9. Add trial expiration date to welcome email --done
1.10. Implement trial expiration warnings (7, 3, 1 day before expiry) --done
1.11. Add grace period handling (7 days after trial expires) --done
1.12. Create email notifications for expiring trials --done

## v1.28 Release
083. Fixed database connection to use DB_USERNAME instead of DB_USER --done
084. Fixed customerManager.mjs to use correct DB credentials --done
085. Added extensive debug logging to connection.mjs for troubleshooting --done
086. Removed fallback defaults - must use .env-custmgr values --done
087. Fixed user-management.html API_BASE for production (relative paths) --done
088. Added trust proxy setting for rate limiting behind Caddy --done
089. Added automatic session cleanup job (runs every minute) --done
090. Confirmed 5-minute session timeout is working correctly --done

## v1.27 Release
079. Created separate .env files for different apps (.env-custmgr and .env-aips) --done
080. Updated custmgr server to load .env-custmgr instead of .env --done
081. Updated aips server to load .env-aips instead of .env --done
082. Separated database/email config (custmgr) from API keys only (aips) --done

## v1.26 Release
072. Fixed email address typo - changed aiaprivatesearch to aiprivatesearch --done
073. Created email test page at /email-test.html for testing email functionality --done
074. Added /api/test/send-email endpoint for email testing --done
075. Configured Gmail SMTP with explicit host/port settings --done
076. Fixed email password format - Gmail app passwords require spaces --done
077. Added debug logging to EmailService and test routes --done
078. Bypassed authentication for email-test page and test endpoints --done

## v1.25 Release

## v1.24 Release
057. Fixed register endpoint 404 error - API_BASE now uses full URL for localhost --done
058. Fixed CORS error for DELETE/PUT methods - added to allowed methods in server.mjs --done
059. Replaced insecure confirm() with secureConfirm() for delete user confirmation --done
060. Matched container width to aiprivatesearch user-management (1200px max-width) --done
061. Fixed syntax error in common.js (extra closing brace) --done
062. Updated security-check.sh to filter out false positive password warnings --done
063. Created customer registration page with email, phone, city, state, postal code fields --done
064. Created CustomerManager class to handle customer registration and license creation --done
065. Added /api/customers/register endpoint for public customer registration --done
066. Auto-create 60-day Standard tier (tier 1) license for new customers --done
067. Modified registration to return license key for aips activation --done
068. Added handling for existing customers - returns existing license info --done
069. Added email verification with 6-digit code (15 min expiry) --done
070. Created EmailService to send verification codes via aiaprivatesearch@gmail.com --done
071. Added /api/customers/verify-email endpoint --done

## v1.23 Release
050. Added debugging logs to auth.js and server middleware for troubleshooting --done
051. Fixed root path redirect - server and client now redirect / to user-management.html --done
052. Fixed login flow - after successful login, redirects to index.html (home page) --done
053. Removed tier access manager from common.js - not needed in customer manager app --done
054. Fixed user-management.html to check session on load - shows dashboard if already logged in --done
055. Removed 'Back to Dashboard' link from user-management page header --done
056. Changed user icon to direct link - clicking goes straight to user-management (no dropdown) --done

## Completed Tasks
001. create github repo and commit and sync changes --done
002. setup start.sh script and fix missing dependencies --done
003. verify that ports are 56303 and 56304 --done
004. Read /Users/Shared/AIPrivateSearch/repo/aiprivatesearchweb/start.sh and modify this app'a start.sh for the ubuntu test --done
005. from /Users/Shared/AIPrivateSearch/repo/aiprivatesearchweb bring the pm2 realeted files and modify if neccessary for this app --done
006. change app name to aipscust from custmgr --done
007. configure PM2 for separate frontend/backend processes --done
008. debug and verify both servers running on correct ports --done
009. install and test on ubuntu server --done
010. lets add a login to custmgr. Craete a new database aiprivatesearchcustmgr. add the user, log and other needed tables there. use the same login approach as in aiprivatesearch. If not logged in show login page. Create account adm-custmgr@a.com password 123 role admin. There will be 2 roles: admin and manager. there will be no tier as in aiprivatesearch --done
012. Added Sherlock icons  --done
013. Implemented standardized footer with dynamic loading across all pages --done
014. Added dark/light mode support with proper CSS variables --done
015. Created template review and recommendations documentation --done
016. Fixed footer styling consistency and link colors in dark mode --done
017. Added user management styles and improved form styling --done
018. Updated Coming Soon text color to gold and resized logout button --done
019. Fixed API configuration to use hostname instead of localhost for Ubuntu server deployment --done
020. Updated API configuration to use same protocol (HTTPS) to resolve Mixed Content security errors --done
021. Implemented production-ready API routing using relative paths compatible with Caddy reverse proxy --done
022. Fixed API endpoint paths to prevent double /api prefix and maintain dev/prod compatibility --done
023. Complete comprehensive app review documentation --done
024. Reviewed JWT token plan and adjusted custmgr implementation --done
025. Enhanced JWT payload with tier info, features, device limits, and all standard claims --done
026. Added devices table for device tracking and management --done
027. Implemented tier checking with checkCustomerLimits method --done
028. Added device limit enforcement (2/5/10 devices for standard/premium/professional) --done
029. Created /api/licensing/check-limits endpoint --done
030. Added refresh token support (24-hour access tokens, 30-day refresh tokens) --done
031. Added second admin account custmgr-adm@c.com password 123 for production login --done
032. Replaced logout button with user icon dropdown menu on index page --done
033. Copied and adapted user-management functionality from aiprivatesearch --done
034. Removed subscription tier references, kept admin/manager roles only --done
035. Fixed user-management.html to work standalone without shared components --done
036. Added user management API endpoints (register, list, update, delete) --done
037. Added user management methods to UserManager class --done
038. Updated auth routes to match aiprivatesearch pattern (userRole, userId, consistent errors) --done
039. Fixed user-management API calls to use backend URL (http://localhost:56304) --done
040. Set dark mode as default theme on user-management page --done
041. Added role dropdown, edit, deactivate buttons to user management (matching aiprivatesearch) --done
042. Replaced alert/prompt with secure modal dialogs and toast messages (no security violations) --done
043. Moved all inline styles to styles.css using CSS classes (secure-modal, toast-message) --done
044. Reduced button widths to auto (label width) on user-management page --done
045. Fixed user action buttons (Go to Application, Edit, Deactivate, Delete) to auto-width --done
046. Fixed user icon dropdown - clicking icon no longer logs out, only logout link does --done
047. Fixed auth.js to not redirect from index.html (allow dashboard access without forced login) --done
048. Fixed user icon dropdown event handling - removed inline onclick, using addEventListener --done
049. Changed app entry point to user-management.html - requires login before accessing dashboard --done
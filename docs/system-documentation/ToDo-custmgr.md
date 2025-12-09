## Pending Tasks
018. Test enhanced JWT tokens and device limit enforcement on Ubuntu server
019. Create admin dashboard for device management
020. check conatcts pages etc for auth.
022. create payment process using paypal.





=====================================================

## v1.28 Release (Current)
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
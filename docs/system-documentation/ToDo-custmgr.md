## Pending Tasks

### Stripe Live Mode
- [ ] S26. Switch to Stripe live mode and retest

=====================================================

## v1.66 Release (Current)
288. Fixed ESLint errors — 2 empty catch blocks resolved --done
289. Removed unused imports: fs, path from unifiedUserManager.mjs; crypto, adminUsers, defaultPassword from init.mjs --done
290. Removed unused validateCSRFToken import from server.mjs --done
291. Simplified session cleanup interval — removed unnecessary UnifiedUserManager import --done
292. Prefixed intentional unused catch vars with underscore (_e, _error) --done
293. Deleted legacy unused files: userManager.mjs, subscriptionManager.mjs --done
294. ESLint result: 0 errors, 4 warnings (all intentional _prefixed catch vars) --done

## v1.65 Release
277. Added previewUpgrade to stripeService.mjs — calls Stripe retrieveUpcoming for exact proration --done
278. Added POST /api/payments/preview-upgrade endpoint --done
279. Updated change-tier.html — shows full proration breakdown before confirming upgrade --done
280. Upgrade preview shows: unused credit, new plan cost, total due today, renewal date --done
281. Downgrade shows renewal date message, no charge preview --done
282. Trial customers routed to Stripe checkout, existing subscribers use update-subscription --done
283. Completed Stripe payment processing setup S1-S25 --done
284. Created aips-stripe-setup.md documentation --done
285. Removed Coming Soon from index.html, changed header to AI Private Search --done
286. Added invoice.paid webhook handler to record upgrade/renewal payments in DB --done
287. Added customer.subscription.updated webhook handler --done

## v1.64 Release
268. Added updateSubscription and getSubscriptionId to stripeService.mjs --done
269. Added customer.subscription.updated webhook handler to sync tier changes --done
270. Added POST /api/payments/update-subscription endpoint --done
271. Added GET /api/payments/subscription-status endpoint --done
272. Rewrote change-tier.html — current tier greyed out, upgrade/downgrade messaging, pricing policy section --done
273. Smart routing — existing subscribers use update-subscription, new subscribers use Stripe checkout --done
274. Added tier change success toast on my-account.html when redirected back --done
275. Added customer.subscription.updated event to Stripe webhook --done
276. Removed Coming Soon from index.html, changed header to AI Private Search --done

## v1.63 Release
261. Fixed payment history button — replaced innerHTML with DOM methods, removed inline onclick handlers --done
262. Fixed payment history section position — now appears before Manage Devices --done
263. Added close button to payment history section --done
264. Matched Payment History button color to Change Tier button --done
265. Fixed CSP frameSrc — removed invalid 'none' combined with Stripe domain --done
266. Updated stripeService.mjs to support STRIPE_MODE (test/live) with separate credential sets --done
267. Marked S9-S21 Stripe implementation steps complete --done

## v1.62 Release
251. Created lib/payments/stripeService.mjs (createCheckoutSession, handleWebhook, getPaymentHistory) --done
252. Created routes/payments.mjs (POST /create-checkout, POST /webhook, GET /history/:customerId) --done
253. Created payments table in DB --done
254. Registered payments route in server.mjs --done
255. Registered Stripe webhook raw body parser before JSON parser in server.mjs --done
256. Added webhook to public routes (no auth required) in server.mjs --done
257. Added Stripe domains to Helmet CSP (js.stripe.com, api.stripe.com) --done
258. Rewrote change-tier.html with real Stripe checkout, $49/$199/$499/year prices, fixed auth redirect --done
259. Rewrote payment-confirm.html with success/pending/failure states based on webhook result --done
260. Replaced showPaymentHistory stub on my-account.html with real inline payment history table --done

## v1.61 Release
245. Changed registration flow — customer not saved to DB until email verified --done
246. Pending registrations stored in server memory Map, DB insert only on successful verify --done
247. Added resendVerificationCode method to customerManager.mjs --done
248. Added POST /api/customers/resend-verification endpoint --done
249. Added Resend Code link to verification form in customer-registration.html --done
250. Fixed customer-registration.html login links to point to /login.html --done

## v1.60 Release (Current)
238. Completed Phase 1 Testing — T5, T6, T7, T8, T9 all passed --done
239. Completed Unified Auth Testing — T15, T17 all passed --done
240. Added Forgot Password link to login.html --done
241. Fixed reset-password.html to redirect to /login.html instead of /user-management.html --done
242. Fixed trial expiration email upgrade URL to point to /login.html --done
243. Fixed emailService.mjs welcome email login link to point to /login.html --done
244. Added Google Fonts to Helmet CSP (styleSrc, styleSrcElem, fontSrc) --done

## v1.58 Release
237. Fixed settings.html number input spinner arrows — added CSS for all browsers (webkit + moz) --done

## v1.57 Release
229. Created settings.json with configurable system settings (trial_period_days, grace_period_days, verification_expiry_minutes, password_reset_expiry_minutes, trial_warning_days, device_limits, session timeouts, download_url, upgrade_url) --done
230. Created settings-loader.mjs with strict validation — server refuses to start if settings invalid --done
231. Updated 7 server files to use getSettings() instead of hardcoded values --done
232. Fixed trialNotificationService.mjs to query customers table (not deleted licenses table) --done
233. Fixed UnifiedUserManager session timeout to lazy-load getSettings() — avoids startup error --done
234. Settings page (settings.html) updated to editable form with Save All button and inline validation --done
235. Removed spinner arrows from number inputs on settings edit form --done
236. Fixed eslint-plugin-security missing package — pre-commit hook ERR_MODULE_NOT_FOUND resolved --done

## v1.55 Release
216. Added Change Password field to My Account - Account Information section --done
217. Removed npx serve frontend process — Express now serves static files and API on port 56304 --done
218. Fixed static file path in server.mjs --done
219. Stripped server-side page auth middleware — client-side handles all page auth --done
220. Added scriptSrcAttr unsafe-inline to Helmet CSP for inline onclick handlers --done
221. Fixed app.json path in unifiedUserManager.mjs --done
222. Updated Caddy config to route all traffic to port 56304 --done
223. Removed aipscust-c56303 from ecosystem.config.cjs --done
224. Fixed login redirect loop caused by common.js clearing session --done
225. Fixed serve.json with cleanUrls: false --done
226. Built System Settings page (settings.html) displaying all hardcoded system values --done
227. Created routes/settings.mjs API endpoint --done
228. Wired up Settings button on admin dashboard --done

## v1.54 Release
206. Built System Analytics page (analytics.html) with customer, license, tier, device, registration and geographic stats --done
207. Created routes/analytics.mjs with 6 SQL queries --done
208. Wired up Analytics button on admin dashboard --done
209. Fixed customer-management search/filter (email, tier, status) --done
210. Verified DB_USERNAME=aips-readwrite on Ubuntu server --done
211. Checked contacts pages for auth — contact.html kept public (footer link) --done
212. Updated contact.html to use support@aiprivatesearch.com, removed personal PII --done
213. Marked 023 done — customer-management search fixed --done
214. Marked 035 done — aips-readwrite confirmed --done
215. Marked 040 done — analytics built --done

## v1.53 Release (Current)
189. Phase 1 Testing T1 — Customer Registration Flow --done
190. Phase 1 Testing T2 — Download Link Verification (updated URL to DMG) --done
191. Phase 1 Testing T3 — Database Schema Validation --done
192. Phase 1 Testing T4 — Email Templates --done
193. Phase 1 Testing T10 — Production Deployment Test (Ubuntu) --done
194. Unified Auth T11 — Single Database Verification --done
195. Unified Auth T12 — Admin Login Test --done
196. Unified Auth T13 — Customer Registration with Password --done
197. Unified Auth T14 — Customer Login and Self-Management --done
198. Unified Auth T16 — Role-Based Access Control --done
199. Removed Device Management and Token Management cards from admin dashboard --done
200. Updated ToDo completed items to v1.52 release section --done
201. Fixed trialNotificationService.mjs — updated to query 'customers' table instead of deleted 'licenses' table --done
202. Removed Dashboard Device Management card (built into customer-edit) --done
203. Fixed customer-management.html row click — navigates to customer-edit.html --done
204. Removed group.html — not needed --done
205. Removed email-test.html — not needed in production --done

## v1.52 Release
175. Removed all JWT licensing code (jwt-manager.mjs deleted, tier-helpers.mjs created) --done
176. Rewrote licensing-service.mjs — device-based only, removed activateLicense/refreshLicense/revokeLicense/validateLicense --done
177. Rewrote routes/licensing.mjs — removed /activate, /refresh, /validate, /revoke, /public-key endpoints --done
178. Fixed check-limits query — device_id column replaced with device_uuid --done
179. Fixed register-device — ipAddress and pcCode default to null to prevent MySQL bind error --done
180. Added Remove button and device name column to customer-edit.html device list --done
181. Updated customers route devices query to return device_name and pc_code --done
182. Updated my-account.html to show device name instead of Device ID --done
183. Removed Device Management and Token Management cards from admin dashboard --done
184. Updated download links to https://aiprivatesearch.com/downloads/AIPrivateSearch.dmg --done
185. Fixed welcome email fallback download URL to DMG --done
186. Completed all 23 remote licensing tests (AIPS-Remote-Testing-Plan-v1.49.md) --done
187. Marked completed tasks 018, 021, 025-034, 039 as done in ToDo --done
188. Updated aips-custmgr-licensing-plan.md to current implementation state --done

## v1.47 Release
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
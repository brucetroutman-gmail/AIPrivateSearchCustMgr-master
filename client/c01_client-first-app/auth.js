// Auth utility functions
function getSessionId() {
    return localStorage.getItem('sessionId');
}

function setAuthHeaders() {
    const sessionId = getSessionId();
    if (sessionId) {
        return {
            'Authorization': `Bearer ${sessionId}`,
            'Content-Type': 'application/json'
        };
    }
    return {
        'Content-Type': 'application/json'
    };
}

function logout() {
    localStorage.removeItem('sessionId');
    window.location.href = '/login.html';
}

// Check auth on page load
document.addEventListener('DOMContentLoaded', () => {
    const sessionId = getSessionId();
    const path = window.location.pathname;
    console.log('[AUTH.JS] Path:', path, 'SessionId:', sessionId ? 'exists' : 'none');
    
    // Pages that don't require authentication
    const publicPages = [
        '/login.html',
        '/user-management.html',
        '/customer-registration.html',
        '/reset-password.html',
        '/change-tier.html',
        '/payment-confirm.html',
        '/privacy-policy.html',
        '/terms-of-service.html',
        '/contact.html'
    ];
    
    // If on root path, redirect to login
    if (path === '/') {
        window.location.href = '/login.html';
        return;
    }
    
    // Check if current page is public
    const isPublicPage = publicPages.some(page => path.includes(page));
    
    // Redirect to user-management.html if not logged in and not on a public page
    if (!sessionId && !isPublicPage) {
        console.log('[AUTH.JS] No session, redirecting to user-management.html');
        window.location.href = '/user-management.html';
    } else {
        console.log('[AUTH.JS] Auth check passed, staying on', path);
    }
});
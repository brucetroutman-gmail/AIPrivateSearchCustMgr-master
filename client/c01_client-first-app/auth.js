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
    
    // If on root path without session, redirect to user-management
    if (path === '/' && !sessionId) {
        console.log('[AUTH.JS] Root path without session, redirecting to user-management.html');
        window.location.href = '/user-management.html';
        return;
    }
    
    // Redirect to user-management.html if not logged in (except if already on user-management.html)
    if (!sessionId && !path.includes('user-management.html')) {
        console.log('[AUTH.JS] No session, redirecting to user-management.html');
        window.location.href = '/user-management.html';
    } else {
        console.log('[AUTH.JS] Auth check passed, staying on', path);
    }
});
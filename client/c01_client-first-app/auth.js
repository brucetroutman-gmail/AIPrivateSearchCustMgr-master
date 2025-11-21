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
    if (!sessionId && !window.location.pathname.includes('login.html')) {
        window.location.href = '/login.html';
    }
});
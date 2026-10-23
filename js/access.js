// Capture before page action handlers, so suspended sessions cannot keep acting.
document.addEventListener('submit', checkAccess, true);
document.addEventListener('click', checkAccess, true);
function checkAccess(e) {
    if (!activeSession()) { e.preventDefault(); e.stopImmediatePropagation(); logout(); location.href = 'login.html'; }
}

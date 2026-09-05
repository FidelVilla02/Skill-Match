// Login / Register form handling

document.addEventListener('DOMContentLoaded', () => {

    // ---------- REGISTER ----------
    const registerForm = document.getElementById('registerForm');

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const fullName = document.getElementById('fullName').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (!fullName || !email || !password || !confirmPassword) {
                alert('Please fill out all fields.');
                return;
            }

            if (password.length < 6) {
                alert('Password must be at least 6 characters long.');
                return;
            }

            if (password !== confirmPassword) {
                alert('Passwords do not match.');
                return;
            }

            // Save account to localStorage
            const users = JSON.parse(localStorage.getItem('smUsers') || '[]');

            if (users.some(u => u.email === email)) {
                alert('An account with this email already exists.');
                return;
            }

            users.push({ fullName, email, password });
            localStorage.setItem('smUsers', JSON.stringify(users));

            alert('Account created successfully! You can now log in.');
            window.location.href = 'login.html';
        });
    }

    // ---------- LOGIN ----------
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            if (!email || !password) {
                alert('Please enter your email and password.');
                return;
            }

            const users = JSON.parse(localStorage.getItem('smUsers') || '[]');
            const user = users.find(u => u.email === email && u.password === password);

            if (!user) {
                alert('Invalid email or password.');
                return;
            }

            // Store logged-in user
            localStorage.setItem('smCurrentUser', JSON.stringify({ email: user.email, fullName: user.fullName }));
            alert('Login successful! Welcome back.');
            window.location.href = 'dashboard.html';
        });
    }

});
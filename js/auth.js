// Login / Register. Loads on both login.html and register.html.

document.addEventListener('DOMContentLoaded', () => {

    const registerForm = document.getElementById('registerForm');

    // ---------- REGISTER ----------

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const fullName = val('fullName');
            const username = val('username');
            const email = val('email');
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const role = (e.submitter && e.submitter.dataset.role) === 'employer' ? 'employer' : 'jobseeker';

            if (!fullName || !username || !email || !password || !confirmPassword) {
                toast('Please fill in all the fields.', 'danger');
                return;
            }

            const formatError = validateUsername(username);
            if (formatError) {
                toast(formatError, 'danger');
                return;
            }

            if (password.length < 6) {
                toast('Password must be at least 6 characters.', 'danger');
                return;
            }

            if (password !== confirmPassword) {
                toast('Passwords do not match.', 'danger');
                return;
            }

            if (findUserByEmail(email)) {
                toast('An account with this email already exists.', 'danger');
                return;
            }

            if (findUserByUsername(username)) {
                toast('That user name is already taken. Try another one.', 'danger');
                return;
            }

            // Profile details (skills, or business info) are filled in on the
            // profile page after signing in, so both blocks start empty here.
            const user = {
                fullName: fullName,
                username: username,
                email: email,
                password: password,
                role: role,
                seeker: {
                    headline: '',
                    skills: [],
                    experience: 'Some experience',
                    education: 'Prefer not to say',
                    certifications: '',
                    location: '',
                    phone: '',
                    bio: ''
                },
                employer: {
                    businessName: '',
                    industry: '',
                    businessType: 'Small Business',
                    businessSize: '1-10 employees',
                    about: '',
                    address: '',
                    contactPhone: ''
                }
            };

            const users = getUsers();
            users.push(user);
            saveUsers(users);

            sessionStorage.setItem('smJustRegistered', JSON.stringify({ role: role, name: fullName }));
            window.location.href = 'login.html';
        });
    }

    // ---------- LOGIN PAGE EXTRAS ----------

    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        const remember = document.getElementById('rememberMe');
        const banner = document.getElementById('welcomeBanner');
        const demoToggle = document.getElementById('demoToggle');
        const demoPanel = document.getElementById('demoPanel');

        // Shown right after registering, so the next step is obvious
        const justRegistered = sessionStorage.getItem('smJustRegistered');
        if (banner && justRegistered) {
            const info = JSON.parse(justRegistered);
            const next = info.role === 'employer'
                ? ' add your business details so applicants see the right name.'
                : ' add your skills so we can start matching you to jobs.';
            banner.hidden = false;
            banner.textContent = 'Account created, ' + info.name + '. Log in to get started, then' + next;
        }

        if (demoToggle && demoPanel) {
            demoToggle.addEventListener('click', () => {
                const open = demoPanel.hidden;
                demoPanel.hidden = !open;
                demoToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
                demoToggle.textContent = open ? 'Hide demo accounts' : 'Show demo accounts';
            });
        }

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const email = val('email');
            const password = document.getElementById('password').value;

            if (!email || !password) {
                toast('Please enter your email and password.', 'danger');
                return;
            }

            const user = findUserByEmail(email);

            if (!user || user.password !== password) {
                toast('Incorrect email or password.', 'danger');
                return;
            }

            setSession(user, !!(remember && remember.checked));

            sessionStorage.removeItem('smJustRegistered');

            window.location.href = user.role === 'employer' ? 'dashboard.html' : 'jobs.html';
        });
    }

});
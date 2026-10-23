// Central data layer. All localStorage access lives here.
// KEY DESIGN NOTE: this is a frontend-only build, so data lives in the browser
// of whoever is demoing. Seeded demo accounts exist so the full hiring pipeline
// (apply -> shortlist -> interview -> hire) can be shown on one machine.

// Bump this whenever the demo dataset changes shape, so returning visitors
// are reseeded instead of being stuck with stale records. Declared before KEYS
// so the seed marker key is derived from it and can never drift out of sync.
const SEED_VERSION = 'v5';

const KEYS = {
    users: 'smUsers',
    jobs: 'smJobs',
    applications: 'smApplications',
    notifications: 'smNotifications',
    session: 'smCurrentUser',
    seedVersion: 'smSeeded_' + SEED_VERSION
};

const DEMO_PASSWORD = 'demo123';

// ---------- RAW ACCESS ----------

function read(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        const parsed = JSON.parse(raw);
        return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (err) {
        return fallback;
    }
}

function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// ---------- USERS ----------

function getUsers() {
    return read(KEYS.users, []);
}

function saveUsers(list) {
    write(KEYS.users, list);
}

function findUserByEmail(email) {
    const needle = String(email || '').trim().toLowerCase();
    return getUsers().find(u => String(u.email).toLowerCase() === needle) || null;
}

// User names are unique and case-insensitive, so "Delia.Ramos" and
// "delia.ramos" cannot both exist.
function findUserByUsername(username) {
    const needle = String(username || '').trim().toLowerCase();
    if (!needle) return null;
    return getUsers().find(u => String(u.username || '').toLowerCase() === needle) || null;
}

// ---------- SESSION ----------

function getSession() {
    const local = read(KEYS.session, null);
    if (local) return local;

    // sessionStorage holds a JSON string, so it must be parsed too.
    const raw = sessionStorage.getItem(KEYS.session);
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch (err) {
        sessionStorage.removeItem(KEYS.session);
        return null;
    }
}

function setSession(user, remember) {
    const payload = JSON.stringify({
        email: user.email,
        fullName: user.fullName,
        username: user.username,
        role: user.role || 'jobseeker'
    });

    if (remember) {
        localStorage.setItem(KEYS.session, payload);
        sessionStorage.removeItem(KEYS.session);
    } else {
        localStorage.removeItem(KEYS.session);
        sessionStorage.setItem(KEYS.session, payload);
    }
}

function logout() {
    localStorage.removeItem(KEYS.session);
    sessionStorage.removeItem(KEYS.session);
}

// Route guard. Returns the session, or redirects and returns null.
// role omitted = any signed-in role may view the page (used by profile.html).
function requireRole(role) {
    const user = getSession();

    if (!user) {
        window.location.href = 'login.html';
        return null;
    }

    const me = findUserByEmail(user.email);
    if (!me || me.accountStatus === 'suspended') {
        logout(); window.location.href = 'login.html'; return null;
    }
    user.role = me.role;
    if ((role && user.role !== role) || (!role && user.role === 'admin')) {
        window.location.href = roleHome(user.role); return null;
    }

    return user;
}

// Full user record (including profile) for the logged-in email
function getMe() {
    const session = getSession();
    return session ? findUserByEmail(session.email) : null;
}

function updateMe(patch) {
    const session = getSession();
    if (!session) return null;

    const users = getUsers();
    const needle = String(session.email || '').trim().toLowerCase();
    const idx = users.findIndex(u => String(u.email || '').trim().toLowerCase() === needle);
    if (idx === -1) return null;

    const role = users[idx].role || 'jobseeker';
    const profileKey = role === 'employer' ? 'employer' : 'seeker';

    users[idx][profileKey] = Object.assign({}, users[idx][profileKey] || {}, patch[profileKey] || {});
    Object.assign(users[idx], patch.top || {});
    saveUsers(users);

    return users[idx];
}

// ---------- JOBS ----------

function getJobs() {
    return read(KEYS.jobs, []);
}

function saveJobs(list) {
    write(KEYS.jobs, list);
}

function getJob(jobId) {
    return getJobs().find(j => j.id === jobId) || null;
}

function getMyJobs(email) {
    const owner = String(email || '').toLowerCase();
    return getJobs().filter(j => String(j.employer || '').toLowerCase() === owner);
}

function addJob(job) {
    const all = getJobs();
    all.unshift(job);
    saveJobs(all);
    return job;
}

function deleteJob(jobId) {
    saveJobs(getJobs().filter(j => j.id !== jobId));

    // Applications for a deleted job are meaningless - drop them too
    write(KEYS.applications, getApplications().filter(a => a.jobId !== jobId));
}

function countApplicants(jobId) {
    return getApplications().filter(a => a.jobId === jobId).length;
}

// ---------- APPLICATIONS ----------

function getApplications() {
    return read(KEYS.applications, []);
}

function saveApplications(list) {
    write(KEYS.applications, list);
}

function getApplicationsForJob(jobId) {
    return getApplications().filter(a => a.jobId === jobId);
}

function getMyApplications(seekerEmail) {
    const mine = String(seekerEmail || '').toLowerCase();
    return getApplications().filter(a => String(a.seekerEmail || '').toLowerCase() === mine);
}

function hasApplied(jobId, seekerEmail) {
    const mine = String(seekerEmail || '').toLowerCase();
    return getApplications().some(a =>
        a.jobId === jobId &&
        String(a.seekerEmail || '').toLowerCase() === mine &&
        a.status !== 'Withdrawn'
    );
}

function addApplication(app) {
    const all = getApplications();
    all.unshift(app);
    saveApplications(all);
    return app;
}

function findApplication(appId) {
    return getApplications().find(a => a.id === appId) || null;
}

function setApplicationStatus(appId, status, extra) {
    const all = getApplications();
    const app = all.find(a => a.id === appId);
    if (!app) return null;

    const changed = app.status !== status;

    app.status = status;
    Object.assign(app, extra || {});

    // Record the transition so the seeker timeline stays accurate, but never
    // duplicate the entry when a page re-saves the same status.
    if (changed) {
        if (!Array.isArray(app.history)) app.history = [];
        app.history.push({ status: status, at: new Date().toISOString() });
    }

    saveApplications(all);
    notify(app.seekerEmail, app.jobTitle, status);

    return app;
}

// ---------- NOTIFICATIONS ----------

function getNotifications(email) {
    const list = read(KEYS.notifications, []);
    const mine = String(email || '').toLowerCase();
    return list.filter(n => String(n.email || '').toLowerCase() === mine);
}

function notify(email, jobTitle, status) {
    if (!email) return;

    const list = read(KEYS.notifications, []);

    // Whole sentences, so nothing reads as "you were hired you for X".
    const messages = {
        Shortlisted: 'You were shortlisted for ' + jobTitle + '. The employer can now see your contact details.',
        Interview: 'You were invited to an interview for ' + jobTitle + '.',
        Hired: 'You were hired for ' + jobTitle + '. Congratulations!',
        Rejected: 'Your application for ' + jobTitle + ' was closed. Keep applying, other roles are waiting.',
        Withdrawn: 'You withdrew your application for ' + jobTitle + '.'
    };

    list.unshift({
        id: newId('ntf'),
        email: email,
        text: messages[status] || ('Your application for ' + jobTitle + ' is now ' + status + '.'),
        createdAt: new Date().toISOString(),
        read: false
    });

    write(KEYS.notifications, list);
}

// ---------- SEED ----------

function daysAgo(n) {
    return new Date(Date.now() - n * 86400000).toISOString();
}

function demoUsers() {
    return [
        {
            fullName: 'Delia Ramos',
            username: 'delia.ramos',
            email: 'demo@toledo.ph',
            password: DEMO_PASSWORD,
            role: 'employer',
            employer: {
                businessName: 'Ramos Mini Mart & Salon',
                industry: 'Retail & Sales',
                businessType: 'Small Business',
                businessSize: '1-10 employees',
                about: 'Family-run sari-sari store and beauty salon in Poblacion, Toledo. Looking for dependable help at the counter, on the floor, and in the salon.',
                address: 'Poblacion, Toledo, Cebu',
                contactPhone: '0917 555 0142'
            }
        },
        {
            fullName: 'Ernesto Dela Cruz',
            username: 'ernesto.dc',
            email: 'farm@toledo.ph',
            password: DEMO_PASSWORD,
            role: 'employer',
            employer: {
                businessName: 'Toledo Valley Farm',
                industry: 'Farming & Poultry',
                businessType: 'Small Business',
                businessSize: '1-10 employees',
                about: 'Rice and poultry farm in the outskirts of Toledo. Looking for someone dependable who is comfortable with early mornings and outdoor work.',
                address: 'Tabokan, Toledo, Cebu',
                contactPhone: '0917 555 0147'
            }
        },
        {
            fullName: 'Grace Lim',
            username: 'grace.lim',
            email: 'grace@email.ph',
            password: DEMO_PASSWORD,
            role: 'jobseeker',
            seeker: {
                headline: 'Cashier and store assistant - 1 yr',
                skills: ['Cash Handling', 'Stock Inventory', 'Customer Service'],
                experience: 'Entry-level',
                education: 'High School',
                certifications: '',
                location: 'Poblacion, Toledo, Cebu',
                phone: '0917 555 0144',
                bio: 'Looking for stable work close to home. Fast learner, used to busy counters, and I can start immediately.'
            }
        },
        {
            fullName: 'Rhea Alinsunurin',
            username: 'rhea.alinsunurin',
            email: 'rhea@email.ph',
            password: DEMO_PASSWORD,
            role: 'jobseeker',
            seeker: {
                headline: 'Farm helper - experienced with poultry and rice',
                skills: ['Poultry Care', 'Feeding & Cleaning', 'Harvesting', 'Landscaping', 'Heavy Lifting'],
                experience: 'Experienced',
                education: 'High School',
                certifications: 'Farm-related training, Barangay Youth Skills Program',
                location: 'Toledo, Cebu',
                phone: '0917 555 0133',
                bio: 'Grew up on a farm in Leyte and worked two seasons here in Toledo. Comfortable with early mornings and outdoor work.'
            }
        },
        {
            fullName: 'Maria Santos',
            username: 'maria.santos',
            email: 'maria@email.ph',
            password: DEMO_PASSWORD,
            role: 'jobseeker',
            seeker: {
                headline: 'Beautician and salon assistant',
                skills: ['Hair Styling', 'Haircutting', 'Manicure', 'Salon Assistant', 'Customer Service'],
                experience: 'Some experience',
                education: 'Senior High School',
                certifications: 'TESDA NC II Hair and Makeup',
                location: 'Poblacion, Toledo, Cebu',
                phone: '0917 555 0121',
                bio: 'Trained in hairstyling and have helped at a neighbouring salon for over a year. Reliable and cheerful with clients.'
            }
        }
    ];
}

function demoJobs() {
    return [
        {
            id: 'job_seed_farm01',
            title: 'Farmer / Poultry Farm Helper',
            company: 'Toledo Valley Farm',
            category: 'Farming & Poultry',
            location: 'Tabokan, Toledo, Cebu',
            description: 'Help look after our rice field and chicken flock. Early morning work, outdoors all day. No diploma needed - we will train you.',
            responsibilities: 'Feed and water the flock. Clean the coops twice a day. Help during planting and harvest.',
            benefits: 'Meals during shift, free work clothes',
            employmentType: 'Full-time',
            workSetup: 'On-site',
            salary: 'PHP 450 - 550 / day',
            salaryType: 'Daily',
            salaryDisclosed: true,
            skills: ['Poultry Care', 'Feeding & Cleaning', 'Harvesting', 'Farm Work'],
            requirements: [
                { label: 'Physically able to do farm work', required: true },
                { label: 'Can start very early in the morning', required: true },
                { label: 'College diploma', required: false }
            ],
            posted: daysAgo(1),
            status: 'open',
            employer: 'farm@toledo.ph',
            employerName: 'Toledo Valley Farm'
        },
        {
            id: 'job_seed_salon01',
            title: 'Hair Stylist / Beautician',
            company: 'Ramos Mini Mart & Salon',
            category: 'Beautician & Wellness',
            location: 'Poblacion, Toledo, Cebu',
            description: 'Cut, style and colour hair for walk-in clients in our small salon. Training provided if you are new but keen to learn.',
            responsibilities: 'Cut and style hair. Keep the salon tidy and sanitised. Help with the front counter when needed.',
            benefits: 'Free hairstyling course, staff meal',
            employmentType: 'Full-time',
            workSetup: 'On-site',
            salary: 'PHP 16,000 - 19,000',
            salaryType: 'Monthly',
            salaryDisclosed: true,
            skills: ['Hair Styling', 'Haircutting', 'Manicure', 'Salon Assistant', 'Customer Service'],
            requirements: [
                { label: 'Experienced in hair styling or willing to train', required: false },
                { label: 'Friendly and good with walk-in customers', required: true },
                { label: 'TESDA NC II Hair and Makeup', required: false }
            ],
            posted: daysAgo(2),
            status: 'open',
            employer: 'demo@toledo.ph',
            employerName: 'Ramos Mini Mart & Salon'
        }
    ];
}

// ---------- SEED LIFECYCLE ----------

// Writes the demo dataset to storage and records which version is present.
function seedDemoData() {
    saveUsers(demoUsers());
    saveJobs(demoJobs());
    write(KEYS.applications, []);
    write(KEYS.notifications, []);
    localStorage.setItem(KEYS.seedVersion, SEED_VERSION);
    migrateAdminData();
}

// Seed on first visit, and reseed whenever SEED_VERSION changes so returning
// visitors are not stuck with records from an older shape.
function ensureSeeded() {
    if (localStorage.getItem(KEYS.seedVersion) !== SEED_VERSION) {
        seedDemoData();
    }
}

// True while the demo users and jobs are still present and current. The guard
// in utils.js uses this to offer a one-click restore when data goes missing.
function isDemoIntact() {
    return localStorage.getItem(KEYS.seedVersion) === SEED_VERSION &&
        getUsers().length > 0 &&
        getJobs().length > 0;
}

// Wipe the demo records and restore the original set. The session is left
// untouched so whoever is signed in stays signed in after a reset.
function resetDemoData() {
    [KEYS.users, KEYS.jobs, KEYS.applications, KEYS.notifications].forEach(k => {
        localStorage.removeItem(k);
    });
    seedDemoData();
}

// Runs as soon as this file loads on every page. Guarded so a browser with
// storage disabled degrades to an empty (but working) app instead of a crash.
try {
    ensureSeeded();
} catch (err) {
    console.error('Demo seed failed', err);
}
// Add fields without changing SEED_VERSION or erasing existing browser records.
function migrateAdminData() {
    const users = getUsers();
    if (!users.some(u => u.role === 'admin')) users.push({fullName:'SkillMatch Administrator', username:'admin', email:'admin@skillmatch.demo', password:'admin123', role:'admin', accountStatus:'active', createdAt:new Date().toISOString()});
    users.forEach(u => { if (!u.accountStatus) u.accountStatus = 'active'; });
    saveUsers(users);
    const jobs = getJobs();
    jobs.forEach(j => { if (!j.approvalStatus) j.approvalStatus = 'Approved'; });
    saveJobs(jobs);
}
function roleHome(role) { return role === 'admin' ? 'admin.html' : role === 'employer' ? 'dashboard.html' : 'jobs.html'; }
function activeSession(role) {
    const s = getSession(), u = s && findUserByEmail(s.email);
    return !!(u && u.accountStatus !== 'suspended' && (!role || u.role === role));
}
function isVisibleJob(job) {
    const owner = job && findUserByEmail(job.employer);
    return !!(job && job.approvalStatus === 'Approved' && job.status !== 'closed' && owner && owner.accountStatus !== 'suspended');
}
try { migrateAdminData(); } catch (err) { console.error('Admin migration failed', err); }
// Re-check open tabs after account suspension, including same-browser tabs.
if (typeof window !== 'undefined') window.addEventListener('storage', () => {
    if (getSession() && !activeSession()) { logout(); window.location.href = 'login.html'; }
});

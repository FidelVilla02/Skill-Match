function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escAttr(value) {
    return esc(value);
}

// ---------- UNIQUE IDS ----------

function newId(prefix) {
    const rand = Math.random().toString(36).slice(2, 7);
    return prefix + '_' + Date.now().toString(36) + rand;
}

// ---------- SKILL MATCHING ----------

function normSkill(s) {
    return String(s || '').trim().toLowerCase();
}

// Match score = skills + experience only. Education is never scored.
function matchScore(seekerSkills, jobSkills, experience) {
    const mine = (seekerSkills || []).map(normSkill).filter(Boolean);
    const theirs = (jobSkills || []).map(normSkill).filter(Boolean);

    let score = 0;

    if (theirs.length) {
        const hit = theirs.filter(s => mine.includes(s)).length;
        score += Math.round((hit / theirs.length) * 80);
    } else {
        // No skills listed: fall back to experience only
        score += 40;
    }

    score += experienceWeight(experience);
    return Math.max(0, Math.min(100, score));
}

function experienceWeight(experience) {
    switch (experience) {
        case 'Highly experienced': return 20;
        case 'Experienced': return 15;
        case 'Entry-level': return 10;
        case 'Entry level': return 10;
        case 'Some experience': return 12;
        case 'No experience yet': return 5;
        default: return 10;
    }
}

const EXPERIENCE_LEVELS = [
    'No experience yet',
    'Entry-level',
    'Some experience',
    'Experienced',
    'Highly experienced'
];

const EDUCATION_LEVELS = [
    'Prefer not to say',
    'No formal schooling',
    'Primary',
    'High School',
    'Vocational (TESDA/TVET)',
    'College',
    'Graduate',
    'Self-taught'
];

// ---------- APPLICATION STATUS PIPELINE ----------

const STATUS_ORDER = ['Applied', 'Shortlisted', 'Interview', 'Hired'];

const STATUS_META = {
    Pending: { tone: 'warn' },
    Approved: { tone: 'success' },
    Hidden: { tone: 'muted' },
    Applied:     { tone: 'info',    hint: 'Waiting for the employer to review' },
    Shortlisted: { tone: 'primary', hint: 'Employer is interested, contact details shared' },
    Interview:   { tone: 'warn',    hint: 'Interview scheduled' },
    Hired:       { tone: 'success', hint: 'Offer accepted' },
    Rejected:    { tone: 'danger',  hint: 'Not selected this time' },
    Withdrawn:   { tone: 'muted',   hint: 'You withdrew this application' }
};

function statusBadge(status) {
    const meta = STATUS_META[status] || { tone: 'muted' };
    return '<span class="status-badge st-' + esc(meta.tone) + '">' + esc(status || 'Unknown') + '</span>';
}

// Still with the employer, so the applicant can act on it (shortlist, schedule,
// withdraw). Hired is deliberately excluded: the offer is already accepted.
function isOpenStatus(status) {
    return status === 'Applied' || status === 'Shortlisted' || status === 'Interview';
}

// ---------- CATEGORIES (trades-inclusive, grouped) ----------

const CATEGORY_GROUPS = [
    { label: 'Skilled Trades & Technical', items: [
        'Welding & Fabrication', 'Electrical', 'Plumbing', 'Carpentry & Masonry',
        'Painting & Finishing', 'Automotive & Mechanic', 'CNC & Machine Operation'
    ]},
    { label: 'Service & Hospitality', items: [
        'Restaurant & Cooking', 'Hotel & Housekeeping', 'Retail & Sales',
        'Driving & Delivery', 'Security & Guard', 'Beautician & Wellness', 'Garment & Tailoring'
    ]},
    { label: 'Agriculture & Construction', items: [
        'Farming & Poultry', 'Construction & Site Work'
    ]},
    { label: 'Professional & Office', items: [
        'IT & Software', 'Design & Creative', 'Finance & Accounting', 'Admin & HR',
        'Education & Tutoring', 'Healthcare & Nursing', 'Customer Service', 'Engineering'
    ]},
    { label: 'Other', items: [
        'Government & Public Sector', 'Manufacturing & Production',
        'Logistics & Warehouse', 'Other'
    ]}
];

function allCategories() {
    return CATEGORY_GROUPS.reduce((acc, g) => acc.concat(g.items), []);
}

// ---------- DATES ----------

function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) +
        ' · ' + d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

function timeAgo(iso) {
    if (!iso) return '';
    const then = new Date(iso).getTime();
    if (isNaN(then)) return '';
    const mins = Math.floor((Date.now() - then) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs / 24);
    if (days < 7) return days + 'd ago';
    return fmtDate(iso);
}

function matchBadge(score) {
    const n = Number(score) || 0;
    let tone = 'muted';
    if (n >= 75) tone = 'success';
    else if (n >= 50) tone = 'primary';
    else if (n >= 25) tone = 'warn';
    return '<span class="match-badge mb-' + tone + '">' + n + '% match</span>';
}

// ---------- TOASTS ----------

function toastContainer() {
    let box = document.getElementById('toastBox');
    if (!box) {
        box = document.createElement('div');
        box.id = 'toastBox';
        box.className = 'toast-box';
        document.body.appendChild(box);
    }
    return box;
}

function toast(message, tone) {
    const box = toastContainer();
    const el = document.createElement('div');
    el.className = 'toast t-' + (tone || 'info');
    el.setAttribute('role', 'status');
    el.textContent = message;
    box.appendChild(el);

    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 250);
    }, 3200);
}

// ---------- MODAL ----------

function openModal(html, size) {
    closeModal();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modalOverlay';

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog' + (size ? ' modal-' + size : '');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.innerHTML = html;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', modalEscHandler);
    return dialog;
}

function modalEscHandler(e) {
    if (e.key === 'Escape') closeModal();
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.remove();
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', modalEscHandler);
}

function confirmDialog(opts) {
    const o = opts || {};
    return new Promise((resolve) => {
        const dialog = openModal(
            '<div class="modal-card modal-sm">' +
                '<h3>' + esc(o.title || 'Are you sure?') + '</h3>' +
                '<p>' + esc(o.message || 'This action cannot be undone.') + '</p>' +
                '<div class="modal-actions">' +
                    '<button type="button" class="btn-ghost" data-act="no">Cancel</button>' +
                    '<button type="button" class="btn-' + (o.danger ? 'danger' : 'primary') + '" data-act="yes">' +
                        esc(o.confirmText || 'Confirm') + '</button>' +
                '</div>' +
            '</div>'
        );

        dialog.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            closeModal();
            resolve(btn.dataset.act === 'yes');
        });

        const overlay = document.getElementById('modalOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) resolve(false);
            });
        }
    });
}

// ---------- FORM HELPERS ----------

function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function splitList(text) {
    return String(text || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
}

function setFooterYear() {
    document.querySelectorAll('[data-year]').forEach((el) => {
        el.textContent = new Date().getFullYear();
    });
}

// Prefer the chosen user name; fall back to the first name so accounts created
// before user names existed still greet properly.
function greetName(user) {
    if (!user) return 'User';
    if (user.username) return user.username;
    if (user.fullName) return user.fullName.split(' ')[0];
    return 'User';
}

// Shared by register.html and profile.js so both enforce identical rules.
// Returns an error message, or null when the user name is acceptable.
const USERNAME_RULE = /^[A-Za-z0-9._]{3,20}$/;

function validateUsername(username) {
    const value = String(username || '').trim();

    if (!value) {
        return 'Please enter a user name.';
    }
    if (value !== String(username || '').trim() || /\s/.test(value)) {
        return 'User name cannot contain spaces.';
    }
    if (!USERNAME_RULE.test(value)) {
        return 'User name must be 3-20 characters, using only letters, numbers, dots and underscores.';
    }
    return null;
}

// ---------- MOBILE NAV ----------

function bindMenuToggle(button, list) {
    if (!button || !list) return;

    function close() {
        list.classList.remove('show');
        button.setAttribute('aria-expanded', 'false');
    }

    button.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = list.classList.toggle('show');
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // Close when a link is picked, or when tapping elsewhere
    list.addEventListener('click', (e) => {
        if (e.target.closest('a')) close();
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu-toggle') && !e.target.closest('#navLinks')) close();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
    });
}

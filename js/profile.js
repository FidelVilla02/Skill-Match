// Profile - seeker skills or employer business details, depending on role

document.addEventListener('DOMContentLoaded', () => {

    const user = requireRole();
    if (!user) return;

    const isEmployer = user.role === 'employer';
    const me = getMe() || {};
    const profile = (isEmployer ? me.employer : me.seeker) || {};

    const form = document.getElementById('profileForm');
    const previewBox = document.getElementById('previewBox');

    document.getElementById('navName').textContent = greetName(user);

    // ---------- ROLE-SPECIFIC NAV ----------

    function show(id, visible) {
        const el = document.getElementById(id);
        if (el) el.hidden = !visible;
    }

    show('navFindJobs', !isEmployer);
    show('navMyApps', !isEmployer);
    show('navDashboard', isEmployer);
    show('navApplicants', isEmployer);
    show('navPostJob', isEmployer);

    // ---------- PANES ----------

    document.getElementById('seekerPane').hidden = isEmployer;
    document.getElementById('employerPane').hidden = !isEmployer;

    document.getElementById('formHeading').textContent = isEmployer ? 'Your business' : 'About you';
    document.getElementById('profileIntro').textContent = isEmployer
        ? 'Applicants see these details when you shortlist them.'
        : 'This is what employers see when they review your application.';

    // ---------- POPULATE OPTIONS ----------

    function fillSelect(id, values, selected) {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = '';
        values.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            if (v === selected) opt.selected = true;
            el.appendChild(opt);
        });
    }

    fillSelect('experience', EXPERIENCE_LEVELS, profile.experience || 'Some experience');
    fillSelect('education', EDUCATION_LEVELS, profile.education || 'Prefer not to say');

    const industrySelect = document.getElementById('industry');
    CATEGORY_GROUPS.forEach(group => {
        const og = document.createElement('optgroup');
        og.label = group.label;
        group.items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.textContent = item;
            if (item === profile.industry) opt.selected = true;
            og.appendChild(opt);
        });
        industrySelect.appendChild(og);
    });

    // ---------- FILL FIELDS ----------

    function setVal(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value === null || value === undefined ? '' : value;
    }

    // Applies to both roles, so it lives outside the seeker/employer panes.
    setVal('username', user.username);

    if (isEmployer) {
        setVal('businessName', profile.businessName);
        setVal('businessAbout', profile.about);
        setVal('businessAddress', profile.address);
        setVal('businessPhone', profile.contactPhone);
        setVal('businessType', profile.businessType);
        setVal('businessSize', profile.businessSize);
    } else {
        setVal('headline', profile.headline);
        setVal('skills', (profile.skills || []).join(', '));
        setVal('certifications', profile.certifications);
        setVal('location', profile.location);
        setVal('phone', profile.phone);
        setVal('bio', profile.bio);
    }

    // ---------- LIVE PREVIEW ----------

    function handleRow() {
        const u = val('username');
        return u ? '<p class="preview-meta">@' + esc(u) + '</p>' : '';
    }

    function renderPreview() {
        if (isEmployer) {
            const name = val('businessName') || 'Your business name';
            previewBox.innerHTML = '' +
                '<div class="preview-card">' +
                    '<h3>' + esc(name) + '</h3>' +
                    handleRow() +
                    '<p class="preview-meta">' + esc(val('businessType')) + ' &middot; ' + esc(val('businessSize')) + '</p>' +
                    '<p class="preview-meta">' + esc(val('industry')) + '</p>' +
                    (val('businessAddress') ? '<p class="preview-meta">' + esc(val('businessAddress')) + '</p>' : '') +
                    (val('businessAbout') ? '<p class="preview-text">' + esc(val('businessAbout')) + '</p>' : '') +
                    (val('businessPhone') ? '<p class="preview-contact">Contact: ' + esc(val('businessPhone')) + '</p>' : '') +
                '</div>';
            return;
        }

        const skills = splitList(val('skills'));
        const skillTags = skills.map(s => '<span class="skill-tag">' + esc(s) + '</span>').join('');

        previewBox.innerHTML = '' +
            '<div class="preview-card">' +
                '<h3>' + esc(val('headline') || 'Your name') + '</h3>' +
                handleRow() +
                '<p class="preview-meta">' + esc(val('experience')) + '</p>' +
                (val('education') && val('education') !== 'Prefer not to say'
                    ? '<p class="preview-meta">' + esc(val('education')) + '</p>'
                    : '') +
                (val('location') ? '<p class="preview-meta">' + esc(val('location')) + '</p>' : '') +
                (val('certifications') ? '<p class="preview-meta">Cert: ' + esc(val('certifications')) + '</p>' : '') +
                (skillTags ? '<div class="job-skills">' + skillTags + '</div>' : '') +
                (val('bio') ? '<p class="preview-text">' + esc(val('bio')) + '</p>' : '') +
            '</div>' +
            (skills.length
                ? ''
                : '<p class="hint">Add at least one skill to start getting ranked matches.</p>');
    }

    form.addEventListener('input', renderPreview);
    form.addEventListener('change', renderPreview);
    renderPreview();

    // ---------- SAVE ----------

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // User name applies to both roles, so it is validated first.
        const username = val('username');
        const formatError = validateUsername(username);
        if (formatError) {
            toast(formatError, 'danger');
            return;
        }

        const taken = findUserByUsername(username);
        if (taken && String(taken.email).toLowerCase() !== String(user.email).toLowerCase()) {
            toast('That user name is already taken. Try another one.', 'danger');
            return;
        }

        const topPatch = { username: username };
        let saved = null;

        if (isEmployer) {
            const businessName = val('businessName');
            if (!businessName) {
                toast('Please enter your business name.', 'danger');
                return;
            }

            saved = updateMe({
                top: topPatch,
                employer: {
                    businessName: businessName,
                    businessType: val('businessType'),
                    businessSize: val('businessSize'),
                    industry: val('industry'),
                    about: val('businessAbout'),
                    address: val('businessAddress'),
                    contactPhone: val('businessPhone')
                }
            });
        } else {
            const skills = splitList(val('skills'));
            if (!skills.length) {
                toast('Add at least one skill so we can match you to jobs.', 'warn');
                return;
            }

            saved = updateMe({
                top: topPatch,
                seeker: {
                    headline: val('headline'),
                    skills: skills,
                    experience: val('experience'),
                    education: val('education'),
                    certifications: val('certifications'),
                    location: val('location'),
                    phone: val('phone'),
                    bio: val('bio')
                }
            });
        }

        if (!saved) {
            toast('Could not save your profile. Please log in again and retry.', 'danger');
            return;
        }

        // Refresh the session so the nav greeting picks up a renamed user
        // without needing a reload. Keep it in whichever store it was already
        // using, so "Remember me" is not silently switched off.
        const fresh = getMe();
        if (fresh) {
            const wasRemembered = !!localStorage.getItem(KEYS.session);
            setSession(fresh, wasRemembered);
            document.getElementById('navName').textContent = greetName(fresh);
        }

        toast('Profile saved.', 'success');
        renderPreview();
    });

    // ---------- LOGOUT / NAV ----------

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
        window.location.href = 'index.html';
    });

    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) bindMenuToggle(menuToggle, document.getElementById('navLinks'));

});
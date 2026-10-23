// Job seeker - browse, match, and apply

document.addEventListener('DOMContentLoaded', () => {

    const user = requireRole('jobseeker');
    if (!user) return;

    const me = getMe();
    const seekerSkills = (me && me.seeker && me.seeker.skills) || [];

    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const typeFilter = document.getElementById('typeFilter');
    const sortFilter = document.getElementById('sortFilter');
    const jobGrid = document.getElementById('jobGrid');
    const jobCount = document.getElementById('jobCount');

    greetInto('userName', user);
    greetInto('navName', user);

    // ---------- HELPERS ----------

    function greetInto(elId, session) {
        const el = document.getElementById(elId);
        if (el) el.textContent = greetName(session);
    }

    function scoreFor(job) {
        return matchScore(seekerSkills, job.skills, me && me.seeker && me.seeker.experience);
    }

    function salaryText(job) {
        if (!job.salaryDisclosed || !job.salary) {
            return 'Salary not disclosed';
        }
        return job.salary;
    }

    function requirementsBlock(job) {
        if (!job.requirements || !job.requirements.length) {
            return '';
        }

        const rows = job.requirements.map(r =>
            '<li class="req-row"><span class="req-dot ' + (r.required ? 'is-required' : 'is-preferred') + '"></span>' +
            '<span>' + esc(r.label) + '</span>' +
            '<span class="req-kind">' + (r.required ? 'Required' : 'Preferred') + '</span></li>'
        ).join('');

        return '<div class="req-block"><h4>What they require</h4><ul class="req-list">' + rows + '</ul></div>';
    }

    function metaRow(job) {
        const bits = [];
        if (job.employmentType) bits.push(esc(job.employmentType));
        if (job.workSetup) bits.push(esc(job.workSetup));
        return bits.length
            ? '<div class="job-meta">' + bits.map(b => '<span>' + b + '</span>').join('') + '</div>'
            : '';
    }

    // ---------- RENDER ----------

    function renderJobs() {
        const openJobs = getJobs().filter(j => j.status !== 'closed');
        const keyword = (searchInput.value || '').toLowerCase();
        const category = categoryFilter.value;
        const type = typeFilter.value;
        const sort = sortFilter.value;

        let filtered = openJobs.filter(job => {
            const haystack = [job.title, job.company, job.location, job.category]
                .concat(job.skills || [])
                .join(' ')
                .toLowerCase();

            const matchKeyword = !keyword || haystack.indexOf(keyword) !== -1;
            const matchCategory = category === 'All' || job.category === category;
            const matchType = type === 'All' || job.employmentType === type;

            return matchKeyword && matchCategory && matchType;
        });

        filtered = filtered.map(job => Object.assign({}, job, { score: scoreFor(job) }));

        if (sort === 'match') {
            filtered.sort((a, b) => b.score - a.score);
        } else if (sort === 'newest') {
            filtered.sort((a, b) => new Date(b.posted) - new Date(a.posted));
        } else {
            filtered.sort((a, b) => new Date(a.posted) - new Date(b.posted));
        }

        jobCount.textContent = filtered.length;

        if (!filtered.length) {
            jobGrid.innerHTML =
                '<p class="empty">No jobs found. Try a different search, or ' +
                '<a href="index.html">post one yourself</a> if you are hiring.</p>';
            return;
        }

        jobGrid.innerHTML = filtered.map(job => {
            const applied = hasApplied(job.id, user.email);
            const skillTags = (job.skills || []).map(s =>
                '<span class="skill-tag">' + esc(s) + '</span>'
            ).join('');

            const hidden = !job.salaryDisclosed || !job.salary;

            return '' +
            '<article class="job-card">' +
                '<div class="job-card-top">' +
                    '<h3>' + esc(job.title) + '</h3>' +
                    matchBadge(job.score) +
                '</div>' +
                '<p class="job-company">' + esc(job.company) + ' &middot; ' + esc(job.location) + '</p>' +
                metaRow(job) +
                '<p class="job-salary' + (hidden ? ' is-hidden-salary' : '') + '">' + esc(salaryText(job)) + '</p>' +
                '<div class="job-skills">' + skillTags + '</div>' +
                '<p class="job-posted">Posted ' + esc(timeAgo(job.posted)) + '</p>' +
                '<div class="job-actions">' +
                    '<button type="button" class="btn-ghost" data-view="' + esc(job.id) + '">View Details</button>' +
                    (applied
                        ? '<button type="button" class="apply-btn" disabled>Applied</button>'
                        : '<button type="button" class="apply-btn" data-apply="' + esc(job.id) + '">Apply Now</button>') +
                '</div>' +
            '</article>';
        }).join('');
    }

    // ---------- JOB DETAIL MODAL ----------

    function openJobDetail(jobId) {
        const job = getJob(jobId);
        if (!job) return;

        const score = scoreFor(job);
        const applied = hasApplied(job.id, user.email);

        const paras = (text) => (text
            ? '<p class="detail-text">' + esc(text) + '</p>'
            : '');

        const bullets = (text) => (text
            ? '<div class="detail-text"><strong>Responsibilities</strong><ul class="detail-list">' +
              text.split('\n').filter(Boolean).map(l => '<li>' + esc(l) + '</li>').join('') +
              '</ul></div>'
            : '');

        openModal(
            '<div class="modal-card">' +
                '<button type="button" class="modal-close" data-close>&times;</button>' +
                '<h3>' + esc(job.title) + '</h3>' +
                '<p class="detail-company">' + esc(job.company) + ' &middot; ' + esc(job.location) + '</p>' +
                '<div class="detail-badges">' +
                    matchBadge(score) +
                    (job.employmentType ? '<span class="chip">' + esc(job.employmentType) + '</span>' : '') +
                    (job.workSetup ? '<span class="chip">' + esc(job.workSetup) + '</span>' : '') +
                    '<span class="chip">' + esc(job.category) + '</span>' +
                '</div>' +
                '<p class="detail-salary' + (!job.salaryDisclosed || !job.salary ? ' is-hidden-salary' : '') + '">' +
                    esc(salaryText(job)) + '</p>' +
                '<p class="detail-posted">Posted ' + esc(fmtDate(job.posted)) + '</p>' +
                paras(job.description) +
                bullets(job.responsibilities) +
                (job.benefits ? '<div class="detail-text"><strong>Benefits</strong><p>' + esc(job.benefits) + '</p></div>' : '') +
                requirementsBlock(job) +
                '<div class="modal-actions">' +
                    '<button type="button" class="btn-ghost" data-close>Close</button>' +
                    (applied
                        ? '<a class="btn-primary" href="my-applications.html">View My Application</a>'
                        : '<button type="button" class="btn-primary" data-apply="' + esc(job.id) + '">Apply Now</button>') +
                '</div>' +
            '</div>'
        );
    }

    // ---------- APPLY MODAL ----------

    function openApplyModal(jobId) {
        const job = getJob(jobId);
        if (!job) return;

        if (hasApplied(job.id, user.email)) {
            toast('You already applied to this job.', 'warn');
            return;
        }

        const reqs = job.requirements || [];

        const checklist = reqs.length
            ? '<div class="apply-reqs">' +
                '<h4>Tick what you can do</h4>' +
                '<p class="hint">This is not a filter. It helps the employer review you faster.</p>' +
                reqs.map((r, i) =>
                    '<label class="check-row">' +
                        '<input type="checkbox" data-req="' + esc(r.label) + '">' +
                        '<span>' + esc(r.label) + '</span>' +
                        '<span class="req-kind">' + (r.required ? 'Required' : 'Preferred') + '</span>' +
                    '</label>'
                ).join('') +
              '</div>'
            : '';

        const needsProfile = !seekerSkills.length;
        const profileWarning = needsProfile
            ? '<p class="warn-text">You have not added any skills yet, so this employer cannot see what you can do. ' +
              '<a href="profile.html">Add your skills first</a> - it takes a minute.</p>'
            : '';

        openModal(
            '<div class="modal-card">' +
                '<button type="button" class="modal-close" data-close>&times;</button>' +
                '<h3>Apply: ' + esc(job.title) + '</h3>' +
                '<p class="detail-company">' + esc(job.company) + '</p>' +
                profileWarning +
                checklist +
                '<div class="input-box">' +
                    '<label>Message to the employer</label>' +
                    '<textarea id="applyNote" rows="4" placeholder="Briefly say why you are a good fit. No diploma needed - your experience counts."></textarea>' +
                '</div>' +
                '<div class="modal-actions">' +
                    '<button type="button" class="btn-ghost" data-close>Cancel</button>' +
                    '<button type="button" class="btn-primary" data-submit-apply="' + esc(job.id) + '">Send Application</button>' +
                '</div>' +
            '</div>'
        );
    }

    function submitApply(jobId) {
        const job = getJob(jobId);
        if (!job) return;

        const noteEl = document.getElementById('applyNote');
        const note = noteEl ? noteEl.value.trim() : '';

        const checks = {};
        document.querySelectorAll('#modalOverlay [data-req]').forEach(cb => {
            if (cb.checked) checks[cb.dataset.req] = true;
        });

        addApplication({
            id: newId('app'),
            jobId: job.id,
            jobTitle: job.title,
            seekerEmail: user.email,
            seekerName: user.fullName,
            seekerPhone: (me && me.seeker && me.seeker.phone) || '',
            submittedAt: new Date().toISOString(),
            status: 'Applied',
            note: note,
            checks: checks,
            employerNote: '',
            privateNote: '',
            interviewDate: null,
            history: [{ status: 'Applied', at: new Date().toISOString() }]
        });

        closeModal();
        toast('Application sent to ' + job.company + '.', 'success');
        renderJobs();
    }

    // ---------- EVENTS ----------

    function bindCategories() {
        CATEGORY_GROUPS.forEach(group => {
            const og = document.createElement('optgroup');
            og.label = group.label;
            group.items.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item;
                opt.textContent = item;
                og.appendChild(opt);
            });
            categoryFilter.appendChild(og);
        });
    }

    function bindFilter(el, evt) {
        if (el) el.addEventListener(evt, renderJobs);
    }

    bindFilter(searchInput, 'input');
    bindFilter(categoryFilter, 'change');
    bindFilter(typeFilter, 'change');
    bindFilter(sortFilter, 'change');

    jobGrid.addEventListener('click', (e) => {
        const view = e.target.closest('[data-view]');
        if (view) {
            openJobDetail(view.dataset.view);
            return;
        }

        const apply = e.target.closest('[data-apply]');
        if (apply) openApplyModal(apply.dataset.apply);
    });

    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]')) {
            closeModal();
            return;
        }

        const submit = e.target.closest('[data-submit-apply]');
        if (submit) submitApply(submit.dataset.submitApply);
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
            window.location.href = 'index.html';
        });
    }

    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) bindMenuToggle(menuToggle, document.getElementById('navLinks'));

    // ---------- INIT ----------

    bindCategories();
    renderJobs();

});
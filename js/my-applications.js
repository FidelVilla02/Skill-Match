// Job seeker - track applications, withdraw, and see employer contact once shortlisted

document.addEventListener('DOMContentLoaded', () => {

    const user = requireRole('jobseeker');
    if (!user) return;

    const list = document.getElementById('appList');

    document.getElementById('navName').textContent = greetName(user);
    document.getElementById('userName').textContent = greetName(user);

    function myApps() {
        return getMyApplications(user.email);
    }

    // ---------- STATS ----------

    function setStat(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function renderStats() {
        const apps = myApps();
        setStat('statActive', apps.filter(a => isOpenStatus(a.status)).length);
        setStat('statInterviews', apps.filter(a => a.status === 'Interview').length);
        setStat('statHired', apps.filter(a => a.status === 'Hired').length);
        setStat('statClosed', apps.filter(a => a.status === 'Rejected' || a.status === 'Withdrawn').length);
    }

    // ---------- CONTACT REVEAL ----------

    // Employers only share their details once they have shortlisted you.
    function contactBlock(app) {
        const job = getJob(app.jobId);
        if (!job) return '';

        const employer = findUserByEmail(job.employer);
        const biz = (employer && employer.employer) || {};

        const showContact = app.status === 'Shortlisted' ||
            app.status === 'Interview' ||
            app.status === 'Hired';

        if (!showContact) {
            return '' +
            '<div class="msg-box msg-locked">' +
                '<strong>Contact details</strong>' +
                '<p>' + esc(biz.businessName || job.company) + ' will share how to reach you once they shortlist your application.</p>' +
            '</div>';
        }

        const rows = [];
        if (biz.businessName) rows.push('<span>' + esc(biz.businessName) + '</span>');
        if (biz.address) rows.push('<span>' + esc(biz.address) + '</span>');
        if (biz.contactPhone) rows.push('<span>' + esc(biz.contactPhone) + '</span>');

        return '' +
        '<div class="msg-box msg-contact">' +
            '<strong>' + (app.status === 'Interview' ? 'Time to call them' : 'Contact details unlocked') + '</strong>' +
            '<div class="detail-meta">' + rows.join('') + '</div>' +
            (app.status === 'Interview'
                ? '<p class="interview-note">Interview: <strong>' + esc(fmtDateTime(app.interviewDate)) + '</strong></p>'
                : '') +
        '</div>';
    }

    // ---------- RENDER ----------

    function timeline(app) {
        const steps = app.history || [];
        if (!steps.length) return '';

        return '<ul class="timeline">' + steps.map(s =>
            '<li class="tl-step"><span class="tl-dot"></span>' +
            '<span class="tl-status">' + esc(s.status) + '</span>' +
            '<span class="tl-date">' + esc(fmtDate(s.at)) + '</span></li>'
        ).join('') + '</ul>';
    }

    function render() {
        const apps = myApps();

        if (!apps.length) {
            list.innerHTML =
                '<p class="empty">You have not applied to anything yet. ' +
                '<a href="jobs.html" class="inline-link">Browse jobs</a> to get started.</p>';
            return;
        }

        list.innerHTML = apps.map(app => {
            const job = getJob(app.jobId);
            const canWithdraw = isOpenStatus(app.status);

            return '' +
            '<article class="applicant-card">' +
                '<div class="applicant-head">' +
                    '<div>' +
                        '<h3>' + esc(app.jobTitle || (job && job.title) || 'Job removed') + '</h3>' +
                        '<p class="job-company">' +
                            esc(job ? job.company : 'This post was taken down') +
                            (job ? ' &middot; ' + esc(job.location) : '') +
                        '</p>' +
                    '</div>' +
                    statusBadge(app.status) +
                '</div>' +

                '<p class="preview-muted">Applied ' + esc(fmtDateTime(app.submittedAt)) + '</p>' +

                (job && job.salaryDisclosed && job.salary
                    ? '<p class="job-salary">' + esc(job.salary) + '</p>'
                    : '') +

                (job && (job.skills || []).length
                    ? '<div class="job-skills">' + job.skills.map(s => '<span class="skill-tag">' + esc(s) + '</span>').join('') + '</div>'
                    : '') +

                timeline(app) +
                contactBlock(app) +

                (app.employerNote
                    ? '<div class="msg-box msg-mine"><strong>Note from the employer</strong><p>' + esc(app.employerNote) + '</p></div>'
                    : '') +

                (app.note ? '<div class="msg-box"><strong>What you wrote</strong><p>' + esc(app.note) + '</p></div>' : '') +

                '<div class="applicant-actions">' +
                    (canWithdraw
                        ? '<button type="button" class="btn-danger" data-withdraw="' + esc(app.id) + '">Withdraw Application</button>'
                        : '') +
                    (job && job.status !== 'closed'
                        ? '<a class="btn-ghost" href="jobs.html">Find more jobs</a>'
                        : '') +
                '</div>' +
            '</article>';
        }).join('');
    }

    // ---------- WITHDRAW ----------

    list.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-withdraw]');
        if (!btn) return;

        const app = findApplication(btn.dataset.withdraw);
        if (!app) return;

        const ok = await confirmDialog({
            title: 'Withdraw this application?',
            message: 'The employer will no longer see you as an active applicant. You can re-apply while the job is still open.',
            confirmText: 'Withdraw',
            danger: true
        });

        if (!ok) return;

        const history = (app.history || []).slice();
        history.push({ status: 'Withdrawn', at: new Date().toISOString() });

        setApplicationStatus(app.id, 'Withdrawn', { history: history });

        toast('Application withdrawn.', 'info');
        renderStats();
        render();
    });

    // ---------- LOGOUT / NAV ----------

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
        window.location.href = 'index.html';
    });

    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) bindMenuToggle(menuToggle, document.getElementById('navLinks'));

    initDemoGuard();

    renderStats();
    render();

});
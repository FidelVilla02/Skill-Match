// Employer dashboard - pipeline stats and my postings

document.addEventListener('DOMContentLoaded', () => {

    const user = requireRole('employer');
    if (!user) return;

    const myJobsList = document.getElementById('myJobsList');

    greetInto('userName', user, 'Employer');
    greetInto('navName', user);

    function greetInto(elId, session, fallback) {
        const el = document.getElementById(elId);
        if (el) el.textContent = session.fullName ? greetName(session) : (fallback || 'User');
    }

    function myJobIds() {
        return getMyJobs(user.email).map(j => j.id);
    }

    function myApplications() {
        const ids = myJobIds();
        return getApplications().filter(a => ids.indexOf(a.jobId) !== -1);
    }

    // ---------- STATS ----------

    function setStat(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function renderStats() {
        const jobs = getMyJobs(user.email);
        const apps = myApplications();

        setStat('statPostings', jobs.filter(j => j.status !== 'closed').length);
        setStat('statApplicants', apps.length);
        setStat('statShortlisted', apps.filter(a => a.status === 'Shortlisted').length);
        setStat('statInterviews', apps.filter(a => a.status === 'Interview').length);
        setStat('statHired', apps.filter(a => a.status === 'Hired').length);
    }

    function renderPipeline() {
        const apps = myApplications();
        const box = document.getElementById('pipelineBars');
        if (!box) return;

        const stages = ['Applied', 'Shortlisted', 'Interview', 'Hired'];

        if (!apps.length) {
            box.innerHTML = '<p class="empty">No applicants yet. Post a job and applicants will show up here.</p>';
            return;
        }

        const max = Math.max.apply(null, stages.map(s => apps.filter(a => a.status === s).length).concat([1]));

        box.innerHTML = stages.map(stage => {
            const count = apps.filter(a => a.status === stage).length;
            const pct = Math.round((count / max) * 100);

            return '' +
            '<div class="pipe-row">' +
                '<span class="pipe-label">' + esc(stage) + '</span>' +
                '<div class="pipe-track"><div class="pipe-fill pf-' + esc(stage.toLowerCase()) + '" style="width:' + pct + '%"></div></div>' +
                '<span class="pipe-count">' + count + '</span>' +
            '</div>';
        }).join('');
    }

    // ---------- MY POSTINGS ----------

    function renderMyJobs() {
        const myJobs = getMyJobs(user.email);

        if (!myJobs.length) {
            myJobsList.innerHTML =
                '<p class="empty">You have not posted any jobs yet. ' +
                '<a href="employer-post.html" class="inline-link">Post a job</a> now.</p>';
            return;
        }

        myJobsList.innerHTML = myJobs.map(job => {
            const apps = getApplicationsForJob(job.id);
            const open = apps.filter(a => isOpenStatus(a.status));

            const skillTags = (job.skills || []).map(s =>
                '<span class="skill-tag">' + esc(s) + '</span>'
            ).join('');

            return '' +
            '<article class="job-card my-job">' +
                '<div class="job-card-top">' +
                    '<h3>' + esc(job.title) + '</h3>' +
                    (job.status === 'closed'
                        ? '<span class="status-badge st-muted">Closed</span>'
                        : '<span class="status-badge st-success">Open</span>') +
                '</div>' +
                '<p class="job-company">' + esc(job.company) + ' &middot; ' + esc(job.location) + '</p>' +
                '<p class="job-salary' + (!job.salaryDisclosed || !job.salary ? ' is-hidden-salary' : '') + '">' +
                    (job.salaryDisclosed && job.salary ? esc(job.salary) : 'Salary not disclosed') + '</p>' +
                '<div class="job-skills">' + skillTags + '</div>' +
                '<p class="stat-applicants">' + apps.length + ' applicant(s) &middot; ' + open.length + ' still open</p>' +
                '<div class="job-actions">' +
                    '<a class="btn-ghost" href="applicants.html?job=' + encodeURIComponent(job.id) + '">Review</a>' +
                '</div>' +
            '</article>';
        }).join('');
    }

    function renderAll() {
        renderStats();
        renderPipeline();
        renderMyJobs();
    }

    // ---------- LOGOUT / NAV ----------

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
        window.location.href = 'index.html';
    });

    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) bindMenuToggle(menuToggle, document.getElementById('navLinks'));

    renderAll();

});
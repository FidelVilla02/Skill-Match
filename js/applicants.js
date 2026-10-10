// Employer review pipeline: Applied -> Shortlisted -> Interview -> Hired, or Rejected

document.addEventListener('DOMContentLoaded', () => {

    const user = requireRole('employer');
    if (!user) return;

    const jobFilter = document.getElementById('jobFilter');
    const statusFilter = document.getElementById('statusFilter');
    const list = document.getElementById('applicantList');

    document.getElementById('navName').textContent = greetName(user);
    document.getElementById('userName').textContent = greetName(user);

    // Deep link from a job card: applicants.html?job=job_xxx
    const params = new URLSearchParams(window.location.search);
    const preselect = params.get('job');

    // ---------- DATA ----------

    function myJobs() {
        return getMyJobs(user.email);
    }

    function myApplications() {
        const ids = myJobs().map(j => j.id);
        return getApplications().filter(a => ids.indexOf(a.jobId) !== -1);
    }

    // Read the seeker's saved profile so the employer judges real evidence
    function seekerRecord(email) {
        return findUserByEmail(email);
    }

    function scoreFor(app, job) {
        const record = seekerRecord(app.seekerEmail);
        const skills = (record && record.seeker && record.seeker.skills) || [];
        const experience = (record && record.seeker && record.seeker.experience) || '';
        return matchScore(skills, job ? job.skills : [], experience);
    }

    // ---------- RENDER ----------

    function requirementTicks(app, job) {
        const reqs = (job && job.requirements) || [];
        if (!reqs.length) return '';

        const done = reqs.filter(r => app.checks && app.checks[r.label]).length;

        const rows = reqs.map(r =>
            '<li class="req-row">' +
                '<span class="req-dot ' + (app.checks && app.checks[r.label] ? 'is-met' : 'is-missing') + '"></span>' +
                '<span>' + esc(r.label) + '</span>' +
                '<span class="req-kind">' + (r.required ? 'Required' : 'Preferred') + '</span>' +
            '</li>'
        ).join('');

        return '' +
        '<div class="req-block">' +
            '<h4>What they can do <span class="req-progress">' + done + '/' + reqs.length + '</span></h4>' +
            '<ul class="req-list">' + rows + '</ul>' +
        '</div>';
    }

    function timeline(app) {
        const steps = app.history || [];
        if (!steps.length) return '';

        const items = steps.map(s =>
            '<li class="tl-step"><span class="tl-dot"></span>' +
            '<span class="tl-status">' + esc(s.status) + '</span>' +
            '<span class="tl-date">' + esc(fmtDate(s.at)) + '</span></li>'
        ).join('');

        return '<ul class="timeline">' + items + '</ul>';
    }

    function actionsFor(app) {
        if (!isOpenStatus(app.status)) {
            return '<button type="button" class="btn-ghost" data-reopen="' + esc(app.id) + '">Reopen</button>';
        }

        let buttons = '';

        if (app.status === 'Applied') {
            buttons += '<button type="button" class="btn-primary" data-shortlist="' + esc(app.id) + '">Shortlist</button>';
        }

        if (app.status === 'Shortlisted' || app.status === 'Applied') {
            buttons += '<button type="button" class="btn-primary" data-interview="' + esc(app.id) + '">Set Interview</button>';
        }

        if (app.status !== 'Hired') {
            buttons += '<button type="button" class="btn-success" data-hire="' + esc(app.id) + '">Hire</button>';
            buttons += '<button type="button" class="btn-danger" data-reject="' + esc(app.id) + '">Reject</button>';
        }

        return buttons +
            '<button type="button" class="btn-ghost" data-note="' + esc(app.id) + '">Add Note</button>';
    }

    function render() {
        const jobSel = jobFilter.value;
        const statusSel = statusFilter.value;

        let apps = myApplications();

        if (jobSel !== 'all') apps = apps.filter(a => a.jobId === jobSel);
        if (statusSel === 'open') apps = apps.filter(a => isOpenStatus(a.status));
        else if (statusSel !== 'all') apps = apps.filter(a => a.status === statusSel);

        if (!apps.length) {
            list.innerHTML =
                '<p class="empty">No applicants here yet. ' +
                '<a href="employer-post.html" class="inline-link">Post a job</a> to start receiving applications.</p>';
            return;
        }

        list.innerHTML = apps.map(app => {
            const job = getJob(app.jobId);
            const record = seekerRecord(app.seekerEmail);
            const seeker = (record && record.seeker) || {};
            const score = scoreFor(app, job);

            return '' +
            '<article class="applicant-card">' +
                '<div class="applicant-head">' +
                    '<div>' +
                        '<h3>' + esc(app.seekerName) +
                            (record && record.username
                                ? ' <span class="handle">@' + esc(record.username) + '</span>'
                                : '') +
                        '</h3>' +
                        '<p class="job-company">' + esc(app.jobTitle || (job && job.title) || 'Job removed') + '</p>' +
                    '</div>' +
                    '<div class="applicant-badges">' +
                        matchBadge(score) +
                        statusBadge(app.status) +
                    '</div>' +
                '</div>' +

                (seeker.headline ? '<p class="preview-text">' + esc(seeker.headline) + '</p>' : '') +

                '<div class="detail-meta">' +
                    (seeker.experience ? '<span>' + esc(seeker.experience) + '</span>' : '') +
                    (seeker.location ? '<span>' + esc(seeker.location) + '</span>' : '') +
                    (seeker.certifications ? '<span>Cert: ' + esc(seeker.certifications) + '</span>' : '') +
                    '<span>Applied ' + esc(timeAgo(app.submittedAt)) + '</span>' +
                '</div>' +

                ((seeker.skills || []).length
                    ? '<div class="job-skills">' + seeker.skills.map(s => '<span class="skill-tag">' + esc(s) + '</span>').join('') + '</div>'
                    : '') +

                requirementTicks(app, job) +

                (app.note ? '<div class="msg-box"><strong>Their message</strong><p>' + esc(app.note) + '</p></div>' : '') +
                (app.employerNote ? '<div class="msg-box msg-mine"><strong>Note to the applicant</strong><p>' + esc(app.employerNote) + '</p></div>' : '') +
                (app.privateNote
                    ? '<div class="msg-box msg-locked"><strong>Private note (staff only)</strong><p>' + esc(app.privateNote) + '</p></div>'
                    : '') +
                (app.interviewDate
                    ? '<p class="interview-note">Interview: <strong>' + esc(fmtDateTime(app.interviewDate)) + '</strong></p>'
                    : '') +

                (seeker.bio ? '<p class="preview-text preview-muted">' + esc(seeker.bio) + '</p>' : '') +

                timeline(app) +

                '<div class="applicant-actions">' + actionsFor(app) + '</div>' +
            '</article>';
        }).join('');
    }

    // ---------- ACTIONS ----------

    function shortlist(appId) {
        setApplicationStatus(appId, 'Shortlisted', {});
        toast('Applicant shortlisted. Their contact number is now visible to them.', 'success');
        render();
    }

    function hire(appId) {
        setApplicationStatus(appId, 'Hired', {});
        toast('Marked as hired.', 'success');
        render();
    }

    async function reject(appId) {
        const ok = await confirmDialog({
            title: 'Reject this applicant?',
            message: 'They will see that their application was closed. You can reopen it later.',
            confirmText: 'Reject',
            danger: true
        });

        if (!ok) return;

        setApplicationStatus(appId, 'Rejected', {});
        toast('Application closed.', 'info');
        render();
    }

    async function reopen(appId) {
        const ok = await confirmDialog({
            title: 'Reopen this application?',
            message: 'The applicant will be able to be shortlisted again.',
            confirmText: 'Reopen'
        });

        if (!ok) return;

        const app = findApplication(appId);
        if (!app) return;

        const history = (app.history || []).slice();
        history.push({ status: 'Applied', at: new Date().toISOString() });

        setApplicationStatus(appId, 'Applied', { history: history });
        toast('Application reopened.', 'success');
        render();
    }

    function openInterviewModal(appId) {
        const app = findApplication(appId);
        if (!app) return;

        openModal(
            '<div class="modal-card modal-sm">' +
                '<button type="button" class="modal-close" data-close>&times;</button>' +
                '<h3>Set an interview</h3>' +
                '<p class="detail-company">' + esc(app.seekerName) + ' &middot; ' + esc(app.jobTitle) + '</p>' +
                '<div class="input-box">' +
                    '<label for="interviewDate">When?</label>' +
                    '<input type="datetime-local" id="interviewDate">' +
                '</div>' +
                '<div class="input-box">' +
                    '<label for="interviewNote">Note for the applicant <span class="legend-note">optional</span></label>' +
                    '<textarea id="interviewNote" rows="3" placeholder="Where to meet, what to bring."></textarea>' +
                '</div>' +
                '<div class="modal-actions">' +
                    '<button type="button" class="btn-ghost" data-close>Cancel</button>' +
                    '<button type="button" class="btn-primary" data-save-interview="' + esc(appId) + '">Confirm Interview</button>' +
                '</div>' +
            '</div>'
        );
    }

    function saveInterview(appId) {
        const dateEl = document.getElementById('interviewDate');
        const noteEl = document.getElementById('interviewNote');
        const when = dateEl ? dateEl.value : '';
        const note = noteEl ? noteEl.value.trim() : '';

        const history = (findApplication(appId).history || []).slice();
        history.push({ status: 'Interview', at: new Date().toISOString() });

        setApplicationStatus(appId, 'Interview', {
            interviewDate: when ? new Date(when).toISOString() : null,
            employerNote: note,
            history: history
        });

        closeModal();
        toast('Interview set. The applicant can now see your contact details.', 'success');
        render();
    }

    function openNoteModal(appId) {
        const app = findApplication(appId);
        if (!app) return;

        openModal(
            '<div class="modal-card modal-sm">' +
                '<button type="button" class="modal-close" data-close>&times;</button>' +
                '<h3>Note about ' + esc(app.seekerName) + '</h3>' +
                '<div class="input-box">' +
                    '<label for="noteText">Private note</label>' +
                    '<textarea id="noteText" rows="4">' + esc(app.privateNote || '') + '</textarea>' +
                    '<p class="hint">Only your team can see this. The applicant never will.</p>' +
                '</div>' +
                '<div class="modal-actions">' +
                    '<button type="button" class="btn-ghost" data-close>Cancel</button>' +
                    '<button type="button" class="btn-primary" data-save-note="' + esc(appId) + '">Save Note</button>' +
                '</div>' +
            '</div>'
        );
    }

    function saveNote(appId) {
        const el = document.getElementById('noteText');
        const all = getApplications();
        const app = all.find(a => a.id === appId);
        if (app) {
            app.privateNote = el.value.trim();
            saveApplications(all);
        }
        closeModal();
        toast('Note saved.', 'success');
        render();
    }

    // ---------- EVENTS ----------

    list.addEventListener('click', async (e) => {
        const map = {
            'data-shortlist': shortlist,
            'data-hire': hire,
            'data-reject': reject,
            'data-reopen': reopen
        };

        for (const attr in map) {
            const btn = e.target.closest('[' + attr + ']');
            if (btn) {
                map[attr](btn.getAttribute(attr));
                return;
            }
        }

        const interview = e.target.closest('[data-interview]');
        if (interview) {
            openInterviewModal(interview.dataset.interview);
            return;
        }

        const note = e.target.closest('[data-note]');
        if (note) openNoteModal(note.dataset.note);
    });

    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]')) {
            closeModal();
            return;
        }

        const saveInt = e.target.closest('[data-save-interview]');
        if (saveInt) {
            saveInterview(saveInt.dataset.saveInterview);
            return;
        }

        const saveN = e.target.closest('[data-save-note]');
        if (saveN) saveNote(saveN.dataset.saveNote);
    });

    jobFilter.addEventListener('change', render);
    statusFilter.addEventListener('change', render);

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
        window.location.href = 'index.html';
    });

    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) bindMenuToggle(menuToggle, document.getElementById('navLinks'));

    // ---------- INIT ----------

    const jobs = myJobs();

    if (preselect && jobs.some(j => j.id === preselect)) {
        jobFilter.value = preselect;
    }

    if (!jobs.length) {
        jobFilter.disabled = true;
        statusFilter.disabled = true;
    } else {
        jobs.forEach(job => {
            const opt = document.createElement('option');
            opt.value = job.id;
            opt.textContent = job.title + ' (' + countApplicants(job.id) + ')';
            jobFilter.appendChild(opt);
        });
    }

    render();

});
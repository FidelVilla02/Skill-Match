// Employer job posting - works for any business size

document.addEventListener('DOMContentLoaded', () => {

    const user = requireRole('employer');
    if (!user) return;

    let editingId = null;
    const me = getMe();
    const biz = (me && me.employer) || {};

    const postForm = document.getElementById('postForm');
    const myJobsList = document.getElementById('myJobsList');
    const reqBuilder = document.getElementById('reqBuilder');
    const salaryDisclosed = document.getElementById('salaryDisclosed');
    const salaryInput = document.getElementById('salary');

    greetInto('navName', user);

    function greetInto(elId, session) {
        const el = document.getElementById(elId);
        if (el) el.textContent = greetName(session);
    }

    // ---------- REQUIREMENTS BUILDER ----------

    function addReqRow(label, required) {
        const row = document.createElement('div');
        row.className = 'req-input-row';
        row.innerHTML =
            '<input type="text" class="req-input" placeholder="e.g. Can work on weekends" value="' + esc(label || '') + '">' +
            '<label class="req-required">' +
                '<input type="checkbox" class="req-req-check"' + (required ? ' checked' : '') + '>' +
                '<span>Required</span>' +
            '</label>' +
            '<button type="button" class="req-remove" data-remove-req aria-label="Remove requirement">&times;</button>';
        reqBuilder.appendChild(row);
        return row;
    }

    function collectRequirements() {
        return Array.from(reqBuilder.querySelectorAll('.req-input-row'))
            .map(row => {
                const input = row.querySelector('.req-input');
                const check = row.querySelector('.req-req-check');
                const text = (input.value || '').trim();
                return text ? { label: text, required: !!check.checked } : null;
            })
            .filter(Boolean);
    }

    document.getElementById('addReqBtn').addEventListener('click', () => {
        addReqRow('', false);
    });

    reqBuilder.addEventListener('click', (e) => {
        if (e.target.closest('[data-remove-req]')) e.target.closest('.req-input-row').remove();
    });

    // ---------- SALARY TOGGLE ----------

    function syncSalary() {
        const shown = salaryDisclosed.checked;
        salaryInput.disabled = !shown;
        if (!shown) salaryInput.value = '';
    }

    salaryDisclosed.addEventListener('change', syncSalary);

    // ---------- MY POSTINGS ----------

    function renderMyJobs() {
        const myJobs = getMyJobs(user.email);

        if (!myJobs.length) {
            myJobsList.innerHTML =
                '<p class="empty">You have not posted any jobs yet. ' +
                '<a href="#" data-go-post>Post your first one</a>.</p>';
            return;
        }

        myJobsList.innerHTML = myJobs.map(job => {
            const applicants = countApplicants(job.id);
            const reqCount = (job.requirements || []).length;

            return '' +
            '<article class="job-card my-job">' +
                '<div class="job-card-top">' +
                    '<h3>' + esc(job.title) + '</h3>' +
                    (job.status === 'closed'
                        ? '<span class="status-badge st-muted">Closed</span>'
                        : '<span class="status-badge st-success">Open</span>') +
                '</div>' +
                '<p>' + statusBadge(job.approvalStatus) + (job.reviewReason ? ' ' + esc(job.reviewReason) : '') + '</p>' +
                '<p class="job-company">' + esc(job.company) + ' &middot; ' + esc(job.location) + '</p>' +
                '<p class="job-salary' + (!job.salaryDisclosed || !job.salary ? ' is-hidden-salary' : '') + '">' +
                    (job.salaryDisclosed && job.salary ? esc(job.salary) : 'Salary not disclosed') + '</p>' +
                '<p class="stat-applicants">' + applicants + ' applicant(s) &middot; ' + reqCount + ' requirement(s)</p>' +
                '<div class="job-actions">' +
                    '<button type="button" class="btn-ghost" data-edit="' + esc(job.id) + '">Edit / Resubmit</button>' +
                    '<a class="btn-ghost" href="applicants.html?job=' + encodeURIComponent(job.id) + '">View Applicants</a>' +
                    '<button type="button" class="btn-ghost" data-toggle="' + esc(job.id) + '">' +
                        (job.status === 'closed' ? 'Reopen' : 'Close') +
                    '</button>' +
                    '<button type="button" class="delete-btn" data-id="' + esc(job.id) + '">Delete</button>' +
                '</div>' +
            '</article>';
        }).join('');
    }

    // ---------- SUBMIT ----------

    postForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!activeSession('employer')) { logout(); location.href='login.html'; return; }
        const title = val('jobTitle');
        const companyName = val('company');
        const jobCategory = val('category');
        const jobLocation = val('location');
        const salaryRange = val('salary');
        const salaryType = val('salaryType');
        const skills = splitList(val('skills'));
        const requirements = collectRequirements();

        if (!title || !companyName || !jobCategory || !jobLocation) {
            toast('Please fill in the title, business name, category, and location.', 'danger');
            return;
        }

        if (!skills.length) {
            toast('Add at least one matching skill so we can rank applicants for you.', 'warn');
            return;
        }

        // Withholding pay is allowed and normal for some businesses. Leaving the
        // range empty simply posts as "Salary not disclosed" - no blocking prompt.
        const hasSalary = salaryRange !== '';
        const disclosed = salaryDisclosed.checked && hasSalary;

        const job = {
            id: editingId || newId('job'),
            approvalStatus: 'Pending',
            reviewReason: '',
            updatedAt: new Date().toISOString(),
            title: title,
            company: companyName,
            category: jobCategory,
            location: jobLocation,
            description: val('description'),
            responsibilities: val('responsibilities'),
            benefits: val('benefits'),
            employmentType: val('employmentType'),
            workSetup: val('workSetup'),
            salary: disclosed ? salaryRange : null,
            salaryType: salaryType,
            salaryDisclosed: disclosed,
            skills: skills,
            requirements: requirements,
            posted: new Date().toISOString(),
            status: 'open',
            employer: user.email,
            employerName: biz.businessName || companyName
        };

        // Store the job, then confirm it can be read back before clearing the
        // form, so a storage failure never silently loses what was typed.
        try {
            if (editingId) {
                const all = getJobs(), old = all.find(j => j.id === editingId && j.employer === user.email);
                if (!old) throw new Error('Job not found');
                job.posted = old.posted; job.status = old.status;
                Object.assign(old, job); saveJobs(all);
            } else addJob(job);
            if (!getJob(job.id)) throw new Error('Job was not persisted');
        } catch (err) {
            console.error('addJob failed', err);
            toast('Could not save the job. Check that this browser allows storage, then try again.', 'danger');
            return;
        }

        editingId = null;
        postForm.querySelector('[type=submit]').textContent = 'Submit for Review';
        postForm.reset();
        reqBuilder.innerHTML = '';
        syncSalary();
        toast('Job submitted. Waiting for admin approval.', 'success');
        renderMyJobs();
    });

    // ---------- LIST EVENTS ----------

    myJobsList.addEventListener('click', async (e) => {
        if (!activeSession('employer')) { logout(); location.href='login.html'; return; }
        const edit = e.target.closest('[data-edit]');
        if (edit) {
            const j = getJob(edit.dataset.edit);
            if (!j || j.employer !== user.email) return;
            editingId = j.id;
            const fields = {jobTitle:'title',company:'company',category:'category',location:'location',description:'description',responsibilities:'responsibilities',benefits:'benefits',employmentType:'employmentType',workSetup:'workSetup',salary:'salary',salaryType:'salaryType'};
            Object.keys(fields).forEach(id => document.getElementById(id).value = j[fields[id]] || '');
            document.getElementById('skills').value = (j.skills || []).join(', ');
            salaryDisclosed.checked = !!j.salaryDisclosed; syncSalary();
            reqBuilder.innerHTML = ''; (j.requirements || []).forEach(r => addReqRow(r.label,r.required));
            postForm.querySelector('[type=submit]').textContent = 'Resubmit for Review';
            document.getElementById('jobTitle').focus(); postForm.scrollIntoView({behavior:'smooth'}); return;
        }
        if (e.target.closest('[data-go-post]')) {
            document.getElementById('jobTitle').focus();
            return;
        }

        const toggle = e.target.closest('[data-toggle]');
        if (toggle) {
            const all = getJobs();
            const job = all.find(j => j.id === toggle.dataset.toggle);
            if (job) {
                job.status = job.status === 'closed' ? 'open' : 'closed';
                saveJobs(all);
                toast(job.status === 'open' ? 'Job reopened.' : 'Job closed.', 'info');
                renderMyJobs();
            }
            return;
        }

        const btn = e.target.closest('.delete-btn');
        if (!btn) return;

        const ok = await confirmDialog({
            title: 'Delete this job post?',
            message: 'Applicants who sent their details for this job will be removed too. This cannot be undone.',
            confirmText: 'Delete job',
            danger: true
        });

        if (!ok) return;

        deleteJob(btn.dataset.id);
        toast('Job posting deleted.', 'info');
        renderMyJobs();
    });

    // ---------- LOGOUT / NAV ----------

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
        window.location.href = 'index.html';
    });

    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) bindMenuToggle(menuToggle, document.getElementById('navLinks'));

    // ---------- INIT ----------

    CATEGORY_GROUPS.forEach(group => {
        const og = document.createElement('optgroup');
        og.label = group.label;
        group.items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.textContent = item;
            og.appendChild(opt);
        });
        document.getElementById('category').appendChild(og);
    });

    // Prefill the business name from the profile so repeat posting is quick
    const companyField = document.getElementById('company');
    if (!companyField.value && biz.businessName) companyField.value = biz.businessName;

    syncSalary();
    addReqRow('', true);
    renderMyJobs();

});
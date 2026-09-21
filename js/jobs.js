// Job seeker - find and apply to jobs

document.addEventListener('DOMContentLoaded', () => {

    // ---------- GUARD: job seekers only ----------
    const currentUser = JSON.parse(localStorage.getItem('smCurrentUser') || 'null');

    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    if (currentUser.role === 'employer') {
        window.location.href = 'dashboard.html';
        return;
    }

    // ---------- SEED DEFAULT JOBS ----------
    if (!localStorage.getItem('smJobs')) {
        const defaultJobs = [
            { id: 1, title: 'Software Developer', company: 'Toledo Tech Solutions', category: 'IT', location: 'Toledo, PH', salary: 'PHP 30,000 - 45,000', skills: ['JavaScript', 'HTML', 'CSS'], posted: 'today' },
            { id: 2, title: 'Graphic Designer', company: 'Cebu Creative Studio', category: 'Design', location: 'Cebu City, PH', salary: 'PHP 25,000 - 35,000', skills: ['Photoshop', 'Illustrator'], posted: '2 days ago' },
            { id: 3, title: 'Accountant', company: 'Cebu Business Hub', category: 'Finance', location: 'Toledo, PH', salary: 'PHP 28,000 - 40,000', skills: ['Bookkeeping', 'Excel'], posted: '3 days ago' },
            { id: 4, title: 'Customer Service Rep', company: 'BPO Center Cebu', category: 'Customer Service', location: 'Cebu City, PH', salary: 'PHP 18,000 - 25,000', skills: ['Communication', 'English'], posted: '1 week ago' },
            { id: 5, title: 'Civil Engineer', company: 'Toledo Builders Inc.', category: 'Engineering', location: 'Toledo, PH', salary: 'PHP 35,000 - 55,000', skills: ['AutoCAD', 'Site Management'], posted: '4 days ago' }
        ];
        localStorage.setItem('smJobs', JSON.stringify(defaultJobs));
    }

    // ---------- APPLICATIONS (per user) ----------
    function getApplied() {
        const map = JSON.parse(localStorage.getItem('smApplications') || '{}');
        return map[currentUser.email] || [];
    }

    function saveApplied(ids) {
        const map = JSON.parse(localStorage.getItem('smApplications') || '{}');
        map[currentUser.email] = ids;
        localStorage.setItem('smApplications', JSON.stringify(map));
    }

    // ---------- ELEMENTS ----------
    const userNameEl = document.getElementById('userName');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const jobGrid = document.getElementById('jobGrid');
    const jobCount = document.getElementById('jobCount');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userNameEl) {
        const first = (currentUser.fullName || 'User').split(' ')[0];
        userNameEl.textContent = first;
    }

    // ---------- RENDER JOBS ----------
    function renderJobs() {
        const allJobs = JSON.parse(localStorage.getItem('smJobs') || '[]');
        const appliedIds = getApplied();
        const keyword = (searchInput ? searchInput.value : '').toLowerCase();
        const category = categoryFilter ? categoryFilter.value : 'All';

        const filtered = allJobs.filter(job => {
            const matchKeyword = !keyword || job.title.toLowerCase().includes(keyword)
                || job.company.toLowerCase().includes(keyword)
                || job.skills.some(s => s.toLowerCase().includes(keyword));
            const matchCategory = category === 'All' || job.category === category;
            return matchKeyword && matchCategory;
        });

        if (jobCount) {
            jobCount.textContent = filtered.length;
        }

        if (!jobGrid) return;

        if (!filtered.length) {
            jobGrid.innerHTML = '<p class="empty">No jobs found. Try a different search.</p>';
            return;
        }

        jobGrid.innerHTML = filtered.map(job => {
            const applied = appliedIds.includes(job.id);
            const skillTags = job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('');

            return `
                <div class="job-card">
                    <div class="job-card-top">
                        <h3>${job.title}</h3>
                        <span class="job-posted">${job.posted}</span>
                    </div>
                    <p class="job-company">${job.company} · ${job.location}</p>
                    <p class="job-salary">${job.salary}</p>
                    <div class="job-skills">${skillTags}</div>
                    <button class="apply-btn" data-id="${job.id}" ${applied ? 'disabled' : ''}>
                        ${applied ? 'Applied' : 'Apply Now'}
                    </button>
                </div>
            `;
        }).join('');
    }

    // ---------- EVENT LISTENERS ----------
    if (searchInput) {
        searchInput.addEventListener('input', renderJobs);
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', renderJobs);
    }

    if (jobGrid) {
        jobGrid.addEventListener('click', (e) => {
            const btn = e.target.closest('.apply-btn');
            if (!btn || btn.disabled) return;

            const jobId = Number(btn.dataset.id);
            const applied = getApplied();
            applied.push(jobId);
            saveApplied(applied);

            alert('Application submitted successfully!');
            renderJobs();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('smCurrentUser');
            window.location.href = 'index.html';
        });
    }

    renderJobs();

});
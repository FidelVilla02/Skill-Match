// Employer job posting

document.addEventListener('DOMContentLoaded', () => {

    // ---------- GUARD: require login ----------
    const currentUser = JSON.parse(localStorage.getItem('smCurrentUser') || 'null');

    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // ---------- ELEMENTS ----------
    const postForm = document.getElementById('postForm');
    const jobTitle = document.getElementById('jobTitle');
    const company = document.getElementById('company');
    const category = document.getElementById('category');
    const location = document.getElementById('location');
    const salary = document.getElementById('salary');
    const skills = document.getElementById('skills');
    const myJobsList = document.getElementById('myJobsList');
    const logoutBtn = document.getElementById('logoutBtn');

    // ---------- RENDER MY POSTED JOBS ----------
    function renderMyJobs() {
        if (!myJobsList) return;

        const allJobs = JSON.parse(localStorage.getItem('smJobs') || '[]');
        const myJobs = allJobs.filter(job => job.employer === currentUser.email);

        if (!myJobs.length) {
            myJobsList.innerHTML = '<p class="empty">You have not posted any jobs yet.</p>';
            return;
        }

        myJobsList.innerHTML = myJobs.map(job => `
            <div class="job-card my-job">
                <div class="job-card-top">
                    <h3>${job.title}</h3>
                    <span class="job-posted">${job.posted}</span>
                </div>
                <p class="job-company">${job.company} · ${job.location}</p>
                <p class="job-salary">${job.salary}</p>
                <button class="delete-btn" data-id="${job.id}">Delete</button>
            </div>
        `).join('');
    }

    // ---------- HANDLE POST ----------
    if (postForm) {
        postForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const title = jobTitle.value.trim();
            const companyName = company.value.trim();
            const jobCategory = category.value;
            const jobLocation = location.value.trim();
            const salaryRange = salary.value.trim();
            const skillList = skills.value.split(',').map(s => s.trim()).filter(Boolean);

            if (!title || !companyName || !jobLocation) {
                alert('Please fill out all required fields.');
                return;
            }

            const allJobs = JSON.parse(localStorage.getItem('smJobs') || '[]');

            const newJob = {
                id: Date.now(),
                title,
                company: companyName,
                category: jobCategory === 'All' ? 'Other' : jobCategory,
                location: jobLocation,
                salary: salaryRange || 'Negotiable',
                skills: skillList,
                posted: 'today',
                employer: currentUser.email
            };

            allJobs.unshift(newJob);
            localStorage.setItem('smJobs', JSON.stringify(allJobs));

            postForm.reset();
            alert('Job posted successfully!');
            renderMyJobs();
        });
    }

    // ---------- HANDLE DELETE ----------
    if (myJobsList) {
        myJobsList.addEventListener('click', (e) => {
            const btn = e.target.closest('.delete-btn');
            if (!btn) return;

            if (!confirm('Are you sure you want to delete this job posting?')) return;

            const jobId = Number(btn.dataset.id);
            const allJobs = JSON.parse(localStorage.getItem('smJobs') || '[]');
            const updated = allJobs.filter(job => job.id !== jobId);
            localStorage.setItem('smJobs', JSON.stringify(updated));

            alert('Job posting deleted.');
            renderMyJobs();
        });
    }

    // ---------- LOGOUT ----------
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('smCurrentUser');
            window.location.href = 'index.html';
        });
    }

    renderMyJobs();

});
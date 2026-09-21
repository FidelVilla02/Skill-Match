// Employer dashboard - stats and my postings

document.addEventListener('DOMContentLoaded', () => {

    // ---------- GUARD: employers only ----------
    const currentUser = JSON.parse(localStorage.getItem('smCurrentUser') || 'null');

    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    if (currentUser.role !== 'employer') {
        window.location.href = 'jobs.html';
        return;
    }

    // ---------- ELEMENTS ----------
    const userNameEl = document.getElementById('userName');
    const statPostings = document.getElementById('statPostings');
    const statApplicants = document.getElementById('statApplicants');
    const statSeekers = document.getElementById('statSeekers');
    const myJobsList = document.getElementById('myJobsList');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userNameEl) {
        const first = (currentUser.fullName || 'Employer').split(' ')[0];
        userNameEl.textContent = first;
    }

    // ---------- DATA HELPERS ----------
    function getMyJobs() {
        const allJobs = JSON.parse(localStorage.getItem('smJobs') || '[]');
        return allJobs.filter(job => job.employer === currentUser.email);
    }

    function countJobApplicants(jobId) {
        const map = JSON.parse(localStorage.getItem('smApplications') || '{}');
        let count = 0;
        Object.values(map).forEach(ids => {
            if (Array.isArray(ids) && ids.includes(jobId)) count++;
        });
        return count;
    }

    // ---------- RENDER STATS ----------
    function renderStats() {
        const myJobs = getMyJobs();

        if (statPostings) {
            statPostings.textContent = myJobs.length;
        }

        if (statApplicants) {
            const total = myJobs.reduce((sum, job) => sum + countJobApplicants(job.id), 0);
            statApplicants.textContent = total;
        }

        if (statSeekers) {
            const users = JSON.parse(localStorage.getItem('smUsers') || '[]');
            const seekers = users.filter(u => (u.role || 'jobseeker') === 'jobseeker').length;
            statSeekers.textContent = seekers;
        }
    }

    // ---------- RENDER MY POSTINGS ----------
    function renderMyJobs() {
        if (!myJobsList) return;

        const myJobs = getMyJobs();

        if (!myJobs.length) {
            myJobsList.innerHTML = '<p class="empty">You have not posted any jobs yet. <a href="employer-post.html" style="color:#0A8F55;">Post a job</a> now.</p>';
            return;
        }

        myJobsList.innerHTML = myJobs.map(job => {
            const applicants = countJobApplicants(job.id);
            const skillTags = job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('');

            return `
                <div class="job-card my-job">
                    <div class="job-card-top">
                        <h3>${job.title}</h3>
                        <span class="job-posted">${job.posted}</span>
                    </div>
                    <p class="job-company">${job.company} · ${job.location}</p>
                    <p class="job-salary">${job.salary}</p>
                    <div class="job-skills">${skillTags}</div>
                    <p class="stat-applicants">${applicants} applicant(s)</p>
                </div>
            `;
        }).join('');
    }

    // ---------- LOGOUT ----------
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('smCurrentUser');
            window.location.href = 'index.html';
        });
    }

    // ---------- INIT ----------
    renderStats();
    renderMyJobs();

});
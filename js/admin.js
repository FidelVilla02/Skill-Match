// Admin demo: each tab reads the same localStorage records as the existing app.
document.addEventListener("DOMContentLoaded", () => {
    if (!requireRole("admin")) return;
    const content = document.getElementById("content"),
        filters = document.getElementById("filters");
    let tab;
    const e = esc;
    const button = (action, id, text) =>
        `<button class="btn-ghost" data-action="${action}" data-id="${e(id)}">${e(text)}</button>`;
    const table = (heads, rows) =>
        rows.length
            ? `<div class="admin-table"><table><thead><tr>${heads.map((h) => `<th>${e(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
            : '<p class="empty">No records match these filters.</p>';
    const select = (id, label, options) =>
        `<label>${label}<select id="${id}">${options.map((o) => `<option value="${e(o[0])}">${e(o[1])}</option>`).join("")}</select></label>`;
    const search =
        '<label>Search<input id="search" placeholder="Search name, email or title"></label>';
    const cards = (items) =>
        `<div class="stats-grid">${items.map((i) => `<a class="stat-card" href="${i[2]}"><h3>${i[1]}</h3><p>${e(i[0])}</p></a>`).join("")}</div>`;
    function route() {
        if (!activeSession("admin")) {
            logout();
            location.href = "login.html";
            return;
        }
        tab = location.hash.slice(1) || "dashboard";
        if (!["dashboard", "users", "jobs", "reports"].includes(tab))
            tab = "dashboard";
        document.getElementById("pageTitle").textContent = {
            dashboard: "Admin Dashboard",
            users: "Manage Users",
            jobs: "Manage Jobs",
            reports: "Reports",
        }[tab];
        document.getElementById("pageHint").textContent = {
            dashboard: "Review pending jobs and monitor platform activity.",
            users: "View profiles and manage account access.",
            jobs: "Review postings while employers manage their own hiring.",
            reports: "Detailed summaries from job and application records.",
        }[tab];
        document
            .querySelectorAll("#adminNav a")
            .forEach((a) => a.classList.toggle("active", a.hash === "#" + tab));
        filters.innerHTML = "";
        if (tab === "users")
            filters.innerHTML =
                search +
                select("role", "Role", [
                    ["", "All roles"],
                    ["jobseeker", "Jobseeker"],
                    ["employer", "Employer"],
                ]) +
                select("state", "Account", [
                    ["", "All statuses"],
                    ["active", "Active"],
                    ["suspended", "Suspended"],
                ]);
        if (tab === "jobs")
            filters.innerHTML =
                search +
                select("state", "Approval", [
                    ["", "All statuses"],
                    ...["Pending", "Approved", "Rejected", "Hidden"].map((s) => [s, s]),
                ]);
        if (tab === "reports")
            filters.innerHTML =
                '<label>From<input type="date" id="from"></label><label>To<input type="date" id="to"></label>' +
                select("employer", "Employer", [
                    ["", "All employers"],
                    ...getUsers()
                        .filter((u) => u.role === "employer")
                        .map((u) => [u.email, u.employer?.businessName || u.fullName]),
                ]) +
                '<button class="btn-ghost" id="printReport">Print Report</button>';
        filters.oninput = render;
        render();
    }
    function render() {
        const users = getUsers(),
            jobs = getJobs(),
            apps = getApplications();
        const keyword = (
            document.getElementById("search")?.value || ""
        ).toLowerCase(),
            state = document.getElementById("state")?.value || "";
        if (tab === "dashboard") {
            content.innerHTML =
                cards([
                    [
                        "Jobseekers",
                        users.filter((u) => u.role === "jobseeker").length,
                        "#users",
                    ],
                    [
                        "Employers",
                        users.filter((u) => u.role === "employer").length,
                        "#users",
                    ],
                    ["Approved / Open Jobs", jobs.filter(isVisibleJob).length, "#jobs"],
                    ["Applications", apps.length, "#reports"],
                    [
                        "Hired",
                        apps.filter((a) => a.status === "Hired").length,
                        "#reports",
                    ],
                ]) +
                "<h2>Pending Jobs</h2>" +
                table(
                    ["Job", "Employer", "Submitted", "Review"],
                    jobs
                        .filter((j) => j.approvalStatus === "Pending")
                        .map((j) => [
                            e(j.title),
                            e(j.company),
                            e(fmtDate(j.updatedAt || j.posted)),
                            button("view-job", j.id, "Review"),
                        ]),
                ) +
                "<h2>Recent Activity</h2>" +
                table(
                    ["Activity", "Date"],
                    [
                        ...jobs.map((j) => ({
                            text: `Job submitted: ${j.title}`,
                            at: j.updatedAt || j.posted,
                        })),
                        ...jobs
                            .filter((j) => j.reviewedAt)
                            .map((j) => ({
                                text: `${j.approvalStatus}: ${j.title}`,
                                at: j.reviewedAt,
                            })),
                        ...apps.map((a) => ({
                            text: `Application: ${a.seekerName} — ${a.jobTitle}`,
                            at: a.submittedAt,
                        })),
                        ...users
                            .filter((u) => u.statusChangedAt)
                            .map((u) => ({
                                text: `Account ${u.accountStatus}: ${u.fullName}`,
                                at: u.statusChangedAt,
                            })),
                    ]
                        .sort((a, b) => new Date(b.at) - new Date(a.at))
                        .slice(0, 8)
                        .map((x) => [e(x.text), e(fmtDateTime(x.at))]),
                );
        }
        if (tab === "users") {
            const role = document.getElementById("role").value;
            content.innerHTML = table(
                ["Name / Email", "Role", "Account", "Actions"],
                users
                    .filter(
                        (u) =>
                            u.role !== "admin" &&
                            (!role || u.role === role) &&
                            (!state || u.accountStatus === state) &&
                            `${u.fullName} ${u.email} ${u.username}`
                                .toLowerCase()
                                .includes(keyword),
                    )
                    .map((u) => [
                        `${e(u.fullName)}<br>${e(u.email)}`,
                        e(u.role),
                        e(u.accountStatus),
                        button("view-user", u.email, "View Profile") +
                        button(
                            "account",
                            u.email,
                            u.accountStatus === "suspended" ? "Reactivate" : "Suspend",
                        ),
                    ]),
            );
        }
        if (tab === "jobs")
            content.innerHTML = table(
                ["Job / Employer", "Approval", "Hiring", "Reason", "Actions"],
                jobs
                    .filter(
                        (j) =>
                            (!state || j.approvalStatus === state) &&
                            `${j.title} ${j.company} ${j.employer}`
                                .toLowerCase()
                                .includes(keyword),
                    )
                    .map((j) => [
                        `${e(j.title)}<br>${e(j.company)}`,
                        e(j.approvalStatus),
                        e(j.status),
                        `<span class="admin-reason">${e(j.reviewReason || "—")}</span>`,
                        button("view-job", j.id, "View Details") +
                        (j.approvalStatus === "Pending"
                            ? button("approve", j.id, "Approve") +
                            button("reject", j.id, "Reject")
                            : "") +
                        (j.approvalStatus === "Approved"
                            ? button("hide", j.id, "Hide")
                            : "") +
                        (j.approvalStatus === "Hidden"
                            ? button("review", j.id, "Return to Review")
                            : ""),
                    ]),
            );
        if (tab === "reports") renderReport(jobs, apps, users);
    }
    function renderReport(jobs, apps, users) {
        const from = document.getElementById("from").value,
            to = document.getElementById("to").value,
            employer = document.getElementById("employer").value;
        if (from && to && from > to) {
            content.innerHTML =
                '<p class="empty">From date must be before or equal to To date.</p>';
            return;
        }
        const inRange = (iso) => {
            const d = new Date(iso);
            if (isNaN(d)) return false;
            const date =
                d.getFullYear() +
                "-" +
                String(d.getMonth() + 1).padStart(2, "0") +
                "-" +
                String(d.getDate()).padStart(2, "0");
            return (!from || date >= from) && (!to || date <= to);
        };
        const employerJobs = jobs.filter(
            (j) => !employer || j.employer === employer,
        ),
            ids = new Set(employerJobs.map((j) => j.id));
        const filteredJobs = employerJobs.filter((j) => inRange(j.posted)),
            filteredApps = apps.filter(
                (a) => ids.has(a.jobId) && inRange(a.submittedAt),
            );
        const countRows = (values, data, key) =>
            values.map((v) => [
                e(v),
                String(data.filter((x) => x[key] === v).length),
            ]);
        content.innerHTML =
            `<p class="report-context">Period: ${e(from || "All dates")} to ${e(to || "present")} · Employer: ${e(document.getElementById("employer").selectedOptions[0].textContent)}<br>Jobs use original posting date. Applications use submission date and show current status. Hired totals describe currently hired applications submitted in this period.</p>` +
            cards([
                ["Job Postings", filteredJobs.length, "#reports"],
                ["Applications", filteredApps.length, "#reports"],
                [
                    "Hired Applicants",
                    filteredApps.filter((a) => a.status === "Hired").length,
                    "#reports",
                ],
            ]) +
            "<h2>Applications by Status</h2>" +
            table(
                ["Current Status", "Total"],
                countRows(
                    [
                        "Applied",
                        "Shortlisted",
                        "Interview",
                        "Hired",
                        "Rejected",
                        "Withdrawn",
                    ],
                    filteredApps,
                    "status",
                ),
            ) +
            "<h2>Jobs by Approval</h2>" +
            table(
                ["Approval", "Total"],
                countRows(
                    ["Pending", "Approved", "Rejected", "Hidden"],
                    filteredJobs,
                    "approvalStatus",
                ),
            ) +
            "<h2>Jobs by Category</h2>" +
            table(
                ["Category", "Total"],
                countRows(
                    [...new Set(filteredJobs.map((j) => j.category))],
                    filteredJobs,
                    "category",
                ),
            ) +
            "<h2>Hiring by Employer</h2>" +
            table(
                ["Employer", "Applications", "Hired"],
                users
                    .filter(
                        (u) => u.role === "employer" && (!employer || u.email === employer),
                    )
                    .map((u) => {
                        const owned = new Set(
                            jobs.filter((j) => j.employer === u.email).map((j) => j.id),
                        );
                        const mine = filteredApps.filter((a) => owned.has(a.jobId));
                        return [
                            e(u.employer?.businessName || u.fullName),
                            String(mine.length),
                            String(mine.filter((a) => a.status === "Hired").length),
                        ];
                    }),
            );
    }
    function showDetail(title, rows) {
        openModal(
            `<div class="modal-card"><button class="modal-close" data-admin-close aria-label="Close">×</button><h3>${e(title)}</h3><div class="admin-detail">${rows.map((r) => `<div><strong>${e(r[0])}</strong><p class="detail-text">${e(r[1] || "—")}</p></div>`).join("")}</div><button class="btn-ghost" data-admin-close>Close</button></div>`,
        );
    }
    document.addEventListener("click", async (ev) => {
        if (ev.target.closest("[data-admin-close]")) {
            closeModal();
            return;
        }
        if (ev.target.closest("#printReport")) {
            window.print();
            return;
        }
        const b = ev.target.closest("[data-action]");
        if (!b) return;
        if (!activeSession("admin")) {
            logout();
            location.href = "login.html";
            return;
        }
        const id = b.dataset.id,
            action = b.dataset.action;
        if (action === "view-user") {
            const u = findUserByEmail(id);
            if (!u) return;
            const profile = u.role === "employer" ? u.employer : u.seeker;
            showDetail(u.fullName, [
                ["Username", u.username],
                ["Email", u.email],
                ["Role", u.role],
                ["Account", u.accountStatus],
                ...Object.entries(profile || {}).map(([k, v]) => [
                    k,
                    Array.isArray(v) ? v.join(", ") : v,
                ]),
            ]);
            return;
        }
        if (action === "account") {
            const u = findUserByEmail(id);
            if (!u || u.role === "admin") return;
            const next = u.accountStatus === "suspended" ? "active" : "suspended";
            if (
                !(await confirmDialog({
                    title: next === "active" ? "Reactivate account?" : "Suspend account?",
                    message:
                        "Records will be kept. Suspended users cannot sign in or perform actions.",
                    confirmText: "Confirm",
                }))
            )
                return;
            if (!activeSession("admin")) return;
            const users = getUsers(),
                target = users.find((x) => x.email === id);
            if (!target || target.role === "admin") return;
            target.accountStatus = next;
            target.statusChangedAt = new Date().toISOString();
            saveUsers(users);
            render();
            return;
        }
        const j = getJob(id);
        if (!j) return;
        if (action === "view-job") {
            showDetail(j.title, [
                ["Employer", j.company],
                ["Owner Email", j.employer],
                ["Location", j.location],
                ["Approval", j.approvalStatus],
                ["Hiring Status", j.status],
                ["Category", j.category],
                ["Employment", j.employmentType],
                ["Work Setup", j.workSetup],
                ["Salary", j.salaryDisclosed ? j.salary : "Not disclosed"],
                ["Skills", (j.skills || []).join(", ")],
                ["Description", j.description],
                ["Responsibilities", j.responsibilities],
                ["Benefits", j.benefits],
                [
                    "Requirements",
                    (j.requirements || [])
                        .map((r) => r.label + (r.required ? " (Required)" : " (Preferred)"))
                        .join("\n"),
                ],
                ["Review Reason", j.reviewReason],
            ]);
            return;
        }
        let reason = "";
        if (action === "reject" || action === "hide") {
            reason = window.prompt("Enter a reason (required):");
            if (reason === null) return;
            reason = reason.trim();
            if (!reason) {
                toast("Please provide a reason.", "warn");
                return;
            }
        }
        if (!activeSession("admin")) return;
        const all = getJobs(),
            target = all.find((x) => x.id === id);
        if (!target) return;
        if (
            (action === "approve" || action === "reject") &&
            target.approvalStatus !== "Pending"
        )
            return;
        if (action === "hide" && target.approvalStatus !== "Approved") return;
        if (action === "review" && target.approvalStatus !== "Hidden") return;
        const status = {
            approve: "Approved",
            reject: "Rejected",
            hide: "Hidden",
            review: "Pending",
        }[action];
        if (!status) return;
        target.approvalStatus = status;
        target.reviewReason = reason;
        target.reviewedAt = new Date().toISOString();
        saveJobs(all);
        toast("Job " + status.toLowerCase() + ".", "success");
        render();
    });
    document.getElementById("adminLogout").onclick = () => {
        logout();
        location.href = "login.html";
    };
    window.addEventListener("hashchange", route);
    window.addEventListener("storage", render);
    route();
});

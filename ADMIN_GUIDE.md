# Skill-Match Admin Demo

Open the project using VS Code Live Server. Use the same browser and site address for all demo accounts. This project uses HTML, CSS, JavaScript and localStorage only.

## Login

- Admin: `admin@skillmatch.demo` / `admin123`
- Employer: `demo@toledo.ph` / `demo123`
- Jobseeker: `grace@email.ph` / `demo123`

Use the existing login page. There is no admin registration.

## New admin features

- Dashboard: linked summary cards, pending jobs and recent activity.
- Manage Users: search, role/status filters, profile view, suspend/reactivate. Passwords are not displayed.
- Manage Jobs: search/status filter, details, approve, reject with reason, hide with reason, return hidden posts to review.
- Reports: current application statuses, job categories/approval, hiring by employer, date and employer filters, printing.

## Modified flows

- New job posts wait for approval. Only approved/open jobs from active employers appear in the jobseeker listing.
- Employers see moderation status/reason on their dashboard and posting list.
- On Post a Job, choose Edit / Resubmit to load an existing job into the full form. Saving returns it to Pending and keeps existing applications and its original posting date.
- Admins moderate postings; employers retain hiring decisions.
- Suspended accounts cannot sign in or continue actions in protected pages. Records remain; suspended employers' jobs are temporarily excluded from listings.
- Existing local records are migrated in place without changing the seed version. Existing jobs are treated as approved. Restoring demo data explicitly resets records as before and also restores the admin.

## Suggested demo

1. Employer submits a job; confirm Pending.
2. Admin approves it in Manage Jobs.
3. Jobseeker signs in, sees the job and applies.
4. Employer reviews the applicant and changes the hiring status.
5. Admin views Reports and prints the filtered result.
6. Admin rejects a new pending job with a reason. Employer edits and resubmits it.
7. Admin suspends/reactivates a demo user and checks login behavior.

Reports filter jobs by original posting date and applications by submission date, using local calendar dates. Application and hiring counts show current status, not historical transitions during that period.

All accounts and access checks are simulated in the browser for coursework. No backend or shared cross-device storage is used. Demo credentials and records are browser data; use invented information.

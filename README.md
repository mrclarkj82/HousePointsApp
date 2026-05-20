# Doral Red Rock House Points

React, Tailwind CSS, Firebase Authentication, Firestore, and PWA MVP for Doral Red Rock house points.

## Run Locally

```bash
npm install
npm run dev
```

## Website

GitHub Pages deploys from `main` with GitHub Actions:

`https://mrclarkj82.github.io/HousePointsApp/`

If the first workflow run says GitHub Pages has not been enabled, open repository
Settings > Pages and set the source to GitHub Actions, then rerun the workflow.

Because Firebase Google Sign-In checks allowed domains, add this domain in Firebase Console:

`mrclarkj82.github.io`

## Firebase Setup

1. Enable Google sign-in in Firebase Authentication.
2. Add `mrclarkj82.github.io` to Authentication > Settings > Authorized domains.
3. Deploy Firestore rules and indexes from this repo.
4. Create the first admin by either:
   - signing in as `joseph.clark@doralacademynv.org` or `nicole.whitaker@doralacademynv.org`, which are built in as bootstrap admins,
   - adding a Firebase custom claim `admin: true`, or
   - creating `teachers/{admin-email-lowercase}` in Firestore with `name`, `email`, `emailLower`, `role: "admin"`, and `active: true`.
5. Sign in with that admin account.
6. Use Admin > Setup to seed houses, categories, and seasons.
7. Import students and teachers by CSV.

Student CSV headers:

```csv
student name,email,grade,period/advisory,house
```

Teacher CSV headers:

```csv
teacher name,email,role
```

Valid houses: Verax, Constantia, Comitas, Fortitudo.

## MVP Features

- Google sign-in and Firestore role-based routing.
- Student dashboard with profile, house, personal points, recent awards, and leaderboard.
- Teacher mobile-first award flow for students, groups, periods, and houses.
- Admin CSV import, student house assignment, user roles, categories, seasons, and audit log.
- Point reversal and amount correction with preserved transaction history.
- Installable PWA manifest and service worker.

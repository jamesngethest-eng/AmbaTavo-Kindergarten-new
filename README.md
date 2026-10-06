# AmboTavo Kindergarten

A responsive Montessori kindergarten website with a secure school portal for administrators, teachers and parents.

## Run locally

Requires Node.js 18+.

```bash
npm start
```

Open `http://localhost:3000`.

## First admin account

For a fresh database, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`. If omitted, the development fallback is:

- Email: `admin@ambotavo.school`
- Password: `ChangeMe123!`

**Change this immediately for any real deployment.** Existing databases keep their existing password.

## Production / Render

The repository includes `render.yaml` with:

- Node web service
- `/health` health check
- persistent disk mounted at `/var/data`
- `DATA_DIR=/var/data`
- optional WhatsApp Cloud API variables

If you deploy with Render Blueprint, review the generated service and set a strong `ADMIN_PASSWORD` before the first production initialization.

## WhatsApp login

The parent/teacher portal can use password login without any external service. Real WhatsApp one-time codes require a WhatsApp Cloud API token, phone-number ID and approved authentication template. Without those values, OTP requests run in development mode and print the code to the server log.

## Important production note

This project stores application data in a JSON file. The included persistent disk is required on hosts with ephemeral filesystems. For a larger school deployment, move users, posts and enquiries to PostgreSQL or another managed database.
"# AmbaTavo-Kindergarten-new" 

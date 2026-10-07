# AmboTavo Kindergarten (Montessori Way Road)
Run: `node server.js` (Node 18+, no installs) then open http://localhost:3000
Demo logins (change them in the portal): admin@ambotavo.school / Admin123!, teacher@ambotavo.school / Teacher123!, parent@ambotavo.school / Parent123!
Email sign-in codes: turn on 2-Step Verification on the school Gmail, create an App Password at myaccount.google.com/apppasswords,
then set GMAIL_USER and GMAIL_APP_PASSWORD in .env (or Render Environment). Without them, codes print in the terminal.
Sign-ins last 30 days and survive restarts. Keep data.json and uploads/ safe (on Render: persistent disk + DATA_DIR=/var/data).

# Parent Messaging Backend

A lightweight Express + SQLite service that powers parent assignments, invitation QR codes + PINs, and two-way messaging for the NICU dashboards.

## Prerequisites

- Node.js 18+
- npm

## Setup

`ash
cd ../parent_backend
npm install
cp .env.example .env   # customise secrets and ports
npm run migrate         # creates the SQLite schema
npm start               # runs on http://localhost:5055 by default
`

### Environment variables (.env)

| Variable | Description |
| --- | --- |
| PARENT_BACKEND_PORT | HTTP port (default 5055) |
| PARENT_JWT_SECRET | Secret used to sign parent JWT tokens |
| PARENT_CLINICIAN_KEY | API key required by the clinical dashboard for clinician endpoints |
| PARENT_INVITE_EXPIRY_HOURS | Default invitation validity (default 48) |

### Database

- SQLite database stored at parent_backend/data/parent_portal.db
- Tables: abies, parents, invitations (stores hashed PIN + expiry), messages
- Run 
pm run migrate any time you need to recreate the schema

## API overview

| Endpoint | Method | Description |
| --- | --- | --- |
| /api/clinician/invitations | POST | Generate a parent invitation + 6-digit PIN (requires x-api-key) |
| /api/clinician/babies/:babyId/parents | GET | List parents assigned to a baby |
| /api/clinician/babies/:babyId/messages | GET | Conversation history for a baby |
| /api/clinician/messages | POST | Send a message from the care team |
| /api/invitations/:code | GET | Fetch invitation metadata (PIN required flag, expiry) |
| /api/auth/parent/register | POST | Parent registration (code + PIN + phone + password) |
| /api/auth/parent/login | POST | Parent login (phone + password) |
| /api/parent/messages | GET | Parent view of conversation (JWT protected) |
| /api/parent/messages | POST | Parent reply |

All parent-facing endpoints expect a Bearer token returned by the login/register endpoints.

## Clinical dashboard integration

Set the following variables in eact_dashboard/.env:

`env
REACT_APP_PARENT_API_URL=http://localhost:5055/api
REACT_APP_PARENT_CLINICIAN_KEY=super-secret-clinician-key
REACT_APP_PARENT_REGISTRATION_URL=http://localhost:3000/parent/register
`

Then rebuild the React app (
pm run build). Assigning a parent from the clinical dashboard will now generate QR codes, display the PIN, and enable two-way messaging.

## Development tips

- 
pm run dev if you install 
odemon locally
- Logs print to stdout; press Ctrl+C to stop the server
- Delete data/parent_portal.db to reset (or adjust the migration script)

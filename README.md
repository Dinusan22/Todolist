# Todo. — Minimal list frontend (option 1)

This is the first design you selected: a calm green theme, a centered task list, status filters and edit/delete controls on every row. Task editing opens in a small dialog.

This is a separate React project from the Workspace design. It has its own demo data, browser session and theme settings.

## Run it

1. Extract the ZIP.
2. Open the `todo-minimal-frontend` folder in VS Code.
3. In the terminal, run:

```bash
npm install
npm run dev
```

4. Open `http://localhost:5174`.
5. Try the sample tasks immediately in **Demo mode**.
6. To connect real tasks, start Spring Boot on port **8081** and click **Sign in** or **Connect your backend**. Choose **Sign up** if you need an account.

Use Node.js 22.12 or newer. Check with `node --version`.

This version uses port **5174**, so it can run beside the Workspace version on **5173**. Both can connect to the same backend on **8081**.

### Windows PowerShell

If PowerShell blocks `npm.ps1`, use these commands instead. There is no need to change the PowerShell execution policy:

```powershell
npm.cmd install
npm.cmd run dev
```

## Included pages

| Page | Local address | Fields and controls |
| --- | --- | --- |
| Minimal task list | `http://localhost:5174/` | Add, edit, delete, complete, filter and search |
| Sign in | `http://localhost:5174/#/sign-in` | Email, password and show/hide password |
| Sign up | `http://localhost:5174/#/sign-up` | Email, password, confirm password and show/hide controls |

Sign up checks that both passwords match before sending a request. A successful registration returns to Sign in with a confirmation message. Successful sign-in loads the backend task list. The backend receives only `email` and `password`; the confirm-password field is checked in the frontend.

## Included

- Add, edit, delete and complete tasks.
- All, Pending and Completed filters, plus search.
- Progress count and progress bar.
- Responsive layout and light/dark themes.
- Sign-in and registration using your JWT backend.
- Separate browser-only demo data.
- Loading states, connection errors and session expiry handling.

Demo tasks are saved only in this browser. They are not uploaded when you sign in. Signing in loads the backend task list instead.

## Backend configuration

The API matches your saved `HelloWorld - Copy.zip` from 27 October 2026. If you changed your controller routes since then, update `src/services/api.js`.

If Spring Boot uses another address, copy `.env.example` to `.env`, change `BACKEND_URL` and restart the frontend:

```dotenv
BACKEND_URL=http://localhost:8081
VITE_API_BASE_URL=/api
```

Vite forwards `/api` to Spring Boot and removes that prefix, avoiding cross-origin requests during local development.

| Action | Request |
| --- | --- |
| Register | `POST /auth/Register` |
| Log in | `POST /auth/Login` |
| List tasks | `GET /todo` |
| Create task | `POST /todo/create` |
| Update task | `PUT /todo` with the task ID in the JSON body |
| Delete task | `DELETE /todo/{id}` |

The task fields are `id`, `title`, `description` and `isCompleted`. Create requests omit `id`. Task requests use the JWT in an `Authorization: Bearer <token>` header. The frontend stores the token in session storage for this tab, clears it on sign-out/expiry, and does not store passwords.

## Main files

| File | Purpose |
| --- | --- |
| `src/App.jsx` | Task list, app state and task operations |
| `src/styles.css` | Minimal design and responsive styling |
| `src/components/TaskEditDialog.jsx` | Edit title, description and completion status |
| `src/components/AuthPage.jsx` | Separate Sign in and Sign up pages |
| `src/components/Dialog.jsx` | Accessible modal dialog |
| `src/services/api.js` | Backend requests and error handling |
| `src/data/demoTasks.js` | Sample tasks and separate demo storage |
| `vite.config.js` | Frontend ports and local backend proxy |

## Check and build

```bash
npm test
npm run build
```

The production build is placed in `dist/`. To preview it locally:

```bash
npm run preview
```

Open `http://localhost:4174`. The local preview also forwards `/api` to your backend.

## Troubleshooting

- **Cannot reach backend:** start Spring Boot and check `BACKEND_URL`.
- **Invalid User / user not registered:** sign in with an existing backend account or register.
- **Session ended:** sign in again. Your backend controls the token lifetime and does not provide a refresh-token endpoint.
- **404:** check the controller route names and their capital letters.
- **Port 5174 is busy:** stop another copy of this frontend, or run `npm run dev -- --port 5175`.

## Scope

This is a frontend-only package. It does not modify your Java code, database or credentials. The backend connection must be tested with Spring Boot running on your computer; the included API tests use mock HTTP responses.

Your saved backend currently uses `findAll()` without filtering by the logged-in user. Authenticated accounts therefore share the task list. Separate private accounts require ownership checks in the backend; changing the frontend does not provide that protection.

The Vite proxy runs only during local development/preview. A deployed production frontend needs an HTTPS reverse proxy to the API, or an HTTPS API URL and an appropriate backend CORS policy.

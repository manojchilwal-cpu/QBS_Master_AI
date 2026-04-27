# Login App

A desktop-first React login page with dark/light mode support and an Express backend for authentication.

## Features
- Dark and light theme toggle
- Poppins font styling
- Hero brand illustration using SVG assets
- Login validation, loading state, and feedback messaging
- Express API with JWT token generation

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the backend server:

```bash
npm run server
```

3. In another terminal, start the client:

```bash
npm run dev
```

4. Open the app in your browser at `http://localhost:5173`.

5. To preview the production build, first start the backend server in another terminal:

```bash
npm run server
```

Then run:

```bash
npm run preview
```

6. Open the preview in your browser at the port shown by Vite (usually `http://localhost:4173`).

> The preview server only serves the built frontend. Login requires the backend to be running at `http://localhost:4000`.

## Demo credentials
- Username: `admin`
- Password: `Demo1234!`

## Notes
- Use `npm install` after installing Node.js in your environment.
- The server listens on port `4000`.
- The login request proxy is configured through Vite.

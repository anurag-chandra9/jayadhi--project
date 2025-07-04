
 jayadhi--project

This project contains both frontend (vanilla JavaScript) and backend code.

 Frontend

- The frontend is a vanilla JavaScript project.
- To run the frontend:
  - Open `index.html` directly in your browser.
  - Or, use a static server like [live-server](https://www.npmjs.com/package/live-server) or [http-server](https://www.npmjs.com/package/http-server) to serve the files.

 Backend

- The backend code is located in the `server` folder (or specify the correct folder if different).
- To run the backend:
  1. Navigate to the backend directory:
     ```
     cd server
     ```
  2. Install dependencies:
     ```
     npm install
     ```
  3. Start the backend server:
     ```
     npm run dev
     ```

> Note: The frontend is not a React project. Do not use `npm start` or `react-scripts` in the frontend directory.
# jayadhi--project

Instructions to Get Gmail App Password (for NodeMailer, etc.)
Go to https://myaccount.google.com/apppasswords
(Sign in and complete 2-Step Verification if not done already)

Select App → choose “Mail”, Select Device → choose “Other” (name it e.g., "NodeMailer") → click Generate
→ Google will show you a 16-character password like 
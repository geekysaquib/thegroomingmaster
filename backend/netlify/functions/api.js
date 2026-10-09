import serverless from "serverless-http";
import app from "../../src/app.js";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set in the Netlify site environment variables.");

// Netlify rewrites /api/* to /.netlify/functions/api/api/*; strip the function prefix so Express sees /api/*.
export const handler = serverless(app, { basePath: "/.netlify/functions/api" });

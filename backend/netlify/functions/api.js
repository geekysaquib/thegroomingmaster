import serverless from "serverless-http";
import app from "../../src/app.js";

// Netlify rewrites /api/* to /.netlify/functions/api/api/*; strip the function prefix so Express sees /api/*.
const expressHandler = serverless(app, { basePath: "/.netlify/functions/api" });

const REQUIRED = ["JWT_SECRET", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"];
const missing = REQUIRED.filter((k) => !process.env[k]);

// Answer with a readable JSON error instead of crashing (which Netlify reports as an opaque 502).
export const handler = missing.length
  ? async () => ({
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: `Server is not configured: set ${missing.join(", ")} in Netlify environment variables, then redeploy.` }),
    })
  : expressHandler;

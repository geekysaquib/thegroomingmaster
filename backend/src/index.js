import "dotenv/config";
import app from "./app.js";

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set - copy backend/.env.example to backend/.env first.");
  process.exit(1);
}

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Grooming Master API on http://localhost:${port}`));

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import pool from "./config/db";
import authRoutes from "./routes/authRoutes";
import flightRoutes from "./routes/flightRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import { stripeWebhookHandler } from "./controllers/webhookController";

const app = express();
app.use(cors({
 origin: 'http://localhost:3000/', 
    credentials: true,
    }));

app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(express.json());


app.use("/auth", authRoutes);
app.use("/flights", flightRoutes);
app.use("/bookings", bookingRoutes);
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/db_test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Database test error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


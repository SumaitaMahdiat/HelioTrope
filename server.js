import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import closetRoutes from "./routes/closetRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import socialRoutes from "./routes/socialRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config(); 

if (!process.env.JWT_SECRET) {
  throw new Error("Missing required environment variable: JWT_SECRET");
}

if (!process.env.MONGO_URI) {
  throw new Error("Missing required environment variable: MONGO_URI");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/closet", closetRoutes);
app.use("/api/social", socialRoutes);
app.use("/api", aiRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("API working");
});

const port = process.env.PORT || 5001;
const server = app.listen(port, () =>
  console.log(`Server running on port ${port}`),
);

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.log(
      `Port ${port} is already in use. A server instance is likely already running.`,
    );
    process.exit(0);
  }
  throw error;
});

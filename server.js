import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import closetRoutes from "./routes/closetRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import socialRoutes from "./routes/socialRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import commerceRoutes from "./routes/commerceRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("Missing required environment variable: JWT_SECRET");
}

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  throw new Error(
    "Missing required environment variable: MONGO_URI or MONGODB_URI",
  );
}

//path configuration for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet());
app.use(morgan("combined"));
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/closet", closetRoutes);
app.use("/api/social", socialRoutes);
app.use("/api", aiRoutes);
app.use("/api/commerce", commerceRoutes);

app.get("/", (req, res) => {
  res.send("API working");
});

const port = process.env.PORT || 5001;

async function startServer() {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("MongoDB connected");

    const server = app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });

    process.on("SIGTERM", () => {
      console.log("SIGTERM received, graceful shutdown...");
      server.close(() => {
        mongoose.connection.close(false, () => {
          process.exit(0);
        });
      });
    });

    server.on("error", (error) => {
      if (error?.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use.`);
        process.exit(0);
      }
      throw error;
    });
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

void startServer();

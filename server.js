import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import closetRoutes from "./routes/closetRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/closet", closetRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

app.get("/", (req, res) => {
  res.send("API working");
});

app.listen(5000, () => console.log("Server running on port 5000"));

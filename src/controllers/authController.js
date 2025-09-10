// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const REFRESH_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  maxAge: 7 * 24 * 3600 * 1000, // 7d
};

// ----------------------
// Generate tokens
// ----------------------
function signAccessToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
}

function signRefreshToken(user) {
  return jwt.sign({ id: user._id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

// ----------------------
// Login
// ----------------------
export const loginUser = async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ field: "email", message: "Email not found" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(400).json({ field: "password", message: "Incorrect password" });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE);

    res.json({
      accessToken,
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fieldErrors = Object.fromEntries(
        err.errors.map((e) => [e.path[0], e.message])
      );
      return res.status(400).json({ errors: fieldErrors });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ----------------------
// Register
// ----------------------
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashed });
    res.status(201).json({ user });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Email already exists" });
  }
};

// ----------------------
// Refresh Token
// ----------------------
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found" });

    // Rotate tokens
    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE);

    res.json({ accessToken: newAccessToken, user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    console.error("Refresh error:", err.message);
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

// ----------------------
// Logout
// ----------------------
export const userLogout = async (req, res) => {
  try {
    res.clearCookie("refreshToken", { path: "/" });
    res.json({ ok: true });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ ok: false });
  }
};

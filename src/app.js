import express from 'express';
import { connectDB } from './config/database.js';
import cookieParser from "cookie-parser";
import cors from 'cors';
import http from "http";
import { Server } from "socket.io";
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import socketHandler from './socket.js';
import User from './models/User.js';

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:3000", // React dev server
  credentials: true,
}));
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use("/api", chatRoutes);

// Connect to the database
connectDB();

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", credentials: true },
});

io.use(async (socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers["authorization"]?.replace("Bearer ", "");

  if (!token) return next(new Error("No token provided"));

  try {
    // Verify token via Laravel
    const res = await fetch(`${process.env.LARAVEL_API}/api/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
    });

    if (!res.ok) throw new Error("Invalid token");

    const user = await res.json();

    // Upsert user in MongoDB
    let mongoUser = await User.findOneAndUpdate(
      { laravelId: user.id }, // store Laravel user id separately
      {
        name: user.name,
        email: user.email,
        photo: user.photo
      },
      { upsert: true, new: true }
    );

    // Attach to socket
    socket.user = {
      id: mongoUser._id, // Mongo _id
      laravelId: user.id, // keep Laravel ID if needed
      name: mongoUser.name,
      photo: mongoUser.photo ?? null
    };

    return next();
  } catch (err) {
    console.error("Auth error:", err);
    return next(new Error("Auth failed"));
  }
});

socketHandler(io);

// Routes
app.get('/', (req, res) => {
  res.send('Hello World Hasan!');
});

export default server;
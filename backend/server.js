const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const client = require("prom-client");

const app = express();
// Prometheus Registry
const register = new client.Registry();

// Collect default NodeJS metrics
client.collectDefaultMetrics({
  register,
});

// Total HTTP Requests
const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP Requests",
  labelNames: ["method", "route", "status"],
});

register.registerMetric(httpRequestCounter);

const requestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP Request Duration",
  labelNames: ["method", "route", "status"],
  buckets: [0.1,0.3,0.5,1,2,5],
});

register.registerMetric(requestDuration);

const activeRequests = new client.Gauge({
    name: "http_active_requests",
    help: "Active HTTP Requests"
});

register.registerMetric(activeRequests);

const PORT = process.env.PORT || 3000;

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://mongodb-service:27017/todoapp";

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Todo Schema
const todoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },
  completed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Todo = mongoose.model("Todo", todoSchema);

app.use((req, res, next) => {

    activeRequests.inc();

    const end = requestDuration.startTimer();

    res.on("finish", () => {

        activeRequests.dec();

        httpRequestCounter.inc({
            method: req.method,
            route: req.route?.path || req.path,
            status: res.statusCode
        });

        end({
            method: req.method,
            route: req.route?.path || req.path,
            status: res.statusCode
        });

    });

    next();

});

// Routes
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/todos", async (req, res) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 });
    res.json(todos);
  } catch (error) {
    console.error("Error fetching todos:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/todos", async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({
        error: "Title is required",
      });
    }

    const todo = new Todo({
      title,
      description: description || "",
    });

    await todo.save();
    res.status(201).json(todo);
  } catch (error) {
    console.error("Error creating todo:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/todos/:id", async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);

    if (!todo) {
      return res.status(404).json({
        error: "Todo not found",
      });
    }

    res.json(todo);
  } catch (error) {
    console.error("Error fetching todo:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/metrics", async (req, res) => {

    res.set("Content-Type", register.contentType);

    res.end(await register.metrics());

});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

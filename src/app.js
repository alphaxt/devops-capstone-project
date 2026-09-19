const path = require("node:path");
const express = require("express");
const { CATEGORIES } = require("./constants/categories");
const { createExpenseRouter } = require("./routes/expenseRoutes");

function formatCurrency(value) {
  const numericValue = Number(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function createApp({ expenseRepository, healthCheck, logger = console }) {
  if (!expenseRepository) {
    throw new Error("expenseRepository is required");
  }
  if (typeof healthCheck !== "function") {
    throw new Error("healthCheck must be a function");
  }

  const app = express();
  app.disable("x-powered-by");
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));

  app.locals.appName = "PocketLedger";
  app.locals.categories = CATEGORIES;
  app.locals.formatCurrency = formatCurrency;
  app.locals.formatDate = formatDate;

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    next();
  });
  app.use(express.urlencoded({ extended: false, limit: "20kb" }));
  app.use(
    "/assets",
    express.static(path.join(__dirname, "public"), {
      maxAge: "1h",
      etag: true,
    }),
  );

  app.get("/", (req, res) => res.redirect(302, "/expenses"));

  app.get("/health", async (req, res) => {
    try {
      await healthCheck();
      return res.status(200).json({ status: "ok", database: "connected" });
    } catch (error) {
      logger.warn("Database health check failed.");
      return res
        .status(503)
        .json({ status: "unhealthy", database: "unavailable" });
    }
  });

  app.use("/expenses", createExpenseRouter(expenseRepository));

  app.use((req, res) => {
    res.status(404).render("404", { title: "Page not found" });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    logger.error("Unhandled request error.", {
      method: req.method,
      path: req.path,
      message: error.message,
    });

    return res.status(500).render("error", {
      title: "Something went wrong",
    });
  });

  return app;
}

module.exports = { createApp, formatCurrency, formatDate };

function requireSameOrigin(req, res, next) {
  const origin = req.get("origin");

  // Non-browser clients may not send Origin. Browsers include it for form POSTs.
  if (!origin) {
    return next();
  }

  try {
    const originHost = new URL(origin).host;
    if (originHost === req.get("host")) {
      return next();
    }
  } catch {
    // Malformed origins are rejected below.
  }

  return res.status(403).render("403", { title: "Request blocked" });
}

module.exports = { requireSameOrigin };

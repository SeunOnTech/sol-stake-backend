import 'dotenv/config';
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { readFileSync } from "fs";
import path from "path";
import { resolvers } from "./api/resolvers";
import { authMiddleware, createGraphQLContext } from "./lib/auth";
import { rateLimitMiddleware } from "./lib/rateLimit";
import { graphQLCache } from "./lib/cache";

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Apply rate limiting middleware
app.use(rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100 // limit each IP to 100 requests per windowMs
}));

// Apply authentication middleware
app.use(authMiddleware);

// Health check endpoint
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

// Cache status endpoint
app.get("/cache/status", async (_, res) => {
  try {
    const stats = await graphQLCache.getStats();
    res.json({
      status: "ok",
      cache: stats
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to get cache status"
    });
  }
});

// Clear cache endpoint (admin only)
app.post("/cache/clear", (req: any, res) => {
  const auth = req.auth;
  
  if (!auth?.hasPermission('admin:system')) {
    return res.status(403).json({
      status: "error",
      message: "Insufficient permissions"
    });
  }

  graphQLCache.clearAll()
    .then(() => {
      res.json({
        status: "ok",
        message: "Cache cleared successfully"
      });
    })
    .catch((error) => {
      res.status(500).json({
        status: "error",
        message: "Failed to clear cache"
      });
    });
});

// Load GraphQL schema from SDL file
const typeDefs = readFileSync(
  path.join(__dirname, "api/schema/schema.graphql"),
  "utf8"
);

(async () => {
  const server = new ApolloServer({ 
    typeDefs, 
    resolvers,
    context: ({ req }) => createGraphQLContext(req)
  });
  
  await server.start();
  server.applyMiddleware({ app, path: "/graphql" });

  const port = process.env.PORT || 3007;
  app.listen(port, () => {
    console.log(`🚀 Server ready at http://localhost:${port}/graphql`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`💾 Cache status: http://localhost:${port}/cache/status`);
    console.log(`🔐 Authentication: JWT Bearer token required for protected endpoints`);
    console.log(`⚡ Rate limiting: 100 requests per 15 minutes per IP`);
  });
})();

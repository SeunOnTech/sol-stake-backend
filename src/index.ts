import 'dotenv/config';
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { readFileSync } from "fs";
import path from "path";
import { resolvers } from "./api/resolvers";

const app = express();

// Health check endpoint
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

// Load GraphQL schema from SDL file
const typeDefs = readFileSync(
  path.join(__dirname, "api/schema/schema.graphql"),
  "utf8"
);

(async () => {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app, path: "/graphql" });

  app.listen(3007, () => {
    console.log(`🚀 Server ready at http://localhost:3007/graphql`);
  });
})();


// // src/index.ts
// import { ApolloServer } from 'apollo-server-express';
// import express from 'express';
// import { gql } from 'apollo-server-express';

// const app = express();

// // Minimal schema so Apollo Server doesn't crash
// const typeDefs = gql`
//   type Query {
//     hello: String
//   }
// `;

// const resolvers = {
//   Query: {
//     hello: () => 'Hello Solana Staking Backend!',
//   },
// };

// const server = new ApolloServer({ typeDefs, resolvers });

// (async () => {
//   await server.start();
//   server.applyMiddleware({ app });

//   app.listen(3007, () => {
//     console.log(`Server ready at http://localhost:3007${server.graphqlPath}`);
//   });
// })();

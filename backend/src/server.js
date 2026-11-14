require("dotenv").config();

const app = require("./app");
const prisma = require("./config/prisma");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();

    console.log("PostgreSQL connected successfully");

    const server = app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });

    const shutdown = async () => {
      console.log("Shutting down server...");

      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Server startup failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();
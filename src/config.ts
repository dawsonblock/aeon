import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  appUrl: process.env.APP_URL || "http://localhost:3000",
};

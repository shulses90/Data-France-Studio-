export function validateEnv() {
  const required: Record<string, string | undefined> = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      `See .env.example for reference.`
    );
  }
}

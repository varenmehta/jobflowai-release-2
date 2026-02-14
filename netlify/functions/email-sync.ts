import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  const userId = event.queryStringParameters?.userId;

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing userId" }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "ok",
      message: "Email sync triggered (stub).",
    }),
  };
};

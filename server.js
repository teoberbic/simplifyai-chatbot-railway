import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const allowedOrigins = [
  "https://simplifyai.solutions",    // put your domain(s) here
  "https://www.simplifyai.solutions"
];
app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null, true) : cb(new Error("Not allowed by CORS"))
}));
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/", (_, res) => res.status(200).send("OK"));

app.post("/chat", async (req, res) => {
  const { messages } = req.body || {};
  if (!Array.isArray(messages)) return res.status(400).json({ error: "messages must be an array" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: messages,
      stream: true
    });

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        res.write(`data: ${JSON.stringify({ delta: event.delta })}\n\n`);
      }
      if (event.type === "response.completed") {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      }
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`Chat proxy on ${PORT}`));

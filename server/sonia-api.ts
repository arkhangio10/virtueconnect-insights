/**
 * Sonia API — Express backend for the PatientSafe chatbot.
 *
 * Features:
 *  - Gemini multimodal chat (text, images, PDFs)
 *  - Drug-Drug Interaction (DDI) analysis from prescriptions
 *  - Conversation storage (JSON per session)
 *  - Facility data awareness (reads facilities_full.json)
 */

import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Config ──────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? process.env.SONIA_PORT ?? 3001);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? "";
// Sonia voice — "Rachel" is a warm professional female voice
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
const FACILITIES_PATH = path.resolve(
  __dirname,
  "../../data/output/facilities_full.json"
);
const CONVERSATIONS_DIR = path.resolve(__dirname, "../../data/conversations");
const UPLOADS_DIR = path.resolve(__dirname, "../../data/uploads");

// Ensure dirs
[CONVERSATIONS_DIR, UPLOADS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Gemini ──────────────────────────────────────────────────────────────────
if (!GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY not set — Sonia will use fallback responses.");
}
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// ── Databricks Connection (Optional) ───────────────────────────────────────
const DB_HOST = process.env.DATABRICKS_HOST;
const DB_TOKEN = process.env.DATABRICKS_TOKEN;
const DB_WAREHOUSE_ID = process.env.DATABRICKS_WAREHOUSE_ID;

// ── Facility context (loaded dynamically) ──────────────────────────────────
let facilitySummary = "No facility data available.";
let facilitiesForContext: any[] = [];

async function loadFacilities() {
  // Try Databricks first
  if (DB_HOST && DB_TOKEN && DB_WAREHOUSE_ID) {
    try {
      console.log("🌊 Connecting to Databricks SQL...");
      // Import dynamically to avoid crash if package missing
      const { DBSQLClient } = await import("@databricks/sql");

      const client = new DBSQLClient();
      const connection = await client.connect({
        token: DB_TOKEN,
        host: DB_HOST,
        path: `/sql/1.0/warehouses/${DB_WAREHOUSE_ID}`,
      });

      const session = await connection.openSession();

      // Query Gold Wide Table
      // We select key columns to keep context small but rich
      const query = `
        SELECT 
          facility_id, 
          name, 
          region, 
          district, 
          facility_type, 
          lat, 
          lon,
          c_section_value,
          blood_bank_value,
          operating_room_value,
          anesthesia_value,
          emergency_24_7_value,
          ambulance_value,
          pharmacy_value,
          lab_basic_value
        FROM virtueconnect.gold.gold_facilities_wide
        LIMIT 1000
      `;

      const queryOperation = await session.executeStatement(query, { runAsync: true });
      const result = await queryOperation.fetchAll();
      await queryOperation.close();
      await session.close();
      await connection.close();
      await client.close();

      console.log(`✅ Loaded ${result.length} facilities from Databricks!`);

      // Map Databricks rows to internal format
      facilitiesForContext = result.map((row: any) => ({
        ...row,
        // Helper specifically for context building below
        maternity: {
          c_section: { value: row.c_section_value },
          blood_bank: { value: row.blood_bank_value },
          operating_room: { value: row.operating_room_value },
          anesthesia: { value: row.anesthesia_value },
        },
        trauma: {
          emergency_24_7: { value: row.emergency_24_7_value },
          ambulance: { value: row.ambulance_value },
        },
        infrastructure: {
          pharmacy: { value: row.pharmacy_value },
          lab_basic: { value: row.lab_basic_value },
        }
      }));

    } catch (err) {
      console.error("⚠️ Failed to load from Databricks (using local fallback caused by):", err);
    }
  }

  // Fallback to local JSON if empty
  if (facilitiesForContext.length === 0 && fs.existsSync(FACILITIES_PATH)) {
    try {
      console.log("📂 Loading facilities from local JSON...");
      const raw = JSON.parse(fs.readFileSync(FACILITIES_PATH, "utf-8"));
      facilitiesForContext = Array.isArray(raw) ? raw : Object.values(raw);
    } catch (err) {
      console.error("❌ Failed to load local JSON:", err);
    }
  }

  // Build the Context String
  if (facilitiesForContext.length > 0) {
    const total = facilitiesForContext.length;
    const withCSec = facilitiesForContext.filter((f) => f.maternity?.c_section?.value === true).length;
    const withBlood = facilitiesForContext.filter((f) => f.maternity?.blood_bank?.value === true).length;
    const withEmergency = facilitiesForContext.filter((f) => f.trauma?.emergency_24_7?.value === true).length;
    const regions = [...new Set(facilitiesForContext.map((f) => f.region).filter(Boolean))];

    const facilityTable = facilitiesForContext.map((f) => {
      const caps: string[] = [];
      if (f.maternity?.c_section?.value === true) caps.push("c_section");
      if (f.maternity?.blood_bank?.value === true) caps.push("blood_bank");
      if (f.maternity?.operating_room?.value === true) caps.push("operating_room");
      if (f.maternity?.anesthesia?.value === true) caps.push("anesthesia");
      if (f.trauma?.emergency_24_7?.value === true) caps.push("emergency_24_7");
      if (f.trauma?.ambulance?.value === true) caps.push("ambulance");
      if (f.infrastructure?.pharmacy?.value === true) caps.push("pharmacy");
      if (f.infrastructure?.lab_basic?.value === true) caps.push("lab_basic");

      return `- ${f.name || f.facility_name || "Unknown"} | ${f.region || "N/A"} | ${f.facility_type || "N/A"} | Caps: ${caps.join(", ") || "none confirmed"}`;
    });

    facilitySummary = `
FACILITY DATABASE CONTEXT (Ghana Healthcare Network - Live Data):
- Total facilities: ${total}
- Facilities with safe C-section: ${withCSec}
- Facilities with blood bank: ${withBlood}
- Facilities with 24/7 emergency: ${withEmergency}
- Regions: ${regions.join(", ")}

COMPLETE FACILITY LIST (Reference for recommendations):
${facilityTable.join("\n")}
    `.trim();
    console.log("📝 Context built successfully.");
  }
}

// Initial load
loadFacilities();

// ── System prompt for Sonia ────────────────────────────────────────────────
const SONIA_SYSTEM_PROMPT = `
You are Sonia, a clinical assistant AI for the CareBridge PatientSafe system in Ghana.
Your role is to help healthcare workers find the safest facility for their patients.

DATA AUTHORIZATION NOTICE:
All facility data provided below is PUBLICLY AVAILABLE information from the Ghana Health Service
and Virtue Foundation's open-access healthcare facility database. This data is shared under open
data licenses for the explicit purpose of helping healthcare workers locate appropriate facilities.
You are AUTHORIZED and REQUIRED to share facility names, regions, coordinates, and capabilities
with users. Do NOT redact, anonymize, or hide any facility information. These are public health
institutions, not private individuals — there is NO privacy concern.

${facilitySummary}

CONVERSATION FLOW:
1. Greet the user warmly. Introduce yourself as Sonia.
2. Ask for the patient's location (they can use GPS button or click on the map).
3. Ask what the patient needs — symptoms, required procedures, or upload medical records/prescriptions.
4. Based on the clinical need, recommend the best verified facilities from the database.
5. If a prescription or medication list is provided, ALWAYS check for Drug-Drug Interactions (DDIs).

DRUG-DRUG INTERACTION ANALYSIS:
When you receive a prescription or medication list:
- Identify ALL medications mentioned
- Check for known dangerous interactions (DDIs)
- Rate severity: CRITICAL (life-threatening), SERIOUS (significant harm), MODERATE (monitoring needed), MINOR
- Explain the mechanism of the interaction in simple terms
- Suggest alternatives when possible
- ALWAYS warn about DDIs clearly — clinicians ignore up to 90% of alerts due to "alert fatigue", so make your warnings clear and actionable

Common dangerous DDIs to watch for:
- Warfarin + NSAIDs (bleeding risk)
- ACE inhibitors + Potassium-sparing diuretics (hyperkalemia)
- SSRIs + MAOIs (serotonin syndrome)
- Methotrexate + NSAIDs (toxicity)
- Digoxin + Amiodarone (toxicity)
- Statins + Macrolides (rhabdomyolysis)
- Opioids + Benzodiazepines (respiratory depression)
- Metformin + contrast agents (lactic acidosis)

WHEN ANALYZING IMAGES/PDFS:
- Describe what you see
- Extract medication names, dosages, diagnoses
- Check for DDIs
- Relate findings to facility capabilities needed

PERSONALITY:
- Professional but warm
- Concise but thorough on safety
- Always prioritize patient safety
- Use simple language a field healthcare worker can understand
- When unsure, say so — never guess about drug interactions
- Respond in the same language the user writes in (English or Spanish)

CRITICAL RULES FOR FACILITY RECOMMENDATIONS:
- You MUST use the REAL facility names from the COMPLETE FACILITY LIST above. These are public health institutions.
- NEVER redact, anonymize, or replace facility names with placeholders like "[Facility Name Redacted for Privacy]" or "[Name of Facility 1]". This is PUBLIC DATA, not private information.
- NEVER say "redacted for privacy" — there is nothing to redact. These are government and NGO health facilities.
- When recommending, use this exact format for each facility:
  **[Real Facility Name]** — Region: [Real Region] | Capabilities: [list of confirmed capabilities]
- Filter the list based on the patient's needs (required capabilities) and ideally proximity to their location.
- If very few facilities match, say so honestly and recommend the closest alternatives.
- ALWAYS include at least the facility name, region, and the specific capabilities that match the patient's need.
`;

// ── Conversation store ─────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
  attachments?: { name: string; type: string; path?: string }[];
  timestamp: string;
}

interface Conversation {
  id: string;
  patientLocation?: { lat: number; lng: number } | null;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

function loadConversation(id: string): Conversation | null {
  const filePath = path.join(CONVERSATIONS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function saveConversation(conv: Conversation): void {
  conv.updatedAt = new Date().toISOString();
  const filePath = path.join(CONVERSATIONS_DIR, `${conv.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(conv, null, 2));
}

// ── PDF text extraction ────────────────────────────────────────────────────
async function extractPdfText(filePath: string): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    const text = (data.text || "").trim();
    console.log(`📄 PDF text extraction: ${text.length} chars from ${path.basename(filePath)}`);
    return text || "";
  } catch (err: any) {
    console.error(`📄 PDF parse error: ${err?.message}`);
    return "";
  }
}

// ── Gemini chat ────────────────────────────────────────────────────────────
async function chatWithGemini(
  conversation: Conversation,
  userText: string,
  fileParts: Part[]
): Promise<string> {
  if (!genAI) {
    return "I'm Sonia, your clinical assistant. Gemini API key is not configured — please set GEMINI_API_KEY in .env to enable AI-powered responses.";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Build history from conversation
    const history = conversation.messages.map((msg) => ({
      role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: "System instructions: " + SONIA_SYSTEM_PROMPT }] },
        {
          role: "model",
          parts: [
            {
              text: "Understood. I am Sonia, the CareBridge PatientSafe clinical assistant. I will follow the conversation flow and always check for drug interactions when prescriptions are shared.",
            },
          ],
        },
        ...history,
      ],
    });

    // Build user message parts
    const parts: Part[] = [{ text: userText }, ...fileParts];

    const result = await chat.sendMessage(parts);
    const response = result.response;
    return response.text();
  } catch (err: any) {
    console.error("Gemini error:", err?.message ?? err);
    return `I encountered an error processing your request. Error: ${err?.message ?? "Unknown"}. Please try again.`;
  }
}

// ── Express app ────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/csv",
      "text/plain",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

// POST /api/sonia/start — Create new conversation
app.post("/api/sonia/start", (_req, res) => {
  const conv: Conversation = {
    id: uuidv4(),
    patientLocation: null,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveConversation(conv);

  // Sonia's greeting
  const greeting: Message = {
    role: "assistant",
    content:
      "Hello! I'm Sonia, your clinical assistant from CareBridge PatientSafe. I'm here to help you find the safest facility for your patient.\n\nLet's start — **where is the patient located?** You can:\n- 📍 Use the **Locate Patient** button above to get GPS coordinates\n- 🗺️ **Click on the map** to set the location manually\n\nOnce I know where the patient is, I'll help find the best facility for their needs.",
    timestamp: new Date().toISOString(),
  };
  conv.messages.push(greeting);
  saveConversation(conv);

  res.json({ conversationId: conv.id, message: greeting });
});

// POST /api/sonia/location — Set patient location
app.post("/api/sonia/location", (req, res) => {
  const { conversationId, lat, lng } = req.body;
  const conv = loadConversation(conversationId);
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  conv.patientLocation = { lat, lng };

  const assistantMsg: Message = {
    role: "assistant",
    content: `Great, I've marked the patient's location at coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}).\n\nNow, **what does the patient need?** You can:\n- 💬 Describe their symptoms or condition\n- 🏥 Use the quick action buttons (Blood Type, Vital Signs, Cardiac, OB/GYN)\n- 📎 Upload medical records, prescriptions, or lab results (PDF or photo)\n- 💊 Share a medication list so I can check for drug interactions`,
    timestamp: new Date().toISOString(),
  };
  conv.messages.push(assistantMsg);
  saveConversation(conv);

  res.json({ message: assistantMsg });
});

// POST /api/sonia/chat — Send message (with optional file uploads)
app.post("/api/sonia/chat", upload.array("files", 5), async (req, res) => {
  try {
    const { conversationId, text } = req.body;
    const conv = loadConversation(conversationId);
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const files = (req.files as Express.Multer.File[]) ?? [];
    const attachments: Message["attachments"] = [];
    const fileParts: Part[] = [];

    // Process uploaded files
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const newPath = path.join(UPLOADS_DIR, `${uuidv4()}${ext}`);
      fs.renameSync(file.path, newPath);

      attachments.push({
        name: file.originalname,
        type: file.mimetype,
        path: newPath,
      });

      if (file.mimetype === "application/pdf") {
        // Try text extraction first
        const pdfText = await extractPdfText(newPath);

        // ALWAYS send the raw PDF to Gemini as inlineData — Gemini 2.0 Flash
        // can read PDFs natively (including scanned/image-based ones)
        const pdfBuffer = fs.readFileSync(newPath);
        fileParts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: pdfBuffer.toString("base64"),
          },
        });

        // If text extraction succeeded, also send it as context
        if (pdfText.length > 10) {
          fileParts.push({
            text: `[Uploaded PDF: ${file.originalname} — extracted text below]\n${pdfText}`,
          });
        } else {
          fileParts.push({
            text: `[Uploaded PDF: ${file.originalname} — text extraction returned minimal content, likely a scanned document. Please use the PDF file directly to read and analyze its contents, including any medications, prescriptions, diagnoses, and check for drug-drug interactions.]`,
          });
        }
      } else if (file.mimetype.startsWith("image/")) {
        // Send image as inline data to Gemini
        const imageBuffer = fs.readFileSync(newPath);
        fileParts.push({
          inlineData: {
            mimeType: file.mimetype,
            data: imageBuffer.toString("base64"),
          },
        });
        fileParts.push({
          text: `[Uploaded image: ${file.originalname} — please analyze this clinical image/prescription]`,
        });
      } else {
        const textContent = fs.readFileSync(newPath, "utf-8");
        fileParts.push({
          text: `[Uploaded file: ${file.originalname}]\n${textContent}`,
        });
      }
    }

    // Separate user-visible text from system facility context
    const rawText: string = text || "";
    const systemContextMatch = rawText.match(/\n\n\[SYSTEM:[\s\S]*\]$/);
    const userVisibleText = systemContextMatch
      ? rawText.slice(0, systemContextMatch.index).trim()
      : rawText;
    const facilityContext = systemContextMatch ? systemContextMatch[0] : "";

    // Add user message (only user-visible text is stored)
    const userMsg: Message = {
      role: "user",
      content: userVisibleText || (files.length > 0 ? `Uploaded ${files.length} file(s)` : ""),
      attachments: attachments.length > 0 ? attachments : undefined,
      timestamp: new Date().toISOString(),
    };
    conv.messages.push(userMsg);

    // Build enriched text for Gemini (includes facility context + location)
    let enrichedText = rawText;
    if (conv.patientLocation) {
      enrichedText += `\n[Patient location: lat ${conv.patientLocation.lat.toFixed(4)}, lng ${conv.patientLocation.lng.toFixed(4)}]`;
    }
    if (files.length > 0) {
      enrichedText += `\n[User uploaded ${files.length} file(s): ${files.map((f) => f.originalname).join(", ")}. Please analyze them carefully, especially for medications and drug interactions.]`;
    }

    // Get Gemini response
    const response = await chatWithGemini(conv, enrichedText, fileParts);

    const assistantMsg: Message = {
      role: "assistant",
      content: response,
      timestamp: new Date().toISOString(),
    };
    conv.messages.push(assistantMsg);
    saveConversation(conv);

    res.json({ message: assistantMsg });
  } catch (err: any) {
    console.error("Chat error:", err);
    res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

// GET /api/sonia/conversation/:id — Get conversation history
app.get("/api/sonia/conversation/:id", (req, res) => {
  const conv = loadConversation(req.params.id);
  if (!conv) return res.status(404).json({ error: "Conversation not found" });
  res.json(conv);
});

// GET /api/sonia/conversations — List all conversations
app.get("/api/sonia/conversations", (_req, res) => {
  try {
    const files = fs.readdirSync(CONVERSATIONS_DIR).filter((f) => f.endsWith(".json"));
    const conversations = files.map((f) => {
      const conv = JSON.parse(
        fs.readFileSync(path.join(CONVERSATIONS_DIR, f), "utf-8")
      );
      return {
        id: conv.id,
        messageCount: conv.messages.length,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        patientLocation: conv.patientLocation,
      };
    });
    res.json(conversations.sort((a: any, b: any) => b.updatedAt.localeCompare(a.updatedAt)));
  } catch {
    res.json([]);
  }
});

// ── ElevenLabs TTS proxy ────────────────────────────────────────────────────
app.post("/api/sonia/tts", async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing text" });
  }

  if (!ELEVENLABS_API_KEY) {
    return res.status(503).json({ error: "ElevenLabs API key not configured" });
  }

  try {
    // Limit text to avoid huge API calls (ElevenLabs bills per char)
    const trimmed = text.slice(0, 3000);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: trimmed,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`ElevenLabs error ${response.status}:`, errText);
      return res.status(response.status).json({ error: `TTS failed: ${response.status}` });
    }

    // Stream audio back
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error("TTS error:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "TTS error" });
  }
});

// ── Health Check (for Render/Railway) ────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "carebridge-api",
    gemini: !!genAI,
    facilities: facilitiesForContext.length,
  });
});

// ── Serve Facilities JSON (for frontend) ─────────────────────────────────────
app.get("/api/facilities", (req, res) => {
  if (fs.existsSync(FACILITIES_PATH)) {
    res.sendFile(FACILITIES_PATH);
  } else if (facilitiesForContext.length > 0) {
    res.json(facilitiesForContext);
  } else {
    res.status(404).json({ error: "Facilities data not found" });
  }
});

// ── Serve Frontend (Production) ─────────────────────────────────────────────
const DIST_DIR = path.resolve(__dirname, "../dist");
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(DIST_DIR, "index.html"));
    }
  });
}

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🩺 Sonia API running on http://localhost:${PORT}`);
  console.log(`   Gemini: ${genAI ? "✅ Configured" : "❌ No API key"}`);
  console.log(`   ElevenLabs: ${ELEVENLABS_API_KEY ? "✅ Configured" : "❌ No API key"}`);
  console.log(`   Facilities: ${facilitySummary.includes("Total") ? "✅ Loaded" : "❌ Not found"}`);
  console.log(`   Conversations: ${CONVERSATIONS_DIR}`);
});

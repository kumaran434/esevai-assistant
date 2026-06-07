import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Razorpay from "razorpay";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Latest App Version and Update configuration with smart GitHub Release automation
  app.get("/api/latest-version", async (req, res) => {
    const owner = process.env.GITHUB_OWNER || "kumaran434"; // Default fallback username
    const repo = process.env.GITHUB_REPO || "esevai-assistant";      // Default fallback repository

    try {
      // Dynamic fetch from GitHub releases API
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "esevai-assistant-updater"
        }
      });

      if (response.ok) {
        const release = (await response.json()) as any;
        // Find first asset ending with .exe (Windows Installer)
        const exeAsset = release.assets?.find((asset: any) => asset.name.endsWith('.exe'));
        
        if (exeAsset) {
          // Extract changelog bullets from release body/markdown
          const rawBody = release.body || "";
          const changelog = rawBody
            .split('\n')
            .map((line: string) => line.replace(/^-\s*/, '').replace(/^\*\s*/, '').trim())
            .filter((line: string) => line.length > 0);

          return res.json({
            version: release.tag_name.replace(/^v\.?/i, ''), // normalizes 'v1.1.9' or 'v.1.1.9' to '1.1.9'
            downloadUrl: exeAsset.browser_download_url,
            changelog: changelog.length > 0 ? changelog : ["புதிய மேம்படுத்தல்கள் மற்றும் செயல்திறன் திருத்தங்கள் (Performance updates and bug fixes)"]
          });
        }
      }
    } catch (err) {
      console.error("Failed to query GitHub releases, falling back to Firebase URL:", err);
    }

    let currentVersion = "1.1.5";
    try {
      const packageJsonPath = path.join(process.cwd(), "package.json");
      const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(packageJsonContent);
      if (packageJson.version) {
        currentVersion = packageJson.version;
      }
    } catch (e) {
      console.error("Failed to read package.json version in server.ts fallback", e);
    }

    // Default stable static fallback if GitHub API call fails or is not yet published
    res.json({
      version: currentVersion,
      downloadUrl: `https://github.com/kumaran434/esevai-assistant/releases/download/v${currentVersion}/esevadraft.Setup.${currentVersion}.exe`,
      changelog: [
        "ஏஐ ஸ்மார்ட் பகுப்பாய்வு இருபுறமும் உள்ள அட்டைகளைப் படிக்கும் புதிய வசதி (Double-sided proof extraction support)",
        "ஆவண அச்சிடல் மற்றும் பிரிண்ட் வடிவமைப்புப் பிழை திருத்தங்கள் (Print layout fixes)",
        "ஆட்டோமேஷன் வேக மேம்படுத்தல் மற்றும் செயல்திறன் சீரமைப்பு (Auto-fill speed and performance improvements)"
      ]
    });
  });

  // Razorpay API keys status check
  app.get("/api/payment/status", (req, res) => {
    const hasKeys = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    res.json({ 
      configured: hasKeys,
      keyId: process.env.RAZORPAY_KEY_ID || null 
    });
  });

  // Create Razorpay Order
  app.post("/api/payment/create-order", async (req, res) => {
    try {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        return res.status(400).json({
          success: false,
          error: "configured_missing",
          message: "Razorpay keys are missing from the environment environment variables configured on the server."
        });
      }

      const { amount, currency = "INR" } = req.body;
      if (!amount || isNaN(Number(amount))) {
        return res.status(400).json({ success: false, error: "invalid_amount", message: "Invalid amount provided." });
      }

      // Lazy initialization of Razorpay instance
      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      });

      const options = {
        amount: Math.round(Number(amount) * 100), // amount in paisa
        currency: currency,
        receipt: `receipt_order_${Date.now()}`
      };

      const order = await razorpay.orders.create(options);
      res.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: keyId
      });
    } catch (error: any) {
      console.error("Razorpay Order Creation Error:", error);
      res.status(500).json({
        success: false,
        error: "order_failed",
        message: error.message || "Failed to create Razorpay payment order."
      });
    }
  });

  // Verify Razorpay Payment Signature
  app.post("/api/payment/verify", async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keySecret) {
        return res.status(500).json({
          success: false,
          error: "configured_missing",
          message: "Razorpay key secret is missing from server."
        });
      }

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          error: "missing_params",
          message: "Payment response parameters are missing."
        });
      }

      // Generate localized signature verification
      const hmac = crypto.createHmac("sha256", keySecret);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest("hex");

      if (generatedSignature === razorpay_signature) {
        res.json({
          success: true,
          message: "Payment verified successfully"
        });
      } else {
        res.status(400).json({
          success: false,
          error: "invalid_signature",
          message: "Cryptographic payment verification signature mismatch!"
        });
      }
    } catch (error: any) {
      console.error("Razorpay Signature Verification Error:", error);
      res.status(500).json({
        success: false,
        error: "verification_failed",
        message: error.message || "Cryptographic verification process failure."
      });
    }
  });

  // AI Translate Endpoint
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, targetLang = "Tamil" } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(550).json({ error: "எழுத்துக்களை மொழிபெயர்க்க சேவையகத்தில் 'GEMINI_API_KEY' அமைக்கப்படவில்லை." });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const prompt = `Translate precisely to ${targetLang}: "${text}". Return only the translated text.`;
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      res.json({ translation: (result.text || "").trim() });
    } catch (error: any) {
      console.error("AI translation error:", error);
      res.status(500).json({ error: error.message || "மொழிபெயர்ப்பு தோல்வியடைந்தது." });
    }
  });

  // AI Extract details endpoint (for document upload)
  app.post("/api/extract", async (req, res) => {
    try {
      const { images, customFields, extractionPrompt } = req.body;
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "படம் பெறப்படவில்லை. (Missing or invalid images)" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(550).json({ error: "சேவையகத்தில் 'GEMINI_API_KEY' இல்லை." });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const imageParts = images.map((img: { base64: string; mimeType: string }) => ({
        inlineData: {
          data: img.base64.split(',')[1] || img.base64,
          mimeType: img.mimeType
        }
      }));

      const customFieldsPrompt = customFields && customFields.length > 0 
        ? `Additionally, look for values for these specific labels: ${customFields.map((f: any) => f.label).join(', ')}. Return them in a field called 'customValues' which is an object mapping label to found value.`
        : '';

      const prompt = `Extract ALL possible personal and demographic data from these Indian government documents (Aadhaar, Ration Card, PAN, Voter ID, driving license, etc.).
            
            YOUR GOAL: Extract every piece of information visible in BOTH English and Tamil.
            
            FIELDS TO EXTRACT (Return as flat JSON): 
            - applicantName (English), applicantNameTamil (Tamil)
            - fatherName (English), fatherNameTamil (Tamil)
            - dob (DD/MM/YYYY)
            - gender (Male/Female/Transgender), genderTamil (ஆண்/பெண்/மூன்றாம் பாலினம்)
            - doorNoEn (Door No), doorNoTa (கதவு எண்)
            - streetEn (Street), streetTa (தெரு)
            - villageEn (Village), villageTa (கிராமம்)
            - talukEn (Taluk), talukTa (வட்டம்)
            - districtEn (District), districtTa (மாவட்டம்)
            - pincode (6 digits)
            - aadhaarNumber (12 digits, format: XXXX XXXX XXXX)
            - rationCardNumber (Family number)
            - smartCardNumber (TNPDS sequence)
            - mobileNumber (10 digits)
            
            Strict Extraction Rules:
            1. LANGUAGE: If a field is only in English, try to transliterate/translate it to Tamil for the Tamil field. If only in Tamil, translate to English.
            2. ADDRESS: Be extremely precise with Door No, Street, Village, Taluk, and District. Look at the back of the card if available.
            3. NUMBERS: Clean all spaces from ID numbers (Aadhaar, PAN, etc.) unless specified format.
            4. Return ONLY valid JSON. No conversational filler.

            ${customFieldsPrompt}
            ${extractionPrompt || ''}`;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ text: prompt }, ...imageParts],
        config: {
          responseMimeType: "application/json"
        }
      });

      res.json(JSON.parse(result.text || "{}"));
    } catch (error: any) {
      console.error("Local extraction error:", error);
      res.status(500).json({ error: error.message || "ஆவணத்திலிருந்து தகவலைப் பெற முடியவில்லை." });
    }
  });

  // AI Word Editor Analysis: Analyzes raw code/HTML of document and asks user what attachments are needed
  app.post("/api/word-ai-analyze", async (req, res) => {
    try {
      const { templateHtml } = req.body;
      if (!templateHtml || templateHtml.trim().length === 0) {
        return res.status(400).json({ error: "பகுப்பாய்வு செய்ய ஆவணத்தில் உரை இல்லை. (No content inside doc)" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(550).json({ error: "சேவையகத்தில் 'GEMINI_API_KEY' இல்லை." });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const prompt = `You are an expert Tamil document analyzer and automation assistant.
      Your goal is to inspect this template / word draft HTML:
      
      \`\`\`html
      ${templateHtml}
      \`\`\`
      
      Task:
      Determine:
      1. What type of document this is (e.g. Rent Agreement, Affidavit, Undertaking, Power of Attorney).
      2. Write a highly professional and friendly summary in TAMIL explaining what this document is, and explaining what documents are needed from the parties to fill it completely (e.g. "இது வாடகை ஒப்பந்தப் பத்திரம் ஆகும். இதனை வெற்றிகரமாகப் பூர்த்தி செய்ய வாடகைதாரர் மற்றும் வீட்டு உரிமையாளரின் ஆதார் அட்டைகளை ஏற்றவும்.")
      3. Identify exactly 1 to 2 documents that are required as uploads. For each document, configure:
         - \`id\`: simple English slug (e.g., "tenant_aadhaar", "landlord_aadhaar")
         - \`label\`: Tamil label indicating what it is (e.g., "வாடகைதாரர் ஆதார் அட்டை (Tenant Aadhaar)", "உரிமையாளர் ஆதார் அட்டை (Landlord Aadhaar)")
         - \`partyType\`: brief party designation in Tamil (e.g., "வாடகைதாரர்", "உரிமையாளர்")
         - \`doubleSided\`: boolean. Set to TRUE if this document is typically a double-sided identity card (Aadhaar Card, Smart Ration Card, Driving License, Voter ID Card, PAN card) because useful fields are spread across both sides. Else FALSE.
      4. A list of expected fields.
      
      Return ONLY a pure valid JSON object fitting this schema:
      {
        "documentType": "English doc type name",
        "analysisTamil": "Friendly description of document and what is requested in Tamil",
        "requiredDocs": [
          { "id": "slug_id", "label": "Tamil label", "partyType": "Tamil party", "doubleSided": true }
        ],
        "fieldsNeeded": ["Tamil labels", "Like", "வாடகைதாரர் பெயர்"]
      }
      
      Do NOT wrap response in markdown blocks \`\`\`json. Return pure JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const resultText = response.text || "{}";
      res.json(JSON.parse(resultText.trim()));
    } catch (error: any) {
      console.error("AI analyze template error:", error);
      res.status(500).json({ error: error.message || "ஆவணத்தை மேலாய்வு செய்ய இயலவில்லை." });
    }
  });

  // AI Word Editor Auto Fill: Uses Gemini to intelligently replace placeholders in style-rich HTML
  app.post("/api/word-ai-fill", async (req, res) => {
    try {
      const { templateHtml, extractedDetails } = req.body;
      if (!templateHtml) {
        return res.status(400).json({ error: "Missing templateHtml" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(550).json({ error: "சேவையகத்தில் 'GEMINI_API_KEY' இல்லை." });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const prompt = `You are a professional legal scripter and legal documents generator.
      Your mission is to fill out the following template / document HTML:
      
      \`\`\`html
      ${templateHtml}
      \`\`\`
      
      Using these highly precise extracted data payloads of candidates/parties:
      
      \`\`\`json
      ${JSON.stringify(extractedDetails)}
      \`\`\`
      
      Instructions:
      1. Look for all empty blanks like "_______", placeholder labels like "[வாடகைதாரர் பெயர்]", "[கதவு எண்]", "[ஆதார் எண்]", "[உரிமையாளர் முகவரி]", etc., and replace them beautifully with the extracted values.
      2. If a value is in English, translate or transliterate it intelligently to dynamic elegant Tamil to blend perfectly with the surrounding text (e.g., 'Karthik' becomes 'கார்த்திக்', 'Chennai' becomes 'சென்னை').
      3. Maintain the EXACT HTML tag hierarchy, inline CSS, line breaks (<br>), list items, strong marks (<b>), tables, and structure. Do NOT delete or rewrite non-placeholder content. Return ONLY the fully-filled HTML layout.
      
      Return ONLY a pure valid JSON object with the filled HTML:
      {
        "filledHtml": "The filled HTML string here..."
      }
      
      Do NOT wrap in markdown enclosing blocks. Return pure JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const resultText = response.text || "{}";
      res.json(JSON.parse(resultText.trim()));
    } catch (error: any) {
      console.error("AI autofill template error:", error);
      res.status(500).json({ error: error.message || "ஆவணத்தில் தானாக விவரங்களை நிரப்ப முடியவில்லை." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

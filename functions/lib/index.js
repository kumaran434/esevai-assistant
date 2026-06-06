"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const genai_1 = require("@google/genai");
const razorpay_1 = __importDefault(require("razorpay"));
const crypto = __importStar(require("crypto"));
admin.initializeApp();
/**
 * Main API function handling extraction, translation, and payments.
 * Configured as 2nd Gen for better scalability and automatic CORS handling.
 */
exports.api = (0, https_1.onRequest)({
    memory: "1GiB",
    timeoutSeconds: 300,
    cors: true,
    region: "us-central1",
    secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "GEMINI_API_KEY"]
}, async (req, res) => {
    const path = req.path.toLowerCase();
    // Handle latest-version endpoint (does not require Gemini API keys)
    if (path.includes("latest-version")) {
        const owner = process.env.GITHUB_OWNER || "kumaran434";
        const repo = process.env.GITHUB_REPO || "esevai-assistant";
        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
                headers: {
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "esevai-assistant-updater"
                }
            });
            if (response.ok) {
                const release = (await response.json());
                const exeAsset = release.assets?.find((asset) => asset.name.endsWith('.exe'));
                if (exeAsset) {
                    const rawBody = release.body || "";
                    const changelog = rawBody
                        .split('\n')
                        .map((line) => line.replace(/^-\s*/, '').replace(/^\*\s*/, '').trim())
                        .filter((line) => line.length > 0);
                    res.json({
                        version: release.tag_name.replace(/^v/, ''),
                        downloadUrl: exeAsset.browser_download_url,
                        changelog: changelog.length > 0 ? changelog : ["புதிய மேம்படுத்தல்கள் மற்றும் செயல்திறன் திருத்தங்கள் (Performance updates and bug fixes)"]
                    });
                    return;
                }
            }
        }
        catch (err) {
            console.error("Failed to query GitHub releases on Firebase Cloud Function:", err);
        }
        let currentVersion = "1.1.6";
        const hostname = req.hostname || "esevai-assistant.web.app";
        try {
            // First try to check the live deployed package.json for instant dynamic updates without GitHub delays
            const localResponse = await fetch(`https://${hostname}/package.json`);
            if (localResponse.ok) {
                const pkg = await localResponse.json();
                if (pkg.version)
                    currentVersion = pkg.version;
            }
            else {
                // Fallback to raw GitHub package.json if hosting fails
                const pkgResponse = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/main/package.json`);
                if (pkgResponse.ok) {
                    const pkg = await pkgResponse.json();
                    if (pkg.version)
                        currentVersion = pkg.version;
                }
            }
        }
        catch (pkge) {
            console.error("Failed to query live package.json version", pkge);
        }
        res.json({
            version: currentVersion,
            downloadUrl: `https://github.com/kumaran434/esevai-assistant/releases/download/v${currentVersion}/esevadraft.Setup.${currentVersion}.exe`,
            changelog: [
                "ஏஐ ஸ்மார்ட் பகுப்பாய்வு இருபுறமும் உள்ள அட்டைகளைப் படிக்கும் புதிய வசதி (Double-sided proof extraction support)",
                "ஆட்டோமேஷன் வேக மேம்படுத்தல் மற்றும் செயல்திறன் சீரமைப்பு (Auto-fill speed and performance improvements)",
                "புதிய ஏஐ வேர்ட் எடிட்டர் பகுப்பாய்வு டூல்கள் (AI Word Editor assistant tools)"
            ]
        });
        return;
    }
    // Handle Razorpay Payment Endpoints first (unrelated to Gemini API)
    if (path.includes("payment")) {
        try {
            if (path.includes("payment/status")) {
                const hasKeys = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
                res.json({
                    configured: hasKeys,
                    keyId: process.env.RAZORPAY_KEY_ID || null
                });
                return;
            }
            if (path.includes("payment/create-order")) {
                const keyId = process.env.RAZORPAY_KEY_ID;
                const keySecret = process.env.RAZORPAY_KEY_SECRET;
                if (!keyId || !keySecret) {
                    res.status(400).json({
                        success: false,
                        error: "configured_missing",
                        message: "Razorpay keys are missing on Firebase Cloud Functions."
                    });
                    return;
                }
                const { amount, currency = "INR" } = req.body;
                if (!amount || isNaN(Number(amount))) {
                    res.status(400).json({ success: false, error: "invalid_amount", message: "Invalid amount." });
                    return;
                }
                const RazorpayClass = razorpay_1.default.default || razorpay_1.default;
                const razorpay = new RazorpayClass({
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
                return;
            }
            if (path.includes("payment/verify")) {
                const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
                const keySecret = process.env.RAZORPAY_KEY_SECRET;
                if (!keySecret) {
                    res.status(500).json({
                        success: false,
                        error: "configured_missing",
                        message: "Razorpay key secret is missing on Firebase."
                    });
                    return;
                }
                if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                    res.status(400).json({
                        success: false,
                        error: "missing_params",
                        message: "Payment response parameters are missing."
                    });
                    return;
                }
                const hmac = crypto.createHmac("sha256", keySecret);
                hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
                const generatedSignature = hmac.digest("hex");
                if (generatedSignature === razorpay_signature) {
                    res.json({
                        success: true,
                        message: "Payment verified successfully"
                    });
                }
                else {
                    res.status(400).json({
                        success: false,
                        error: "invalid_signature",
                        message: "Signature mismatch!"
                    });
                }
                return;
            }
        }
        catch (paymentError) {
            console.error("Firebase Razorpay error:", paymentError);
            let errorDetail = "";
            if (paymentError.error && typeof paymentError.error === "object") {
                errorDetail = paymentError.error.description || JSON.stringify(paymentError.error);
            }
            else if (paymentError.description) {
                errorDetail = paymentError.description;
            }
            else {
                errorDetail = paymentError.message || String(paymentError);
            }
            res.status(500).json({
                success: false,
                error: "payment_failed",
                message: `Firebase: ${errorDetail}`
            });
            return;
        }
    }
    // Helper to validate if a string looks like a valid Google API Key
    const isValidKey = (k) => typeof k === "string" && k.trim().length > 10;
    let finalApiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY;
    if (!isValidKey(finalApiKey)) {
        try {
            const { config } = require("firebase-functions");
            const cfg = config();
            if (isValidKey(cfg.gemini?.key)) {
                finalApiKey = cfg.gemini.key;
            }
        }
        catch (e) {
            console.warn("Could not load legacy functions.config()");
        }
    }
    if (!isValidKey(finalApiKey)) {
        res.status(500).json({
            error: "API Key invalid or not found.",
            details: "The server could not find a valid Google AI API Key."
        });
        return;
    }
    const ai = new genai_1.GoogleGenAI({ apiKey: finalApiKey.trim() });
    const MODEL_NAME = "gemini-2.5-flash";
    try {
        if (path.includes("analyze-fields")) {
            const { fields, websiteTitle, currentUrl, pageInfo } = req.body;
            const prompt = `COMPLETE APPLICATION STRATEGIST (FULL LIFECYCLE).
            WEBSITE: "${pageInfo?.heading || websiteTitle}" (${currentUrl})
            VISIBLE FIELDS: ${JSON.stringify((fields || []).slice(0, 150))}
            
            YOUR ULTIMATE GOAL: 
            The user wants the COMPLETE work done. Most Indian Government portals have multi-page forms (e.g., Step 1: Basic Info, Step 2: Address, Step 3: Family/Member details, Step 4: Documents). 
            You must use 'googleSearch' to discover the FULL SCHEMA of the "${websiteTitle}" service. 
            Do not just map the current HTML.
            
            1. FULL-PROCESS SEARCH (DEEP GROUNDING):
               - Identify EVERY field needed for the ENTIRE process (Applicant Details, Family Details, Bank Details, etc.).
               - Pay special attention to "Verification Documents" (Aadhaar, Ration Card, DL, Gas Bill).
            
            2. PRE-EMPTIVE GUIDANCE:
               - List ALL requirements and ALL fields even if their HTML is not yet loaded.
               - Label fields with 'visualGroup' (e.g., 'தனிப்பட்ட விவரங்கள்', 'முகவரி விவரங்கள்') to create a clean UI.
            
            3. SEMANTIC MAPPING:
               - Map current HTML IDs accurately. Use visual context to guess the meaning of ambiguous IDs.
               
            OUTPUT SCHEMA (STRICT JSON):
            { 
              "serviceName": "Official Full Name (TAMIL)",
              "goal": "Complete objective of this process (TAMIL)",
              "applicationSteps": [
                "Step 1: ... (TAMIL)",
                "Step 2: ... (TAMIL)",
                "..."
              ],
              "requiredDocs": [
                { 
                  "id": "slug", 
                  "name": "Name", 
                  "tamilName": "பெயர்", 
                  "reason": "Why needed? (TAMIL)", 
                  "purpose": "upload|extract|both",
                  "maxSizeKb": 200,
                  "requiresMerge": true/false,
                  "format": "pdf|jpeg|png"
                }
              ], 
              "fieldMap": { 
                "FIELD_ID": { 
                   "key": "semantic_key", 
                   "lang": "Tamil|English|Both|None",
                   "type": "text|file|select|checkbox", 
                   "visualGroup": "Section Name (TAMIL)",
                   "description": "True Label Meaning (TAMIL)"
                } 
              },
              "fillingStrategy": "Complete roadmap in TAMIL",
              "specialInstructions": "Crucial warnings in TAMIL"
            }`;
            const result = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    systemInstruction: "You are the world's most accurate E-Sevai assistant. Always use googleSearch to verify requirements for Indian government websites (TNPDS, TNeGA, etc.) to ensure 100% accuracy.",
                    tools: [{ googleSearch: {} }]
                }
            });
            const text = result.text || "";
            res.status(200).json(JSON.parse(text || "{}"));
        }
        else if (path.includes("analyze-portal")) {
            const { prompt } = req.body;
            const result = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    systemInstruction: "You are a Senior Research Specialist for Indian Government Portals (E-Sevai, TNeGA, TNPDS, etc.). Your mission is to provide an absolute, 100% accurate list of required documents for any service. You MUST use 'googleSearch' to verify the official checklist for the given service. Do not rely solely on the visible page HTML; identify documents needed for the entire multi-step process from start to finish. Focus on accuracy of file sizes, formats, and whether ID cards (Aadhaar, Ration, etc.) require merging both sides.",
                    tools: [{ googleSearch: {} }]
                }
            });
            const text = result.text || "";
            res.status(200).json(JSON.parse(text || "{}"));
        }
        else if (path.includes("explain-error")) {
            const { errorContext, fieldInfo } = req.body;
            const prompt = `You are an AI assistant for an E-Sevai portal automation.
            The system encountered an error while trying to fill a form or process a document.
            ERROR CONTEXT: ${errorContext}
            FIELD INFO: ${JSON.stringify(fieldInfo || {})}
            
            TASK: Explain in simple TAMIL exactly why this happened and what the user should do manually.
            BE SPECIFIC: 
            - If it's a size issue, tell them why compression failed (e.g., photo quality too low or too high).
            - If it's a document issue, tell them if it's blurry or wrong type.
            - If it's a network issue, say website slow.
            
            Return ONLY the Tamil text. Do not use technical jargon.`;
            const result = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: prompt
            });
            res.status(200).json({ explanation: (result.text || "").trim() });
        }
        else if (path.includes("extract")) {
            const { images, customFields, extractionPrompt } = req.body;
            if (!images || !Array.isArray(images) || images.length === 0) {
                res.status(400).json({ error: "Missing or invalid images payload" });
                return;
            }
            const imageParts = images.map((img) => ({
                inlineData: {
                    data: img.base64.split(',')[1] || img.base64,
                    mimeType: img.mimeType
                }
            }));
            const customFieldsPrompt = customFields && customFields.length > 0
                ? `Additionally, look for values for these specific labels: ${customFields.map((f) => f.label).join(', ')}. Return them in a field called 'customValues' which is an object mapping label to found value.`
                : '';
            const prompt = `Extract ALL possible personal and demographic data from these Indian government documents (Aadhaar, Ration Card, PAN, Voter ID, driving license, etc.).
            
            YOUR GOAL: Extract every piece of information visible in BOTH English and Tamil.
            
            FIELDS TO EXTRACT (Return as flat JSON): 
            - applicantName (English), applicantNameTamil (Tamil)
            - fatherName (English), fatherNameTamil (Tamil)
            - motherName (English), motherNameTamil (Tamil)
            - spouseName (English), spouseNameTamil (Tamil)
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
            - voterId (EPIC No)
            - panNumber (10 chars)
            - mobileNumber (10 digits)
            - email
            
            Strict Extraction Rules:
            1. LANGUAGE: If a field is only in English, try to transliterate/translate it to Tamil for the Tamil field. If only in Tamil, translate to English.
            2. ADDRESS: Be extremely precise with Door No, Street, Village, Taluk, and District. Look at the back of the card if available.
            3. NUMBERS: Clean all spaces from ID numbers (Aadhaar, PAN, etc.) unless specified format.
            4. ACCURACY: If you find conflicting info across documents, prioritize Aadhaar for name/DOB and Ration Card for family/address details.
            5. ANALYZE CAREFULLY. If blurry, try to infer the most likely values.
            6. Return ONLY valid JSON. No conversational filler.

            ${customFieldsPrompt}
            ${extractionPrompt || ''}`;
            const result = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: [{ text: prompt }, ...imageParts],
                config: {
                    responseMimeType: "application/json"
                }
            });
            res.status(200).json(JSON.parse(result.text || "{}"));
        }
        else if (path.includes("translate")) {
            const { text, targetLang = "Tamil" } = req.body;
            const prompt = `Translate precisely to ${targetLang}: "${text}". Return only translated text.`;
            const result = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: prompt
            });
            res.json({ translation: (result.text || "").trim() });
        }
        else if (path.includes("word-ai-analyze")) {
            const { templateHtml } = req.body;
            if (!templateHtml || templateHtml.trim().length === 0) {
                res.status(400).json({ error: "பகுப்பாய்வு செய்ய ஆவணத்தில் உரை இல்லை. (No content inside doc)" });
                return;
            }
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
      
      Do NOT wrap response in markdown blocks. Return pure JSON.`;
            const result = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: prompt,
                config: {
                    responseMimeType: "application/json"
                }
            });
            res.status(200).json(JSON.parse((result.text || "{}").trim()));
        }
        else if (path.includes("word-ai-fill")) {
            const { templateHtml, extractedDetails } = req.body;
            if (!templateHtml) {
                res.status(400).json({ error: "Missing templateHtml" });
                return;
            }
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
            const result = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: prompt,
                config: {
                    responseMimeType: "application/json"
                }
            });
            res.status(200).json(JSON.parse((result.text || "{}").trim()));
        }
        else {
            res.status(404).json({ error: "Endpoint not found" });
        }
    }
    catch (error) {
        res.status(500).json({
            error: error.message || "Failed to process request"
        });
    }
});
//# sourceMappingURL=index.js.map
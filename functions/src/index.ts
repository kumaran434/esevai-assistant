import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";
import Razorpay from "razorpay";
import * as crypto from "crypto";

admin.initializeApp();

/**
 * Main API function handling extraction, translation, and payments.
 * Configured as 2nd Gen for better scalability and automatic CORS handling.
 */
export const api = onRequest({
  memory: "1GiB",
  timeoutSeconds: 300,
  cors: true,
  region: "us-central1",
  secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "GEMINI_API_KEY"]
}, async (req, res) => {
  const path = req.path.toLowerCase();

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

        const RazorpayClass = (Razorpay as any).default || Razorpay;
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
        } else {
          res.status(400).json({
            success: false,
            error: "invalid_signature",
            message: "Signature mismatch!"
          });
        }
        return;
      }
    } catch (paymentError: any) {
      console.error("Firebase Razorpay error:", paymentError);
      
      let errorDetail = "";
      if (paymentError.error && typeof paymentError.error === "object") {
        errorDetail = paymentError.error.description || JSON.stringify(paymentError.error);
      } else if (paymentError.description) {
        errorDetail = paymentError.description;
      } else {
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
  const isValidKey = (k: any) => typeof k === "string" && k.trim().startsWith("AIza") && k.trim().length > 20;

  let finalApiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || (process.env as any).GOOGLE_API_KEY;
  
  if (!isValidKey(finalApiKey)) {
    try {
      const { config } = require("firebase-functions");
      const cfg = config();
      if (isValidKey(cfg.gemini?.key)) {
        finalApiKey = cfg.gemini.key;
      }
    } catch (e) {
      console.warn("Could not load legacy functions.config()");
    }
  }

  if (!isValidKey(finalApiKey)) {
    res.status(500).json({ 
      error: "API Key invalid or not found.",
      details: "The server could not find a valid Google AI API Key (must start with AIza)."
    });
    return;
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey.trim() });
  const MODEL_NAME = "gemini-3-flash-preview";

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

    } else if (path.includes("analyze-portal")) {
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

    } else if (path.includes("explain-error")) {
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

    } else if (path.includes("extract")) {
      const { images, customFields, extractionPrompt } = req.body;
      
      if (!images || !Array.isArray(images) || images.length === 0) {
        res.status(400).json({ error: "Missing or invalid images payload" });
        return;
      }

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
      
    } else if (path.includes("translate")) {
      const { text, targetLang = "Tamil" } = req.body;
      const prompt = `Translate precisely to ${targetLang}: "${text}". Return only translated text.`;
      
      const result = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt
      });
      res.json({ translation: (result.text || "").trim() });
      
    } else {
      res.status(404).json({ error: "Endpoint not found" });
    }
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || "Failed to process request"
    });
  }
});

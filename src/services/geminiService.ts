// src/services/geminiService.ts
import { ExtractionResult } from "../types";
import { reportAppError } from '../lib/firebase-utils';

/**
 * Cloud Function பின்முனைக்கு (Backend) கோரிக்கைகளை அனுப்பும் தற்காலிக முகவரி உதவியாளர்
 */
const getApiUrl = (endpoint: string) => {
  const baseUrl = import.meta.env.VITE_SERVER_URL || "";
  if (baseUrl) {
    const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${cleanBase}${cleanEndpoint}`;
  }
  const isElectron = typeof window !== 'undefined' && 
     ((window as any).process?.versions?.electron || 
      navigator.userAgent.toLowerCase().indexOf(' electron/') > -1);
  if (window.location.protocol === 'file:' || isElectron) {
    const fallbackUrl = "https://esevadraft.in";
    return `${fallbackUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  }
  return endpoint;
};

async function safeJson(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    const isHtml = text.includes("<!doctype") || text.includes("<html");
    throw new Error(isHtml ? "சர்வர் தற்காலிகமாக செயலிழந்துள்ளது (Error: 500 HTML)." : `JSON parsing error. Received text: ${text.substring(0, 100)}`);
  }
  return response.json();
}

async function handleHttpError(response: Response): Promise<never> {
  let details = "";
  try {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      details = data.details || data.error || data.message || "";
    } else {
      const text = await response.text();
      if (text && text.length < 200 && !text.includes("<html")) {
        details = text;
      }
    }
  } catch (e) {
    console.warn("Failed to extract error details", e);
  }
  throw new Error(details || `Cloud function returned status ${response.status}`);
}

export async function translateText(
  text: string,
  targetLang: string = 'Tamil'
): Promise<string> {
  try {
    const response = await fetch(getApiUrl("/api/translate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLang })
    });
    if (!response.ok) {
      await handleHttpError(response);
    }
    const data = await safeJson(response);
    return data.translation || text;
  } catch (error: any) {
    console.error("Translation error proxying to backend:", error);
    return text;
  }
}

export async function explainError(
  errorContext: string,
  fieldInfo?: any
): Promise<string> {
  try {
    const response = await fetch(getApiUrl("/api/explain-error"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ errorContext, fieldInfo })
    });
    if (!response.ok) {
      await handleHttpError(response);
    }
    const data = await safeJson(response);
    return data.explanation || "விவரங்களை விளக்குவதில் சிக்கல் ஏற்பட்டுள்ளது.";
  } catch (error: any) {
    console.error("Explain error proxying to backend:", error);
    return `தொழில்நுட்பக் கோளாறு (Cloud Function Offline): ${error.message || ""}`;
  }
}

export async function analyzeFormFields(
  fields: any[],
  websiteTitle: string,
  currentUrl: string,
  analysisData?: any
): Promise<any> {
  try {
    const response = await fetch(getApiUrl("/api/analyze-fields"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields,
        websiteTitle,
        currentUrl,
        pageInfo: analysisData?.pageInfo
      })
    });
    if (!response.ok) {
       await handleHttpError(response);
    }
    return await safeJson(response);
  } catch (error: any) {
    console.error("Form fields analysis proxying to backend:", error);
    reportAppError(error, "Field Analysis Failure");
    throw new Error(`AI பகுப்பாய்வு செய்வதில் தோல்வி ஏற்பட்டது: ${error.message || "உங்கள் இணைய இணைப்பை சரிபார்க்கவும்."}`);
  }
}

export async function analyzePortalWithAI(
  prompt: string
): Promise<any> {
  try {
    const response = await fetch(getApiUrl("/api/analyze-portal"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    if (!response.ok) {
      await handleHttpError(response);
    }
    return await safeJson(response);
  } catch (error: any) {
    console.error("Portal analysis error proxying to backend:", error);
    throw error;
  }
}

export async function extractDetailsFromDocuments(
  images: { base64: string; mimeType: string }[],
  customFields?: { id: string; label: string }[],
  extractionPrompt?: string
): Promise<any> {
  try {
    const response = await fetch(getApiUrl("/api/extract"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images, customFields, extractionPrompt })
    });
    if (!response.ok) {
      await handleHttpError(response);
    }
    const parsed = await safeJson(response);
    return processCustomFields(parsed, customFields);
  } catch (error: any) {
    console.error("Extraction error proxying to backend:", error);
    reportAppError(error, "Extraction Failure");
    throw error;
  }
}

function processCustomFields(parsed: any, customFields?: { id: string; label: string }[]) {
  if (parsed.customValues && customFields) {
    const mappedValues: { [id: string]: string } = {};
    customFields.forEach(f => {
      const label = f.label.toLowerCase();
      const foundKey = Object.keys(parsed.customValues).find(k => k.toLowerCase() === label);
      if (foundKey) {
        mappedValues[f.id] = parsed.customValues[foundKey];
      }
    });
    parsed.customValues = mappedValues;
  }
  return parsed;
}

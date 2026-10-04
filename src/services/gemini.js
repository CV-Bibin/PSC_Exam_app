import { GoogleGenerativeAI } from "@google/generative-ai";
import JSZip from "jszip";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// --- NEW: PPTX Text Extractor ---
export const extractTextFromPPTX = async (file) => {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(file);
  let fullText = "";

  // PPTX files store slide text in XML files under ppt/slides/
  for (const relativePath in zipContent.files) {
    if (relativePath.startsWith('ppt/slides/slide') && relativePath.endsWith('.xml')) {
      const xmlData = await zipContent.files[relativePath].async('text');
      // Strip XML tags to leave only the raw presentation text
      const cleanText = xmlData.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      fullText += cleanText + "\n";
    }
  }
  return fullText;
};

// --- UPDATED: AI Data Extraction & Validation ---
export const extractSyllabusData = async (fileData, isText = false) => {
  const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
  
  const prompt = `You are an expert Civil Engineering AI assistant and strict fact-checker. 
  Analyze the provided document data and perform the following:
  1. title: A concise 4-7 word 'Day Topic Title'.
  2. dates_found: Extract all dates, years, or timelines mentioned (e.g., IS Code revision years like "IS 456:2000", historical project dates).
  3. notes: A refined, heavily summarized bulleted list of the most crucial concepts, formulas, or clauses.
  4. validity_check: Cross-reference the extracted notes against standard Kerala PSC / Indian standard engineering principles. State whether the data is accurate, or flag any outdated formulas/codes.
  
  Return STRICTLY a JSON object. Do not include markdown formatting like \`\`\`json:
  {
    "title": "string",
    "dates_found": ["string", "string"],
    "notes": "string (bullet points)",
    "validity_check": "string"
  }`;

  try {
    const contentPayload = isText 
      ? [prompt, fileData] // Pass raw text for PPTX
      : [prompt, { inlineData: { data: fileData, mimeType: "application/pdf" } }]; // Pass Base64 for PDF

    const result = await model.generateContent(contentPayload);
    const responseText = result.response.text();
    
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);

  } catch (error) {
    console.error("Gemini AI Extraction Error:", error);
    throw new Error("Failed to analyze document. Ensure it contains readable text.");
  }
};

export const askAITutor = async (userQuestion, contextContext = "General Civil Engineering") => {
  const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
  const prompt = `You are 'AE Chettan', a witty and expert Kerala PSC Civil Engineering tutor.
  Current Syllabus Context: ${contextContext}
  Student Question: ${userQuestion}
  Provide a clear, step-by-step explanation. If applicable, use a localized Kerala cultural analogy.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    throw new Error("AE Chettan is taking a tea break. Try again in a moment.");
  }
};
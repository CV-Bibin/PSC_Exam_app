import { GoogleGenerativeAI } from "@google/generative-ai";
import JSZip from "jszip";

// Safely parse multiple API keys from .env
const apiKeys = import.meta.env.VITE_GEMINI_API_KEY
  ? import.meta.env.VITE_GEMINI_API_KEY.split(',').map(key => key.trim()).filter(Boolean)
  : [];

const getRandomKey = () => {
  if (apiKeys.length === 0) throw new Error("API Key is missing in your .env file!");
  return apiKeys[Math.floor(Math.random() * apiKeys.length)];
};

// --- SMART ROUTER WITH JSON LOCK ---
async function fetchWithRetry(contentPayload, isHeavyJson = false, maxRetries = 3) {
  let delay = 3000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const genAI = new GoogleGenerativeAI(getRandomKey());

      // ✅ Using your requested model
      const model = genAI.getGenerativeModel({
        model: "gemini-3.5-flash",
        generationConfig: isHeavyJson ? { responseMimeType: "application/json" } : {}
      });

      const result = await model.generateContent(contentPayload);
      return result.response.text();
    } catch (error) {
      console.error(`[Gemini Try ${attempt}] Error Detail:`, error);

      const errorStr = error.message || error.toString();
      const isRateLimited = errorStr.includes('429') || errorStr.includes('503');
      const isNotFound = errorStr.includes('404');

      if (isNotFound) {
        throw new Error("404 Model Not Found. Check your API key or model string.");
      }

      if (isRateLimited) {
        if (attempt === maxRetries) {
          throw new Error("All API keys are currently rate-limited (Error 429). Please wait 60 seconds and try again.");
        }
        console.warn(`[Attempt ${attempt}/${maxRetries}] API Limit hit. Switching keys & retrying in ${delay / 1000}s...`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 1.5;
      } else {
        throw error;
      }
    }
  }
}

export const extractTextFromPPTX = async (file) => {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(file);
  let fullText = "";
  for (const relativePath in zipContent.files) {
    if (relativePath.startsWith('ppt/slides/slide') && relativePath.endsWith('.xml')) {
      const xmlData = await zipContent.files[relativePath].async('text');
      const cleanText = xmlData.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      fullText += cleanText + "\n";
    }
  }
  return fullText;
};

// --- MASSIVE UPGRADE: Exhaustive Restructurer, Bullet Points & Grand Exam Reserve ---
export const extractSyllabusData = async (fileData, isText = false) => {
  const prompt = `You are an expert, highly rigorous Kerala PSC Civil Engineering Curriculum Compiler. 
  
  CRITICAL DIRECTIVES:
  1. NOISE FILTER: Completely remove non-syllabus elements. Delete author names, publisher info, watermarks, index pages, page numbers, and irrelevant conversational text. ONLY process the core engineering subject matter.
  2. EXHAUSTIVE RESTRUCTURING: DO NOT SUMMARIZE. DO NOT OMIT ANY INFORMATION. Preserve 100% of the factual data, numerical values, IS codes, formulas, dimensions, and definitions.
  3. BULLET POINT FORMAT ONLY: Absolutely NO large paragraphs. You MUST break down all text, explanations, and definitions into easy-to-read bullet points. Use "\\n• " for each point.
  4. GRAND EXAM RESERVE: Generate 3-5 highly difficult, completely unique MCQs and Traps specifically reserved for the "grand_exam" arrays. Do not duplicate these in the regular "quizzes" or "games" arrays.
  5. INFINITE SLIDES: If the raw text is very long, generate AS MANY "study_material" objects (slides) as necessary to fit all the data. Do not compress points together to save space.
  6. NO LATEX: DO NOT use LaTeX ($ or $$). Write formulas normally (e.g., A = pi * r^2).
  
  Generate a STRICT JSON object matching exactly this schema:
  {
    "title": "string (4-7 words indicating the main topic)",
    "study_material": [
      {
        "heading": "string (Clear, specific heading)",
        "content": "string (The detailed explanation formatted STRICTLY as a bulleted list using '\\n• '. DO NOT WRITE PARAGRAPHS. Keep all details intact.)",
        "key_data": ["string (Extract EVERY single numerical value, IS code, dimension, and factual bullet point exactly as provided in the raw text)"],
        "psc_trap": "string (Identify one confusing concept from this chunk where students might make a mistake)"
      }
    ],
    "quick_revision": ["string (Write comprehensive one-liners for EVERY single fact mentioned in the raw text. DO NOT LEAVE ANY FACT BEHIND. Generate as many as needed.)"],
    "missing_concepts": ["string (Note any major topics related to the heading that are clearly missing from this text)"],
    "quizzes": [{"question": "string", "options": ["A","B","C","D"], "correct_answer": "string", "explanation": "string"}],
    "games": {
      "flashcards": [{"front": "string", "back": "string"}],
      "match_pairs": [{"left": "string", "right": "string"}],
      "spot_the_trap": [{"statement": "string", "is_true": boolean, "catch": "string"}],
      "fill_in_the_blanks": [{"sentence": "string", "answer": "string", "hint": "string"}]
    },
    "grand_exam_quizzes": [{"question": "string", "options": ["A","B","C","D"], "correct_answer": "string", "explanation": "string"}],
    "grand_exam_traps": [{"statement": "string", "is_true": boolean, "catch": "string"}],
    "validity_check": "string (Confirm that 100% of facts were preserved, formatted as bullet points, and noise was filtered out)"
  }`;

  const contentPayload = isText
    ? [prompt, fileData]
    : [prompt, { inlineData: { data: fileData, mimeType: "application/pdf" } }];

  const responseText = await fetchWithRetry(contentPayload, true);

  try {
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (parseError) {
    console.error("Failed to parse Gemini JSON output:", responseText);
    throw new Error("AI returned malformed data. Please click process again.");
  }
};

export const askAITutor = async (userQuestion, contextContext = "General Civil Engineering") => {
  const prompt = `You are 'AE Chettan', a witty Kerala PSC Civil Engineering tutor. 
  Current Context: ${contextContext}. 
  Question: ${userQuestion}. 
  Explain this clearly and directly for a PSC exam student. Do not use LaTeX formatting.`;

  return await fetchWithRetry([prompt], false);
};
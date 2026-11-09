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

// --- CASCADING FALLBACK ROUTER ---
async function fetchWithRetry(contentPayload, isHeavyJson = false) {
  // The exact priority order: Try 3.6 first, then cascade down to Flash-Lite models
  const modelsToTry = [
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite'
  ];

  let delay = 3000;

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];

    try {
      const genAI = new GoogleGenerativeAI(getRandomKey());
      console.log(`[Gemini Router] Attempting generation with: ${currentModel}`);

      const model = genAI.getGenerativeModel({
        model: currentModel,
        generationConfig: isHeavyJson ? { responseMimeType: "application/json" } : {}
      });

      const result = await model.generateContent(contentPayload);
      console.log(`[Gemini Router] Success using ${currentModel}!`);
      return result.response.text();

    } catch (error) {
      console.error(`[Gemini Error on ${currentModel}]:`, error);

      const errorStr = error.message || error.toString();
      // Catch Overloaded (503), Rate Limited (429), or Missing/Locked Models (404)
      const isRetryable = errorStr.includes('429') || errorStr.includes('503') || errorStr.includes('404');

      if (isRetryable) {
        if (i === modelsToTry.length - 1) {
          throw new Error("All fallback models failed. Google's servers are currently saturated. Please wait a minute and try again.");
        }
        console.warn(`[Fallback Router] ${currentModel} failed/busy. Switching to next model in ${delay / 1000}s...`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 1.5; // Exponential backoff to give the network time to breathe
      } else {
        // If it's a code error (like a bad prompt), throw it immediately
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

// --- ART DIRECTOR & UI ARCHITECT GENERATOR ---
export const extractSyllabusData = async (fileData, isText = false) => {

const prompt = `You are an elite, highly rigorous Kerala PSC Civil Engineering Master Tutor. 
Your objective is LOSSLESS ENHANCEMENT. You must transform raw, messy notes into a structured, highly visual JSON payload for a React application. You are expected to generate PSC tips, memory hooks, and clear explanations, BUT YOU MUST NOT OMIT ANY SOURCE DATA.

CRITICAL ENGINEERING DIRECTIVES (FOLLOW STRICTLY):
1. ZERO OMISSION RULE: You have full creative freedom to organize the text, explain concepts, and add PSC-specific tips. However, you are STRICTLY FORBIDDEN from deleting or omitting any raw facts. Every single line, IS Code, numerical tolerance, dimension, ratio, formula, and classification mentioned in the input MUST be preserved and integrated into the slides.
2. THE SPLIT-SLIDE MANDATE: Do not cram. If the raw text contains a long list of 8 properties, do not compress them into 4. You MUST create multiple consecutive slides (e.g., "Properties of Cement - Part 1", "Properties of Cement - Part 2") to preserve all 8 properties exactly as provided.
3. AGGRESSIVE KEY-DATA USE: You MUST aggressively use the 'key_data' array on every single slide to isolate numerical limits, IS Codes, and formulas so they are visually highlighted to the student. If a slide mentions a number, it belongs in 'key_data'.
4. HIERARCHY & FLOW: When explaining classifications (e.g., "Types of Bonds"), you MUST first create a 'grid' slide listing all types. Only AFTER the grid slide should you create detailed 'theory' or 'takeaways' slides for each specific type.
5. THE UI COMPONENTS:
   - "definition": For core concepts. 'content_data' must have 'term' and 'explanation'.
   - "comparison": For exact differences. 'content_data' must have 'left_title', 'left_points', 'right_title', 'right_points'.
   - "formula": For math/equations. 'content_data' must have 'equation', 'variables' (array of strings), 'explanation'.
   - "takeaways": For numbered lists, properties, or rules. 'content_data' must have 'points' (array of OBJECTS with 'term' and 'desc').
   - "grid": For classifications/types. 'content_data' must have 'items' (array of objects with 'title' and 'desc').
   - "theory": For standard reading. 'content_data' must have 'paragraphs'.
   - "quick_quiz": Inject 1-2 between complex slides. 'content_data' must have 'question', 'options', 'correct', 'explanation'.
   - "interactive_match": Inject 1 per topic. 'content_data' must have 'instructions' and 'pairs' (array of left/right objects).
6. VISUAL ART DIRECTOR: Set "is_needed": false for 80% of slides. ONLY request an image (art_prompt) if a spatial diagram is absolutely mandatory (e.g., cross-section of a dam). 
7. STRICT MCQ ROUTING: Extract all raw questions into "quizzes". Generate 3-5 brand new, highly difficult questions into "grand_exam_quizzes".

Generate a STRICT JSON object matching exactly this schema:
{
  "title": "string (4-7 words indicating the overall module topic)",
  "study_material": [
    {
      "type": "string (MUST BE: 'definition', 'comparison', 'formula', 'takeaways', 'grid', 'theory', 'quick_quiz', or 'interactive_match')",
      "badge": "string (Short tag e.g., '⭐ Important', '📖 Definition', '⚠️ Trap')",
      "context_breadcrumb": "string (CRITICAL: The parent topic this slide belongs to. e.g., 'Classification of Surveys > Based on Instruments')",
      "heading": "string (Punchy slide title, append 'Part 1' etc. if splitting)",
      "image_request": {
        "is_needed": boolean,
        "art_prompt": "string (Detailed visual description ONLY if absolutely necessary, else null)"
      },
      "content_data": { 
        "//": "Structure this object exactly as requested in Directive 5 based on the 'type'" 
      },
      "key_data": ["string (Extract specific numerical thresholds, codes, or dimensions)"],
      "psc_trap": "string (Clear trap alert with the exact trap trick Kerala PSC uses)"
    }
  ],
  "quick_revision": ["string (One-liner memory hooks for every critical fact)"],
  "missing_concepts": ["string (Notable PSC syllabus topics missing from the input text)"],
  "quizzes": [{"question": "string", "options": ["A","B","C","D"], "correct_answer": "string", "explanation": "string"}],
  "games": {
    "flashcards": [{"front": "string", "back": "string"}],
    "match_pairs": [{"left": "string", "right": "string"}],
    "spot_the_trap": [{"statement": "string", "is_true": boolean, "catch": "string"}],
    "fill_in_the_blanks": [{"sentence": "string", "answer": "string", "hint": "string"}]
  },
  "grand_exam_quizzes": [{"question": "string", "options": ["A","B","C","D"], "correct_answer": "string", "explanation": "string"}],
  "grand_exam_traps": [{"statement": "string", "is_true": boolean, "catch": "string"}],
  "validity_check": "string"
}`;
  const contentPayload = isText
    ? [prompt, fileData]
    : [prompt, { inlineData: { data: fileData, mimeType: "application/pdf" } }];

  // Keep your existing Cascading Fallback Router logic here
  // Cascading Fallback Router
  const modelsToTry = [
    'gemini-3.6-flash',
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite'
  ];
  let delay = 3000;

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    try {
      const genAI = new GoogleGenerativeAI(getRandomKey());
      console.log(`[Gemini Router] Attempting generation with: ${currentModel}`);

      const model = genAI.getGenerativeModel({
        model: currentModel,
        generationConfig: { responseMimeType: "application/json" } // Strictly enforce JSON
      });

      const result = await model.generateContent(contentPayload);
      console.log(`[Gemini Router] Success using ${currentModel}!`);

      const responseText = result.response.text();
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);

    } catch (error) {
      console.error(`[Gemini Error on ${currentModel}]:`, error);
      const errorStr = error.message || error.toString();
      const isRetryable = errorStr.includes('429') || errorStr.includes('503') || errorStr.includes('404');

      if (isRetryable) {
        if (i === modelsToTry.length - 1) {
          throw new Error("All fallback models failed. Google's servers are currently saturated. Please wait a minute and try again.");
        }
        console.warn(`[Fallback Router] ${currentModel} failed/busy. Switching to next model in ${delay / 1000}s...`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 1.5;
      } else {
        throw new Error("AI failed to generate a valid curriculum structure. Please try again.");
      }
    }
  }
};

export const askAITutor = async (userQuestion, contextContext = "General Civil Engineering") => {
  const prompt = `You are 'AE Chettan', a witty Kerala PSC Civil Engineering tutor. 
  Current Context: ${contextContext}. 
  Question: ${userQuestion}. 
  Explain this clearly and directly for a PSC exam student. Do not use LaTeX formatting.`;

  return await fetchWithRetry([prompt], false);
};
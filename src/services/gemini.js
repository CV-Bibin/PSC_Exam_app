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

 const prompt = `You are an elite Kerala PSC Civil Engineering Master Tutor and Infographic Designer. 
Your job is to transform raw technical text into a structured JSON payload that powers a highly visual React application.

CRITICAL DIRECTIVES:
1. ABSOLUTE ZERO FACT LOSS: Retain EVERY SINGLE POINT, definition, sub-type, classification, and explanation. DO NOT SUMMARIZE.
2. UNLIMITED SLIDES & HIERARCHY FLOW: Create as many slides as necessary. CRITICAL RULE: If explaining classifications (e.g., Types of Surveys), you MUST first create a 'grid' slide listing all the types. ONLY AFTER the grid slide should you create detailed 'theory' or 'takeaways' slides for each specific type.
3. THE UI COMPONENTS:
   - "definition": For core concepts. 'content_data' must have 'term' and 'explanation'.
   - "comparison": For differences. 'content_data' must have 'left_title', 'left_points' (array of strings), 'right_title', 'right_points' (array of strings).
   - "formula": For math/equations. 'content_data' must have 'equation', 'variables' (array of strings), 'explanation'.
   - "takeaways": For numbered lists, objectives, or rules. 'content_data' must have 'points' (array of OBJECTS with 'term' (short bold prefix/sub-heading, or null) and 'desc' (the main text)).
   - "grid": For classifications/types. 'content_data' must have 'items' (array of objects with 'title' and 'desc').
   - "theory": For standard reading. 'content_data' must have 'paragraphs' (array of strings).
   - "quick_quiz": Inject 1-2 of these between complex slides. 'content_data' must have 'question', 'options', 'correct', 'explanation'.
   - "interactive_match": Inject 1 of these per topic. 'content_data' must have 'instructions' and 'pairs' (array of left/right objects).
4. VISUAL ART DIRECTOR (IMAGES): Only request an image if a diagram is ABSOLUTELY NECESSARY for the student to understand a complex spatial or technical concept (e.g., Earth's curvature, specific instrument parts). Do not force an image quota. If the topic is purely theoretical and easily understood through our UI text/icons, set "is_needed": false for ALL slides. However, NEVER skip an image if a visual is genuinely required for exam comprehension.
5. STRICT MCQ ROUTING: Extract all raw questions into "quizzes". Generate 3-5 brand new, highly difficult questions into "grand_exam_quizzes".

Generate a STRICT JSON object matching exactly this schema:
{
  "title": "string (4-7 words indicating the overall module topic)",
  "study_material": [
    {
      "type": "string (MUST BE: 'definition', 'comparison', 'formula', 'takeaways', 'grid', 'theory', 'quick_quiz', or 'interactive_match')",
      "badge": "string (Short tag e.g., '⭐ Important', '📖 Definition', '⚠️ Trap')",
      "context_breadcrumb": "string (CRITICAL: The parent topic this slide belongs to. e.g., 'Classification of Surveys > Based on Instruments')",
      "heading": "string (Punchy slide title)",
      "image_request": {
        "is_needed": boolean,
        "art_prompt": "string (Detailed visual description ONLY if absolutely necessary, else null)"
      },
      "content_data": { 
        "//": "Structure this object exactly as requested in Directive 3 based on the 'type'" 
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
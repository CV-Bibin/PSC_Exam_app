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

export const extractSyllabusData = async (fileData, isText = false) => {
  const prompt = `You are an elite, highly engaging Kerala PSC Civil Engineering Master Tutor and Coach. 
Transform raw technical civil engineering text into an interactive, visually stunning, high-retention study guide.

CRITICAL DIRECTIVES:
1. ZERO FACT LOSS: Preserve 100% of factual data, numbers, IS codes, formulas, limits, tolerances, and definitions. 
2. NO DRY BULLET DUMPS:
   - For comparisons, ALWAYS use Markdown Tables (| Aspect | Plane | Geodetic |).
   - Use bold inline Markdown (**keyword**) for immediate visual scanning.
   - Use clean, structured sections: "### 💡 Core Intuition", "### 📊 Comparison Matrix", "### 📐 Field Formulas".
3. EMOJIS & CARDS: Use professional civil engineering markers (🏗️, 📏, 🌐, ⚠️, 📌) to open major concepts.
4. INFINITE SLIDES: Break long raw texts across multiple slide objects. Never crowd more than 2-3 focused concepts onto a single slide.
5. NO LATEX: Write formulas with standard text/unicode (e.g., A = π × r², Δ = 18.2 km -> 0.01 m).
6. STRICT MCQ ROUTING: 
   - Place ONLY the exact questions extracted directly from the raw text into the "quizzes" array (for daily practice). 
   - Generate 3 to 5 completely ORIGINAL, highly difficult questions and place them EXCLUSIVELY in the "grand_exam_quizzes" array (for monthly/mastery exams). DO NOT mix them.

Generate a STRICT JSON object matching exactly this schema:
{
  "title": "string (4-7 words indicating the overall module topic)",
  "study_material": [
    {
      "heading": "string (Punchy, professional title with an icon, e.g., '🌐 Primary Divisions')",
      "content": "string (Full rich Markdown content with headers, Markdown tables where applicable, bold terms, and bulleted field rules. Use '\\n\\n' between paragraphs and tables. NEVER dump raw unformatted lines.)",
      "key_data": ["string (Extract every specific numerical threshold, IS code, or parameter)"],
      "psc_trap": "string (Clear trap alert with the exact trap trick Kerala PSC uses)"
    }
  ],
  "quick_revision": ["string (One-liner memory hooks for every critical fact)"],
  "missing_concepts": ["string (Notable PSC syllabus topics missing from the input text)"],
  "quizzes": [{"question": "string", "options": ["A","B","C","D"], "correct_answer": "string", "explanation": "string (Extract and place ONLY the raw questions found in the text here. Do not add new ones here.)"}],
  "games": {
    "flashcards": [{"front": "string", "back": "string"}],
    "match_pairs": [{"left": "string", "right": "string"}],
    "spot_the_trap": [{"statement": "string", "is_true": boolean, "catch": "string"}],
    "fill_in_the_blanks": [{"sentence": "string", "answer": "string", "hint": "string"}]
  },
  "grand_exam_quizzes": [{"question": "string", "options": ["A","B","C","D"], "correct_answer": "string", "explanation": "string (Generate 3-5 original, highly difficult questions here for the final mastery exam)"}],
  "grand_exam_traps": [{"statement": "string", "is_true": boolean, "catch": "string (Generate 2-3 unique, original traps here for the final mastery exam)"}],
  "validity_check": "string (Verified complete factual retention with interactive markdown presentation)"
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
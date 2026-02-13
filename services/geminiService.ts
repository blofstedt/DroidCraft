
import { GoogleGenAI, Type } from "@google/genai";
import { ProjectState, AppFile } from "../types";

export class GeminiAppService {
  constructor() {}

  async *processRequestStream(
    userMessage: string, 
    project: ProjectState,
    history: any[],
    scope: string = 'general',
    persistentInstructions: string = ''
  ) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const fileContext = Object.values(project.files)
      .map(f => `FILE: ${f.path}\nCONTENT:\n${f.content}\n---`)
      .join('\n');

    const firebaseContext = project.firebase?.config 
      ? `CONNECTED_BACKEND: Firestore (Project: ${project.firebase.config.projectId})\nCOLLECTIONS: ${JSON.stringify(project.firebase.collections)}`
      : "BACKEND: Local Only (Not yet connected to Firebase)";

    const systemInstruction = `
      You are "DroidCraft AI", a professional App Builder Studio Orchestrator.
      
      CORE MANDATE:
      You function like Power Apps for real Android applications (Capacitor/PWA).
      Users interact with a visual canvas to drag, resize, and edit components.
      
      BEHAVIORAL RULES:
      1. COMPONENT INSERTION: If a user asks to "Insert [Component]", identify the best place in the HTML (usually inside the <main> or the last div) and inject professional, Tailwind-styled code for that component.
      2. MULTI-SCREEN MANAGEMENT: If requested to "Add Screen", create a new HTML file or add a high-level container that can be toggled via JS logic.
      3. VISUAL EDITS: When receiving "Element /id: pos(...), styles: {..}", update the CSS/HTML to reflect these EXACT manual visual overrides.
      4. UI CONSISTENCY: Maintain a clean, professional Material Design 3 or modern aesthetic.
      5. CLARIFICATION: If a request is unclear, ASK before coding.

      USER-DEFINED SYSTEM INSTRUCTIONS:
      ${persistentInstructions}

      OUTPUT FORMAT:
      Response MUST be JSON.
      {
        "explanation": "concise summary",
        "filesToUpdate": [{"path": "string", "content": "string", "language": "string"}],
        "newFiles": [],
        "deleteFiles": [],
        "backendUpdates": {
          "collections": [{"name": "string", "schema": "object", "rules": "string"}],
          "configSync": true
        }
      }
    `;

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: [
        { role: 'user', parts: [{ text: `REPO_STATE:\n${fileContext}\n\n${firebaseContext}\n\nREQUEST_SCOPE: ${scope}\nUSER_COMMAND: ${userMessage}` }] }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            filesToUpdate: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  path: { type: Type.STRING },
                  content: { type: Type.STRING },
                  language: { type: Type.STRING }
                },
                required: ["path", "content", "language"]
              }
            },
            newFiles: {
               type: Type.ARRAY,
               items: {
                type: Type.OBJECT,
                properties: {
                  path: { type: Type.STRING },
                  content: { type: Type.STRING },
                  language: { type: Type.STRING }
                },
                required: ["path", "content", "language"]
               }
            },
            deleteFiles: {
               type: Type.ARRAY,
               items: { type: Type.STRING }
            },
            backendUpdates: {
              type: Type.OBJECT,
              properties: {
                collections: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      schema: { type: Type.OBJECT },
                      rules: { type: Type.STRING }
                    }
                  }
                },
                configSync: { type: Type.BOOLEAN }
              }
            }
          },
          required: ["explanation"]
        }
      }
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        yield fullText;
      }
    }
  }
}

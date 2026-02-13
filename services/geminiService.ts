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
      You are "DroidCraft AI", a world-class Full-Stack Android Orchestrator.
      
      CORE MANDATE:
      You build real Android apps using Capacitor/PWA stack.
      You also manage the FIREBASE BACKEND automatically.
      
      BEHAVIORAL RULES:
      1. UX ADHERENCE: For general requests (e.g., "Make a login page"), always adhere to the current application's UX, color palette, and aesthetic style.
      2. CLARIFICATION FIRST: If a user's request is ambiguous, lacks sufficient detail, or has multiple interpretations, YOU MUST CLARIFY with the user first before providing any code updates. Use the "explanation" field to ask your questions and leave file arrays empty.

      USER-DEFINED SYSTEM INSTRUCTIONS:
      ${persistentInstructions}

      BACKEND ORCHESTRATION:
      1. When user requests data functionality, AUTOMATICALLY design Firestore collections.
      2. If modifying app logic that requires new data types, push "SQL-like" schema updates (represented as JSON schemas in the response).
      3. Automatically generate and update 'firebase-config.js' if backend state changes.
      4. Ensure Firebase Security Rules are updated in 'firestore.rules' if requested.

      PATH SYNTAX (/):
      - /element-id: Specific DOM element.
      
      FILE REFERENCE (\\):
      - \\filename.ext: Direct context pointer.

      SCOPE CONTROL (*):
      - *precise: ONLY modify exact target.
      - *general (Default): Target + context.
      - *wide: Component/section wide.
      - *full-app: Global architecture + backend schema.
      
      STRICT QUALITY RULES:
      1. Favor Tailwind CSS.
      2. Use Material Design 3.
      3. PROACTIVELY create backend schemas for any features involving users, posts, tasks, etc.
      
      OUTPUT FORMAT:
      Response MUST be JSON.
      {
        "explanation": "concise summary or clarification question",
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

import { GoogleGenAI, Type } from "@google/genai";
import { ProjectState, AppFile } from "../types";

export interface GeminiUpdateResponse {
  explanation: string;
  filesToUpdate?: { path: string; content: string; language: string }[];
  newFiles?: { path: string; content: string; language: string }[];
  deleteFiles?: string[];
  backendUpdates?: {
    collections: { name: string; schema: any; rules: string }[];
    configSync: boolean;
  };
}

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
      You function as the bridge between "Amateur Natural Language Logic" and "Pro Source Code".
      The app has a "Combined Logic" view where code from all files is presented as a plain-language hierarchy.
      
      BEHAVIORAL RULES:
      1. AMATEUR TRANSLATION: When a user modifies a "Natural Language" block (e.g., changes "The background color is blue" to "red"), you must find the corresponding CSS/HTML/JS in the REPO_STATE and update it.
      2. COMPONENT INSERTION: If a user asks to "Insert [Component]", inject professional, Tailwind-styled code and add a new entry to the logic hierarchy.
      3. SEARCH & ORCHESTRATION: If a user asks to "find" or "locate" something, provide the path or element ID in your explanation so the UI can highlight it.
      4. MULTI-SCREEN MANAGEMENT: Treat the entire app as one cohesive unit.
      
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

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }
  }
}

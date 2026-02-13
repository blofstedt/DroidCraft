
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

    const connectionsContext = project.connections && project.connections.length > 0
      ? `NAVIGATION_CONNECTIONS:\n${project.connections.map(c => `  ${c.fromScreen} [${c.fromElementLabel}] --${c.action}--> ${c.toScreen}`).join('\n')}`
      : "NAVIGATION: No screen connections defined yet";

    const systemInstruction = `
      You are "DroidCraft AI", a professional App Builder Studio Orchestrator.
      
      ROLE:
      You are the technical architect and code generator for real Android apps (using Capacitor/PWA bridge).
      Users might perform direct edits; your job is to supplement their requests with production-grade code.

      CORE MANDATE:
      1. CODE GENERATION: Write clean, modular, and responsive code using Tailwind CSS.
      2. REPO AWARENESS: You have full access to REPO_STATE. When asked to modify, provide the complete updated file content.
      3. ANDROID CONTEXT: Remember this is for Android. Use mobile-first design patterns, Material Design 3 principles, and consider native plugins (Camera, GPS, etc.) via Capacitor.
      4. BACKEND: If Firebase is connected, suggest database schema changes or cloud function logic where relevant.
      5. NAVIGATION: When navigation connections exist between screens, ensure they are reflected in click handlers and routing logic.

      USER-DEFINED SYSTEM INSTRUCTIONS:
      ${persistentInstructions}

      OUTPUT FORMAT:
      Response MUST be JSON only.
      {
        "explanation": "concise description of technical changes",
        "filesToUpdate": [{"path": "string", "content": "string", "language": "string"}],
        "newFiles": [{"path": "string", "content": "string", "language": "string"}],
        "deleteFiles": ["string"],
        "backendUpdates": {
          "collections": [{"name": "string", "schema": "object", "rules": "string"}],
          "configSync": true
        }
      }
    `;

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: [
        { role: 'user', parts: [{ text: `REPO_STATE:\n${fileContext}\n\n${firebaseContext}\n\n${connectionsContext}\n\nREQUEST_SCOPE: ${scope}\nUSER_COMMAND: ${userMessage}` }] }
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

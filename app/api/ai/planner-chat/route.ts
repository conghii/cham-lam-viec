import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { goal, history, questionCount } = await req.json();

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-pro",
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
            ],
        });

        const historyText = history.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Consultant'}: ${msg.content}`).join("\n");

        const prompt = `
            You are an expert Strategy Consultant conducting a discovery interview with a client.
            
            **CLIENT GOAL**: "${goal}"
            
            **CONTEXT**:
            ${historyText}
            
            **YOUR TASK**:
            You are currently at Question ${questionCount} of 10.
            Ask the NEXT most important question to clarify their goal, resources, constraints, or preferences.
            
            **RULES**:
            - Ask ONLY ONE question.
            - Keep it concise (under 20 words).
            - Be professional yet encouraging.
            - Do not offer advice yet, just gather information.
            - If this is Question 10, ask a final wrapping-up question.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;

        let text = "";
        try {
            text = response.text();
        } catch (e) {
            // Fallback if text() fails (e.g. blocked)
            if (response.candidates && response.candidates.length > 0 && response.candidates[0].content.parts.length > 0) {
                text = response.candidates[0].content.parts[0].text || "";
            }
        }

        if (!text) {
            text = "I'm having a bit of trouble connecting. Could you elaborate on your last point?";
        }

        return NextResponse.json({ message: text });

    } catch (error: any) {
        console.error("Chat Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

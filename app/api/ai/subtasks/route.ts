import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { title, description } = await req.json();

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("Missing GEMINI_API_KEY");
            return NextResponse.json({ error: "Configuration Error: Missing API Key" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

        const prompt = `
        You are an expert productivity assistant. 
        Break down the following task into 3-5 concrete, actionable subtasks.
        Task Title: ${title}
        Task Description: ${description}
        
        Return ONLY a JSON array of strings. Example: ["Step 1", "Step 2"].
        Do not include markdown formatting or "json" tags.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown if present
        let cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        // Ensure it starts with [ and ends with ]
        const firstBracket = cleanedText.indexOf('[');
        const lastBracket = cleanedText.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1) {
            cleanedText = cleanedText.substring(firstBracket, lastBracket + 1);
        }

        const subtasks = JSON.parse(cleanedText);

        return NextResponse.json({ subtasks });
    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return NextResponse.json({ error: `Failed to generate subtasks: ${error.message || "Unknown error"}` }, { status: 500 });
    }
}

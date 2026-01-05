import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { goal, deadline, hoursPerDay } = await req.json();

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing GEMINI_API_KEY in environment" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

        const prompt = `
            You are a world-class Strategist, Project Manager, and Domain Expert across multiple industries (Tech, Business, Fitness, Arts, etc.).
            
            **USER GOAL**: "${goal}"
            **DEADLINE**: ${deadline}
            **DAILY BUDGET**: ${hoursPerDay} hours/day

            **YOUR MISSION**:
            1.  **Analyze the Domain**: Identify the specific field (e.g., "React Native Development", "Marathon Training", "SaaS Marketing").
            2.  **Strategic Breakdown**: Deconstruct the goal into a logical, phased roadmap suitable for the deadline.
            3.  **Proof of Work**: Define specific, measurable "Key Results" that prove progress. Avoid generic "Learn X" tasks; prefer "Build X", "Publish Y", "Run Z".

            **OUTPUT RULES**:
            - Return ONLY a valid JSON object.
            - No markdown formatting (no \`\`\`json).
            - No preamble or postscript.

            **JSON SCHEMA**:
            {
                "phases": [
                    {
                        "title": "Phase Title (e.g., 'Phase 1: MVP')",
                        "duration": "Estimated Duration (e.g., '2 Weeks')",
                        "tasks": ["Action item 1", "Action item 2", "Action item 3"]
                    }
                ]
            }

            **CRITERIA**:
            - Generate 3-5 distinct phases.
            - Each phase should have 3-5 actionable tasks.
            - Ensure the workload fits strictly within ${hoursPerDay} hours/day.
            - If the goal is vague, infer the best professional standard path.
            - Tasks should be concrete and start with verbs (e.g., "Design database", "Run ad campaign").
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Cleanup markdown if present
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const plan = JSON.parse(jsonStr);

        return NextResponse.json(plan);

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate plan" }, { status: 500 });
    }
}

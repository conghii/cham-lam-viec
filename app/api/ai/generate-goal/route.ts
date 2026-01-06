import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { goal, deadline, hoursPerDay, interviewContext } = await req.json();

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing GEMINI_API_KEY in environment" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
            You are a world-class Strategist, Project Manager, and Domain Expert.
            
            **USER GOAL**: "${goal}"
            **DEADLINE**: ${deadline}
            **DAILY BUDGET**: ${hoursPerDay} hours/day

            **INTERVIEW INSIGHTS (CONTEXT)**:
            ${interviewContext || "No additional context provided."}

            **YOUR MISSION**:
            1.  **Analyze the Domain**: Identify the specific field (e.g., "React Native Development", "Marathon Training").
            2.  **Strategic Breakdown**: Deconstruct the goal into a logical, phased roadmap suitable for the deadline, TAILORED to the interview insights.
            3.  **Proof of Work**: Define actionable "Key Results".

            **OUTPUT RULES**:
            - Return ONLY a valid JSON object.
            - No markdown formatting.
            - No preamble.
            
            **JSON SCHEMA**:
            {
                "phases": [
                    {
                        "title": "Phase Title",
                        "duration": "Duration",
                        "tasks": ["Action item 1", "Action item 2", "Action item 3"]
                    }
                ]
            }

            **CRITERIA**:
            - Generate 3-5 distinct phases.
            - Each phase should have 3-5 actionable tasks.
            - Ensure the workload fits strictly within ${hoursPerDay} hours/day.
            - Tasks should be concrete and start with verbs.
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

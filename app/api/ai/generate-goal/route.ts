import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { goal, deadline, hoursPerDay, interviewContext, deepDiveData, language } = await req.json();

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing GEMINI_API_KEY in environment" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

        let deepDiveContext = "";
        if (deepDiveData) {
            deepDiveContext = `
            **DEEP DIVE INTAKE**:
            - **Key Results**: ${deepDiveData.keyResults?.join(", ") || "N/A"}
            - **Domain**: ${deepDiveData.domain || "N/A"}
            - **Current Level**: ${deepDiveData.currentLevel || "Unknown"}
            - **Past Experience**: "${deepDiveData.pastExperience || "N/A"}"
            - **Weekly Availability**: ${JSON.stringify(deepDiveData.weeklyHours || {})}
            - **Blockers**: ${deepDiveData.blockers?.join(", ") || "None"}
            - **Additional Notes**: "${deepDiveData.brainDump || "None"}"
            `;
        }

        const targetLanguage = language === 'vi' ? 'Vietnamese (Tiếng Việt)' : 'English';

        const prompt = `
            You are a world-class Strategist, Project Manager, and Domain Expert.
            
            **USER GOAL**: "${goal}"
            **DEADLINE**: ${deadline}
            **DAILY BUDGET**: ${hoursPerDay} hours/day
            **OUTPUT LANGUAGE**: ${targetLanguage}

            **INTERVIEW INSIGHTS (CONTEXT)**:
            ${interviewContext || "No basic interview context."}

            ${deepDiveContext}

            **YOUR MISSION**:
            1.  **Analyze the Domain**: Identify the specific field (e.g., "React Native Development", "Marathon Training").
            2.  **Strategic Breakdown**: Deconstruct the goal into a logical, phased roadmap suitable for the deadline, TAILORED to the interview and deep dive insights.
            3.  **Proof of Work**: Define actionable "Key Results".
            4.  **Adapt to Level**: If the user is a Beginner, focus on fundamentals. If Advanced, focus on optimization.
            5.  **Respect Constraints**: Account for known blockers and availability.

            **IMPORTANT LANGUAGE RULE**:
            - THE TEXT CONTENT MUST BE IN ${targetLanguage}.
            - The JSON KEYS (like "phases", "title", "tasks") must remain in ENGLISH.
            - Only the VALUES should be in ${targetLanguage}.

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

        console.log("AI Response:", text); // Debugging

        // Robust JSON Extraction
        let jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();

        // If the AI included preamble text, search for the first '{' and last '}'
        const firstBrace = jsonStr.indexOf("{");
        const lastBrace = jsonStr.lastIndexOf("}");

        if (firstBrace !== -1 && lastBrace !== -1) {
            jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
        }

        try {
            const plan = JSON.parse(jsonStr);
            return NextResponse.json(plan);
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError, "Raw Text:", text);
            return NextResponse.json({
                error: "Failed to parse AI response",
                raw: text
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return NextResponse.json({
            error: error.message || "Failed to generate plan",
            details: error.toString()
        }, { status: 500 });
    }
}


import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { prompt, type } = await req.json();

        // Simulate AI Delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock Response Structure (This would eventually come from Gemini/OpenAI)
        // We return a hierarchical structure that the frontend will flatten into Nodes/Edges.
        const mockResponse = {
            root: {
                label: prompt || "Central Idea",
                children: [
                    {
                        label: "Key Concept 1",
                        children: [
                            { label: "Detail A" },
                            { label: "Detail B" }
                        ]
                    },
                    {
                        label: "Key Concept 2",
                        children: [
                            { label: "Strategy X" },
                            { label: "Strategy Y" }
                        ]
                    },
                    {
                        label: "Key Concept 3",
                        children: []
                    },
                    {
                        label: "Summary",
                        children: []
                    }
                ]
            }
        };

        return NextResponse.json(mockResponse);

    } catch (error) {
        console.error("AI Generation Error:", error);
        return NextResponse.json({ error: "Failed to generate mindmap" }, { status: 500 });
    }
}

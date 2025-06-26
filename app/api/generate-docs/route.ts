import type { NextRequest } from "next/server"
import { streamText } from "ai"
import { AIModel } from "@/lib/ai/model"

export async function POST(request: NextRequest) {
  try {
    const { repoData } = await request.json()

    const prompt = `Generate comprehensive documentation for this GitHub repository:

Repository Information:
- Name: ${repoData.name}
- Description: ${repoData.description || "No description provided"}
- Primary Language: ${repoData.language || "Not specified"}
- Stars: ${repoData.stars}
- File Count: ${repoData.fileCount}
- File Types: ${JSON.stringify(repoData.fileTypes)}
- Topics: ${repoData.topics?.join(", ") || "None"}
- License: ${repoData.license || "Not specified"}

${repoData.readme ? `Existing README:\n${repoData.readme}\n` : ""}

File Structure (top-level):
${repoData.contents?.map((item: any) => `- ${item.name} (${item.type})`).join("\n") || "No files found"}

Please generate a comprehensive documentation that includes:

1. **Project Overview** - Clear description of what the project does
2. **Features** - Key features and capabilities
3. **Installation** - Step-by-step installation instructions
4. **Usage** - How to use the project with examples
5. **API Documentation** - If applicable, document the main APIs/functions
6. **Configuration** - Configuration options and environment variables
7. **Contributing** - Guidelines for contributors
8. **License** - License information
9. **Troubleshooting** - Common issues and solutions

Format the documentation in clean Markdown with proper headers, code blocks, and examples. Make it professional and comprehensive but easy to understand.`

    const result = await streamText({
      model:AIModel,
      prompt,
      maxTokens: 4000,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("Error generating documentation:", error)
    return new Response("Failed to generate documentation", { status: 500 })
  }
}

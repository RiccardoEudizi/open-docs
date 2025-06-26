import { generateObject } from "ai"
import { z } from "zod"
import { AIModel } from "@/lib/ai/model"

const repoAnalysisSchema = z.object({
  projectType: z.string().describe("Type of project (web app, library, CLI tool, etc.)"),
  techStack: z.array(z.string()).describe("Technologies and frameworks used"),
  complexity: z.enum(["beginner", "intermediate", "advanced"]).describe("Project complexity level"),
  keyFeatures: z.array(z.string()).describe("Main features of the project"),
  suggestedSections: z.array(z.string()).describe("Recommended documentation sections"),
})

export async function POST(req: Request) {
  const { repoData } = await req.json()
  const parsedRepoData = JSON.parse(repoData)

  const { object } = await generateObject({
    model: AIModel,
    schema: repoAnalysisSchema,
    prompt: `Analyze this GitHub repository and provide structured insights:

Repository: ${parsedRepoData.fullName}
Description: ${parsedRepoData.description || "No description"}
Language: ${parsedRepoData.language || "Not specified"}
Stars: ${parsedRepoData.stars}
Topics: ${parsedRepoData.topics?.join(", ") || "None"}
File Types: ${JSON.stringify(parsedRepoData.fileTypes)}

File structure:
${
  parsedRepoData.contents
    ?.slice(0, 20)
    .map((item: any) => `- ${item.name} (${item.type})`)
    .join("\n") || "No files found"
}

${parsedRepoData.readme ? `README content:\n${parsedRepoData.readme.slice(0, 2000)}...` : "No README found"}

Provide a comprehensive analysis of this repository including project type, tech stack, complexity level, key features, and suggested documentation sections.`,
  })

  return Response.json({ object })
}

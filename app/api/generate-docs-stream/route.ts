import { streamText } from "ai";
import { AIModel } from "@/lib/ai/model";
import { type FileContent, getRepositoryData } from "@/lib/codebase";

export async function POST(req: Request) {
	const { repoAnalysis, repoData, repoUrl, accessToken } = await req.json();

	const headers: HeadersInit = {};
	if (accessToken) {
		headers.Authorization = `Bearer ${accessToken}`;
	}

	console.log(`Readme length: ${repoData.readme.length}`);

	let repoContent:
		| {
				fileContents: Map<string, FileContent>;
				structure: string;
		  }
		| undefined;
	let fullText = "";

	if (repoData.readme.length < 400) {
		const splitUrl = repoUrl.split("://");
		repoContent = await getRepositoryData(
			`${splitUrl[0]}://${accessToken}@${splitUrl[1]}`,
			headers,
		);
		fullText = repoContent?.fileContents
			.entries()
			.toArray()
			.map(
				(x) => `
================================================
 FILE: ${x[0]}
================================================
    ${x[1].content}
    `,
			)
			.join("\n\n");

		console.log(
			`Repository URL: ${repoUrl}. ${repoContent.fileContents.size} files.`,
		);
		console.log(repoContent.fileContents.keys().toArray().join(",\n"));
		
	}

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

${
	repoAnalysis
		? `
AI Analysis:
- Project Type: ${repoAnalysis.projectType}
- Tech Stack: ${repoAnalysis.techStack.join(", ")}
- Complexity: ${repoAnalysis.complexity}
- Key Features: ${repoAnalysis.keyFeatures.join(", ")}
- Suggested Sections: ${repoAnalysis.suggestedSections.join(", ")}
`
		: ""
}

${
	repoData.readme && repoData.readme.length > 400
		? `Existing README:\n${repoData.readme}\n`
		: `
Repository structure:
${repoContent?.structure}

Repository files content:
${fullText}
`
}

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

Do not assume any information about CLI usage, flags, Exported API's etc. Base your knowledge on what is present in the repository only.
Format the documentation in clean Markdown with proper headers, code blocks, and examples. Make it professional and comprehensive but easy to understand.
Do not include ${"```markdown"} tags at the start of the output.`;

	const result = streamText({
		model: AIModel,
		prompt,
		temperature: 0.2,
		maxTokens: 10000,
	});

	return result.toDataStreamResponse();
}

import type { NextRequest } from "next/server";
import { smoothStream, streamText, tool } from "ai";
import { z } from "zod";
import { AIModel } from "@/lib/ai/model";

export async function POST(request: NextRequest) {
	try {
		const req = await request.json();

		const { repoData, repoAnalysis } = req;
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

Format the documentation in clean Markdown with proper headers, code blocks, and examples. Make it professional and comprehensive but easy to understand.`;

		const result = streamText({
			toolCallStreaming: true,
			experimental_transform: smoothStream({ delayInMs: 30 }),
			model: AIModel,
			prompt: `${prompt}

Do not assume any information, if is not present, dont give info on CLI usage, Exported API's etc. Base your knowledge on what is present in the repository.

Use the available tools to analyze the repository structure and generate appropriate documentation sections.`,

			tools: {
				analyzeFileStructure: tool({
					description:
						"Analyze the file structure to understand project organization",
					parameters: z.object({
						fileTypes: z
							.record(z.number())
							.describe("File types and their counts"),
						language: z.string().describe("Primary programming language"),
					}),
					execute: async ({ fileTypes, language }) => {
						const analysis = {
							projectType:
								language === "JavaScript" || language === "TypeScript"
									? "Node.js/Web"
									: language === "Python"
										? "Python Application"
										: language === "Java"
											? "Java Application"
											: language === "Go"
												? "Go Application"
												: "General Software Project",
							hasTests: Object.keys(fileTypes).some((ext) =>
								[
									"test.js",
									"spec.js",
									"test.ts",
									"spec.ts",
									"test.py",
								].includes(ext),
							),
							hasConfig: Object.keys(fileTypes).some((ext) =>
								["json", "yaml", "yml", "toml", "ini"].includes(ext),
							),
							hasDocs: Object.keys(fileTypes).some((ext) =>
								["md", "rst", "txt"].includes(ext),
							),
						};
						return analysis;
					},
				}),

				generateInstallationSteps: tool({
					description: "Generate installation steps based on project type",
					parameters: z.object({
						language: z.string().describe("Programming language"),
						hasPackageManager: z
							.boolean()
							.describe("Whether project uses a package manager"),
					}),
					execute: async ({ language, hasPackageManager }) => {
						const steps = [];

						if (language === "JavaScript" || language === "TypeScript") {
							steps.push("1. Clone the repository: `git clone <repo-url>`");
							steps.push(
								"2. Navigate to project directory: `cd " + repoData.name + "`",
							);
							if (hasPackageManager) {
								steps.push(
									"3. Install dependencies: `npm install` or `yarn install`",
								);
								steps.push(
									"4. Start the application: `npm start` or `yarn start`",
								);
							}
						} else if (language === "Python") {
							steps.push("1. Clone the repository: `git clone <repo-url>`");
							steps.push(
								"2. Navigate to project directory: `cd " + repoData.name + "`",
							);
							steps.push(
								"3. Create virtual environment: `python -m venv venv`",
							);
							steps.push(
								"4. Activate virtual environment: `source venv/bin/activate` (Linux/Mac) or `venv\\Scripts\\activate` (Windows)",
							);
							steps.push(
								"5. Install dependencies: `pip install -r requirements.txt`",
							);
						} else {
							steps.push("1. Clone the repository: `git clone <repo-url>`");
							steps.push(
								"2. Navigate to project directory: `cd " + repoData.name + "`",
							);
							steps.push("3. Follow language-specific setup instructions");
						}

						return { steps };
					},
				}),

				createUsageExamples: tool({
					description: "Create usage examples based on project type",
					parameters: z.object({
						projectType: z.string().describe("Type of project"),
						language: z.string().describe("Programming language"),
					}),
					execute: async ({ projectType, language }) => {
						const examples = [];

						if (language === "JavaScript" || language === "TypeScript") {
							examples.push({
								title: "Basic Usage",
								code: `const ${repoData.name.replace(/-/g, "")} = require('${repoData.name}');\n\n// Example usage\nconsole.log('Hello from ${repoData.name}!');`,
							});
						} else if (language === "Python") {
							examples.push({
								title: "Basic Usage",
								code: `import ${repoData.name.replace(/-/g, "_")}\n\n# Example usage\nprint("Hello from ${repoData.name}!")`,
							});
						}

						return { examples };
					},
				}),
			},
			maxSteps: 5,
			maxTokens: 4000,
		});

		return result.toDataStreamResponse();
	} catch (error) {
		console.error("Error generating documentation:", error);
		return new Response("Failed to generate documentation", { status: 500 });
	}
}

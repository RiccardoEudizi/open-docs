import { streamText } from "ai";
import { AIModel } from "@/lib/ai/model";
import { FileContent, getRepositoryData } from "@/lib/codebase";

export async function POST(req: Request) {
	const { repoAnalysis, repoData, repoUrl, accessToken } = await req.json();
	const headers: HeadersInit = {};
	if (accessToken) {
		headers.Authorization = `Bearer ${accessToken}`;
	}

	let repoContent:
		| {
				fileContents: Map<string, FileContent>;
				structure: string;
		  }
		| undefined;
	let fullText = "";

	const splitUrl = repoUrl.split("://");
	repoContent = await getRepositoryData(
		`${splitUrl[0]}://${accessToken}@${splitUrl[1]}`,
		headers,
	);

	fullText = repoContent.fileContents
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
	console.log(`Readme length: ${repoData.readme.length}`);

	const result = streamText({
		model: AIModel,
		prompt: `Create a README.md file for this repository:
		 Repository structure:
		 ${repoContent.structure}
		 
		 Repository files content:
		 ${fullText}
		 
		 Do not include ${"```markdown"} tags at the start of the output.`,
		temperature: 0.2,
		maxTokens: 10000,
	});

	return result.toDataStreamResponse();
}

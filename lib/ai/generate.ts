import {
	smoothStream,
	streamText,
	type StreamTextResult,
	type ToolSet,
} from "ai";
import { AIModel } from "./model";
import {  parseTypeScriptApiAndStructure, parseTypeScriptCodeWithCompiler } from "../ast/parser";
import { getRepositoryData } from "../codebase";
import { createMainPrompt } from "./promptTemplate";
import type ts from "typescript";

export async function generateDoc(url: string) {
	const { fileContents, structure } = await getRepositoryData(url);

	const streams: Map<string, StreamTextResult<ToolSet, never>> = new Map();
	console.log(fileContents.size, structure);

	for (const [path, content] of fileContents) {
		console.log("INPUTS: ", url, path);

		let ast: ts.SourceFile | null = null;
		let ASTstring = "[]";
		if (
			path.endsWith(".ts") ||
			path.endsWith(".tsx") ||
			path.endsWith(".js") ||
			path.endsWith(".jsx")
		) {
			console.log("getting AST...");
			ast = parseTypeScriptCodeWithCompiler(content.content);
			ASTstring = parseTypeScriptApiAndStructure(ast as ts.SourceFile);
			
		}

		console.log("generating docs...");

		const prompt = createMainPrompt(
			url,
			path,
			structure,
			ASTstring !== "[]" ? ASTstring : content.content,
		);

		const result = streamText({
			model: AIModel,
			experimental_transform: smoothStream({
				delayInMs: 30, // optional: defaults to 10ms
				chunking: "line", // optional: defaults to 'word'
			}),
			// schema: z.object({ documentation: z.string({ description: "the documentation for the code" }) }),
			prompt,
			temperature: 0.5,
			topP: 0.95,
		});
		streams.set(path, result);
	}

	//const finalDocs = FormatDocumentation(fullDocumentation);

	return streams;
}

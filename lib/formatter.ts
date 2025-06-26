const thinkingSeparator = "</think>";

/**
 * Formats documentation extracted during a middle step, typically before final processing.
 * Removes the "thinking" part based on a separator.
 *
 * @param docs A map where keys are file paths and values are the documentation strings.
 * @returns A formatted string with each document preceded by its file path.
 */
export function FormatDocsMiddleStep(docs: Record<string, string>): string {
	let output = "";
	for (const filePath in docs) {
		if (Object.hasOwn(docs, filePath)) {
			const doc = docs[filePath];
			const formattedDoc = FormatThinkingResponse(doc);
			output += `### *${filePath}*\n${formattedDoc}\n\n---\n\n`;
		}
	}
	return output;
}

/**
 * Removes the "thinking" part from a response string based on a defined separator.
 *
 * @param response The input string which may contain a "thinking" section.
 * @returns The string content after the thinking separator, or the original string if the separator is not found.
 */
export function FormatThinkingResponse(response: string): string {
	const thinkIndex = response.indexOf(thinkingSeparator);

	if (thinkIndex < 0) {
		return response;
	}
	// Return the part of the string after the separator, trimming leading/trailing whitespace
	return response.substring(thinkIndex + thinkingSeparator.length).trim();
}

/**
 * Generates a URL-friendly anchor string from a file path.
 * Replaces non-alphanumeric characters with hyphens and converts to lowercase.
 *
 * @param filePath The file path to generate an anchor from.
 * @returns A URL-friendly anchor string.
 */
function generateAnchor(filePath: string): string {
	let anchor = filePath.replace(/[^a-zA-Z0-9]+/g, "-");
	anchor = anchor.toLowerCase();
	return anchor;
}

/**
 * Formats the generated documentation into a Markdown string with a table of contents.
 *
 * @param documentation A map where keys are file paths and values are the documentation strings.
 * @returns A formatted Markdown string.
 */
export function FormatDocumentation(
	documentation: Record<string, string>,
): string {
	const formattedDate = new Date().toUTCString();
	let output = `# Project Documentation - ${formattedDate}\n\n`;
	output += "## Table of Contents\n\n";

	const sortedKeys = Object.keys(documentation).sort();

	// Generate table of contents
	for (const filePath of sortedKeys) {
		const anchor = generateAnchor(filePath);
		output += `- [${filePath}](#${anchor})\n`;
	}

	output += "\n---\n\n";

	// Generate documentation content
	for (const filePath of sortedKeys) {
		const docs = documentation[filePath];

		const formattedDocs = FormatThinkingResponse(docs);

		output += `### *${filePath}*\n${formattedDocs}\n\n---\n\n`;
	}

	return output;
}

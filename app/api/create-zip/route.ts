import { type NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { FormatDocumentation } from "@/lib/formatter";

export async function POST(request: NextRequest) {
	try {
		const { documentation, repoInfo } = await request.json();
		const zip = new JSZip();

		if (Array.isArray(documentation)) {
			for (const { path, content } of documentation) {
				zip.file(`${path}.md`, content);
			}
		} else {
			// Add main documentation file
			zip.file("README.md", documentation);
		}

		let fullDocumentation: Record<string, string> = {};

		for (const doc of documentation) {
			fullDocumentation = {
				...fullDocumentation,
				...{ [doc.path]: doc.content },
			};
		}
		zip.file("full_docs.md", FormatDocumentation(fullDocumentation));
		// Add additional files
		zip.file("project-info.json", JSON.stringify(repoInfo, null, 2));

		// Create a simple package.json if it's a JavaScript project
		if (
			repoInfo.language === "JavaScript" ||
			repoInfo.language === "TypeScript"
		) {
			const packageJson = {
				name: repoInfo.name,
				version: "1.0.0",
				description: repoInfo.description || "",
				main: "index.js",
				scripts: {
					start: "node index.js",
					test: 'echo "Error: no test specified" && exit 1',
				},
				keywords: repoInfo.topics || [],
				license: repoInfo.license || "ISC",
			};
			zip.file("package.json", JSON.stringify(packageJson, null, 2));
		}

		// Add a simple getting started guide
		const gettingStarted = `# Getting Started with ${repoInfo.name}

This documentation package was generated automatically for the repository: ${repoInfo.fullName}

## Contents

- \`README.md\` - Complete project documentation
- \`project-info.json\` - Repository metadata
${repoInfo.language === "JavaScript" || repoInfo.language === "TypeScript" ? "- `package.json` - Node.js package configuration" : ""}

## Repository Statistics

- **Language**: ${repoInfo.language || "Not specified"}
- **Stars**: ${repoInfo.stars}
- **Forks**: ${repoInfo.forks}
- **File Count**: ${repoInfo.fileCount}
- **Last Updated**: ${new Date(repoInfo.updatedAt).toLocaleDateString()}

Generated on: ${new Date().toISOString()}
`;

		zip.file("GETTING_STARTED.md", gettingStarted);

		// Generate the ZIP file
		const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

		return new Response(zipBuffer, {
			headers: {
				"Content-Type": "application/zip",
				"Content-Disposition": `attachment; filename="${repoInfo.name}-docs.zip"`,
			},
		});
	} catch (error) {
		console.error("Error creating ZIP:", error);
		return NextResponse.json(
			{ error: "Failed to create ZIP file" },
			{ status: 500 },
		);
	}
}

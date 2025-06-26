import * as path from "node:path";
import * as os from "node:os";
import { clone, TREE, walk, listFiles } from "isomorphic-git";
import http from "isomorphic-git/http/node/index.js"; // Use the node HTTP plugin
import fs from "node:fs";
import { Buffer } from "node:buffer"; // Needed for file content

// Define the equivalent of the Go struct FileContent
export interface FileContent {
	path: string;
	content: string;
}

// Define constants
const defaultIgnorePatterns = `
    ui
    node_modules/
    .git
    dist/
    build/
    coverage/
    .log$
    .env$
    .lock$
    .md$
    .min.js$
    package-lock.json
	.vscode
    .editorconfig
    .gitignore
    license
	LICENSE
    tsconfig.json
    .dockerignore
	tailwind.config.ts

`; // Trim space and split by newline later

const supportedExtensions =
	".js .json .ts .jsx .tsx .py .java .cpp .rb .php .go .rs .swift .cs";

// Define the equivalent of the Go map fileTypePrefixes
const fileTypePrefixes: { [key: string]: string } = {
	".ts": "```typescript",
	".tsx": "```typescript",
	".js": "```javascript",
	".jsx": "```javascript",
	".java": "```java",
	".c": "```c",
	".cpp": "```c++",
	".cs": "```csharp",
	".go": "```go",
	".py": "```python",
	".rb": "```ruby",
	".sh": "```bash",
	".md": "```markdown",
	".json": "```json",
	".yaml": "```yaml",
	".html": "```html",
	".css": "```css",
	".sql": "```sql",
};

function addMarkdownPrefix(filename: string): string {
	const ext = path.extname(filename);
	const prefix = fileTypePrefixes[ext] || "```";
	return `${prefix}\n`;
}

function addMarkdownSuffix(filename: string): string {
	const ext = path.extname(filename);
	const suffix = fileTypePrefixes[ext] || "```";
	return `\n${suffix}`;
}

function isSupportedExtension(filename: string): boolean {
	const ext = path.extname(filename);
	return supportedExtensions.split(" ").includes(ext);
}

/**
 * Parses ignore patterns into a RegExp.
 * @param patterns - A string containing ignore patterns separated by newlines.
 * @returns A RegExp object to test against file paths.
 */
function parseIgnorePatterns(patterns: string) {
	const ignorePatterns = patterns
		.split("\n")
		.map((line) => line.trim().replace("\t", ""))
		.filter((line) => line !== "" && !line.startsWith("#")); // Basic comment handling

	if (ignorePatterns.length === 0) {
		return /(?:)/; // Match nothing if no patterns
	}

	// Convert gitignore patterns to regex. This is a simplified conversion.
	const regexps = ignorePatterns.map((pattern) => {
		let regex = pattern
			.replace(/[.+?^${}()|[\]\\]/g, "\\$&") // Escape regex metacharacters
			.replace(/\*\*/g, ".*") // Support **
			.replace(/\*/g, "[^/]*"); // Support *

		// Anchor to the start if pattern doesn't start with /
		if (!pattern.startsWith("/")) {
			regex = `(^|/)${regex}`;
		} else {
			regex = `^${regex.substring(1)}`; // Remove leading / and anchor to start
		}

		// Anchor to the end if pattern ends with /
		if (pattern.endsWith("/")) {
			regex += "($|/)";
		} else {
			regex += "$"; // Anchor to the end for files
		}

		return `(${regex})`; // Group each pattern
	});

	const finalRegex = regexps.join("|");
	try {
		return ignorePatterns; //return new RegExp(finalRegex);
	} catch (e) {
		console.error("Error creating regex from ignore patterns:", finalRegex, e);
		// Fallback to a regex that matches nothing if parsing fails
		return /^$/;
	}
}

/**
 * Walks the Git tree recursively and collects file contents based on ignore patterns and supported extensions.
 * @param git - The isomorphic-git instance.
 * @param dir - The directory path of the repository (needed by isomorphic-git).
 * @param commitOid - The OID of the commit tree to walk.
 * @param fileContents - The map to store file contents.
 * @param ignorePatterns - The compiled RegExp for ignore patterns.
 * @param currentPath - The current path within the tree being walked (for recursion).
 * @returns A Promise that resolves when the walk is complete.
 */
async function walkTree(
	dir: string,
	commitOid: string,
	fileContents: Map<string, FileContent>,
	ignorePatterns: RegExp | string[],
	currentPath = "",
): Promise<void> {
	// Use isomorphic-git's walk function
	await walk({
		fs, // the temporary directory
		gitdir: path.join(dir, ".git"), // Path to the .git directory

		// Define the working tree
		trees: [TREE({ ref: commitOid })],
		// Define the callback for visiting entries
		map: async (filepath, entries) => {
			// Ignore the root directory entry itself if filepath is empty string
			if (!filepath) {
				return;
			}

			const [entry] = entries;
			if (!entry) {
				// This case might happen for directories already processed, skip
				return;
			}
			const fullPath = currentPath
				? path.join(currentPath, filepath)
				: filepath;

			// Check against ignore patterns and supported extensions
			if (Array.isArray(ignorePatterns)) {
				for (const pattern of ignorePatterns) {
					if (fullPath.includes(pattern.replace("$", "")) || !isSupportedExtension(fullPath)) {
						return;
					}
				}
			} else if (
				ignorePatterns.test(fullPath) ||
				!isSupportedExtension(fullPath)
			) {
				console.log(`skipping: ${fullPath}. Unsupported extension`);

				return; // Skip ignored or unsupported files/directories
			}

			if (
				fullPath.includes("examples") ||
				fullPath.includes("example") ||
				fullPath.includes("tests") ||
				fullPath.includes("test")
			) {
				return;
			}

			const type = await entry.type();

			if (type === "blob" && fileContents.size < 11) {
				const content = Buffer.from(
					(await entry.content()) as Uint8Array,
				).toString("utf8");

				const formattedContent =
					addMarkdownPrefix(filepath) + content + addMarkdownSuffix(filepath);

				fileContents.set(fullPath, {
					path: fullPath,
					content: formattedContent,
				});
			} else if (type === "tree") {
				return true; // Return true to continue walking this tree
			}

			return; // For blobs, return nothing after processing
		},
	});
}

/**
 * Generates a string representation of the repository structure.
 * @param git - The isomorphic-git instance.
 * @param dir - The directory path of the repository.
 * @param commitOid - The OID of the commit tree to structure.
 * @returns A Promise that resolves with the repository structure string.
 */
export async function getRepositoryStructure(
	dir: string,
	commitOid: string,
): Promise<string> {
	let structure = "";

	// Use isomorphic-git's walk function to traverse the tree
	await walk({
		fs, // The file system to use
		gitdir: path.join(dir, ".git"), // Path to the .git directory

		trees: [TREE({ ref: commitOid })],
		// Define the callback for visiting entries
		map: async (filepath, entries) => {
			// Ignore the root directory entry
			if (!filepath) {
				return;
			}

			const [entry] = entries;
			if (!entry) {
				return;
			}

			const type = await entry.type();

			// Calculate indentation level based on path depth
			const indentLevel = filepath.split("/").length - 1;
			const spaces = "  ".repeat(indentLevel); // Use 2 spaces for indentation

			if (type === "tree") {
				structure += `${spaces}- ${filepath} (directory)\n`;
				return true; // Return true to continue walking this tree
			}
			if (type === "blob") {
				structure += `${spaces}- ${filepath} (file)\n`;
				return; // Return nothing for blobs after processing
			}
			structure += `${spaces}- ${filepath} (unknown)\n`;
			return; // Return nothing for other types
		},
	});

	return structure;
}

/**
 * Clones a repository and returns its file contents and structure.
 * @param url - The repository URL.
 * @param branch - The branch name (optional, defaults to HEAD).
 * @returns A Promise that resolves with an object containing file contents and the repository structure string.
 */
export async function getRepositoryData(
	url: string,
	headers: { [key: string]: string } = {},
	branch = "HEAD",
): Promise<{ fileContents: Map<string, FileContent>; structure: string }> {
	const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "repo-clone-")); // Create a temporary directory

	try {
		// Clone the repository
		await clone({
			fs, // The file system to use
			http, // The HTTP client
			dir, // The directory to clone into
			url, // The repository URL

			headers,
			singleBranch: branch !== "", // Optimize by fetching only the specified branch
			depth: 1, // Clone only the latest commit for efficiency
			//ref: branch || "HEAD", // Specify the branch or use HEAD
			onProgress: (progress) => {
				console.log(
					"clone progress:",
					progress.phase,
					progress.loaded,
					progress.total,
				);
			},
		});
		// let br = await listBranches({
		// 	fs,
		// 	dir,
		// });
		// console.log("BRANCH", br);
		// Get the commit OID for the specified branch or HEAD
		const commitOid = await listFiles({
			fs,

			gitdir: path.join(dir, ".git"),
			ref: branch || "HEAD",
		});

		if (commitOid.length === 0) {
			throw new Error(`Could not find commit for branch: ${branch || "HEAD"}`);
		}

		const fileContents = new Map<string, FileContent>();
		const ignorePatterns = parseIgnorePatterns(defaultIgnorePatterns);

		// Walk the tree and collect file contents
		await walkTree(dir, branch, fileContents, ignorePatterns);

		// Get the repository structure
		const structure = await getRepositoryStructure(dir, branch);

		return { fileContents, structure };
	} catch (error: any) {
		console.error("Error getting repository data:", error);
		throw new Error(`Failed to get repository data: ${error.message}`);
	} finally {
		// Clean up the temporary directory
		try {
			await fs.promises.rm(dir, { recursive: true, force: true });
		} catch (cleanupError) {
			console.error("Error cleaning up temporary directory:", cleanupError);
		}
	}
}

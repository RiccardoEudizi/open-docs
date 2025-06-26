import { type NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { AIModel } from "@/lib/ai/model";

const repoAnalysisSchema = z.object({
	projectType: z
		.string()
		.describe("Type of project (web app, library, CLI tool, etc.)"),
	techStack: z.array(z.string()).describe("Technologies and frameworks used"),
	complexity: z
		.enum(["beginner", "intermediate", "advanced"])
		.describe("Project complexity level"),
	keyFeatures: z.array(z.string()).describe("Main features of the project"),
	suggestedSections: z
		.array(z.string())
		.describe("Recommended documentation sections"),
});
interface GitHubTreeItem {
	path: string;
	mode: string;
	type: "blob" | "tree" | "commit";
	sha: string;
	size?: number; // Present for blobs
	url: string;
}

interface GitHubTreeResponse {
	sha: string;
	url: string;
	tree: GitHubTreeItem[];
	truncated?: boolean; // Indicates if the response was truncated due to size limits
}

interface GitHubBranchResponse {
	name: string;
	commit: {
		sha: string;
		url: string;
	};
	// ... other branch properties
}

export async function POST(request: NextRequest) {
	try {
		const { repoUrl, accessToken } = await request.json();

		const headers: HeadersInit = {};
		if (accessToken) {
			headers.Authorization = `Bearer ${accessToken}`;
		}
		
		// Extract owner and repo from GitHub URL
		const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
		if (!match) {
			return NextResponse.json(
				{ error: "Invalid GitHub URL" },
				{ status: 400 },
			);
		}

		const [, owner, repo] = match;
		const cleanRepo = repo.replace(".git", "");

		// Fetch repository information from GitHub API
		const repoResponse = await fetch(
			`https://api.github.com/repos/${owner}/${cleanRepo}`,{headers}
		);
		if (!repoResponse.ok) {
			return NextResponse.json(
				{ error: "Repository not found" },
				{ status: 404 },
			);
		}

		const repoData = await repoResponse.json();

		// Fetch repository contents
		const contentsResponse = await fetch(
			`https://api.github.com/repos/${owner}/${cleanRepo}/contents`,{headers}
		);
		const contents = contentsResponse.ok ? await contentsResponse.json() : [];

		// Fetch README if it exists
		let readme = "";
		try {
			const readmeResponse = await fetch(
				`https://api.github.com/repos/${owner}/${cleanRepo}/readme`,{headers}
			);
			if (readmeResponse.ok) {
				const readmeData = await readmeResponse.json();
				readme = Buffer.from(readmeData.content, "base64").toString("utf-8");
			}
		} catch (error) {
			console.log("No README found");
		}

		// Analyze file structure
		const fileTypes = new Map();
		let totalFiles = 0;

		const analyzeContents = async (items: any[]) => {
			const tot_headers: HeadersInit = {
				Accept: "application/vnd.github+json",
				...headers
			};

			const defaultBranch = repoData.default_branch;
			console.log(`Default branch for ${owner}/${repo}: ${defaultBranch}`);

			// --- STEP 2: Get the SHA of the default branch's head commit ---
			const branchUrl = `https://api.github.com/repos/${owner}/${repo.replace(
				".git",
				"",
			)}/branches/${defaultBranch}`;
			const branchResponse = await fetch(branchUrl, { headers:tot_headers });
			if (!branchResponse.ok) {
				console.error(
					`Error fetching branch info for '${defaultBranch}': ${branchResponse.statusText}${branchUrl}`,
				);
				return;
			}
			const branchData: GitHubBranchResponse = await branchResponse.json();
			const commitSha = branchData.commit.sha;
			console.log(
				`Found head commit SHA for branch '${defaultBranch}': ${commitSha}`,
			);

			// --- STEP 3: Get the recursive tree for that commit SHA ---
			const treeUrl = `https://api.github.com/repos/${owner}/${repo.replace(
				".git",
				"",
			)}/git/trees/${commitSha}?recursive=1`;
			const treeResponse = await fetch(treeUrl, { headers:tot_headers });
			if (!treeResponse.ok) {
				console.error(`Error fetching tree: ${treeResponse.statusText}`);
				return;
			}
			const treeData: GitHubTreeResponse = await treeResponse.json();

			if (treeData.truncated) {
				console.warn(
					"Warning: The tree response was truncated. Not all files may be included.",
				);
				// For very large repos, you'd need to implement a non-recursive fetch
				// and then traverse each 'tree' item individually, making more API calls.
			}

			// --- STEP 4: Analyze the tree items ---
			treeData.tree.forEach((item: GitHubTreeItem) => {
				if (item.type === "blob") {
					// 'blob' type indicates a file
					totalFiles++;
					const ext = item.path.split(".").pop()?.toLowerCase() || "no-ext";
					fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
				}
			});
		};

		if (Array.isArray(contents)) {
			analyzeContents(contents);
		}

		// Use AI to analyze the repository
		let analysis = null;
		try {
			const { object } = await generateObject({
				model: AIModel,
				schema: repoAnalysisSchema,
				prompt: `Analyze this GitHub repository and provide insights:

Repository: ${repoData.full_name}
Description: ${repoData.description || "No description"}
Language: ${repoData.language || "Not specified"}
Stars: ${repoData.stargazers_count}
Topics: ${repoData.topics?.join(", ") || "None"}

File structure:
${contents
	.slice(0, 20)
	.map((item: any) => `- ${item.name} (${item.type})`)
	.join("\n")}

${readme ? `README content:\n${readme.slice(0, 2000)}...` : "No README found"}

Provide a comprehensive analysis of this repository including project type, tech stack, complexity level, key features, and suggested documentation sections.`,
			});
			analysis = object;
		} catch (error) {
			console.error("AI analysis failed:", error);
			// Continue without AI analysis if it fails
		}

		const result = {
			name: repoData.name,
			fullName: repoData.full_name,
			description: repoData.description,
			language: repoData.language,
			stars: repoData.stargazers_count,
			forks: repoData.forks_count,
			size: `${(repoData.size / 1024).toFixed(2)} MB`,
			fileCount: totalFiles,
			fileTypes: Object.fromEntries(fileTypes),
			readme,
			contents: contents.slice(0, 20),
			topics: repoData.topics || [],
			license: repoData.license?.name,
			createdAt: repoData.created_at,
			updatedAt: repoData.updated_at,
			analysis, // AI-generated analysis (may be null if failed)
		};

		return NextResponse.json(result);
	} catch (error) {
		console.error("Error analyzing repository:", error);
		return NextResponse.json(
			{ error: "Failed to analyze repository" },
			{ status: 500 },
		);
	}
}

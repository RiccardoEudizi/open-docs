import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const { repoUrl,accessToken } = await request.json();
    
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
			`https://api.github.com/repos/${owner}/${cleanRepo}`,
			{ headers },
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
			`https://api.github.com/repos/${owner}/${cleanRepo}/contents`,
			{ headers },
		);
		const contents = contentsResponse.ok ? await contentsResponse.json() : [];

		// Fetch README if it exists
		let readme = "";
		try {
			const readmeResponse = await fetch(
				`https://api.github.com/repos/${owner}/${cleanRepo}/readme`,
				{ headers },
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

		const analyzeContents = (items: any[]) => {
			items.forEach((item) => {
				if (item.type === "file") {
					totalFiles++;
					const ext = item.name.split(".").pop()?.toLowerCase() || "no-ext";
					fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
				}
			});
		};

		if (Array.isArray(contents)) {
			analyzeContents(contents);
		}

		const result = {
			name: repoData.name,
			fullName: repoData.full_name,
			description: repoData.description,
			language: repoData.language,
			stars: repoData.stargazers_count,
			forks: repoData.forks_count,
			size: `${Math.round(repoData.size / 1024)} MB`,
			fileCount: totalFiles,
			fileTypes: Object.fromEntries(fileTypes),
			readme,
			contents: contents.slice(0, 20), // Limit to first 20 items
			topics: repoData.topics || [],
			license: repoData.license?.name,
			createdAt: repoData.created_at,
			updatedAt: repoData.updated_at,
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	FileText,
	Archive,
	Terminal,
	GitBranch,
	Loader2,
	AlertCircle,
} from "lucide-react";
import { MemoizedMarkdown as Markdown } from "@/components/markdown";
import "@/styles/markdown.css";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface RepoAnalysis {
	projectType: string;
	techStack: string[];
	complexity: "beginner" | "intermediate" | "advanced";
	keyFeatures: string[];
	suggestedSections: string[];
}

export default function Component() {
	const [repoUrl, setRepoUrl] = useState("");
	const [accessToken, setAccessToken] = useState("");
	const [repoInfo, setRepoInfo] = useState<any>(null);
	const [repoAnalysis, setRepoAnalysis] = useState<RepoAnalysis | null>(null);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [analysisError, setAnalysisError] = useState("");
	const [developerMode, setDeveloperMode] = useState(false);
	const [apiUrl, setApiUrl] = useState("/api/generate-docs-stream");

	const pathMap = useRef(new Map());

	useEffect(() => {
		setAccessToken(localStorage.getItem("accessToken") || "");
	}, []);

	// AI SDK hook for documentation generation
	const url = useMemo(
		() => (developerMode ? "/api/generate-docs-core" : apiUrl),
		[developerMode, apiUrl],
	);

	const {
		handleSubmit: generateDocs,
		messages,
		setMessages,
		status: isGenerating,
		data: generationData,
		setData,
		error: generationError,
		stop: stopGeneration,
	} = useChat({
		api: url,
	});

	const handleAnalyzeRepo = async () => {
		if (!repoUrl.trim()) return;

		setIsAnalyzing(true);
		setAnalysisError("");
		setRepoInfo(null);
		setRepoAnalysis(null);
		pathMap.current = new Map();
		setData(undefined);
		setMessages([]);

		try {
			// Get repository info and AI analysis
			const repoResponse = await fetch("/api/analyze-repo-detailed", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ repoUrl, accessToken }),
			});

			if (!repoResponse.ok) {
				throw new Error("Failed to analyze repository");
			}

			const repoData = await repoResponse.json();
			setRepoInfo(repoData);

			if (repoData.analysis) {
				setRepoAnalysis(repoData.analysis);
			}
		} catch (error) {
			console.error("Error:", error);
			setAnalysisError(
				error instanceof Error ? error.message : "Failed to analyze repository",
			);
		} finally {
			setIsAnalyzing(false);
		}
	};

	const handleGenerateDocs = async () => {
		if (!repoInfo) return;
		pathMap.current = new Map();
		setData(undefined);
		setMessages([]);
		if (developerMode) {
			generateDocs(
				{},
				{ body: { repoUrl, accessToken }, allowEmptySubmit: true },
			);
		} else {
			generateDocs(
				{},
				{
					body: { repoAnalysis, repoData: repoInfo, repoUrl, accessToken },
					allowEmptySubmit: true,
				},
			);
		}
	};

	const handleDownloadMarkdown = () => {
		const documentation = developerMode
			? Array.from(pathMap.current.entries())
					.map(
						([path, content]) => `**-----------------------------**
. **File: ${path}**
**-----------------------------**
---
${content}
           ---`,
					)
					.join("\n\n")
			: messages.map((message) => message.content).join("");

		if (!documentation) return;

		const blob = new Blob([documentation], { type: "text/markdown" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${repoInfo?.name || "documentation"}.md`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const handleDownloadZip = async () => {
		const documentation = developerMode
			? Array.from(pathMap.current.entries()).map(([path, content]) => ({
					path,
					content,
				}))
			: messages.map((message) => ({
					path: repoInfo.name,
					content: message.content,
				}));

		if (!documentation || documentation.length === 0 || !repoInfo) return;

		try {
			const response = await fetch("/api/create-zip", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ documentation, repoInfo }),
			});

			if (!response.ok) throw new Error("Failed to create ZIP");

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${repoInfo.name}-docs.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Error creating ZIP:", error);
		}
	};

	const hasError = analysisError || generationError;

	useEffect(() => {
		const data = generationData?.[generationData?.length - 1] as any;
		if (data?.type && data?.type === "chunk") {
			const text = (pathMap.current.get(data.path) ?? "") + data.text;

			pathMap.current.set(data.path, text);
			const element = document.getElementById(
				data.path,
			) as HTMLDivElement | null;
			element?.append(data.text);
		}
	}, [generationData]);

	function saveAccessToken(accessToken: string) {
		setAccessToken(accessToken);
		localStorage.setItem("accessToken", accessToken);
	}

	return (
		<div className="min-h-screen  bg-black text-white font-mono">
			{/* Header */}
			<div className="border-b border-white/20 bg-black">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center gap-3">
						<Terminal className="h-6 w-6" />
						<h1 className="text-xl font-bold tracking-tight">OPEN-DOCS</h1>
						<Badge
							variant="outline"
							className="border-white/20 text-white/70 font-mono text-xs"
						>
							v2.0.0
						</Badge>
					</div>
					<p className="text-white/60 text-sm mt-1 font-mono">
						AI-powered repository documentation generator
					</p>
				</div>
			</div>

			<div className="container mx-auto px-4 py-8 max-w-6xl ">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 ">
					{/* Input Section */}
					<div className=" flex-col flex-1 space-y-6  ">
						<Card className="bg-black border-white/20">
							<CardHeader className="border-b border-white/10">
								<CardTitle className="flex items-center gap-2 font-mono text-white">
									<GitBranch className="h-4 w-4" />
									REPOSITORY INPUT
									{process.env.NEXT_PUBLIC_IS_DEMO !== "1" && (
										<div className="flex ml-auto items-center space-x-2">
											<Switch
												onCheckedChange={(mode) => {
													// setData(undefined);
													// setMessages([]);
													setDeveloperMode(mode);
												}}
												checked={developerMode}
											/>
											<Label htmlFor="developer-mode">Developer Mode</Label>
										</div>
									)}
								</CardTitle>
							</CardHeader>
							<CardContent className="p-6 space-y-4">
								<div className="space-y-2">
									<label
										htmlFor="url"
										className="text-sm font-mono text-white/80 uppercase tracking-wide"
									>
										Git Repository URL
									</label>
									<Input
										name="url"
										value={repoUrl}
										onChange={(e) => setRepoUrl(e.target.value)}
										placeholder="https://github.com/username/repository"
										className="bg-black border-white/20 text-white font-mono focus:border-white/40 focus:ring-0"
										disabled={isAnalyzing}
									/>
								</div>
								<div className="space-y-2">
									<label
										htmlFor="token"
										className="text-sm font-mono text-white/80 uppercase tracking-wide"
									>
										GitHub Access Token
									</label>
									<Input
										name="token"
										value={accessToken}
										onChange={(e) => saveAccessToken(e.target.value)}
										placeholder="your_token"
										className="bg-black border-white/20 text-white font-mono focus:border-white/40 focus:ring-0"
										disabled={isAnalyzing}
									/>
								</div>

								<Button
									onClick={handleAnalyzeRepo}
									disabled={!repoUrl.trim() || isAnalyzing}
									className="w-full bg-white text-black hover:bg-white/90 font-mono font-bold tracking-wide"
								>
									{isAnalyzing ? (
										<>
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											ANALYZING...
										</>
									) : (
										"ANALYZE REPOSITORY"
									)}
								</Button>

								{repoInfo && (
									<div className="flex ">
										<Button
											onClick={() => {
												setApiUrl("/api/generate-docs-stream");
												handleGenerateDocs();
											}}
											disabled={
												isGenerating === "submitted" ||
												isGenerating === "streaming"
											}
											variant="outline"
											className="w-full border-white/20 text-white hover:bg-white/10 font-mono"
										>
											{(isGenerating === "submitted" ||
												isGenerating === "streaming") &&
											apiUrl === "/api/generate-docs-stream" ? (
												<>
													<Loader2 className="h-4 w-4 mr-2 animate-spin" />
													GENERATING DOCS...
												</>
											) : (
												"GENERATE DOCUMENTATION"
											)}
										</Button>
										{/* <Button
											onClick={() => {
												setApiUrl("/api/generate-readme");
												handleGenerateDocs();
											}}
											disabled={
												isGenerating === "submitted" ||
												isGenerating === "streaming"
											}
											variant="outline"
											className="w-full border-white/20 text-white hover:bg-white/10 font-mono"
										>
											{(isGenerating === "submitted" ||
												isGenerating === "streaming") &&
											apiUrl === "/api/generate-readme" ? (
												<>
													<Loader2 className="h-4 w-4 mr-2 animate-spin" />
													GENERATING README...
												</>
											) : (
												"GENERATE README"
											)}
										</Button> */}
									</div>
								)}

								{isGenerating === "submitted" ||
									(isGenerating === "streaming" && (
										<Button
											onClick={stopGeneration}
											variant="outline"
											className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 font-mono"
										>
											STOP GENERATION
										</Button>
									))}

								{hasError && (
									<div className="border border-red-500/20 p-3 bg-red-500/5">
										<div className="flex items-center gap-2">
											<AlertCircle className="h-4 w-4 text-red-400" />
											<p className="text-sm font-mono text-red-400">
												{analysisError ||
													generationError?.message ||
													"An error occurred"}
											</p>
										</div>
									</div>
								)}

								<div className="grid grid-cols-3 sm:grid-cols-6  gap-3">
									<Button
										onClick={() =>
											setRepoUrl("https://github.com/dotenvx/dotenvx.git")
										}
										variant="outline"
										className="border-white/20 text-white/70 font-mono text-xs "
									>
										dotenvx
									</Button>
									<Button
										onClick={() =>
											setRepoUrl("https://github.com/vercel/next.js.git")
										}
										variant="outline"
										className="border-white/20 text-white/70 font-mono text-xs"
									>
										Next js
									</Button>
									<Button
										onClick={() =>
											setRepoUrl("https://github.com/honojs/hono.git")
										}
										variant="outline"
										className="border-white/20 text-white/70 font-mono text-xs"
									>
										Hono
									</Button>
									<Button
										onClick={() =>
											setRepoUrl("https://github.com/vitejs/vite.git")
										}
										variant="outline"
										className="border-white/20 text-white/70 font-mono text-xs"
									>
										Vite
									</Button>
									<Button
										onClick={() =>
											setRepoUrl("https://github.com/vercel/ai.git")
										}
										variant="outline"
										className="border-white/20 text-white/70 font-mono text-xs"
									>
										AI SDK
									</Button>
								</div>
							</CardContent>
						</Card>

						{/* Repository Info */}
						{repoInfo && (
							<Card className="bg-black border-white/20">
								<CardHeader className="border-b border-white/10">
									<CardTitle className="font-mono text-white">
										REPOSITORY INFO
									</CardTitle>
								</CardHeader>
								<CardContent className="p-6 space-y-3">
									<div className="grid grid-cols-2 gap-4 text-sm font-mono">
										<div>
											<span className="text-white/60">NAME:</span>
											<p className="text-white">{repoInfo.name}</p>
										</div>
										<div>
											<span className="text-white/60">LANGUAGE:</span>
											<p className="text-white">{repoInfo.language || "N/A"}</p>
										</div>
										<div>
											<span className="text-white/60">FILES:</span>
											<p className="text-white">{repoInfo.fileCount}</p>
										</div>
										<div>
											<span className="text-white/60">SIZE:</span>
											<p className="text-white">{repoInfo.size}</p>
										</div>
									</div>
								</CardContent>
							</Card>
						)}

						{/* AI Analysis */}
						{repoAnalysis && (
							<Card className="bg-black border-white/20">
								<CardHeader className="border-b border-white/10">
									<CardTitle className="font-mono text-white">
										AI ANALYSIS
									</CardTitle>
								</CardHeader>
								<CardContent className="p-6 space-y-3">
									<div className="space-y-3 text-sm font-mono">
										<div>
											<span className="text-white/60">PROJECT TYPE:</span>
											<p className="text-white">{repoAnalysis.projectType}</p>
										</div>
										<div>
											<span className="text-white/60">COMPLEXITY:</span>
											<Badge
												variant="outline"
												className={`ml-2 font-mono text-xs ${
													repoAnalysis.complexity === "beginner"
														? "border-green-500/20 text-green-400"
														: repoAnalysis.complexity === "intermediate"
															? "border-yellow-500/20 text-yellow-400"
															: "border-red-500/20 text-red-400"
												}`}
											>
												{repoAnalysis.complexity.toUpperCase()}
											</Badge>
										</div>
										<div>
											<span className="text-white/60">TECH STACK:</span>
											<div className="flex flex-wrap gap-1 mt-1">
												{repoAnalysis.techStack.map((tech, index) => (
													<Badge
														key={`stack_${index.toString()}`}
														variant="outline"
														className="border-white/20 text-white/70 font-mono text-xs"
													>
														{tech}
													</Badge>
												))}
											</div>
										</div>
										<div>
											<span className="text-white/60">KEY FEATURES:</span>
											<ul className="text-white/80 mt-1 space-y-1">
												{repoAnalysis.keyFeatures.map((feature, index) => (
													<li key={index.toString()} className="text-xs">
														• {feature}
													</li>
												))}
											</ul>
										</div>
									</div>
								</CardContent>
							</Card>
						)}

						{/* Download Options */}
						{(generationData?.some(
							(x: any) => x.status && x.status === "done",
						) ||
							(messages.length > 0 &&
								isGenerating !== "streaming" &&
								isGenerating !== "submitted")) && (
							<Card className="bg-black border-white/20">
								<CardHeader className="border-b border-white/10">
									<CardTitle className="font-mono text-white">
										EXPORT OPTIONS
									</CardTitle>
								</CardHeader>
								<CardContent className="p-6 space-y-3">
									<Button
										onClick={handleDownloadMarkdown}
										variant="outline"
										className="w-full border-white/20 text-white hover:bg-white/10 font-mono"
									>
										<FileText className="h-4 w-4 mr-2" />
										DOWNLOAD MARKDOWN
									</Button>
									<Button
										onClick={handleDownloadZip}
										variant="outline"
										className="w-full border-white/20 text-white hover:bg-white/10 font-mono"
									>
										<Archive className="h-4 w-4 mr-2" />
										DOWNLOAD ZIP
									</Button>
								</CardContent>
							</Card>
						)}
					</div>

					{/* Documentation Preview */}
					<div className="space-y-6  max-h-[145vh] ">
						<Card className="bg-black border-white/20  h-full overflow-y-auto overflow-x-hidden">
							<CardHeader className="border-b border-white/10 sticky w-full top-0  bg-inherit">
								<CardTitle className="font-mono text-white flex items-center justify-between">
									DOCUMENTATION PREVIEW
									{isGenerating === "streaming" ? (
										<div className="flex items-center gap-2">
											<Loader2 className="h-4 w-4 animate-spin" />
											<span className="text-xs text-white/60">
												STREAMING...{" "}
												{pathMap.current.size > 0
													? pathMap.current
															.values()
															.toArray()
															.join("")
															.split(" ").length - 1
													: messages
															.map((x) => x.content)
															.join("")
															.split(" ").length - 1}{" "}
												words
											</span>
										</div>
									) : (
										(pathMap.current.size > 0 ||
											messages.some(
												(x) =>
													x.role === "assistant" &&
													x.parts.some((y) => y.type === "text"),
											)) &&
										` ${
											pathMap.current.size > 0
												? (
														pathMap.current
															.values()
															.toArray()
															.join("")
															.split(" ").length - 1
													).toString()
												: messages
														.map((x) => x.content)
														.join("")
														.split(" ").length - 1
										} words`
									)}
								</CardTitle>
							</CardHeader>
							<CardContent className="p-6 ">
								{pathMap.current.size > 0 || messages.length > 0 ? (
									<div className=" markdown-body whitespace-pre-wrap">
										{developerMode ? (
											<>
												{generationData?.map((x: any) => {
													if (x.message && x.message === "done") {
														return (
															<Markdown
																key={x.path}
																content={`**-----------------------------**
. **File: ${x.path}**
**-----------------------------**
---
${generationData
	.filter((y: any) => y.path === x.path)
	.map((t: any) => t.text)
	.join("")}
           ---`}
																id={x.path}
															/>
														);
													}
												})}

												{Array.from(pathMap.current.keys()).map((path, i) =>
													generationData?.find(
														(x: any) =>
															x.message &&
															x.message === "done" &&
															x.path === path,
													) ? null : (
														<div key={`file_${path}`} id={path}>{`
												
**-----------------------------**
. **File: ${path}**
**-----------------------------**
---

`}</div>
													),
												)}
											</>
										) : (
											// biome-ignore lint/nursery/useUniqueElementIds: <explanation>
											<Markdown
												id="docs"
												content={messages
													.flatMap((message, i) => {
														if (message.role === "assistant") {
															return message.parts.map((part) => {
																if (part.type === "text") {
																	
																	return part.text;
																}
															});
														}
													})
													.join("")}
											/>
										)}
									</div>
								) : (
									<div className="h-[600px] flex items-center justify-center border-white/10">
										<div className="text-center space-y-3">
											<Terminal className="h-12 w-12 mx-auto text-white/40" />
											<p className="text-white/60 font-mono text-sm">
												{repoInfo
													? "Click 'Generate Documentation' to create docs"
													: "Enter a repository URL to get started"}
											</p>
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="border-t border-white/20 mt-12 ">
				<div className="container mx-auto px-4 py-6">
					<p className="text-white/40 text-xs font-mono text-center">
						POWERED BY AI SDK • BUILT FOR DEVELOPERS
					</p>
				</div>
			</div>
		</div>
	);
}

import type { NextRequest } from "next/server";
import { createDataStreamResponse } from "ai";
import { generateDoc } from "@/lib/ai/generate";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
	const { repoUrl } = await request.json();
	return createDataStreamResponse({
		execute: async (dataStream) => {
			try {
				dataStream.writeData({ status: "initializing" });
				const streams = await generateDoc(repoUrl);
				await Promise.all(
					streams.entries().map(async ([path, stream]) => {
						dataStream.writeMessageAnnotation({
							path,
							status: "writing",
						});
						const { textStream } = stream;

						for await (const textPart of textStream) {
							dataStream.writeData({
								path,
								text: textPart,
								type: "chunk",
							});
						}

						dataStream.writeData({
							path,
							type: "info",
							message: "done",
						});
					}),
				);
				console.log("DONE");

				dataStream.writeData({ status: "done" });
			} catch (error) {
				dataStream.writeData({ status: "failed" });
				console.error("Error generating documentation:", error);
			}
		},
		onError: (error) => {
			console.error(error);
			return "Failed to generate documentation";
		},
	});
}

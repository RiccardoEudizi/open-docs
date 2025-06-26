import type React from "react";
import type { Metadata, Viewport } from "next";
import { GeistSans, GeistMono } from "geist/font";
import "./globals.css";

export const metadata: Metadata = {
	// Standard SEO Meta Tags
	title: "OPEN-DOCS - AI-Powered Repository Documentation & Analysis",
	description:
		"Generate comprehensive documentation and insightful analysis for any Git repository instantly with AI. Streameline your code understanding.",
	applicationName: "OPEN-DOCS",
	authors: [{ name: "rdz_tch", url: "https://auto-doc-ai-one.vercel.app" }],
	keywords: [
		"Git",
		"Repository",
		"Documentation",
		"Analysis",
		"AI",
		"Code",
		"DevOps",
		"Software Development",
	],
	referrer: "origin-when-cross-origin",
	creator: "Riccardo Eudizi",
	publisher: "rdz_tch",
	formatDetection: {
		email: false,
		address: false,
		telephone: false,
	},
 // Indicate support for light and dark modes

	// Canonical URL and other alternates
	alternates: {
		canonical: "https://auto-doc-ai-one.vercel.app/", // Make sure this matches your app's actual domain 
		// You can add other language versions here, e.g.:
		// languages: {
		//   'en-US': 'https://auto-doc-ai-one.vercel.app//en-US',
		//   'es-ES': 'https://auto-doc-ai-one.vercel.app//es-ES',
		// },
	},

	// Web App Manifest (for PWA)
	//manifest: "/manifest.json",

	// Robots meta tag for search engine crawling
	robots: {
		index: true,
		follow: true,
		nocache: true,
		googleBot: {
			index: true,
			follow: true,
			noimageindex: true,
			"max-video-preview": -1,
			"max-snippet": -1,
		},
	},

	// Open Graph / Facebook
	openGraph: {
		type: "website",
		url: "https://auto-doc-ai-one.vercel.app/",
		title: "OPEN-DOCS - AI-Powered Repository Documentation & Analysis",
		description:
			"Generate comprehensive documentation and insightful analysis for any Git repository instantly with AI. Streamline your code understanding.",
		
		siteName: "OPEN-DOCS",
		locale: "en_US", // Specify the language and region
	},

	// Twitter Card Tags
	twitter: {
		card: "summary_large_image",
		site: "@riccardiin0", // The Twitter @username the card should be attributed to
		creator: "@riccardiin0", // Optional: Your app's Twitter handle for the content creator
		title: "OPEN-DOCS - AI-Powered Repository Documentation & Analysis",
		description:
			"Generate comprehensive documentation and insightful analysis for any Git repository instantly with AI. Streamline your code understanding.",
		
	},
};

//status bar
export const viewport: Viewport = { themeColor: "#000",	colorScheme: "light dark" };

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
			<body className="font-sans antialiased">{children}</body>
		</html>
	);
}

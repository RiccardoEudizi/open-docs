# OPEN-DOCS: AI-Powered Repository Documentation & Analysis
## 1. Project Overview

**OPEN-DOCS** is an innovative web application that leverages artificial intelligence to streamline the process of understanding and documenting software projects. By simply providing a Git repository URL, users can obtain comprehensive documentation and a detailed AI-driven analysis of the codebase, including its project type, tech stack, complexity, and key features. The application aims to enhance developer productivity by providing instant, high-quality insights into any Git repository.

## 2. Features

OPEN-DOCS offers a robust set of features designed to simplify repository analysis and documentation:

*   **AI-Powered Documentation Generation:** Generates comprehensive, high-quality technical documentation for entire repositories or individual files, based on the code content and structure.
*   **Repository Analysis:** Provides an AI-driven overview of the repository, including:
    *   **Project Type:** Identifies the nature of the project (e.g., web app, library).
    *   **Tech Stack:** Lists the primary technologies and frameworks used.
    *   **Complexity:** Assesses the project's complexity (beginner, intermediate, advanced).
    *   **Key Features:** Highlights core functionalities and capabilities.
*   **Git Integration:** Supports cloning and analyzing both public and private Git repositories (GitHub, GitLab, Bitbucket, etc.) using a provided access token.
*   **AST-Based Code Understanding:** Utilizes Abstract Syntax Tree (AST) parsing for TypeScript and JavaScript files to gain deeper insights into code structure, functions, classes, and APIs, enhancing documentation accuracy.
*   **Markdown Output:** Generates documentation in a clean, readable Markdown format, complete with a Table of Contents for easy navigation.
*   **Download Options:** Allows users to download the generated documentation as a Markdown file or a convenient ZIP archive.
*   **Developer Mode:** Provides a granular view of the AI's documentation process, streaming documentation for each file individually.
*   **Modern User Interface:** Built with Next.js, Tailwind CSS, and Shadcn UI for a responsive and intuitive user experience.
*   **Streaming AI Responses:** Enhances user experience by streaming AI-generated content in real-time.

## 3. Installation

To set up and run the OPEN-DOCS application locally, follow these steps:

### Prerequisites

*   **Node.js:** Ensure you have Node.js (version 18 or higher recommended) installed.
*   **pnpm:** This project uses pnpm for package management. If you don't have it, install it globally:
    ```bash
    npm install -g pnpm
    ```

### Steps

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/RiccardoEudizi/open-docs.git
    cd open-docs
    ```

2.  **Install Dependencies:**
    ```bash
    pnpm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env.local` file in the root of the project and add the necessary environment variables for the AI model. You must configure either the Ollama variables or the Google Generative AI variables.

    **Using Ollama (Local AI Model):**
    ```env
    OLLAMA_BASE_URL=http://localhost:11434 # Your Ollama server URL
    OLLAMA_MODEL=llama3 # The name of the model you want to use (e.g., llama3, codellama)
    ```
    Ensure you have Ollama installed and a model pulled (e.g., `ollama pull llama3`).

    **Using Google Generative AI (Cloud-based AI Model):**
    ```env
    GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
    GOOGLE_MODEL=gemini-pro # The name of the Google model (e.g., gemini-pro)
    ```
    Replace `YOUR_GOOGLE_API_KEY` with your actual Google Cloud API key.

    **Optional:**
    ```env
    NEXT_PUBLIC_IS_DEMO=1 # Set to 1 to disable developer mode switch in UI
    ```

4.  **Run the Development Server:**
    ```bash
    pnpm dev
    ```
    The application will be accessible at `http://localhost:3000`.

5.  **Build and Start (for Production):**
    ```bash
    pnpm build
    pnpm start
    ```
    This will build the application for production and then start the production server.

## 4. Usage

Using OPEN-DOCS is straightforward through its web interface:

1.  **Access the Application:**
    Open your web browser and navigate to `http://localhost:3000` (or the deployed URL).

2.  **Enter Repository URL:**
    In the "REPOSITORY INPUT" section, paste the URL of the Git repository you wish to analyze (e.g., `https://github.com/vercel/next.js.git`).

3.  **Provide GitHub Access Token (Optional, for Private Repos):**
    If the repository is private, enter a GitHub Personal Access Token with appropriate permissions to clone the repository. This token is stored locally in your browser's `localStorage` for convenience.

4.  **Analyze Repository:**
    Click the "ANALYZE REPOSITORY" button. The application will clone the repository (to a temporary directory), gather basic information, and perform an initial AI analysis.
    *   The "REPOSITORY INFO" section will display details like name, primary language, file count, and size.
    *   The "AI ANALYSIS" section will show the AI's assessment of the project type, complexity, tech stack, and key features.

5.  **Generate Documentation:**
    Once the analysis is complete, click the "GENERATE DOCUMENTATION" button. The AI will then generate comprehensive documentation based on the repository's content. The documentation will stream in real-time into the "DOCUMENTATION PREVIEW" section.

6.  **Developer Mode (Optional):**
    Toggle the "Developer Mode" switch in the "REPOSITORY INPUT" section. In this mode, the AI generates documentation for each file individually, providing a more granular view of the process. This can be useful for debugging or understanding the AI's output per file.

7.  **Download Documentation:**
    After documentation generation is complete, use the "EXPORT OPTIONS" to:
    *   **DOWNLOAD MARKDOWN:** Save the entire documentation as a single Markdown file.
    *   **DOWNLOAD ZIP:** Download a ZIP archive containing the generated documentation.

## 5. API Documentation (Internal)

The `open-docs` project is a web application, and the following "APIs" refer to its internal Next.js API routes. These endpoints are designed for communication between the frontend and backend of the application and are not intended for direct external consumption without the accompanying UI.

### Endpoints

*   **`POST /api/analyze-repo-detailed`**
    *   **Purpose:** Analyzes a given Git repository, providing detailed repository information and an initial AI-driven analysis.
    *   **Request Body (JSON):**
        ```json
        {
          "repoUrl": "string", // The URL of the Git repository
          "accessToken": "string" // Optional: GitHub Personal Access Token for private repos
        }
        ```
    *   **Response (JSON):**
        ```json
        {
          "name": "string",
          "language": "string",
          "fileCount": "number",
          "size": "string", // e.g., "1.2 MB"
          "analysis": { // AI analysis
            "projectType": "string",
            "techStack": ["string"],
            "complexity": "beginner" | "intermediate" | "advanced",
            "keyFeatures": ["string"],
            "suggestedSections": ["string"]
          }
        }
        ```

*   **`POST /api/generate-docs-stream`**
    *   **Purpose:** Generates comprehensive documentation for the analyzed repository, streaming the output to the client. This is the default mode.
    *   **Request Body (JSON):**
        ```json
        {
          "repoAnalysis": { ... }, // The AI analysis object from /api/analyze-repo-detailed
          "repoData": { ... },     // The repository info object from /api/analyze-repo-detailed
          "repoUrl": "string",
          "accessToken": "string"  // Optional
        }
        ```
    *   **Response:** Server-Sent Events (SSE) streaming Markdown content.

*   **`POST /api/generate-docs-core`**
    *   **Purpose:** (Used in Developer Mode) Generates documentation for individual files within the repository, streaming the output.
    *   **Request Body (JSON):**
        ```json
        {
          "repoUrl": "string",
          "accessToken": "string" // Optional
        }
        ```
    *   **Response:** Server-Sent Events (SSE) streaming Markdown content, chunked per file.

*   **`POST /api/create-zip`**
    *   **Purpose:** Creates a ZIP archive containing the generated documentation.
    *   **Request Body (JSON):**
        ```json
        {
          "documentation": [
            {
              "path": "string",    // File path (e.g., "README.md")
              "content": "string"  // Markdown content for the file
            }
          ],
          "repoInfo": { ... } // Basic repository info (e.g., name)
        }
        ```
    *   **Response:** `application/zip` blob.

*   **`POST /api/generate-readme`**
    *   **Purpose:** (Present in the codebase but not actively used in the current UI) Intended for generating a README.md file for the repository.
    *   **Request Body (JSON):** Similar to `generate-docs-stream`.
    *   **Response:** Server-Sent Events (SSE) streaming Markdown content.

## 6. Configuration

The application's behavior can be configured using environment variables and configuration files.

### Environment Variables

As detailed in the [Installation](#3-installation) section, environment variables are crucial for configuring the AI model. These should be placed in a `.env.local` file in the project root.

*   **`OLLAMA_BASE_URL`**: (Required if using Ollama) The base URL for your local Ollama server.
*   **`OLLAMA_MODEL`**: (Required if using Ollama) The name of the Ollama model to use for generation (e.g., `llama3`).
*   **`GOOGLE_API_KEY`**: (Required if using Google Generative AI) Your API key for Google's Generative AI services.
*   **`GOOGLE_MODEL`**: (Required if using Google Generative AI) The name of the Google model to use (e.g., `gemini-pro`).
*   **`NEXT_PUBLIC_IS_DEMO`**: (Optional) Set to `1` to disable the "Developer Mode" switch in the UI, useful for public demos.

### Project Configuration Files

*   **`components.json`**: Configures Shadcn UI components, including aliases for easy import (`@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`).
*   **`tailwind.config.ts`**: Tailwind CSS configuration file, defining the utility classes and design system.
*   **`postcss.config.mjs`**: PostCSS configuration, typically used with Tailwind CSS for processing CSS.
*   **`next.config.mjs`**: Next.js configuration file for custom build settings.
*   **`tsconfig.json`**: TypeScript configuration file, defining compiler options for the project.

## 7. License

The license for the `open-docs` repository is **Not Specified**.

It is highly recommended that a license file (e.g., `LICENSE.md`) be added to the repository to clarify the terms under which the software can be used, modified, and distributed.

## 8. Troubleshooting

Here are some common issues you might encounter and their potential solutions:

*   **"Failed to analyze repository" or "An error occurred" after clicking "Analyze Repository"**:
    *   **Invalid URL:** Double-check that the Git repository URL is correct and accessible.
    *   **Network Issues:** Ensure you have a stable internet connection.
    *   **Private Repository Access:** If it's a private repository, make sure your GitHub Access Token is valid and has the necessary permissions (e.g., `repo` scope for private repositories).
    *   **API Rate Limits:** If you are making many requests in a short period, you might hit GitHub's API rate limits. Wait a few minutes and try again.

*   **AI model not found or not configured correctly**:
    *   **Environment Variables:** Verify that your `.env.local` file is correctly set up with either `OLLAMA_BASE_URL` and `OLLAMA_MODEL`, or `GOOGLE_API_KEY` and `GOOGLE_MODEL`.
    *   **Ollama Server:** If using Ollama, ensure your Ollama server is running and the specified model is pulled and available.
    *   **API Key Validity:** If using Google Generative AI, confirm your `GOOGLE_API_KEY` is valid and active.

*   **Documentation generation is slow or incomplete for large repositories**:
    *   **AI Context Window:** Large files or a high number of files can exceed the AI model's context window, leading to truncated or less accurate documentation.
    *   **Processing Time:** Generating documentation for many files or very large files can take a significant amount of time.

*   **Generated documentation is missing certain files or sections**:
    *   **Unsupported File Types:** The `lib/codebase.ts` file defines `supportedExtensions` (e.g., `.ts`, `.js`, `.json`, `.py`, `.java`, `.cpp`, `.rb`, `.php`, `.go`, `.rs`, `.swift`, `.cs`). Files with other extensions will be ignored.
    *   **Ignored Patterns:** The `lib/codebase.ts` also contains `defaultIgnorePatterns` (e.g., `node_modules/`, `.git`, `dist/`, `build/`, `coverage/`, `.md`, `.json`, `package-lock.json`, `.vscode`, `license`, `tailwind.config.ts`, `examples`, `tests`). Files or directories matching these patterns will be skipped during analysis and documentation.
    *   **Empty Files:** Files with no content or only comments might not yield substantial documentation.

*   **"STOP GENERATION" button doesn't immediately stop the process**:
    *   Streaming processes might have a slight delay in stopping due to network buffers or ongoing AI model inference.
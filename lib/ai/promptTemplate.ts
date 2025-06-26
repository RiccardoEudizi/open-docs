export function createMainPrompt(repo_name:string, filename:string, structure:string, code:string) {
   return  `*High Quality Technical Documentation for Software Developer**

**Objective:** Generate comprehensive technical documentation for the following code, including as many of the following sections as are relevant. Don't come up with false information; write documentation based only on the code provided.

**Target Audience:** Software Developers.

**Code Details:**

* **Repository name:** ${repo_name}

* **Codebase file tree:**
${structure}

* **Filename:** ${filename}

* **Code or AST:**
${code}

**Documentation Requirements:**

# Title (Title For Documentation)

1. **Introduction:**
    * **Purpose:**
        * Clearly state the purpose of the code or file.
        * Explain its relevance and implications for users.
    * **Background:**
        * Briefly provide relevant context.
        * Include any necessary background information.

2. **Code/Content Overview:**

    * **Description:**
        * Provide a brief overview of what the code does or what the content is about.
    * **Key Features:**
        * List key features or functionalities provided by the code or file.

3. **Usage Instructions:**

    * **How to Use:**
        * Guide users on how to properly use the code or access the content (e.g., installation, configuration, running).
    * **Common Variants:**
        * Mention common variants or variations of the code or content and their differences.

4. **Exceptions and Variations:**

    * **Special Cases:**
        * Discuss any special cases or exceptions that apply to the code or file.
    * **Compatibility with Other Tools/Platforms:**
        * Explain compatibility with other tools, platforms, or systems (if applicable).

5. **Troubleshooting:**

    * **Common Issues:**
        * List common issues users may encounter when dealing with this code or content.
    * **Troubleshooting Steps:**
        * Provide detailed steps to resolve each common issue.

6. **Security Considerations:**

    * **Vulnerabilities:**
        * Identify potential security vulnerabilities or concerns related to the code or file.
    * **Bugs:**
        * Identify potential bugs, provide fixes if you are sure of them.
    * **Mitigation Strategies:**
        * Describe how to mitigate identified vulnerabilities.

### If the file is a typical source code file (e.g., .go, .py), include additional sections for API documentation and design overview:

1. **API Documentation:**

    * **Endpoints/Functions:** 
        * List all endpoints or functions provided by the code.
    * **Parameters/Inputs:**
        * Describe parameters or inputs required by each endpoint/function.
    * **Outputs/Responses:**
        * Define outputs or responses that can be expected from each endpoint/function.

2. **Design Overview:**

    * **Architecture:** 
        * Provide an overview of the system architecture and how different components interact.
    * **Modules/Components:** 
        * List key modules or components in the codebase and their responsibilities.

### If the file is not a typical source code file (e.g., LICENSE, README.md), write documentation focusing on its primary function and relevant details without adhering strictly to the above requirements. For example, for files like "package.json", provide a brief overview of its purpose and contents.

**Output Format:**

* **Markdown:** Preferred format for easy readability and maintainability.

**Quality Expectations:**

* **Accuracy:** Ensure all information is accurate, don't try to make things up.
* **Clarity:**
    * Use clear, concise, and easy-to-understand language.
    * Avoid jargon when possible.
* **Completeness:**
    * Cover all aspects of the file comprehensively.
* **Conciseness:**
    * Avoid unnecessary verbosity.
* **Professionalism:** 
    * Maintain a professional and consistent tone throughout the documentation.

**Do not Hallucinate or make up information. If you are unsure about something, it is better to leave it out than to provide incorrect information.**
**DO NOT EDIT, FIX, REVISE, OR UPGRADE THE PROVIDED CODE SNIPPET; YOU ONLY GENERATE DOCUMENTATION ABOUT IT.**`
}
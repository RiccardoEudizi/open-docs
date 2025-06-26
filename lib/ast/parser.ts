import * as ts from "typescript"; // Import the TypeScript compiler API

/**
 * Parses TypeScript code content into its Abstract Syntax Tree (AST)
 * using the built-in TypeScript compiler API.
 *
 * @param code - The TypeScript code content to parse.
 * @param fileName - An optional file name for the source file. Defaults to 'temp.ts'.
 * @param scriptTarget - The ECMAScript target version. Defaults to ES2020.
 * @returns The root `ts.SourceFile` node of the AST, which represents the complete syntax tree, or null if an error occurs.
 */
export function parseTypeScriptCodeWithCompiler(
	code: string,
	fileName = "temp.ts",
	scriptTarget: ts.ScriptTarget = ts.ScriptTarget.ES2020,
): ts.SourceFile | null {
	try {
		// Create a SourceFile object, which is the root of the AST.
		// This function parses the code and builds the syntax tree.
		const sourceFile = ts.createSourceFile(
			fileName, // The file name
			code, // The source code content
			scriptTarget, // The ECMAScript target version (e.g., ES5, ES2015, ESNext)
			/* setParentNodes */ true, // Crucial for easy traversal; sets `parent` property on nodes
		);

		return sourceFile;
	} catch (error) {
		console.error("Error parsing TypeScript code with compiler API:", error);
		return null;
	}
}

/**
 * Recursively walks the TypeScript AST, logging information about each node.
 * @param node - The current AST node to visit.
 * @param indent - The current indentation level for logging.
 */
function walkTypeScriptAST(node: ts.Node, indent = ""): void {
	// Log basic information about the current node
	const kind = ts.SyntaxKind[node.kind]; // Get the string representation of the node's kind
	const text = node.getText().split("\n")[0]; // Get the text content of the node (first line)

	console.log(`${indent}Kind: ${kind}, Text: "${text.trim()}"`);

	// Recursively visit child nodes
	ts.forEachChild(node, (child) => {
		walkTypeScriptAST(child, `${indent}  `); // Increase indentation for children
	});
}
function getSemanticNodeInfo(node: ts.Node): string {
	if (ts.isIdentifier(node)) {
		return `Name: '${node.text}'`;
	}
	if (
		ts.isStringLiteral(node) ||
		ts.isNumericLiteral(node) ||
		node.kind === ts.SyntaxKind.TrueKeyword ||
		node.kind === ts.SyntaxKind.FalseKeyword
	) {
		return `Value: '${node.getText()}'`;
	}
	if (ts.isDeclarationStatement(node) && node.name) {
		return `DeclaredName: '${node.name.getText()}'`;
	}
	if (ts.isPropertyAccessExpression(node)) {
		return `Access: '${node.expression.getText()}.${node.name.getText()}'`;
	}
	if (ts.isCallExpression(node)) {
		return `Called: '${node.expression.getText()}'`;
	}
	if (ts.isImportDeclaration(node)) {
		return `From: '${node.moduleSpecifier.getText()}'`;
	}
	if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
		return `Var: '${node.name.text}'`;
	}
	if (ts.isFunctionDeclaration(node) && node.name) {
		return `Func: '${node.name.getText()}'`;
	}
	if (ts.isClassDeclaration(node) && node.name) {
		return `Class: '${node.name.getText()}'`;
	}
	if (ts.isInterfaceDeclaration(node) && node.name) {
		return `Interface: '${node.name.getText()}'`;
	}
	if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
		return `Method: '${node.name.text}'`;
	}
	if (ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name)) {
		return `Prop: '${node.name.text}'`;
	}
	if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
		return `Param: '${node.name.text}'`;
	}
	if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
		return `Type: '${node.typeName.text}'`;
	}
	if (ts.isTypeLiteralNode(node)) {
		return "TypeLiteral";
	}

	return ""; // No specific semantic info extracted
}

/**
 * Converts a TypeScript AST (ts.SourceFile) into a structured string suitable for LLM input.
 * The output string represents the AST's hierarchical structure with node kinds and their text content.
 *
 * @param node - The current AST node to process (start with the root ts.SourceFile).
 * @param indent - The current indentation string for hierarchical representation.
 * @param result - An array of strings to build the output. This is used for internal recursion.
 * @returns The complete string representation of the AST.
 */
export function astToString(
	node: ts.Node,
	indent = "",
	result: string[] = [],
): string {
	const kind = ts.SyntaxKind[node.kind];
	const semanticInfo = getSemanticNodeInfo(node);
	const nodeText = node.getText().trim();

	// Limit the source text snippet to a compact length for LLM input

	let line = `${indent}${kind}`;
	if (semanticInfo) {
		line += ` (${semanticInfo})`;
	}
	line += ` [Source: "${nodeText.replace(/\n/g, "\\n")}"]`; // Replace newlines for single-line display

	result.push(line);

	// Recursively visit child nodes, increasing indentation
	ts.forEachChild(node, (child) => {
		astToString(child, `${indent} `, result);
	});

	// If this is the initial call (from the root), join the array into a single string
	if (node.kind === ts.SyntaxKind.SourceFile) {
		return result.join("\n");
	}

	return "";
}

interface LlmAstNode {
    // General type of the code construct (e.g., "Function", "Class", "Variable", "Import")
    type: string;
    // The name of the construct (e.g., "myFunction", "MyClass", "myVariable")
    name?: string;
    // JSDoc comment for this construct, if present
    jsDoc?: string;
    // Modifiers (e.g., "public", "private", "static", "export", "async", "readonly")
    modifiers?: string[];

    // --- Specific details based on 'type' ---

    // For Functions/Methods:
    signature?: {
        parameters: {
            name: string;
            type: string;
            isOptional?: boolean; // '?' in parameter signature
        }[];
        returnType: string;
    };
    // High-level logic description for functions/methods
    // This is NOT full code, but structured summaries of control flow.
    logicFlow?: LlmAstNode[]; // e.g., 'if' statements, 'return' statements, 'call' expressions

    // For Classes:
    inheritsFrom?: string; // Name of the class it extends
    implements?: string[]; // Names of interfaces it implements

    // For Variables/Constants:
    dataType?: string; // Declared type
    value?: string | number | boolean; // For simple literal initializers
    assignedFromExpression?: string; // Textual representation for non-literal initializers

    // For Imports:
    moduleSpecifier?: string; // The path/name of the module being imported from
    importedElements?: {
        name: string; // The name of the symbol imported
        alias?: string; // If it's imported with an alias (e.g., `foo as bar`)
        isDefault?: boolean; // If it's a default import
        isNamespace?: boolean; // If it's a namespace import (e.g., `* as ns`)
    }[];

    // For Exports:
    exportedElements?: {
        name?: string; // The name of the symbol being exported (or re-exported)
        alias?: string; // If exported with an alias (e.g., `bar as foo`)
        fromModule?: string; // If it's a re-export from another module
        isDefault?: boolean; // If it's a default export
    }[];

    // Children nodes (e.g., class members, interface properties, statements within a function body)
    children?: LlmAstNode[];
}

// Internal helper interface for processing
interface ProcessingContext {
    sourceFile: ts.SourceFile;
    // Add type checker if needed for more accurate type resolution (more setup)
    // typeChecker: ts.TypeChecker;
}
/**
 * Parses a TypeScript AST to extract high-level API, structure, and JSDoc information,
 * formatted for consumption by a Large Language Model.
 *
 * @param sourceCode The TypeScript code string to parse.
 * @returns A JSON string representing the well-formatted API and structure overview.
 */
export function parseTypeScriptApiAndStructure(sourceFile: ts.SourceFile): string {
   

    // Optional: If you need precise type resolution, uncomment and set up a Program
    // const program = ts.createProgram([sourceFile.fileName], { target: ts.ScriptTarget.ESNext });
    // const typeChecker = program.getTypeChecker();
    const context: ProcessingContext = { sourceFile /*, typeChecker*/ };

    // --- Helper Functions ---

    const getJSDoc = (node: ts.Node): string | undefined => {
        // ts.getJSDocTags can sometimes return tags for parent JSDoc,
        // so we filter to ensure we get the comment directly on the node.
        const jsDocNodes = ts.getJSDocTags(node).map(tag => tag.parent).filter(ts.isJSDoc);
        const comments = jsDocNodes.map(doc => doc.comment).filter((comment): comment is string => typeof comment === 'string');
        return comments.length > 0 ? comments.join('\n') : undefined;
    };

    const getModifiers = (node: ts.Node): string[] => {
        return ts.canHaveModifiers(node)
            ? (ts.getModifiers(node)?.map(m => ts.SyntaxKind[m.kind].toLowerCase().replace('keyword', '')) || [])
            : [];
    };

    const getTypeString = (typeNode: ts.TypeNode | undefined): string => {
        if (!typeNode) return 'any'; // Default for untyped
        // For simple types, getText is fine. For complex types, you might want to recurse or use typeChecker.
        return typeNode.getText(context.sourceFile);
    };

    // --- Core Traversal Function ---
    function processNode(node: ts.Node): LlmAstNode | null {
        // Skip purely syntactic elements not directly requested
        if (ts.isToken(node) || ts.isMissingDeclaration(node) || ts.isCommaListExpression(node)) {
            return null;
        }

        const nodeRep: LlmAstNode = { type: 'Unknown' };
        nodeRep.jsDoc = getJSDoc(node);
        nodeRep.modifiers = getModifiers(node);

        switch (node.kind) {
            case ts.SyntaxKind.SourceFile:
                nodeRep.type = 'Module';
                nodeRep.name = context.sourceFile.fileName.replace(/\.ts(x)?$/, ''); // Clean filename
                nodeRep.children = [];
                ts.forEachChild(node, child => {
                    const processedChild = processNode(child);
                    if (processedChild) {
                        nodeRep.children!.push(processedChild);
                    }
                });
                break;

            case ts.SyntaxKind.ImportDeclaration:
                const importDecl = node as ts.ImportDeclaration;
                nodeRep.type = 'Import';
                nodeRep.moduleSpecifier = importDecl.moduleSpecifier.getText(context.sourceFile).replace(/['"]/g, '');
                nodeRep.importedElements = [];

                if (importDecl.importClause) {
                    if (importDecl.importClause.name) { // Default import: `import Foo from './foo'`
                        nodeRep.importedElements.push({
                            name: importDecl.importClause.name.getText(context.sourceFile),
                            isDefault: true
                        });
                    }
                    if (importDecl.importClause.namedBindings) {
                        if (ts.isNamedImports(importDecl.importClause.namedBindings)) { // Named imports: `{ Foo, Bar as Baz }`
                            importDecl.importClause.namedBindings.elements.forEach(element => {
                                nodeRep.importedElements!.push({
                                    name: element.name.getText(context.sourceFile),
                                    alias: element.propertyName ? element.propertyName.getText(context.sourceFile) : undefined
                                });
                            });
                        } else if (ts.isNamespaceImport(importDecl.importClause.namedBindings)) { // Namespace import: `* as Foo`
                            nodeRep.importedElements.push({
                                name: importDecl.importClause.namedBindings.name.getText(context.sourceFile),
                                isNamespace: true
                            });
                        }
                    }
                }
                break;

            case ts.SyntaxKind.ExportDeclaration:
                const exportDecl = node as ts.ExportDeclaration;
                nodeRep.type = 'Export';
                nodeRep.exportedElements = [];
                nodeRep.moduleSpecifier = exportDecl.moduleSpecifier?.getText(context.sourceFile).replace(/['"]/g, ''); // For re-exports

                if (exportDecl.isTypeOnly) {
                    nodeRep.modifiers = [...(nodeRep.modifiers || []), 'typeOnly'];
                }

                if (exportDecl.exportClause) {
                    if (ts.isNamedExports(exportDecl.exportClause)) { // Named exports: `{ Foo, Bar as Baz }`
                        exportDecl.exportClause.elements.forEach(element => {
                            nodeRep.exportedElements!.push({
                                name: element.name.getText(context.sourceFile),
                                alias: element.propertyName ? element.propertyName.getText(context.sourceFile) : undefined,
                                fromModule: nodeRep.moduleSpecifier // Re-export
                            });
                        });
                    }
                } else if (exportDecl.moduleSpecifier && !exportDecl.exportClause) {
                    // Export all: `export * from './module'`
                    nodeRep.exportedElements.push({
                        name: '*',
                        fromModule: nodeRep.moduleSpecifier
                    });
                }
                break;

            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.MethodDeclaration:
            case ts.SyntaxKind.ArrowFunction: // Could be assigned to a const
                const funcDecl = node as ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction;
                nodeRep.type = ts.isFunctionDeclaration(funcDecl) ? 'Function' :
                               ts.isMethodDeclaration(funcDecl) ? 'Method' : 'ArrowFunction';
                nodeRep.name = (funcDecl as any).name?.getText(context.sourceFile); // Name for declarations
                nodeRep.modifiers = getModifiers(funcDecl);
                
                nodeRep.signature = {
                    parameters: funcDecl.parameters.map(param => ({
                        name: param.name.getText(context.sourceFile),
                        type: getTypeString(param.type),
                        isOptional: !!param.questionToken
                    })),
                    returnType: getTypeString((funcDecl as any).type) // FunctionDeclaration has .type, ArrowFunction has .type too
                };

                // Extract high-level logic flow for the function body
                if ((funcDecl as ts.FunctionLikeDeclaration).body) {
                    nodeRep.logicFlow = [];
                    ts.forEachChild((funcDecl as ts.FunctionLikeDeclaration).body!, child => {
                        const logicNode = processFunctionLogicNode(child);
                        if (logicNode) {
                            nodeRep.logicFlow!.push(logicNode);
                        }
                    });
                }
                break;

            case ts.SyntaxKind.ClassDeclaration:
                const classDecl = node as ts.ClassDeclaration;
                nodeRep.type = 'Class';
                nodeRep.name = classDecl.name?.getText(context.sourceFile);
                nodeRep.modifiers = getModifiers(classDecl);

                if (classDecl.heritageClauses) {
                    classDecl.heritageClauses.forEach(clause => {
                        clause.types.forEach(type => {
                            if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
                                nodeRep.inheritsFrom = type.expression.getText(context.sourceFile);
                            } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
                                if (!nodeRep.implements) nodeRep.implements = [];
                                nodeRep.implements.push(type.expression.getText(context.sourceFile));
                            }
                        });
                    });
                }
                // Process class members (properties, methods, constructors) as children
                nodeRep.children = [];
                classDecl.members.forEach(member => {
                    const processedMember = processNode(member);
                    if (processedMember) {
                        nodeRep.children!.push(processedMember);
                    }
                });
                break;

            case ts.SyntaxKind.PropertyDeclaration:
            case ts.SyntaxKind.PropertySignature: // For interfaces
                const propDecl = node as ts.PropertyDeclaration | ts.PropertySignature;
                nodeRep.type = ts.isPropertyDeclaration(propDecl) ? 'Property' : 'PropertySignature';
                nodeRep.name = propDecl.name.getText(context.sourceFile);
                nodeRep.dataType = getTypeString(propDecl.type);
                nodeRep.modifiers = getModifiers(propDecl);
                // Capture simple literal initializers
                if (ts.isPropertyDeclaration(propDecl) && propDecl.initializer) {
                    if (ts.isStringLiteral(propDecl.initializer)) {
                        nodeRep.value = propDecl.initializer.text;
                    } else if (ts.isNumericLiteral(propDecl.initializer)) {
                        nodeRep.value = parseFloat(propDecl.initializer.text);
                    } else if (propDecl.initializer.kind === ts.SyntaxKind.TrueKeyword) { // Check for boolean literal keywords
                        nodeRep.value = true;
                    } else if (propDecl.initializer.kind === ts.SyntaxKind.FalseKeyword) {
                        nodeRep.value = false;
                    } else {
                        nodeRep.assignedFromExpression = propDecl.initializer.getText(context.sourceFile);
                    }
                }
                break;

            case ts.SyntaxKind.Constructor:
                const constructorDecl = node as ts.ConstructorDeclaration;
                nodeRep.type = 'Constructor';
                nodeRep.modifiers = getModifiers(constructorDecl); // public/private parameters
                nodeRep.signature = {
                    parameters: constructorDecl.parameters.map(param => ({
                        name: param.name.getText(context.sourceFile),
                        type: getTypeString(param.type),
                        isOptional: !!param.questionToken
                    })),
                    returnType: 'void' // Constructors don't return
                };
                if (constructorDecl.body) {
                    nodeRep.logicFlow = [];
                    ts.forEachChild(constructorDecl.body, child => {
                        const logicNode = processFunctionLogicNode(child);
                        if (logicNode) {
                            nodeRep.logicFlow!.push(logicNode);
                        }
                    });
                }
                break;

            case ts.SyntaxKind.InterfaceDeclaration:
                const interfaceDecl = node as ts.InterfaceDeclaration;
                nodeRep.type = 'Interface';
                nodeRep.name = interfaceDecl.name.getText(context.sourceFile);
                nodeRep.modifiers = getModifiers(interfaceDecl);
                // Process interface members (property signatures, method signatures)
                nodeRep.children = [];
                interfaceDecl.members.forEach(member => {
                    const processedMember = processNode(member);
                    if (processedMember) {
                        nodeRep.children!.push(processedMember);
                    }
                });
                break;

            case ts.SyntaxKind.TypeAliasDeclaration:
                const typeAliasDecl = node as ts.TypeAliasDeclaration;
                nodeRep.type = 'TypeAlias';
                nodeRep.name = typeAliasDecl.name.getText(context.sourceFile);
                nodeRep.dataType = getTypeString(typeAliasDecl.type); // The type it aliases
                nodeRep.modifiers = getModifiers(typeAliasDecl);
                break;

            case ts.SyntaxKind.EnumDeclaration:
                const enumDecl = node as ts.EnumDeclaration;
                nodeRep.type = 'Enum';
                nodeRep.name = enumDecl.name.getText(context.sourceFile);
                nodeRep.modifiers = getModifiers(enumDecl);
                nodeRep.children = enumDecl.members.map(member => ({
                    type: 'EnumMember',
                    name: member.name.getText(context.sourceFile),
                    value: member.initializer ? member.initializer.getText(context.sourceFile) : undefined
                }));
                break;

            // Handle Variable Declarations (e.g., `const foo = 1;`)
            case ts.SyntaxKind.VariableStatement:
                // VariableStatement wraps one or more VariableDeclarations
                const varStatement = node as ts.VariableStatement;
                nodeRep.type = 'VariableDeclarationGroup'; // Indicates a group (const, let, var)
                nodeRep.modifiers = getModifiers(varStatement);
                nodeRep.children = [];
                ts.forEachChild(varStatement.declarationList, declNode => {
                    if (ts.isVariableDeclaration(declNode)) {
                        const varDecl = declNode;
                        let varNode: LlmAstNode = { type: 'Variable' };
                        varNode.name = varDecl.name.getText(context.sourceFile);
                        varNode.dataType = getTypeString(varDecl.type);
                        
                        if (varDecl.initializer) {
                            if (ts.isStringLiteral(varDecl.initializer)) {
                                varNode.value = varDecl.initializer.text;
                            } else if (ts.isNumericLiteral(varDecl.initializer)) {
                                varNode.value = parseFloat(varDecl.initializer.text);
                            } else if (varDecl.initializer.kind === ts.SyntaxKind.TrueKeyword) {
                                varNode.value = true;
                            } else if (varDecl.initializer.kind === ts.SyntaxKind.FalseKeyword) {
                                varNode.value = false;
                            } else if (ts.isArrowFunction(varDecl.initializer)) {
                                // If it's an arrow function assigned to a variable, process it as such
                                const arrowFuncNode = processNode(varDecl.initializer);
                                if (arrowFuncNode) {
                                    arrowFuncNode.name = varNode.name; // Assign variable name to arrow function
                                    // Combine modifiers from VariableStatement if applicable
                                    arrowFuncNode.modifiers = [...(nodeRep.modifiers || []), ...(arrowFuncNode.modifiers || [])];
                                    nodeRep.children!.push(arrowFuncNode);
                                    return; // Skip adding as a simple variable if it's an arrow function
                                }
                            } else {
                                varNode.assignedFromExpression = varDecl.initializer.getText(context.sourceFile);
                            }
                        }
                        nodeRep.children!.push(varNode);
                    }
                });
                break;

            default:
                // For any other node type, recurse through children.
                // This helps capture nested structures even if the parent isn't explicitly handled.
                let hasMeaningfulChild = false;
                const children: LlmAstNode[] = [];
                ts.forEachChild(node, child => {
                    const processedChild = processNode(child);
                    if (processedChild) {
                        children.push(processedChild);
                        hasMeaningfulChild = true;
                    }
                });
                if (hasMeaningfulChild) {
                    // Only include a generic type if we don't have a specific semantic type.
                    // This can be adjusted based on how much detail is truly "useful".
                    if (nodeRep.type === 'Unknown' && !nodeRep.name) {
                         // Consider removing this if you want stricter filtering
                         nodeRep.type = `GenericContainer (${ts.SyntaxKind[node.kind]})`;
                    }
                    nodeRep.children = children;
                } else {
                    // If no specific handling and no meaningful children, skip this node.
                    return null;
                }
                break;
        }

        // After processing, if it's a 'SourceFile' we've already collected children
        // and we want to return just the top-level processed nodes, not a wrapper.
        // This is handled by returning rootNodes.children in the main function.
        if (node.kind === ts.SyntaxKind.SourceFile) {
            return nodeRep; // The root node itself, will be unwrapped later
        }

        return nodeRep;
    }

    // --- Function to process *internal logic* within functions/methods ---
    // This is a simplified view of "logic"
    function processFunctionLogicNode(node: ts.Node): LlmAstNode | null {
        let logicNode: LlmAstNode = { type: 'UnknownLogic' };

        // Prioritize explicit statements
        switch (node.kind) {
            case ts.SyntaxKind.IfStatement:
                const ifStmt = node as ts.IfStatement;
                logicNode.type = 'IfStatement';
                logicNode.name = `if (${ifStmt.expression.getText(context.sourceFile)})`; // Condition text
                // Recursively process then/else blocks
                logicNode.children = [];
                if (ifStmt.thenStatement) {
                    const thenBlock = processFunctionLogicNode(ifStmt.thenStatement);
                    if (thenBlock) logicNode.children.push({ type: 'ThenBlock', children: [thenBlock] });
                }
                if (ifStmt.elseStatement) {
                    const elseBlock = processFunctionLogicNode(ifStmt.elseStatement);
                    if (elseBlock) logicNode.children.push({ type: 'ElseBlock', children: [elseBlock] });
                }
                break;
            case ts.SyntaxKind.ReturnStatement:
                const returnStmt = node as ts.ReturnStatement;
                logicNode.type = 'ReturnStatement';
                logicNode.value = returnStmt.expression ? returnStmt.expression.getText(context.sourceFile) : 'void';
                break;
            case ts.SyntaxKind.CallExpression:
                const callExpr = node as ts.CallExpression;
                logicNode.type = 'FunctionCall';
                logicNode.name = callExpr.expression.getText(context.sourceFile);
                logicNode.children = callExpr.arguments.map(arg => ({
                    type: 'Argument',
                    value: arg.getText(context.sourceFile) // Could process args recursively for deeper insight
                }));
                break;
            case ts.SyntaxKind.ExpressionStatement:
                // An expression statement might contain a function call, for example.
                // We only want the *inner* useful expression.
                return processFunctionLogicNode((node as ts.ExpressionStatement).expression);
            case ts.SyntaxKind.Block:
                // For a block, just process its statements
                const blockChildren: LlmAstNode[] = [];
                ts.forEachChild(node, child => {
                    const innerLogic = processFunctionLogicNode(child);
                    if (innerLogic) blockChildren.push(innerLogic);
                });
                return blockChildren.length > 0 ? { type: 'Block', children: blockChildren } : null;

            case ts.SyntaxKind.ForStatement:
            case ts.SyntaxKind.WhileStatement:
            case ts.SyntaxKind.SwitchStatement:
            case ts.SyntaxKind.TryStatement:
                logicNode.type = ts.SyntaxKind[node.kind]; // Use SyntaxKind name for now
                const childrenLogic: LlmAstNode[] = [];
                 ts.forEachChild(node, child => {
                    const innerLogic = processFunctionLogicNode(child);
                    if (innerLogic) childrenLogic.push(innerLogic);
                });
                if (childrenLogic.length > 0) logicNode.children = childrenLogic;
                break;
            
            case ts.SyntaxKind.VariableStatement:
            case ts.SyntaxKind.VariableDeclarationList:
            case ts.SyntaxKind.VariableDeclaration:
                 // Capture variable declarations *inside* functions too
                 // Re-use the main processing logic to get variable details.
                 const varDeclarationNode = processNode(node); 
                 if (varDeclarationNode && (varDeclarationNode.type === 'Variable' || varDeclarationNode.type === 'VariableDeclarationGroup')) {
                     return varDeclarationNode;
                 }
                return null; // Don't return if it's not a relevant variable
            
            default:
                // If it's not a recognized logic flow statement, try to process its children
                // (e.g., for binary expressions, property access etc. within a larger expression)
                let hasUsefulNestedLogic = false;
                const nestedLogicChildren: LlmAstNode[] = [];
                ts.forEachChild(node, child => {
                    const processedNestedLogic = processFunctionLogicNode(child);
                    if (processedNestedLogic) {
                        nestedLogicChildren.push(processedNestedLogic);
                        hasUsefulNestedLogic = true;
                    }
                });

                if (hasUsefulNestedLogic) {
                    // If we found useful nested logic, return a generic container for it.
                    // You might refine this to explicitly represent specific expressions if needed.
                    return {
                        type: `NestedLogic (${ts.SyntaxKind[node.kind]})`,
                        children: nestedLogicChildren,
                        value: node.getText(context.sourceFile) // Provide raw text as fallback
                    };
                }
                return null; // Skip other internal expressions/statements unless they are critical
        }
        return logicNode;
    }


    // Start the main parsing process
    const rootNodes = processNode(sourceFile);
    
    // The top-level `processNode(sourceFile)` returns a single 'Module' node.
    // We want its children (the top-level declarations and statements).
    
        return JSON.stringify(rootNodes?.children, null, 2);
    

    // Return an empty array if no top-level nodes found
}
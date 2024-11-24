import * as vscode from 'vscode';
import * as fs from 'fs';

// Constants
const PAGE_SIZE = 1024 * 1024;  // Number of characters per page (adjust as needed)
let currentPage = 0;
let currentFileStream: fs.ReadStream | null = null;
let fileContent: string = '';
let totalFileLength = 0;

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "logpager" is now active!');

    // Handle file opening at the start (if a file is already open when the extension starts)
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.languageId === 'plaintext') {
        const filePath = activeEditor.document.uri.fsPath;
        openFilePaged(filePath);
    }

    // Automatically paginate any open file when the active text editor changes
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && editor.document.languageId === 'plaintext') {
            const filePath = editor.document.uri.fsPath;
            openFilePaged(filePath);
        }
    });
}


function openFilePaged(filePath: string) {
    vscode.window.showInformationMessage(`Opening file: ${filePath}`);
    createPagedEditor(filePath);
}

function createPagedEditor(filePath: string) {
    const panel = vscode.window.createWebviewPanel(
        'pagedFileView',
        'Paged File Viewer',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    // Reset file reading state for each new file
    currentPage = 0;
    fileContent = '';
    totalFileLength = 0;

    // Open the file stream for reading
    currentFileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });

    // Read the entire file content at once to calculate the total length
    currentFileStream.on('data', (chunk) => {
        fileContent += chunk.toString();
        totalFileLength += chunk.length;
    });

    // Send the initial empty content to the webview
    currentFileStream.on('end', () => {
        sendPageToWebview(panel);
    });    

    currentFileStream.on('error', (error) => {
        vscode.window.showErrorMessage(`Error reading file: ${error.message}`);
    });

    // Handle messages from the webview (e.g., Next Page, Previous Page button)
    panel.webview.onDidReceiveMessage((message) => {
        if (message.command === 'requestNextPage') {
            currentPage++;
            sendPageToWebview(panel);
        } else if (message.command === 'requestPreviousPage') {
            currentPage--;
            sendPageToWebview(panel);
        } else if (message.command === 'jumpToFirstPage') {
            currentPage = 0;
            sendPageToWebview(panel);
        } else if (message.command === 'jumpToLastPage') {
            currentPage = Math.floor(totalFileLength / PAGE_SIZE);
            sendPageToWebview(panel);
        } else if (message.command === 'jumpToPage') {
            currentPage = message.page;
            sendPageToWebview(panel);
        }
    });
}

// Function to send the correct page of content to the webview
function sendPageToWebview(panel: vscode.WebviewPanel) {
    const startIdx = currentPage * PAGE_SIZE;
    const endIdx = Math.min(startIdx + PAGE_SIZE, fileContent.length);
    const pageContent = fileContent.slice(startIdx, endIdx);

    // Send the page content to the webview
    panel.webview.html = getWebviewContent(pageContent);

    // Disable the "Previous" button if we are at the first page
    const previousDisabled = currentPage <= 0;

    // Disable the "Next" button if we are at the last page
    const nextDisabled = endIdx === fileContent.length;

    panel.webview.postMessage({
        command: 'updatePaginationButtons',
        previousDisabled,
        nextDisabled,
        currentPage,
        totalPages: Math.floor(totalFileLength / PAGE_SIZE),
    });
}

function getWebviewContent(content: string) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                }
                .container {
                    background-color: inherit;
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    overflow-y:hidden;
                    overflow-x:hidden;
                    width:100%;
                    align-items:center;
                }
                .content {
                    flex-grow: 1;
                    white-space: pre-wrap;
                    margin-bottom: 10px;
                    padding: 20px;
                    overflow-y: auto;
                    box-sizing: border-box;
                    width:100%;
                }
                .button-section {
                    background-color: inherit;
                    width: 90%;
                    display: flex;
                    justify-content: space-between;
                    padding: 10px;
                    border-top: 1px solid #ccc;
                    position: sticky;
                    bottom: 0;
                    left: 0;
                }
                .pagination-buttons {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .pagination-buttons button {
                    padding: 10px 20px;
                    font-size: 16px;
                    cursor: pointer;
                    background-color: #007bff;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    margin: 0 5px;
                }
                .pagination-buttons button:hover {
                    background-color: #0056b3;
                }
                .pagination-buttons button:disabled {
                    background-color: #d3d3d3;
                    cursor: not-allowed;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div id="content" class="content">${content}</div>
                <div class="button-section">
                    <button id="prev">Previous</button>
                    <div class="pagination-buttons" id="pageButtons"></div>
                    <button id="next">Next</button>
                </div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();

                document.getElementById('prev').addEventListener('click', () => {
                    vscode.postMessage({ command: 'requestPreviousPage' });
                });
                document.getElementById('next').addEventListener('click', () => {
                    vscode.postMessage({ command: 'requestNextPage' });
                });

                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.command === 'updatePaginationButtons') {
                        // Disable/enable Previous and Next buttons
                        document.getElementById('prev').disabled = message.previousDisabled;
                        document.getElementById('next').disabled = message.nextDisabled;

                        // Update numbered page buttons
                        const pageButtons = document.getElementById('pageButtons');
                        pageButtons.innerHTML = '';

                        const totalPages = message.totalPages;
                        const currentPage = message.currentPage;

                        // Create numbered page buttons (up to 10 buttons max)
                        const maxPagesToShow = 10;
                        let startPage = Math.max(currentPage - 1, 0);
                        let endPage = Math.min(startPage + maxPagesToShow - 1, totalPages);

                        if (endPage - startPage < maxPagesToShow) {
                            startPage = Math.max(endPage - maxPagesToShow + 1, 0);
                        }

                        // Create buttons for each page number
                        for (let i = startPage; i <= endPage; i++) {
                            const pageButton = document.createElement('button');
                            pageButton.textContent = (i + 1).toString();
                            pageButton.addEventListener('click', () => {
                                vscode.postMessage({ command: 'jumpToPage', page: i });
                            });
                            if (i === currentPage) {
                                pageButton.disabled = true;
                            }
                            pageButtons.appendChild(pageButton);
                        }

                        // Add jump to first/last page buttons
                        const firstPageButton = document.createElement('button');
                        firstPageButton.textContent = '<< First';
                        firstPageButton.addEventListener('click', () => {
                            vscode.postMessage({ command: 'jumpToFirstPage' });
                        });

                        const lastPageButton = document.createElement('button');
                        lastPageButton.textContent = 'Last >>';
                        lastPageButton.addEventListener('click', () => {
                            vscode.postMessage({ command: 'jumpToLastPage' });
                        });

                        pageButtons.prepend(firstPageButton);
                        pageButtons.appendChild(lastPageButton);
                    }
                });
            </script>
        </body>
        </html>
    `;
}

// This method is called when your extension is deactivated
export function deactivate() {}

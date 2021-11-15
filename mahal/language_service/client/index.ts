/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, commands, ExtensionContext, OutputChannel } from 'vscode';

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';


let client: LanguageClient;

export function activate(context: ExtensionContext) {
    console.log("workspace folders",workspace.workspaceFolders, workspace.rootPath);
    const socketPort = workspace.getConfiguration('languageServerExample').get('port', 7000);
    let socket: WebSocket | null = null;

    commands.registerCommand('languageServerExample.startStreaming', () => {
        // Establish websocket connection
        socket = new WebSocket(`ws://localhost:${socketPort}`);
    });

    // The server is implemented in node
    const serverModule = context.asAbsolutePath(
        path.join('language_service', 'dist', 'server.js')
    );
    console.log('mahal language extension activated', serverModule);

    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions,
        }
    };
    // The log to send
    let log = '';
    const websocketOutputChannel: OutputChannel = {
        name: 'websocket',
        // Only append the logs but send them later
        append(value: string) {
            log += value;
            console.log(value);
        },
        appendLine(value: string) {
            log += value;
            // Don't send logs until WebSocket initialization
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(log);
            }
            log = '';
        },
        clear() { /* empty */ },
        show() { /* empty */ },
        hide() { /* empty */ },
        dispose() { /* empty */ }
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // Register the server for plain text documents
        documentSelector: [{ scheme: 'file', language: 'mahal' }],
        // Hijacks all LSP logs and redirect them to a specific port through WebSocket connection
        outputChannel: websocketOutputChannel
    };

    // Create the language client and start the client.
    client = new LanguageClient(
        'mahal_lang_extension',
        'Mahal Language Extension',
        serverOptions,
        clientOptions
    );

    // client.onNotification("log", (...params) => {
    //     console.log(...params);
    // })

    // Start the client. This will also launch the server
    client.start();
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}

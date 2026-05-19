# Words2DrawGenerator

<img width="2560" height="1440" alt="W2DG001" src="https://github.com/user-attachments/assets/7ff14bc0-1d8b-48b7-adac-9f8c6ac6a154" />

----

Words2DrawGenerator is a word generator to help users create drawing compositions. It is useful for drawing-related tasks, creative warmups, ideation, and research.

The app generates words across eight card categories: **time, mood, action, adjective, object, place, animal and person**.

Users can choose a difficulty level, lock words they want to keep, reroll individual cards, enable or disable cards, and use the card actions dropdown for bulk actions such as enable all, disable all, lock all, and unlock all.

If an OpenAI API key is saved, the local server can use LLM: GPT-5.4 Mini to generate words. `Generate Words` and `individual card reroll 🔄️` buttons both use the LLM when a key is available. If no API key is saved, the app falls back to the built-in word lists. The app also avoids repeated ideas by checking current and recently generated words.

## Main files in this repo

This repository contains a one-page web app for generating drawing prompt words.

| File | Purpose |
| --- | --- |
| `index.html` | Page structure and card markup. |
| `styles.css` | Responsive styling and layout. |
| `script.js` | Card behavior, locking, disabling, difficulty selection, and generation logic. |
| `server.js` | Local Node server that serves the app, stores settings in AppData, and calls the OpenAI API. |
| `start.bat` | Easy Windows launcher that starts the server and opens the app. |
| `stop.bat` | Easy Windows script that stops the server on port `4173`. |

## User settings and API key storage

<img width="2560" height="1440" alt="W2DG002" src="https://github.com/user-attachments/assets/ae025f6c-cb16-4f9f-a527-588373cf11c7" />

API key settings are stored locally in AppData through the Node server, not in browser localStorage. The browser can see whether a key exists, but it does not receive the saved key after it is stored.

When the app is run through `server.js`, settings are stored on Windows at:

```text
%localappdata%\Words2DrawGenerator\UserSettings\settings.json
```

The browser page does not receive the saved API key. It calls the local server, and the local server reads the key from AppData only when it needs to call OpenAI.

For local security, the server binds to `127.0.0.1`, so it is only available from your own computer. The local API also rejects non-local Host/Origin headers, requires JSON for POST requests, and sends basic browser security headers.

## How to run it

### Easy Windows option

1. Create a new OpenAI API key if you want LLM generation.

2. Create a new folder in your PC.
3. Open that folder in Git Bash or PowerShell.

4. Clone and wait for the files to download.
   
```text
git clone https://github.com/okmikaelaok/Words2DrawGenerator.git
```
   
5. Open that folder, and double-click:

```text
start.bat
```

3. The app opens at:

```text
http://127.0.0.1:4173
```

Keep the terminal window open while using the app.

4. Explore the web app and generate some words to start drawing!

## How to stop it

### Easy Windows option

Double-click:

```text
stop.bat
```

### Terminal option

If the server is running in the terminal, press:

```text
Ctrl + C
```

<img width="914" height="313" alt="terminalW2DG" src="https://github.com/user-attachments/assets/c1e349cc-6346-40fa-832a-5eedc17e72fc" />

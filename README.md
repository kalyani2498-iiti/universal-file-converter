# Universal File Type Converter Web Application

[cite_start]A secure, full-stack web application that enables users to seamlessly convert files between different formats while prioritizing data privacy and user experience[cite: 6, 8].

## Supported Formats
- [cite_start]**Images:** JPG, PNG (Format swapping and optimization) 
- [cite_start]**Documents:** PDF, DOCX (Plain text extraction to .txt) 

## Core Features Implemented
- [cite_start]**Drag-and-Drop UI:** A clean, responsive interface built with Tailwind CSS.
- [cite_start]**Data Privacy & Security:** Uploaded files are given randomized unique UUID identifiers[cite: 18]. [cite_start]An automated background cron script securely purges all uploaded and converted files from the server directories after 30 minutes[cite: 14].
- [cite_start]**Pure JavaScript Processing:** Utilizes `jimp`, `pdf-parse`, and `mammoth` for robust server-side processing without complex system dependencies[cite: 13, 19].

## Local Setup Instructions
1. Clone the repository.
2. Run `npm install` to set up dependencies.
3. Start the application using `node server.js`.
4. Open `http://localhost:3000` in your web browser.

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Jimp = require('jimp'); // Pure JS image processing (Windows Friendly)
const cron = require('node-cron');

// Document parsing engines
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up secure temporary directories
const UPLOAD_DIR = path.join(__dirname, 'storage', 'uploads');
const CONVERTED_DIR = path.join(__dirname, 'storage', 'converted');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(CONVERTED_DIR)) fs.mkdirSync(CONVERTED_DIR, { recursive: true });

app.use(express.static('public'));
app.use(express.json());
app.use('/download', express.static(CONVERTED_DIR));

// Configure disk storage with secure UUID naming
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, UPLOAD_DIR); },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Strict 10MB file limit
});

// Main Core Conversion Processing Route
app.post('/api/convert', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        const targetFormat = req.body.targetFormat.toLowerCase(); 
        const inputPath = req.file.path;
        const fileExtension = path.extname(req.file.originalname).toLowerCase();

        let outputFilename = `${uuidv4()}.${targetFormat}`;
        let outputPath = path.join(CONVERTED_DIR, outputFilename);

        // --- LAYER A: IMAGE CONVERSION ENGINE (JIMP) ---
        if (['png', 'jpeg', 'jpg'].includes(targetFormat)) {
            const image = await Jimp.read(inputPath);
            await image.writeAsync(outputPath);
        } 
        
        // --- LAYER B: DOCUMENT PROCESSING ENGINE (.TXT Extraction) ---
        else if (targetFormat === 'txt') {
            let extractedText = '';

            if (fileExtension === '.pdf') {
                const dataBuffer = fs.readFileSync(inputPath);
                const pdfData = await pdfParse(dataBuffer);
                extractedText = pdfData.text;
            } else if (fileExtension === '.docx') {
                const result = await mammoth.extractRawText({ path: inputPath });
                extractedText = result.value;
            } else if (fileExtension === '.txt') {
                extractedText = fs.readFileSync(inputPath, 'utf-8');
            } else {
                return res.status(400).json({ error: 'Unsupported document format.' });
            }

            // Error handling for empty extractions / scanned images inside PDFs
            if (!extractedText || !extractedText.trim()) {
                return res.status(400).json({ error: 'Could not find readable digital text in this file.' });
            }

            fs.writeFileSync(outputPath, extractedText, 'utf-8');
        } else {
            return res.status(400).json({ error: 'Unsupported target format.' });
        }

        // Return secure download link metadata
        res.json({
            success: true,
            message: 'Conversion completed successfully.',
            downloadUrl: `/download/${outputFilename}`
        });

    } catch (error) {
        console.error('Conversion Error:', error);
        res.status(500).json({ error: 'An error occurred while processing your file.' });
    }
});

// Automated File Cleanup Routine (Runs every 15 mins to nuke items older than 30 mins)
cron.schedule('*/15 * * * *', () => {
    console.log('Sweeping storage directories for expired assets...');
    const now = Date.now();
    const EXPIRATION_TIME = 30 * 60 * 1000; 

    const cleanDirectory = (dirPath) => {
        fs.readdir(dirPath, (err, files) => {
            if (err) return;
            files.forEach(file => {
                const filePath = path.join(dirPath, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) return;
                    if (now - stats.mtimeMs > EXPIRATION_TIME) {
                        fs.unlink(filePath, () => {
                            console.log(`Securely deleted expired file instance: ${file}`);
                        });
                    }
                });
            });
        });
    };
    cleanDirectory(UPLOAD_DIR);
    cleanDirectory(CONVERTED_DIR);
});

app.listen(PORT, () => {
    console.log(`Server executing safely on http://localhost:${PORT}`);
});
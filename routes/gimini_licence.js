const express = require('express');
require('dotenv').config();
const multer = require('multer');
const axios = require('axios');
const app = express();
const port = 3000;

const upload = multer({ storage: multer.memoryStorage() });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

app.post('/analyze-image', upload.single('image'), async (req, res) => {
    try {
        if (!GOOGLE_API_KEY) {
            return res.status(500).json({ error: "GOOGLE_API_KEY is not configured" });
        }

        const imageBuffer = req.file.buffer;
        const base64Image = imageBuffer.toString('base64');

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
            {
                contents: [
                    {
                        parts: [
                            {
                                text: "اقرأ النصوص الموجودة في هذه الرخصة سطراً سطراً، وأعدها بنفس الترتيب، دون أي عناوين أو شرح، فقط المحتوى الحقيقي لكل سطر."
                            },
                            {
                                inlineData: {
                                    mimeType: "image/jpeg",
                                    data: base64Image
                                }
                            }
                        ]
                    }
                ]
            },
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        const fullText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const lines = fullText.split("\n").map(line => line.trim()).filter(Boolean);

        const name = lines[1] || "";
        const licence_num = Number(lines[2]) || 0;
        const id_num = Number(lines[3]) || 0;
        const licence_type = lines[4]?.split(" ").pop() || "";

        // Remove Arabic letters from lines 5 and 6
        const release_date = lines[5]?.replace(/[\u0600-\u06FF]/g, '').trim() || "";
        const expiry_date = lines[6]?.replace(/[\u0600-\u06FF]/g, '').trim() || "";

        // ✅ Extract only the part between colons from line 7
        const release_place = (lines[7]?.includes(":"))
            ? lines[7].split(":").slice(1).join(":").trim()
            : "";

        console.log("Name:", name);
        console.log("License Number:", licence_num);
        console.log("ID Number:", id_num);
        console.log("License Type (last word):", licence_type);
        console.log("Release Date (no Arabic):", release_date);
        console.log("Expiry Date (no Arabic):", expiry_date);
        console.log("Release Place (after colon):", release_place);

        res.json({
            name,
            licence_num,
            id_num,
            licence_type,
            release_date,
            expiry_date,
            release_place
        });

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({
            error: "Failed to analyze image",
            details: error.response?.data || error.message
        });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

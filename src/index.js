import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5001';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Proxy API requests to Python backend
app.use('/api', async (req, res) => {
    try {
        const response = await axios({
            method: req.method,
            url: `${PYTHON_API_URL}${req.originalUrl}`,
            data: req.body,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Proxy error:', error.message);
        
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else if (error.code === 'ECONNREFUSED') {
            res.status(503).json({
                success: false,
                error: 'Python backend is not running. Please start it with: pnpm backend'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle paper viewer routes
app.get('/paper/:arxiv_id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle settings routes
app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║         ArXiv Reader Frontend          ║
╠════════════════════════════════════════╣
║ Server running on: http://localhost:${PORT}  ║
║ Python API expected: ${PYTHON_API_URL}      ║
║                                        ║
║ To start Python backend:               ║
║ pnpm backend                           ║
╚════════════════════════════════════════╝
    `);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    process.exit(0);
});

export default app;

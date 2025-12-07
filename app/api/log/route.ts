import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'logs', 'query-logs.jsonl');

// Ensure log directory exists
async function ensureLogDir() {
    const logDir = path.join(process.cwd(), 'logs');
    try {
        await fs.mkdir(logDir, { recursive: true });
    } catch (err) {
        // Directory might already exist
    }
}

export async function POST(req: NextRequest) {
    try {
        const { query, stage, response, error } = await req.json();

        // Get IP address
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';

        // Get user agent
        const userAgent = req.headers.get('user-agent') || 'unknown';

        // Get geo location from Vercel headers
        const country = req.headers.get('x-vercel-ip-country') || 'unknown';
        const city = req.headers.get('x-vercel-ip-city') || 'unknown';

        // Create log entry
        const logEntry = {
            timestamp: new Date().toISOString(),
            query,
            stage,
            ip,
            userAgent,
            country,
            city,
            success: !error,
            error: error || null,
            responseLength: response ? JSON.stringify(response).length : 0
        };

        // Append to log file (JSONL format - one JSON per line)
        await ensureLogDir();
        await fs.appendFile(LOG_FILE, JSON.stringify(logEntry) + '\n');

        return NextResponse.json({ logged: true });
    } catch (error) {
        console.error('Logging error:', error);
        return NextResponse.json({ logged: false, error: String(error) }, { status: 500 });
    }
}

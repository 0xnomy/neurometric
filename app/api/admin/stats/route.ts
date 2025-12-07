import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'logs', 'query-logs.jsonl');
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-in-production';

export async function GET(req: NextRequest) {
    try {
        // Simple authentication
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (token !== ADMIN_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Read log file
        let logs: any[] = [];
        try {
            const fileContent = await fs.readFile(LOG_FILE, 'utf-8');
            logs = fileContent
                .split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line));
        } catch (err) {
            // No logs yet
            return NextResponse.json({
                totalQueries: 0,
                uniqueVisitors: 0,
                countries: {},
                recentQueries: [],
                topQueries: [],
                errorRate: 0
            });
        }

        // Calculate statistics
        const uniqueIPs = new Set(logs.map(l => l.ip));
        const countries: Record<string, number> = {};
        const queries: Record<string, number> = {};
        let errorCount = 0;

        logs.forEach(log => {
            // Count by country
            countries[log.country] = (countries[log.country] || 0) + 1;

            // Count queries
            if (log.query) {
                queries[log.query] = (queries[log.query] || 0) + 1;
            }

            // Count errors
            if (log.error) errorCount++;
        });

        // Sort top queries
        const topQueries = Object.entries(queries)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([query, count]) => ({ query, count }));

        // Get recent queries (last 50)
        const recentQueries = logs
            .slice(-50)
            .reverse()
            .map(log => ({
                timestamp: log.timestamp,
                query: log.query,
                ip: log.ip,
                country: log.country,
                city: log.city,
                success: log.success
            }));

        return NextResponse.json({
            totalQueries: logs.length,
            uniqueVisitors: uniqueIPs.size,
            countries,
            topQueries,
            recentQueries,
            errorRate: logs.length > 0 ? (errorCount / logs.length * 100).toFixed(2) : 0,
            timeRange: logs.length > 0 ? {
                first: logs[0].timestamp,
                last: logs[logs.length - 1].timestamp
            } : null
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 400 });
    }

    const envPath = path.resolve(process.cwd(), '.env');

    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    const keyName = 'GEMINI_API_KEY';
    const newLine = `${keyName}=${apiKey.trim()}`;

    if (envContent.includes(`${keyName}=`)) {
      envContent = envContent.replace(new RegExp(`^${keyName}=.*$`, 'm'), newLine);
    } else {
      envContent = envContent.trimEnd() + '\n' + newLine + '\n';
    }

    fs.writeFileSync(envPath, envContent, 'utf-8');

    // Update process.env so the new key is used immediately without restart
    process.env[keyName] = apiKey.trim();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to save Gemini API key:', err);
    return NextResponse.json({ error: 'Failed to save key' }, { status: 500 });
  }
}

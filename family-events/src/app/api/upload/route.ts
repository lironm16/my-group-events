import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'family-events';

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + apiSecret)
    .digest('hex');

  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type });
  const body = new FormData();
  body.append('file', blob, file.name);
  body.append('api_key', apiKey);
  body.append('timestamp', String(timestamp));
  body.append('signature', signature);
  body.append('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: 'Upload failed', detail: text }, { status: 500 });
  }
  const json = await res.json();
  return NextResponse.json({ url: json.secure_url as string });
}


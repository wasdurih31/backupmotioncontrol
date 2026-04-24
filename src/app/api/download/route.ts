import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch resource: ${response.statusText}`);
    }

    // Pass along the body and appropriate headers to force a download
    const headers = new Headers(response.headers);
    // Use the URL's filename if possible, otherwise default to universe-ai-video.mp4
    const filename = url.split('/').pop()?.split('?')[0] || 'universe-ai-video.mp4';
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Download proxy error:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}

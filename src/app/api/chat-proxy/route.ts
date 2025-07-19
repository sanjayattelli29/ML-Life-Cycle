import { NextResponse } from 'next/server';

const N8N_WEBHOOK_URL = 'https://n8n-render-free-yin1.onrender.com/webhook/d2412453-2e1b-4a92-8f1c-e5ce65c0c461/chat';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Try to get response text first
    const responseText = await response.text();
    let responseData;
    
    try {
      // Attempt to parse as JSON
      responseData = JSON.parse(responseText);
    } catch {
      // If not JSON, use text as is
      responseData = { response: responseText };
    }

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: 'N8N service error',
          status: response.status,
          message: responseData?.error || 'Failed to get response from N8N',
          shouldFallback: true
        },
        { status: 502 } // Use 502 to indicate upstream service failure
      );
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Chat proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

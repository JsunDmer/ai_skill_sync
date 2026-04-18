import { NextRequest, NextResponse } from 'next/server';

const SKILLSMP_API = 'https://skillsmp.com/api/v1';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '20';
  const sortBy = searchParams.get('sortBy');
  const apiKey = searchParams.get('apiKey');

  if (!apiKey || !query) {
    return NextResponse.json({ error: 'Missing query or apiKey' }, { status: 400 });
  }

  const params = new URLSearchParams({
    q: query,
    page,
    limit,
  });

  if (sortBy) params.set('sortBy', sortBy);

  try {
    const response = await fetch(
      `${SKILLSMP_API}/skills/search?${params}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}
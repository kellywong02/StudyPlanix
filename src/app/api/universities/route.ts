import { NextResponse, type NextRequest } from "next/server"

type HipolabsUniversity = {
  name: string
  country: string
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim()
  if (!query || query.length < 3) {
    return NextResponse.json({ universities: [] })
  }

  const res = await fetch(
    `http://universities.hipolabs.com/search?name=${encodeURIComponent(query)}`,
    { signal: AbortSignal.timeout(5000) }
  ).catch(() => null)

  if (!res || !res.ok) {
    return NextResponse.json({ universities: [] })
  }

  const data: HipolabsUniversity[] = await res.json()
  const universities = data.slice(0, 8).map((u) => ({ name: u.name, country: u.country }))

  return NextResponse.json({ universities })
}

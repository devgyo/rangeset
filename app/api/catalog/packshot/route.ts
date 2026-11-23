import type {NextRequest} from "next/server";
import {arcPackshotSource} from "@/lib/arcteryx-packshot";
import {renderArcPackshot} from "@/lib/render-arc-packshot";

const maxImageBytes = 6_000_000;

export async function GET(request: NextRequest) {
  const source = arcPackshotSource(request.nextUrl.searchParams.get("src"));
  if (!source || request.nextUrl.searchParams.get("v") !== "1") return new Response(null, {status: 400});

  try {
    const upstream = await fetch(source, {redirect: "error", signal: AbortSignal.timeout(8_000)});
    if (!upstream.ok || !upstream.body || !/^image\/(?:jpe?g|png|webp)$/i.test(upstream.headers.get("content-type") ?? "")) {
      return new Response(null, {status: upstream.status === 404 ? 404 : 502});
    }

    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = upstream.body.getReader();
    try {
      for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
        size += chunk.value.byteLength;
        if (size > maxImageBytes) {
          await reader.cancel();
          return new Response(null, {status: 502});
        }
        chunks.push(chunk.value);
      }
    } finally {
      reader.releaseLock();
    }
    const image = await renderArcPackshot(Buffer.concat(chunks, size));
    return new Response(new Uint8Array(image), {headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    }});
  } catch {
    return new Response(null, {status: 502});
  }
}

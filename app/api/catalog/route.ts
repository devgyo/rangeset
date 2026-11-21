import {listProducts} from "@/lib/catalog";

export const dynamic = "force-static";
export const revalidate = 300;

export async function GET() {
  return Response.json(await listProducts(), {headers: {"X-Robots-Tag": "noindex"}});
}

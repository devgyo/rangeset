import createMiddleware from "next-intl/middleware";
import {NextResponse, type NextRequest} from "next/server";
import {routing} from "./i18n/routing";
import {legacyTaxonomy, taxonomyPath, taxonomySlugs} from "./lib/taxonomy";

const localeMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const {pathname, searchParams} = request.nextUrl;
  const match = pathname.match(/^\/(?:(en|zh|ja)\/)?products\/?$/);
  const jackets = pathname.match(/^\/(?:(en|zh|ja)\/)?jackets\/?$/);
  if (jackets) {
    const url = request.nextUrl.clone();
    url.pathname = (jackets[1] && jackets[1] !== "en" ? "/" + jackets[1] : "") + taxonomyPath("hardshell-jackets");
    return NextResponse.redirect(url, 301);
  }
  const category = searchParams.get("category");
  if (match && category && (Object.hasOwn(legacyTaxonomy, category) || taxonomySlugs.includes(category))) {
    const url = request.nextUrl.clone();
    const destination = legacyTaxonomy[category] ?? category;
    url.pathname = (match[1] && match[1] !== "en" ? "/" + match[1] : "") + taxonomyPath(destination);
    url.searchParams.delete("category");
    if (category === "Professional Use") url.searchParams.set("series", "PRO");
    return NextResponse.redirect(url, 301);
  }
  return localeMiddleware(request);
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};

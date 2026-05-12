import type { Route } from "next";

export const LOCALES = ["en", "es"] as const;
export const DEFAULT_LOCALE: Locale = "en";

export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "es";
}

export function localizePath(locale: Locale, path: string): Route {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedPath === "/") {
    return `/${locale}` as Route;
  }

  return `/${locale}${normalizedPath}` as Route;
}

export function stripLocaleFromPath(pathname: string) {
  const segments = pathname.split("/");
  const maybeLocale = segments[1];

  if (!isLocale(maybeLocale)) {
    return pathname || "/";
  }

  const stripped = `/${segments.slice(2).join("/")}`;
  return stripped === "/" ? "/" : stripped.replace(/\/$/, "") || "/";
}

export function switchLocalePath(pathname: string, nextLocale: Locale): Route {
  return localizePath(nextLocale, stripLocaleFromPath(pathname));
}

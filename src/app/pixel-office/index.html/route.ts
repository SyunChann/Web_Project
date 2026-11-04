import { readFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };

  if (!user) redirect("/login");

  const htmlPath = path.join(
    process.cwd(),
    "src/components/ai-office/pixel-office.html",
  );
  const html = await readFile(htmlPath, "utf8");

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}

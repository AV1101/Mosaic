import { redirect } from "next/navigation";

export default function LoginPage() {
  // Authentication has been removed, so the login screen is intentionally disabled.
  redirect("/marketplace");
}

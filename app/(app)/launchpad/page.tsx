import { redirect } from "next/navigation";

// Launchpad is now Today; old links and bookmarks still work.
export default function LaunchpadPage() {
  redirect("/today");
}

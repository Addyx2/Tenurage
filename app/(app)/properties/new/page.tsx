import { PageTitle } from "@/components/PageTitle";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";

import { PropertyForm } from "./PropertyForm";

export const metadata = { title: "Add a property" };

export default async function NewPropertyPage() {
  await requireUser();
  return (
    <>
      <PageTitle title="Add a property" description="Once it's in, add viewing slots and Linkbot can offer them to matched applicants." />
      <Card className="max-w-2xl p-6"><PropertyForm /></Card>
    </>
  );
}

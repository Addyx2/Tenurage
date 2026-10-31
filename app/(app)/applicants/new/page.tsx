import { PageTitle } from "@/components/PageTitle";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";

import { ApplicantForm } from "./ApplicantForm";

export const metadata = { title: "Add an applicant" };

export default async function NewApplicantPage() {
  await requireUser();
  return (
    <>
      <PageTitle title="Add an applicant" description="Tenurage matches them to properties as they come on, and Linkbot can text them viewings." />
      <Card className="max-w-2xl p-6"><ApplicantForm /></Card>
    </>
  );
}

import { listRequests } from "@/lib/data/requests";
import { listStudentRequests } from "@/lib/data/student-requests";
import { getPeriods } from "@/lib/data/periods";
import { RequestsView } from "./RequestsView";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const [requests, studentRequests, periods] = await Promise.all([
    listRequests(),
    listStudentRequests(),
    getPeriods(),
  ]);

  return <RequestsView requests={requests} studentRequests={studentRequests} periods={periods} />;
}

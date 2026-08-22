import { listRequests } from "@/lib/data/requests";
import { getPeriods } from "@/lib/data/periods";
import { RequestsView } from "./RequestsView";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const [requests, periods] = await Promise.all([listRequests(), getPeriods()]);

  return <RequestsView requests={requests} periods={periods} />;
}

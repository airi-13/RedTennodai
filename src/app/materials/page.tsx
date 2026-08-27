import { listTextbooks } from "@/lib/data/textbooks";
import { listPricingRules } from "@/lib/data/pricing";
import { MaterialsView } from "./MaterialsViewClient";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const [textbooks, pricingRules] = await Promise.all([
    listTextbooks(),
    listPricingRules(),
  ]);

  return <MaterialsView textbooks={textbooks} pricingRules={pricingRules} />;
}

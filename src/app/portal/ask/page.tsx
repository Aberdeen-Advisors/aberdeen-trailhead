import Chat from "@/components/chat";
import { PageHeader } from "@/components/ui";

export default function AskPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Ask Horizon"
        title="Ask Horizon"
        sub="The HorizonView agent answers from each project's live data (the Power BI semantic model, SharePoint Lists or the HorizonView project database) and your project documents, and always cites its sources."
      />
      <Chat />
    </div>
  );
}

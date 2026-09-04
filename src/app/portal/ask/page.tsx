import Chat from "@/components/chat";
import { PageHeader } from "@/components/ui";

export default function AskPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Ask Horizon"
        title="Ask Horizon"
        sub="The HorizonView agent routes questions across the Semantic Model, SharePoint Lists, and your project documents — and always cites its sources."
      />
      <Chat />
    </div>
  );
}

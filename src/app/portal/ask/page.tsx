import Chat from "@/components/chat";

export default function AskPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ask Horizon</h1>
        <p className="mt-1 text-sm text-hv-muted">
          The HorizonView agent routes questions across the Semantic Model, SharePoint Lists, and
          your project documents — and always cites its sources.
        </p>
      </div>
      <Chat />
    </div>
  );
}

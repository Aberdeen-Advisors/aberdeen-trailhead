import Nav from "@/components/nav";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-hv-bg">
      <Nav />
      <main className="mx-auto max-w-[1320px] px-6 py-8">{children}</main>
      <footer className="mx-auto max-w-[1320px] px-6 pb-10 pt-4">
        <p className="border-t border-hv-border pt-5 text-[0.72rem] font-light text-hv-subtle">
          HorizonView by Aberdeen Advisors · Certified KPIs from the Power BI Semantic Model · AI
          insights generated in Microsoft Fabric
        </p>
      </footer>
    </div>
  );
}

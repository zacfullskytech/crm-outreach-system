import Link from "next/link";

const navItems = [
  ["Dashboard", "/"],
  ["Contacts", "/contacts"],
  ["Companies", "/companies"],
  ["Segments", "/segments"],
  ["Campaigns", "/campaigns"],
  ["Prospects", "/prospects"],
  ["Imports", "/imports"],
  ["Settings", "/settings"],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <h1>Field Notes CRM</h1>
        <nav className="nav">
          {navItems.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

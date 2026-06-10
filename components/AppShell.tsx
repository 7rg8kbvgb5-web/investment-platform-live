import AppSidebar from './AppSidebar';

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="shell">
      <AppSidebar />
      <div className="main">
        <div className="main-inner">{children}</div>
      </div>
    </div>
  );
}

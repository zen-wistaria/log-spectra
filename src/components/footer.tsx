export default function Footer({
  appCopyright,
  appName,
  appCopyrightYear,
  appVersion,
}: {
  appCopyright: string;
  appName: string;
  appCopyrightYear: string;
  appVersion: string;
}) {
  return (
    <footer className="flex items-center justify-center h-16">
      <p className="text-muted-foreground text-xs font-mono">
        {appCopyright}, {appName} &copy; {appCopyrightYear} | {appVersion}
      </p>
    </footer>
  );
}

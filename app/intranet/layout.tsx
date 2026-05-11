import { CommandPalette } from "@/components/CommandPalette";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { IntranetSidebar } from "@/components/IntranetSidebar";
import { PWARegister } from "@/components/PWARegister";
import { ShaderBackground } from "@/components/ShaderBackground";
import { StopModal } from "@/components/StopModal";
import { TimerProvider } from "@/lib/timerContext";
import styles from "@/styles/intranet-layout.module.css";

export default function IntranetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TimerProvider>
      <div className={styles.shell}>
        <ShaderBackground />
        <IntranetSidebar />
        <div className={styles.content}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </div>
      <CommandPalette />
      <StopModal />
      <PWARegister />
    </TimerProvider>
  );
}

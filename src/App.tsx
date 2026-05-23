import { OSProvider } from '@/lib/osContext';
import BootScreen from '@/components/os/BootScreen';
import DesktopEnvironment from '@/components/os/DesktopEnvironment';
import TopMenuBar from '@/components/os/TopMenuBar';
import FloatingDock from '@/components/os/FloatingDock';
import WindowManager from '@/components/os/WindowManager';

function OSDesktop() {
  return (
    <>
      <BootScreen />
      <DesktopEnvironment />
      <WindowManager />
      <TopMenuBar />
      <FloatingDock />
    </>
  );
}

function App() {
  return (
    <OSProvider>
      <OSDesktop />
    </OSProvider>
  );
}

export default App;

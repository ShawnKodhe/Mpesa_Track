import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  BarChart3,
  HandCoins,
  User,
  Wallet,
  TrendingUp,
  Settings as SettingsIcon,
  HelpCircle,
} from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import AuroraBackground from '@/components/layout/AuroraBackground';
import ThemeSwitcher from '@/components/shared/ThemeSwitcher';
import ZombieRobotIcon from '@/components/jarvis/ZombieRobotIcon';
import AppTourProvider, { useAppTour } from '@/components/tour/AppTourProvider';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/budget', label: 'Budget', icon: PiggyBank },
  { path: '/ladder', label: 'Ladder', icon: TrendingUp },
  { path: '/loans', label: 'Loans', icon: HandCoins },
  { path: '/debts-owed', label: 'Owed to Me', icon: Wallet },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/jarvis', label: 'Jarvis', icon: ZombieRobotIcon },
];

const tourKey = (path) => `nav-${path === '/' ? 'dashboard' : path.slice(1)}`;

function AppShell() {
  const location = useLocation();
  const { user: appUser } = useAuth();
  const { startTour } = useAppTour();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
  }, [location.pathname]);

  const currentNav = navItems.find(n => n.path === location.pathname);
  const pageTitle = currentNav?.label || 'PesaTrack';

  return (
    <div className="relative min-h-screen font-body overscroll-none">
      <AuroraBackground />
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col z-30">
        <div className="flex flex-col h-full bg-card border-r border-border">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-heading font-bold text-lg">M</span>
              </div>
              <div>
                <h1 className="font-heading font-bold text-lg text-foreground">PesaTrack</h1>
                <p className="text-xs text-muted-foreground">M-Pesa Finance Manager</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-tour={tourKey(item.path)}
                  className={`select-none flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/15 text-foreground ring-1 ring-inset ring-primary/40'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 mx-3 mb-4 space-y-3">
            {/* Profile row */}
            <Link
              to="/profile"
              data-tour="nav-profile"
              className="select-none flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                {appUser?.profile_picture
                  ? <img src={appUser.profile_picture} alt="avatar" className="w-full h-full object-cover" />
                  : <User className="w-4 h-4 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{appUser?.full_name || 'My Profile'}</p>
                <p className="text-xs text-muted-foreground truncate">{appUser?.email}</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <button
                type="button"
                onClick={() => startTour({ force: true })}
                aria-label="Replay app tour"
                title="Replay app tour"
                className="select-none w-9 h-9 flex-shrink-0 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 flex items-center justify-center"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <Link
              to="/settings"
              data-tour="nav-settings"
              className="select-none w-full flex items-center justify-center px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium text-muted-foreground"
            >
              Settings
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-heading font-bold text-sm select-none">M</span>
            </div>
            <h1 className="font-heading font-bold text-foreground select-none">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => startTour({ force: true })}
              aria-label="Replay app tour"
              className="select-none p-1.5 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <Link to="/settings" data-tour="nav-settings" className="select-none p-1.5 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Settings">
              <SettingsIcon className="w-4 h-4" />
            </Link>
            <ThemeSwitcher className="w-[104px]" />
            <Link to="/profile" data-tour="nav-profile" className="select-none p-1 rounded-full hover:bg-secondary transition-colors" aria-label="Profile">
              <div className="w-7 h-7 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center">
                {appUser?.profile_picture
                  ? <img src={appUser.profile_picture} alt="avatar" className="w-full h-full object-cover" />
                  : <User className="w-4 h-4 text-primary" />}
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main
        className="relative z-10 lg:pl-64 overscroll-none"
        style={{
          paddingTop: 'calc(56px + env(safe-area-inset-top))',
          paddingBottom: 'calc(64px + env(safe-area-inset-bottom))',
        }}
      >
        <div className="p-4 md:p-8 max-w-7xl mx-auto lg:pt-8 lg:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-tour={tourKey(item.path)}
                className={`select-none flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 flex-shrink-0 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function AppLayout() {
  return (
    <AppTourProvider>
      <AppShell />
    </AppTourProvider>
  );
}

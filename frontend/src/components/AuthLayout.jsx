import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glow blobs */}
      <div className="fixed -top-32 -left-32 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[130px] pointer-events-none" />
      <div className="fixed -bottom-32 -right-32 w-[450px] h-[450px] bg-secondary/4 rounded-full blur-[110px] pointer-events-none" />
      <Outlet />
    </div>
  );
}

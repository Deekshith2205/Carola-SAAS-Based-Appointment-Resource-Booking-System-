import { Outlet } from 'react-router-dom';
import { Zap, Quote } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* ── Left Branded Panel (Hidden on Mobile) ── */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between bg-zinc-950 p-10 text-white dark:bg-zinc-950">
        <div className="flex items-center gap-3 font-bold text-xl tracking-tight">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <Zap size={20} />
          </div>
          Calora
        </div>

        <div className="max-w-md space-y-6">
          <Quote className="h-10 w-10 text-zinc-600" />
          <p className="text-2xl font-medium leading-relaxed text-zinc-300">
            "Switching to this platform transformed how we manage our appointments. Everything is seamless, from staff scheduling to customer bookings."
          </p>
          <div>
            <p className="font-semibold text-white">Sarah Jenkins</p>
            <p className="text-sm text-zinc-500">Owner, Calora</p>
          </div>
        </div>
      </div>

      {/* ── Right Content Area ── */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center justify-center gap-3 font-bold text-2xl tracking-tight mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
              <Zap size={20} />
            </div>
            Calora
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

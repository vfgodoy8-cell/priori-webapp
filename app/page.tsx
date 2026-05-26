export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        {/* Logo: 3 barras en degradé de opacidad */}
        <div className="flex flex-col gap-1.5">
          <div className="h-2.5 w-16 rounded-full bg-brand-orange" />
          <div className="h-2.5 w-10 rounded-full bg-brand-orange opacity-65" />
          <div className="h-2.5 w-6 rounded-full bg-brand-orange opacity-30" />
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-brand-black">
          priori
        </h1>

        <p className="text-brand-gray text-base">
          La claridad de priorizar bien.
        </p>
      </div>
    </main>
  );
}

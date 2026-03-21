import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_32%),linear-gradient(180deg,#07111f_0%,#020617_100%)] px-6 py-16">
      <section className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-slate-950/70 px-10 py-16 text-center shadow-2xl shadow-slate-950/50 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">FabricLab</p>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white">
          FabricLab
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Master HPC networking by doing, not reading.
        </p>
        <Link
          href="/module/rocev2"
          className="mt-10 inline-flex rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Start learning RoCEv2
        </Link>
      </section>
    </main>
  );
}

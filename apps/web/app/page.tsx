export default function Home() {
  return (
    <main className="flex min-h-screen gap-6 p-6">
      <section className="w-[70%] rounded border border-gray-200 p-6">
        <p className="text-lg font-medium">Learning Content</p>
      </section>
      <aside className="w-[30%]">
        <div className="flex h-full min-h-[240px] items-center justify-center rounded border border-gray-200 p-6">
          <p className="text-lg font-medium">CLI Terminal</p>
        </div>
      </aside>
    </main>
  );
}

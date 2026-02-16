export default function AdminLoading() {
  return (
    <div className="p-8">
      <div className="animate-pulse">
        <div className="h-3 w-56 bg-neutral-200 rounded-full" />
        <div className="mt-3 h-8 w-52 bg-neutral-200 rounded-2xl" />
        <div className="mt-3 h-4 w-96 bg-neutral-200 rounded-full" />

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-36 bg-neutral-200 rounded-3xl" />
          <div className="h-36 bg-neutral-200 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

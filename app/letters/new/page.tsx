import NewLetterForm from "./NewLetterForm";

export default function NewLetterPage() {
  return (
    <div className="p-8">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
          UHAS Procurement Directorate
        </p>
        <h1 className="mt-2 text-2xl font-semibold">New Letter</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Record a letter and upload the scanned document securely.
        </p>
      </div>

      <div className="mt-6">
        <NewLetterForm />
      </div>
    </div>
  );
}
